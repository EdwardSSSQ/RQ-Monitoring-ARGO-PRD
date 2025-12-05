import axios from 'axios';
import colors from 'colors';
import cron from 'node-cron';

const ARGOCD_URL = 'https://argocd.alproyect.store';
const USERNAME = 'admin';
const PASSWORD = 'QTSK97LQXPeIekdt';

class ArgoCDMonitor {
  constructor(baseURL, username, password) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.token = null;
    this.apiClient = axios.create({
      baseURL: `${this.baseURL}/api/v1`,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async authenticate() {
    try {
      console.log('🔐 Autenticando con ArgoCD...'.yellow);
      
      const response = await axios.post(
        `${this.baseURL}/api/v1/session`,
        {
          username: this.username,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.token = response.data.token;
      this.apiClient.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
      
      console.log('✅ Autenticación exitosa\n'.green);
      return true;
    } catch (error) {
      console.error('❌ Error al autenticar:'.red, error.response?.data || error.message);
      return false;
    }
  }

  async getApplications() {
    try {
      const response = await this.apiClient.get('/applications');
      return response.data.items || [];
    } catch (error) {
      console.error('❌ Error al obtener aplicaciones:'.red, error.response?.data || error.message);
      return [];
    }
  }

  async getApplicationResources(appName, namespace = '') {
    try {
      const params = namespace ? { name: appName, namespace } : { name: appName };
      const response = await this.apiClient.get(`/applications/${appName}/resource`, { params });
      return response.data;
    } catch (error) {
      // Intentar obtener recursos de otra forma
      try {
        const response = await this.apiClient.get(`/applications/${appName}`);
        return response.data;
      } catch (error2) {
        console.error(`❌ Error al obtener recursos de ${appName}:`.red, error2.response?.data || error2.message);
        return null;
      }
    }
  }

  async getApplicationTree(appName) {
    try {
      const response = await this.apiClient.get(`/applications/${appName}/resource-tree`);
      return response.data;
    } catch (error) {
      // Silenciar error, intentaremos otras formas
      return null;
    }
  }

  async getResourceDetails(appName, kind, name, namespace) {
    try {
      const response = await this.apiClient.get(
        `/applications/${appName}/resource`,
        {
          params: {
            name: name,
            namespace: namespace,
            resourceName: `${kind}:${name}`,
            version: 'v1',
            group: '',
            kind: kind
          }
        }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getResourcesByKind(appName, kind) {
    try {
      // Intentar obtener todos los recursos del tipo Pod
      const response = await this.apiClient.get(`/applications/${appName}/resource-tree`, {
        params: {
          name: appName
        }
      });
      
      const resources = [];
      const traverse = (node) => {
        if (node.kind === kind) {
          resources.push(node);
        }
        if (node.children) {
          node.children.forEach(child => traverse(child));
        }
      };

      if (Array.isArray(response.data)) {
        response.data.forEach(node => traverse(node));
      } else if (response.data) {
        traverse(response.data);
      }

      return resources;
    } catch (error) {
      return [];
    }
  }

  async getApplicationManifests(appName, revision = 'HEAD') {
    try {
      const response = await this.apiClient.get(`/applications/${appName}/manifests`, {
        params: { revision }
      });
      return response.data;
    } catch (error) {
      // No mostrar error aquí, se maneja en el llamador
      return null;
    }
  }

  extractPodsFromManifests(manifests) {
    const pods = [];
    
    if (!manifests || !manifests.manifests) {
      return pods;
    }

    for (const manifest of manifests.manifests) {
      try {
        const obj = JSON.parse(manifest);
        if (obj.kind === 'Pod') {
          pods.push({
            name: obj.metadata?.name,
            namespace: obj.metadata?.namespace,
            status: obj.status?.phase,
            ready: this.isPodReady(obj),
            containers: obj.spec?.containers?.length || 0,
            readyContainers: this.getReadyContainersCount(obj)
          });
        }
      } catch (e) {
        // Ignorar errores de parsing
      }
    }

    return pods;
  }

  extractPodsFromTree(tree) {
    const pods = [];
    
    if (!tree) {
      return pods;
    }

    const traverse = (node) => {
      if (!node) return;
      
      // Verificar si es un Pod
      if (node.kind === 'Pod') {
        const healthStatus = node.health?.status || 'Unknown';
        const syncStatus = node.status || node.health?.status || 'Unknown';
        
        // Determinar si está listo
        // En ArgoCD, un pod healthy generalmente significa que está listo
        let ready = false;
        if (healthStatus === 'Healthy' || syncStatus === 'Healthy') {
          ready = true;
        } else if (node.info) {
          // Intentar extraer información de estado del info array
          const readyInfo = node.info?.find(i => i.name === 'Status');
          if (readyInfo && readyInfo.value) {
            ready = readyInfo.value.toLowerCase().includes('running') || 
                    readyInfo.value.toLowerCase().includes('ready');
          }
        }
        
        pods.push({
          name: node.name,
          namespace: node.namespace || 'default',
          status: syncStatus,
          health: healthStatus,
          ready: ready,
          uid: node.uid,
          parent: node.parentRefs?.[0]?.name || node.parentRefs?.[0]?.kind || 'N/A'
        });
      }
      
      // Recorrer hijos
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverse(child));
      }
      
      // También verificar si hay nodos anidados de otra forma
      if (node.nodes && Array.isArray(node.nodes)) {
        node.nodes.forEach(child => traverse(child));
      }
    };

    // Manejar diferentes estructuras de respuesta
    if (Array.isArray(tree)) {
      tree.forEach(node => traverse(node));
    } else if (tree.nodes && Array.isArray(tree.nodes)) {
      tree.nodes.forEach(node => traverse(node));
    } else {
      traverse(tree);
    }

    return pods;
  }

  isPodReady(pod) {
    if (!pod.status || !pod.status.conditions) {
      return false;
    }
    
    const readyCondition = pod.status.conditions.find(
      condition => condition.type === 'Ready'
    );
    
    return readyCondition?.status === 'True';
  }

  getReadyContainersCount(pod) {
    if (!pod.status || !pod.status.containerStatuses) {
      return 0;
    }
    
    return pod.status.containerStatuses.filter(
      status => status.ready === true
    ).length;
  }

  findResourcesByKind(tree, kinds) {
    const resources = [];
    const kindsSet = new Set(kinds);

    const traverse = (node) => {
      if (!node) return;
      
      if (node.kind && kindsSet.has(node.kind)) {
        resources.push(node);
      }
      
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => traverse(child));
      }
      
      if (node.nodes && Array.isArray(node.nodes)) {
        node.nodes.forEach(child => traverse(child));
      }
    };

    if (Array.isArray(tree)) {
      tree.forEach(node => traverse(node));
    } else if (tree.nodes && Array.isArray(tree.nodes)) {
      tree.nodes.forEach(node => traverse(node));
    } else {
      traverse(tree);
    }

    return resources;
  }

  async getApplicationFullStatus(appName) {
    try {
      const response = await this.apiClient.get(`/applications/${appName}`);
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async monitor() {
    console.log('🚀 Iniciando monitoreo de ArgoCD...\n'.cyan);
    console.log(`📍 URL: ${this.baseURL}\n`.gray);

    const authenticated = await this.authenticate();
    if (!authenticated) {
      return;
    }

    const applications = await this.getApplications();
    
    if (applications.length === 0) {
      console.log('⚠️  No se encontraron aplicaciones'.yellow);
      return;
    }

    console.log(`📦 Se encontraron ${applications.length} aplicación(es)\n`.cyan);
    console.log('═'.repeat(80).gray);

    const summary = [];

    for (const app of applications) {
      const result = await this.monitorApplication(app);
      if (result) {
        summary.push(result);
      }
      console.log('═'.repeat(80).gray);
    }

    // Mostrar resumen final
    this.showSummary(summary);
  }

  showSummary(summary) {
    console.log('\n' + '═'.repeat(80).cyan);
    console.log('📊 RESUMEN GENERAL - CONteo de PODS por AMBIENTE'.brightCyan.bold);
    console.log('═'.repeat(80).cyan + '\n');

    if (summary.length === 0) {
      console.log('⚠️  No hay información de pods disponible'.yellow);
      return;
    }

    // Ordenar por nombre de aplicación
    summary.sort((a, b) => a.appName.localeCompare(b.appName));

    summary.forEach(item => {
      const statusIcon = item.notReady > 0 ? '⚠️ ' : '✅';
      const statusColor = item.notReady > 0 ? 'yellow' : 'green';
      const statusText = item.notReady > 0 ? ' (algunos pods no listos)' : ' (todos los pods listos)';
      
      console.log(`${statusIcon} ${item.appName}`.brightCyan);
      console.log(`   Total de pods: ${item.total}`.white);
      console.log(`   ✅ Pods listos: ${item.ready}`.green);
      if (item.notReady > 0) {
        console.log(`   ❌ Pods no listos: ${item.notReady}`.red);
      }
      console.log(`   Estado: ${item.appHealth}`.gray);
      console.log('');
    });

    // Totales generales
    const totalPods = summary.reduce((sum, item) => sum + item.total, 0);
    const totalReady = summary.reduce((sum, item) => sum + item.ready, 0);
    const totalNotReady = summary.reduce((sum, item) => sum + item.notReady, 0);

    console.log('═'.repeat(80).cyan);
    console.log('📈 TOTALES GENERALES:'.brightCyan.bold);
    console.log(`   Total de aplicaciones: ${summary.length}`.white);
    console.log(`   Total de pods: ${totalPods}`.white);
    console.log(`   ✅ Total pods listos: ${totalReady}`.green);
    if (totalNotReady > 0) {
      console.log(`   ❌ Total pods no listos: ${totalNotReady}`.red);
    }
    console.log('═'.repeat(80).cyan + '\n');
  }

  async monitorApplication(app) {
    const appName = app.metadata?.name;
    const namespace = app.metadata?.namespace || 'default';
    
    console.log(`\n📱 Aplicación: ${appName}`.brightCyan);
    console.log(`   Namespace: ${namespace}`.gray);
    console.log(`   Estado: ${app.status?.health?.status || 'Unknown'}`.gray);
    console.log(`   Sincronización: ${app.status?.sync?.status || 'Unknown'}\n`.gray);

    // Intentar obtener pods del árbol de recursos
    let pods = [];
    
    console.log('   🔍 Buscando pods...'.yellow);
    
    // Primero intentar con resource-tree
    const tree = await this.getApplicationTree(appName);
    if (tree) {
      // Debug: imprimir estructura si no hay pods
      pods = this.extractPodsFromTree(tree);
      
      // Si no encontramos pods pero hay tree, buscar Deployments/StatefulSets que contengan pods
      if (pods.length === 0 && tree) {
        // Buscar ReplicaSets o Deployments que pueden tener pods asociados
        const deployments = this.findResourcesByKind(tree, ['Deployment', 'StatefulSet', 'ReplicaSet', 'DaemonSet']);
        if (deployments.length > 0) {
          // Los pods reales vienen del estado del recurso, necesitamos consultar el estado actual
          console.log(`   ℹ️  Encontrados ${deployments.length} deployments/statefulsets, pero los pods se gestionan dinámicamente`.gray);
        }
      }
    }

    // Si no encontramos pods, intentar obtenerlos directamente por tipo
    if (pods.length === 0) {
      const podResources = await this.getResourcesByKind(appName, 'Pod');
      if (podResources && podResources.length > 0) {
        pods = podResources.map(node => ({
          name: node.name,
          namespace: node.namespace || 'default',
          status: node.status || node.health?.status || 'Unknown',
          health: node.health?.status || 'Unknown',
          ready: node.health?.status === 'Healthy',
          uid: node.uid
        }));
      }
    }

    // Si todavía no encontramos pods, intentar obtener el estado completo de la aplicación
    if (pods.length === 0) {
      const fullStatus = await this.getApplicationFullStatus(appName);
      if (fullStatus && fullStatus.status && fullStatus.status.resources) {
        // Los recursos pueden estar en status.resources
        const podResources = fullStatus.status.resources.filter(
          r => r.kind === 'Pod'
        );
        if (podResources.length > 0) {
          pods = podResources.map(r => ({
            name: r.name,
            namespace: r.namespace || 'default',
            status: r.health?.status || r.status || 'Unknown',
            health: r.health?.status || 'Unknown',
            ready: r.health?.status === 'Healthy',
            kind: r.kind
          }));
        }
      }
    }

    // Si todavía no encontramos pods, intentar con manifests (solo como último recurso)
    if (pods.length === 0) {
      try {
        const manifests = await this.getApplicationManifests(appName);
        if (manifests) {
          pods = this.extractPodsFromManifests(manifests);
        }
      } catch (e) {
        // Ignorar errores de manifests silenciosamente
      }
    }

    const readyPods = pods.filter(p => p.ready).length;
    const notReadyPods = pods.length - readyPods;

    if (pods.length === 0) {
      console.log('   ⚠️  No se encontraron pods para esta aplicación\n'.yellow);
      return {
        appName,
        namespace,
        total: 0,
        ready: 0,
        notReady: 0,
        appHealth: app.status?.health?.status || 'Unknown'
      };
    }

    console.log(`   📊 Resumen:`.white);
    console.log(`      Total de pods: ${pods.length}`.white);
    console.log(`      ✅ Pods listos: ${readyPods}`.green);
    console.log(`      ❌ Pods no listos: ${notReadyPods}`.red);
    console.log(`\n   📋 Detalle de pods:`.white);

    pods.forEach(pod => {
      const statusIcon = pod.ready ? '✅' : '❌';
      const statusText = pod.ready ? 'LISTO'.green : 'NO LISTO'.red;
      console.log(`      ${statusIcon} ${pod.name}`.white);
      console.log(`         Namespace: ${pod.namespace}`.gray);
      console.log(`         Estado: ${statusText}`);
      if (pod.containers) {
        console.log(`         Containers: ${pod.readyContainers}/${pod.containers}`.gray);
      }
      if (pod.parent && pod.parent !== 'N/A') {
        console.log(`         Parent: ${pod.parent}`.gray);
      }
      console.log('');
    });

    return {
      appName,
      namespace,
      total: pods.length,
      ready: readyPods,
      notReady: notReadyPods,
      appHealth: app.status?.health?.status || 'Unknown'
    };
  }
}

// Función para ejecutar el monitoreo
async function runMonitoring() {
  try {
    const timestamp = new Date().toLocaleString('es-ES', { 
      timeZone: 'America/Santo_Domingo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    console.log('\n' + '═'.repeat(80).brightBlue);
    console.log(`🕐 Ejecutando monitoreo - ${timestamp}`.brightBlue.bold);
    console.log('═'.repeat(80).brightBlue + '\n');
    
    const monitor = new ArgoCDMonitor(ARGOCD_URL, USERNAME, PASSWORD);
    await monitor.monitor();
    
    console.log(`\n✅ Monitoreo completado a las ${timestamp}\n`.gray);
  } catch (error) {
    console.error('❌ Error fatal:'.red, error);
    throw error;
  }
}

// Verificar si se ejecuta una sola vez o en modo monitoreo continuo
const args = process.argv.slice(2);
const runOnce = args.includes('--once');

if (runOnce) {
  // Ejecutar una sola vez
  runMonitoring().catch(error => {
    console.error('❌ Error fatal:'.red, error);
    process.exit(1);
  });
} else {
  // Ejecutar cada minuto usando cron
  console.log('🔄 Modo monitoreo continuo activado'.cyan.bold);
  console.log('⏰ Se ejecutará cada minuto\n'.cyan);
  console.log('💡 Para ejecutar una sola vez, usa: npm run once\n'.gray);
  
  // Ejecutar inmediatamente al inicio
  runMonitoring();
  
  // Programar para ejecutar cada minuto
  cron.schedule('* * * * *', () => {
    runMonitoring();
  });
  
  console.log('✅ Monitoreo programado. Presiona Ctrl+C para detener.\n'.green);
  
  // Mantener el proceso vivo
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Deteniendo monitoreo...'.yellow);
    process.exit(0);
  });
}


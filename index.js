import axios from 'axios';
import colors from 'colors';
import cron from 'node-cron';

const ARGOCD_URL = process.env.ARGOCD_URL || 'https://argocd.alproyect.store';
const USERNAME = process.env.ARGOCD_USERNAME || 'admin';
const PASSWORD = process.env.ARGOCD_PASSWORD || 'QTSK97LQXPeIekdt';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL || '';

// Configuración de notificaciones Slack
const SLACK_CONFIG = {
  notifyOnErrors: true,        // Notificar errores (autenticación, fatales)
  notifyOnUnreadyPods: true,   // Notificar cuando hay pods no listos (problemas)
  notifyOnPodDeaths: true,     // Notificar cuando pods mueren o desaparecen
  notifyOnAppDegraded: true,   // Notificar cuando aplicación está Degraded
  notifyOnAppOutOfSync: true,  // Notificar cuando aplicación está OutOfSync
  notifyOnAppMissing: true,    // Notificar cuando aplicación está Missing
  notifyOnAppSuspended: true,  // Notificar cuando aplicación está Suspended
  notifySummaryHourly: true,   // Enviar resumen cada hora (incluso si todo está bien)
  notifySummaryAlways: false   // NO enviar cada minuto (solo alertas + resumen horario)
};

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
    // Almacenar estado anterior para detectar pods que mueren
    this.previousPodStates = new Map(); // appName -> Set de pod UIDs
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
      
      // Enviar alerta a Slack sobre error de autenticación
      this.sendSlackNotification(
        `🚨 *Error de Autenticación ArgoCD*\n` +
        `No se pudo autenticar con ArgoCD.\n` +
        `Error: ${error.message || 'Desconocido'}`
      );
      
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

    // Filtrar aplicaciones excluidas
    const excludedApps = ['video-api-r36-prd'];
    const filteredApplications = applications.filter(app => {
      const appName = app.metadata?.name;
      const shouldExclude = appName && excludedApps.includes(appName);
      if (shouldExclude) {
        console.log(`⏭️  Excluyendo aplicación: ${appName}`.gray);
      }
      return !shouldExclude;
    });

    console.log(`📦 Se encontraron ${applications.length} aplicación(es) (${filteredApplications.length} después de filtrar ${excludedApps.join(', ')})\n`.cyan);
    console.log('═'.repeat(80).gray);

    const summary = [];

    for (const app of filteredApplications) {
      const result = await this.monitorApplication(app);
      if (result) {
        summary.push(result);
        
        // Enviar alertas por problemas detectados
        if (result.deadPods > 0 && SLACK_CONFIG.notifyOnPodDeaths) {
          console.log(`💀 ALERTA: ${result.deadPods} pod(s) murieron en ${result.appName}`.red.bold);
          await this.sendPodDeathAlert(result.appName, result.deadPodsList, result.total);
        }
        
        // Alertas por estados de ArgoCD (solo críticas, OutOfSync solo si hay otros problemas)
        if (result.hasCriticalProblems || result.isOutOfSyncCritical) {
          await this.sendArgoCDStatusAlert(result);
        }
      }
      console.log('═'.repeat(80).gray);
    }

    // Mostrar resumen final
    await this.showSummary(summary);
  }

  async sendSlackNotification(message, blocks = null) {
    if (!SLACK_WEBHOOK_URL) {
      console.warn('⚠️  SLACK_WEBHOOK_URL no está configurado. Las notificaciones no se enviarán.'.yellow);
      return;
    }

    try {
      const payload = blocks ? { blocks } : { text: message };
      
      const response = await axios.post(SLACK_WEBHOOK_URL, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log('✅ Notificación enviada a Slack exitosamente'.green);
      }
    } catch (error) {
      console.error('❌ Error al enviar notificación a Slack:'.red);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`.red);
        console.error(`   Data:`, error.response.data);
      } else {
        console.error(`   Mensaje: ${error.message}`.red);
      }
      // No lanzar error, solo loguear para que no interrumpa el monitoreo
    }
  }

  formatSlackSummary(summary) {
    if (!summary || summary.length === 0) {
      return null;
    }

    // Ordenar por nombre de aplicación
    summary.sort((a, b) => a.appName.localeCompare(b.appName));

    // Separar aplicaciones con problemas y sin problemas
    const appsWithIssues = summary.filter(item => item.notReady > 0);
    const appsHealthy = summary.filter(item => item.notReady === 0);

    // Totales generales
    const totalPods = summary.reduce((sum, item) => sum + item.total, 0);
    const totalReady = summary.reduce((sum, item) => sum + item.ready, 0);
    const totalNotReady = summary.reduce((sum, item) => sum + item.notReady, 0);
    const totalDeadPods = summary.reduce((sum, item) => sum + (item.deadPods || 0), 0);

    const timestamp = new Date().toLocaleString('es-ES', {
      timeZone: 'America/Santo_Domingo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Verificar problemas de estado ArgoCD
    const appsWithArgoCDProblems = summary.filter(item => item.hasProblems);
    const totalDegraded = summary.filter(item => item.isDegraded).length;
    const totalOutOfSync = summary.filter(item => item.isOutOfSync).length;
    const totalMissing = summary.filter(item => item.isMissing).length;
    const totalSuspended = summary.filter(item => item.isSuspended).length;

    // Determinar estado general
    const hasIssues = totalNotReady > 0 || totalDeadPods > 0 || appsWithArgoCDProblems.length > 0;
    const statusEmoji = hasIssues ? '⚠️' : '✅';
    const statusText = hasIssues ? 'Con Problemas' : 'Todo OK';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Monitoreo ArgoCD - ${statusText}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📅 ${timestamp}`
          }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*📊 RESUMEN GENERAL*'
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*📦 Total Aplicaciones:*\n${summary.length}`
          },
          {
            type: 'mrkdwn',
            text: `*🎯 Total Pods:*\n${totalPods}`
          },
          {
            type: 'mrkdwn',
            text: `*✅ Pods Listos:*\n${totalReady}`
          },
          {
            type: 'mrkdwn',
            text: `*❌ Pods No Listos:*\n${totalNotReady}`
          },
          {
            type: 'mrkdwn',
            text: `*💀 Pods Muertos:*\n${totalDeadPods || 0}`
          },
          {
            type: 'mrkdwn',
            text: `*🔴 Apps Degraded:*\n${totalDegraded || 0}`
          },
          {
            type: 'mrkdwn',
            text: `*🟡 Apps OutOfSync (crítico):*\n${totalOutOfSync || 0}`
          }
        ]
      }
    ];

    // Si hay problemas, mostrar sección destacada
    const appsWithDeadPods = summary.filter(item => (item.deadPods || 0) > 0);
    
    if (appsWithIssues.length > 0 || appsWithDeadPods.length > 0 || appsWithArgoCDProblems.length > 0) {
      blocks.push({
        type: 'divider'
      });
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*🚨 ALERTAS - Aplicaciones con Problemas*`
        }
      });
      
      // Agrupar aplicaciones con problemas
      let issuesText = '';
      
      // Pods muertos (prioridad alta)
      if (appsWithDeadPods.length > 0) {
        issuesText += appsWithDeadPods.map(app => {
          return `💀 *${app.appName}*\n   • Pods muertos/desaparecidos: ${app.deadPods}\n   • Pods actuales: ${app.total}`;
        }).join('\n\n');
        if (appsWithIssues.length > 0) {
          issuesText += '\n\n';
        }
      }
      
      // Pods no listos
      if (appsWithIssues.length > 0) {
        issuesText += appsWithIssues.map(app => {
          const percentage = ((app.ready / app.total) * 100).toFixed(0);
          return `⚠️ *${app.appName}*\n   • Listos: ${app.ready}/${app.total} (${percentage}%)\n   • No listos: ${app.notReady} pods`;
        }).join('\n\n');
        if (appsWithArgoCDProblems.length > 0 || appsWithDeadPods.length > 0) {
          issuesText += '\n\n';
        }
      }

      // Problemas de estado ArgoCD (solo críticos)
      if (appsWithArgoCDProblems.length > 0) {
        issuesText += appsWithArgoCDProblems.map(app => {
          const problems = [];
          if (app.isDegraded) problems.push('🔴 Degraded');
          if (app.isOutOfSyncCritical) problems.push('🟡 OutOfSync (crítico)'); // Solo si es crítico
          if (app.isMissing) problems.push('⚠️ Missing');
          if (app.isSuspended) problems.push('⏸️ Suspended');
          return `🚨 *${app.appName}*\n   • Health: ${app.appHealth}\n   • Sync: ${app.syncStatus}\n   • Problemas críticos: ${problems.join(', ')}`;
        }).join('\n\n');
      }

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: issuesText
        }
      });
    }

    // Mostrar aplicaciones saludables en una sección separada
    if (appsHealthy.length > 0) {
      blocks.push({
        type: 'divider'
      });
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*✅ Aplicaciones Saludables (${appsHealthy.length})*`
        }
      });

      // Formatear aplicaciones saludables de forma compacta pero legible
      const appsList = appsHealthy.map(item => `✅ *${item.appName}*: ${item.ready}/${item.total}`);
      const chunkSize = 10; // Aplicaciones por bloque
      
      for (let i = 0; i < appsList.length; i += chunkSize) {
        const chunk = appsList.slice(i, i + chunkSize);
        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: chunk.join('\n')
          }
        });
      }
    }

    return blocks;
  }

  async showSummary(summary) {
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
      if (item.deadPods > 0) {
        console.log(`   💀 Pods muertos/desaparecidos: ${item.deadPods}`.red.bold);
      }
      // Mostrar estado de salud con colores
      let healthColor = 'gray';
      if (item.appHealth === 'Degraded') healthColor = 'red';
      else if (item.appHealth === 'Healthy') healthColor = 'green';
      else if (item.appHealth === 'Missing') healthColor = 'yellow';
      else if (item.appHealth === 'Suspended') healthColor = 'magenta';
      
      const healthIcon = item.appHealth === 'Degraded' ? '🔴' : 
                        item.appHealth === 'Healthy' ? '✅' : 
                        item.appHealth === 'Missing' ? '⚠️' : 
                        item.appHealth === 'Suspended' ? '⏸️' : '❓';
      
      console.log(`   ${healthIcon} Health: ${item.appHealth || 'Unknown'}`[healthColor]);
      const syncDisplay = item.syncStatus && item.syncStatus !== 'Unknown' 
        ? (item.syncStatus === 'OutOfSync' ? '🟡 OutOfSync' : '✅ ' + item.syncStatus)
        : '❓ Unknown';
      console.log(`   Sync: ${syncDisplay}`.gray);
      console.log('');
    });

    // Totales generales
    const totalPods = summary.reduce((sum, item) => sum + item.total, 0);
    const totalReady = summary.reduce((sum, item) => sum + item.ready, 0);
    const totalNotReady = summary.reduce((sum, item) => sum + item.notReady, 0);
    const totalDeadPods = summary.reduce((sum, item) => sum + (item.deadPods || 0), 0);

    console.log('═'.repeat(80).cyan);
    console.log('📈 TOTALES GENERALES:'.brightCyan.bold);
    console.log(`   Total de aplicaciones: ${summary.length}`.white);
    console.log(`   Total de pods: ${totalPods}`.white);
    console.log(`   ✅ Total pods listos: ${totalReady}`.green);
    if (totalNotReady > 0) {
      console.log(`   ❌ Total pods no listos: ${totalNotReady}`.red);
    }
    if (totalDeadPods > 0) {
      console.log(`   💀 Total pods muertos: ${totalDeadPods}`.red.bold);
    }
    console.log('═'.repeat(80).cyan + '\n');

    // Enviar notificación a Slack
    const slackBlocks = this.formatSlackSummary(summary);
    if (slackBlocks) {
      const totalNotReady = summary.reduce((sum, item) => sum + item.notReady, 0);
      
      // Enviar notificación según configuración
      const totalDeadPods = summary.reduce((sum, item) => sum + (item.deadPods || 0), 0);
      
      if (totalNotReady > 0 && SLACK_CONFIG.notifyOnUnreadyPods) {
        // ALERTA INMEDIATA: Hay pods no listos (problema detectado)
        console.log('🚨 ALERTA: Enviando notificación a Slack por pods no listos...'.yellow.bold);
        await this.sendSlackNotification(null, slackBlocks);
      } else if (totalDeadPods > 0 && SLACK_CONFIG.notifyOnPodDeaths) {
        // ALERTA INMEDIATA: Hay pods que murieron (ya se enviaron alertas individuales)
        // Esta es una alerta adicional con resumen si hay múltiples apps afectadas
        console.log('💀 ALERTA: Pods muertos detectados en múltiples aplicaciones'.red.bold);
        await this.sendSlackNotification(null, slackBlocks);
      } else if (SLACK_CONFIG.notifySummaryAlways) {
        // Opción de enviar cada minuto (generalmente deshabilitado)
        console.log('📤 Enviando resumen a Slack...'.cyan);
        await this.sendSlackNotification(null, slackBlocks);
      }
      // Si todo está bien y notifySummaryAlways=false, no se envía nada aquí
      // El resumen horario se maneja en el cron job separado
    } else {
      console.warn('⚠️  No se pudo generar el formato de notificación para Slack'.yellow);
    }
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

    // Detectar pods que murieron o desaparecieron
    const deadPods = this.detectDeadPods(appName, pods);

    // Obtener estados de ArgoCD
    const appHealth = app.status?.health?.status || 'Unknown';
    const syncStatus = app.status?.sync?.status || 'Unknown';
    const isDegraded = appHealth === 'Degraded';
    const isOutOfSync = syncStatus === 'OutOfSync';
    const isMissing = appHealth === 'Missing';
    const isSuspended = app.status?.operationState?.phase === 'Suspended' || appHealth === 'Suspended';
    
    // OutOfSync solo es crítico si hay otros problemas (pods no listos, degraded, etc.)
    // Si solo está OutOfSync pero todo está healthy, no se considera problema crítico (para evitar spam)
    const hasCriticalProblems = isDegraded || isMissing || isSuspended || notReadyPods > 0;
    const isOutOfSyncCritical = isOutOfSync && hasCriticalProblems;
    
    // hasProblems incluye OutOfSync solo si es crítico, las demás siempre son problemas
    const hasProblems = hasCriticalProblems || isOutOfSyncCritical;

    return {
      appName,
      namespace,
      total: pods.length,
      ready: readyPods,
      notReady: notReadyPods,
      appHealth,
      syncStatus,
      isDegraded,
      isOutOfSync,
      isOutOfSyncCritical,
      isMissing,
      isSuspended,
      hasProblems,
      hasCriticalProblems,
      deadPods: deadPods.length,
      deadPodsList: deadPods
    };
  }

  detectDeadPods(appName, currentPods) {
    if (!SLACK_CONFIG.notifyOnPodDeaths) {
      return [];
    }

    const currentPodUids = new Set(
      currentPods
        .filter(p => p.uid)
        .map(p => p.uid)
    );

    // Obtener estado anterior
    const previousUids = this.previousPodStates.get(appName) || new Set();

    // Detectar pods que desaparecieron (estaban antes pero ya no están)
    const deadPodsUids = [...previousUids].filter(uid => !currentPodUids.has(uid));

    // Actualizar estado anterior con el actual
    this.previousPodStates.set(appName, currentPodUids);

    // Si es la primera vez que monitoreamos esta app, no hay pods muertos
    if (previousUids.size === 0) {
      return [];
    }

    return deadPodsUids;
  }

  async sendPodDeathAlert(appName, deadPods, currentPodsCount) {
    if (deadPods.length === 0 || !SLACK_CONFIG.notifyOnPodDeaths) {
      return;
    }

    const timestamp = new Date().toLocaleString('es-ES', {
      timeZone: 'America/Santo_Domingo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `💀 ALERTA: Pods Muertos/Desaparecidos - ${appName}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📅 ${timestamp}`
          }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `🚨 *${deadPods.length} pod(s) han muerto o desaparecido* en la aplicación *${appName}*`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Aplicación:*\n${appName}`
          },
          {
            type: 'mrkdwn',
            text: `*Pods actuales:*\n${currentPodsCount}`
          },
          {
            type: 'mrkdwn',
            text: `*Pods muertos:*\n${deadPods.length}`
          },
          {
            type: 'mrkdwn',
            text: `*Estado:*\n⚠️ Requiere atención`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Los pods han desaparecido del sistema. Esto puede indicar:\n• Fallo crítico del pod\n• Reinicio forzado\n• Problemas de recursos\n• Eliminación manual`
        }
      }
    ];

    await this.sendSlackNotification(null, blocks);
  }

  async sendArgoCDStatusAlert(result) {
    if (!result.hasCriticalProblems && !result.isOutOfSyncCritical) {
      return;
    }

    const issues = [];
    if (result.isDegraded && SLACK_CONFIG.notifyOnAppDegraded) {
      issues.push('Degraded');
    }
    // OutOfSync solo se incluye si es crítico (hay otros problemas)
    if (result.isOutOfSyncCritical && SLACK_CONFIG.notifyOnAppOutOfSync) {
      issues.push('OutOfSync (con problemas críticos)');
    }
    if (result.isMissing && SLACK_CONFIG.notifyOnAppMissing) {
      issues.push('Missing');
    }
    if (result.isSuspended && SLACK_CONFIG.notifyOnAppSuspended) {
      issues.push('Suspended');
    }

    if (issues.length === 0) {
      return;
    }

    const timestamp = new Date().toLocaleString('es-ES', {
      timeZone: 'America/Santo_Domingo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const statusEmoji = result.isDegraded ? '🔴' : result.isOutOfSync ? '🟡' : result.isMissing ? '⚠️' : '⏸️';
    const statusText = issues.join(', ');

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${statusEmoji} Alerta de Estado ArgoCD - ${result.appName}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `📅 ${timestamp}`
          }
        ]
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *La aplicación ${result.appName} tiene problemas de estado en ArgoCD*`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Aplicación:*\n${result.appName}`
          },
          {
            type: 'mrkdwn',
            text: `*Namespace:*\n${result.namespace}`
          },
          {
            type: 'mrkdwn',
            text: `*Health Status:*\n${result.appHealth === 'Degraded' ? '🔴 Degraded' : result.appHealth === 'Missing' ? '⚠️ Missing' : result.appHealth === 'Suspended' ? '⏸️ Suspended' : result.appHealth}`
          },
          {
            type: 'mrkdwn',
            text: `*Sync Status:*\n${result.syncStatus === 'OutOfSync' ? '🟡 OutOfSync' : result.syncStatus || 'Unknown'}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Problemas detectados:*\n${issues.map(issue => `• ${issue}`).join('\n')}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Pods totales:*\n${result.total}`
          },
          {
            type: 'mrkdwn',
            text: `*Pods listos:*\n${result.ready}`
          },
          {
            type: 'mrkdwn',
            text: `*Pods no listos:*\n${result.notReady || 0}`
          },
          {
            type: 'mrkdwn',
            text: `*Pods muertos:*\n${result.deadPods || 0}`
          }
        ]
      }
    ];

    console.log(`🚨 ALERTA: Estado problemático detectado en ${result.appName}: ${statusText}`.yellow.bold);
    await this.sendSlackNotification(null, blocks);
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
    
    // Enviar alerta a Slack sobre error fatal
    const monitor = new ArgoCDMonitor(ARGOCD_URL, USERNAME, PASSWORD);
    await monitor.sendSlackNotification(
      `🚨 *Error Fatal en Monitoreo ArgoCD*\n` +
      `Error: ${error.message || 'Desconocido'}\n` +
      `Stack: ${error.stack ? error.stack.substring(0, 500) : 'N/A'}`
    );
    
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

  // Programar resumen cada hora (si está configurado)
  if (SLACK_CONFIG.notifySummaryHourly) {
    cron.schedule('0 * * * *', async () => {
      try {
        console.log('\n📧 Generando resumen horario para Slack...'.cyan);
        const monitor = new ArgoCDMonitor(ARGOCD_URL, USERNAME, PASSWORD);
        const authenticated = await monitor.authenticate();
        if (authenticated) {
          // Filtrar aplicaciones excluidas
          const excludedApps = ['video-api-r36-prd'];
          const applications = await monitor.getApplications();
          const filteredApplications = applications.filter(app => {
            const appName = app.metadata?.name;
            return appName && !excludedApps.includes(appName);
          });

          const summary = [];
          for (const app of filteredApplications) {
            const result = await monitor.monitorApplication(app);
            if (result) {
              summary.push(result);
            }
          }
          const slackBlocks = monitor.formatSlackSummary(summary);
          if (slackBlocks) {
            await monitor.sendSlackNotification(null, slackBlocks);
            console.log('✅ Resumen horario enviado a Slack\n'.green);
          }
        }
      } catch (error) {
        console.error('❌ Error al enviar resumen horario:'.red, error.message);
        // Enviar alerta sobre el error
        const monitor = new ArgoCDMonitor(ARGOCD_URL, USERNAME, PASSWORD);
        await monitor.sendSlackNotification(
          `🚨 *Error al generar resumen horario*\nError: ${error.message}`
        );
      }
    });
    console.log('📧 Resumen horario a Slack activado (cada hora)\n'.cyan);
  }
  
  console.log('✅ Monitoreo programado. Presiona Ctrl+C para detener.\n'.green);
  
  // Mantener el proceso vivo
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Deteniendo monitoreo...'.yellow);
    process.exit(0);
  });
}


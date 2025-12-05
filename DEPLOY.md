# 🚀 Guía de Despliegue en Servidor

## 📍 Estado Actual

**El monitoreo está corriendo en tu Mac local:**
- Hostname: MacBook-Pro-de-Edward.local
- Usuario: edward
- Ruta: `/Users/edward/Proyectos/RQ/RQI-Monitoreo RD`

## 🔄 Mover a un Servidor Remoto

### Opción 1: Despliegue Automático (Recomendado)

1. **Usa el script de despliegue:**
```bash
chmod +x deploy.sh
./deploy.sh usuario@servidor
```

Ejemplo:
```bash
./deploy.sh edward@192.168.1.100
# o
./deploy.sh root@mi-servidor.com
```

El script:
- ✅ Transfiere todos los archivos
- ✅ Instala dependencias
- ✅ Configura PM2
- ✅ Inicia el servicio
- ✅ Configura inicio automático

### Opción 2: Despliegue Manual

#### Paso 1: Transferir archivos al servidor

```bash
# Usando SCP
scp -r . usuario@servidor:~/rqi-monitoreo-argocd

# O usando rsync (mejor para actualizaciones)
rsync -avz --exclude 'node_modules' --exclude 'logs' \
    ./ usuario@servidor:~/rqi-monitoreo-argocd/
```

#### Paso 2: Conectarse al servidor

```bash
ssh usuario@servidor
cd ~/rqi-monitoreo-argocd
```

#### Paso 3: Instalar dependencias

```bash
# Instalar Node.js (si no está instalado)
# Ubuntu/Debian:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL:
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Instalar PM2
npm install -g pm2

# Instalar dependencias del proyecto
npm install
```

#### Paso 4: Configurar y ejecutar

```bash
# Crear directorio de logs
mkdir -p logs

# Iniciar el servicio
pm2 start ecosystem.config.cjs

# Ver estado
pm2 status

# Configurar inicio automático
pm2 startup
# Copia y ejecuta el comando que te muestre
pm2 save
```

### Opción 3: Usando Docker (Próximamente)

Si prefieres usar Docker, puedo crear un Dockerfile.

## 📋 Verificar Despliegue

```bash
# En el servidor, verificar logs
pm2 logs rqi-monitoreo-argocd --lines 50

# Ver estado
pm2 status

# Verificar que se ejecuta cada minuto
# Espera 1-2 minutos y revisa los logs nuevamente
```

## 🔧 Requisitos del Servidor

- **Node.js**: versión 18 o superior
- **npm**: viene con Node.js
- **Conexión a internet**: para conectarse a ArgoCD
- **Acceso al servidor de ArgoCD**: `https://argocd.alproyect.store`

## 🌐 Múltiples Servidores

Si quieres monitorear desde múltiples servidores, solo necesitas:
1. Repetir el proceso en cada servidor
2. El mismo código funcionará en todos

## ⚠️ Importante

- Asegúrate de que el servidor tenga acceso a `https://argocd.alproyect.store`
- Si hay firewall, permite las conexiones HTTPS salientes
- Verifica que las credenciales en `index.js` sean correctas


# 🚂 Desplegar en Railway - Instrucciones

## ✅ Código ya está en GitHub

Repositorio: `https://github.com/rebel-quest-interactive/rq-monitoring-argo`

## 🚀 Pasos para Desplegar en Railway

### 1. Ir a Railway
Abre: https://railway.app

### 2. Login
- Haz clic en "Login"
- Selecciona "Continue with GitHub"
- Autoriza Railway para acceder a tus repos

### 3. Crear Nuevo Proyecto
- Haz clic en "New Project"
- Selecciona "Deploy from GitHub repo"

### 4. Conectar Repositorio
- Busca: `rebel-quest-interactive/rq-monitoring-argo`
- O busca: `rq-monitoring-argo`
- Selecciona el repositorio

### 5. Configurar (Automático)
Railway detectará automáticamente:
- ✅ Es un proyecto Node.js
- ✅ Usará `npm install` para instalar dependencias
- ✅ Usará `node index.js` para iniciar

**No necesitas cambiar nada**, Railway lo hace automáticamente.

### 6. Esperar el Despliegue
- Railway empezará a construir el proyecto
- Esto toma 1-2 minutos
- Verás el progreso en la pantalla

### 7. Verificar Logs
1. Haz clic en tu servicio
2. Ve a la pestaña "Logs"
3. Espera 1-2 minutos
4. Deberías ver:
   ```
   🚀 Iniciando monitoreo de ArgoCD...
   🔐 Autenticando con ArgoCD...
   ✅ Autenticación exitosa
   🕐 Ejecutando monitoreo - ...
   📊 RESUMEN GENERAL - CONteo de PODS por AMBIENTE
   ```

## ✅ Verificación

Si ves los logs mostrando el monitoreo ejecutándose cada minuto, **¡está funcionando perfectamente!**

El servicio estará corriendo 24/7 y ejecutándose cada minuto automáticamente.

## 📊 Monitoreo

- **Costo**: Gratis (Railway da $5 de crédito/mes)
- **Uptime**: 24/7
- **Logs**: Disponibles en el dashboard de Railway
- **Actualizaciones**: Automáticas cuando haces push a GitHub

## 🔗 Enlaces Útiles

- **GitHub**: https://github.com/rebel-quest-interactive/rq-monitoring-argo
- **Railway Dashboard**: https://railway.app/dashboard


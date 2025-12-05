# 🚂 Despliegue en Railway.app (GRATIS y RÁPIDO)

Railway ofrece $5 de crédito gratis al mes, suficiente para ejecutar este monitoreo.

## 🚀 Pasos para Desplegar (5 minutos)

### 1. Crear cuenta en Railway
1. Ve a: https://railway.app
2. Haz clic en "Login" → "Start a New Project"
3. Inicia sesión con GitHub (recomendado) o email

### 2. Crear nuevo proyecto
1. Haz clic en "New Project"
2. Selecciona "Deploy from GitHub repo" (si tienes el código en GitHub)
   O selecciona "Empty Project" y luego "Add Service" → "GitHub Repo"

### 3. Si NO tienes el código en GitHub:
**Opción A: Subir directo a Railway**
1. Selecciona "Empty Project"
2. Haz clic en "Add Service" → "GitHub Repo"
3. Si no tienes repo, primero súbelo a GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin TU_REPO_GITHUB_URL
   git push -u origin main
   ```

**Opción B: Arrastrar y soltar (más rápido)**
1. Ve a: https://railway.app/new
2. Selecciona "Empty Project"
3. En el servicio, haz clic en los 3 puntos → "Settings"
4. En "Source" haz clic en "Connect GitHub Repo" o usa "Deploy from local directory"

### 4. Configurar el servicio
1. Railway detectará automáticamente que es Node.js
2. No necesitas cambiar nada, todo funciona automáticamente
3. El servicio se iniciará automáticamente

### 5. Ver logs
1. En el dashboard de Railway, haz clic en tu servicio
2. Ve a la pestaña "Deployments"
3. Haz clic en el deployment más reciente
4. Verás los logs en tiempo real

## ✅ Verificación

El monitoreo se ejecutará cada minuto automáticamente. Para verificar:

1. Ve a la pestaña "Logs" en Railway
2. Espera 1-2 minutos
3. Deberías ver mensajes como:
   ```
   🕐 Ejecutando monitoreo - ...
   📊 RESUMEN GENERAL - CONteo de PODS por AMBIENTE
   ```

## 📊 Monitoreo del Servicio

- **Costo**: Gratis (hasta $5 de crédito/mes)
- **Uptime**: 24/7
- **Logs**: Disponibles en el dashboard
- **Estado**: Puedes ver el estado en el dashboard

## 🔧 Si algo falla

1. **Ver logs de error**: Dashboard → Service → Deployments → Logs
2. **Reiniciar**: Dashboard → Service → Settings → Restart
3. **Verificar variables**: No necesitas variables de entorno para este proyecto

## 💰 Costos

Railway da $5 gratis al mes, que es suficiente para:
- Este servicio de monitoreo (muy bajo consumo)
- Aproximadamente 100 horas de ejecución

## 🎯 Ventajas de Railway

- ✅ Gratis hasta $5/mes
- ✅ Despliegue automático desde GitHub
- ✅ Logs en tiempo real
- ✅ Escalado automático
- ✅ HTTPS automático (si necesitas un endpoint)


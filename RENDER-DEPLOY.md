# 🎨 Despliegue en Render.com (GRATIS - Alternativa)

Render ofrece plan gratuito (se suspende después de 15 min de inactividad, pero se reactiva automáticamente).

## 🚀 Pasos Rápidos

### 1. Crear cuenta
1. Ve a: https://render.com
2. "Get Started for Free"
3. Inicia sesión con GitHub

### 2. Crear Web Service
1. Dashboard → "New +" → "Web Service"
2. Conecta tu repositorio de GitHub
3. O sube el código primero a GitHub

### 3. Configurar
- **Name**: `rqi-monitoreo-argocd`
- **Region**: Elige la más cercana
- **Branch**: `main`
- **Root Directory**: (dejar vacío)
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `node index.js`
- **Plan**: **Free**

### 4. Desplegar
1. Haz clic en "Create Web Service"
2. Espera a que termine el build
3. El servicio estará corriendo

## ⚠️ Limitación del Plan Gratuito

El servicio se "duerme" después de 15 minutos de inactividad, pero:
- Se reactiva automáticamente cuando hay tráfico
- Con el cron interno ejecutándose cada minuto, se mantendrá activo

## 📊 Logs

Dashboard → Tu servicio → "Logs"


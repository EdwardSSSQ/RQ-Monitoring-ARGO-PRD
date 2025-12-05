# 🚀 Monitoreo de ArgoCD - RQI

Monitoreo automático de aplicaciones y pods en ArgoCD con notificaciones a Slack.

## 🚀 Instalación

```bash
npm install
```

## ⚙️ Configuración

Copia `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

Variables requeridas:
- `SLACK_WEBHOOK_URL` - Webhook de Slack para notificaciones

Variables opcionales:
- `ARGOCD_URL` - URL de ArgoCD (default: https://argocd.alproyect.store)
- `ARGOCD_USERNAME` - Usuario de ArgoCD (default: admin)
- `ARGOCD_PASSWORD` - Contraseña de ArgoCD

## 🏃 Uso

### Ejecución única:
```bash
npm run once
```

### Monitoreo continuo (cada minuto):
```bash
npm start
```

## 🔔 Notificaciones Slack

El monitoreo envía notificaciones automáticamente cuando:
- Hay pods no listos (inmediato)
- Ocurren errores de autenticación o fatales
- Resumen horario (si está habilitado)

## 📦 Desplegar en Railway

1. Sube el código a GitHub
2. Ve a https://railway.app
3. Crea nuevo proyecto → Deploy from GitHub repo
4. Configura la variable `SLACK_WEBHOOK_URL` en Variables
5. ¡Listo!

## 📊 Salida

El monitoreo muestra:
- Lista de todas las aplicaciones/ambientes
- Conteo de pods por aplicación
- Estado de cada pod (listo/no listo)
- Resumen general al final
- Notificaciones en Slack cuando hay problemas

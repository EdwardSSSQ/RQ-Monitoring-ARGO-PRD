# 🔔 Notificaciones de Slack

## ✅ Configurado

El monitoreo ahora envía notificaciones a Slack automáticamente.

**Webhook**: Configurado mediante variable de entorno `SLACK_WEBHOOK_URL`

## 📋 Tipos de Notificaciones

### 1. Alertas de Pods No Listos (Inmediato)
Cuando hay pods que no están listos, se envía una notificación inmediata con:
- Resumen general
- Lista de aplicaciones afectadas
- Detalle de cada aplicación con pods problemáticos

### 2. Errores de Autenticación
Si falla la autenticación con ArgoCD, se envía una alerta.

### 3. Errores Fatales
Si ocurre un error crítico en el monitoreo, se envía una alerta con detalles.

### 4. Resumen Horario (Opcional)
Cada hora se envía un resumen completo del estado, incluso si todo está bien.

## ⚙️ Configuración

En `index.js` puedes ajustar las notificaciones:

```javascript
const SLACK_CONFIG = {
  notifyOnErrors: true,        // Notificar errores
  notifyOnUnreadyPods: true,   // Notificar cuando hay pods no listos
  notifySummaryHourly: true,   // Enviar resumen cada hora
  notifySummaryAlways: false   // Enviar resumen en cada ejecución
};
```

## 📊 Formato de Notificaciones

Las notificaciones incluyen:
- ✅ Header con timestamp
- 📊 Métricas generales (total aplicaciones, pods, etc.)
- ⚠️ Lista de aplicaciones con problemas
- 📋 Detalle completo de todas las aplicaciones

## 🔍 Ejemplo de Notificación

```
✅ Monitoreo ArgoCD - 05/12/2025, 00:18:28

Total Aplicaciones: 11
Total Pods: 55
✅ Pods Listos: 55
❌ Pods No Listos: 0

Detalle por Aplicación:
✅ lotobet-rqi-api: 10/10 listos
✅ lotobet-rqi-orchestrator: 1/1 listos
...
```

## 🚨 Alertas de Problemas

Cuando hay pods no listos, la notificación incluye:
- ⚠️ Sección destacada con aplicaciones problemáticas
- Detalle de cuántos pods no están listos por aplicación

## ✅ Verificación

Para verificar que las notificaciones funcionan:

1. Las notificaciones se enviarán automáticamente cuando:
   - Haya pods no listos (inmediato)
   - Ocurra un error (inmediato)
   - Pase una hora (resumen horario, si está habilitado)

2. Revisa el canal de Slack configurado con el webhook.

## 🔧 Troubleshooting

Si no recibes notificaciones:

1. Verifica que el webhook URL sea correcto
2. Revisa los logs del monitoreo para ver errores
3. Asegúrate de que `SLACK_CONFIG.notifyOnUnreadyPods` esté en `true`
4. Verifica que Slack tenga el webhook configurado correctamente

## 📝 Notas

- Las notificaciones no interrumpen el monitoreo si fallan
- Los errores de envío solo se logean, no detienen el proceso
- Las notificaciones se envían solo cuando hay problemas (excepto resumen horario)


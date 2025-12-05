# 📨 Estructura de Notificaciones Slack

## 🔔 Frecuencia

**❌ NO se envía cada minuto** (para evitar spam)

**✅ Se envía cuando:**
1. **Hay pods NO LISTOS** → Inmediato (cada vez que detecta problemas)
2. **Errores de autenticación** → Inmediato
3. **Errores fatales** → Inmediato
4. **Resumen horario** → Cada hora (si `notifySummaryHourly = true`)

## 📨 Ejemplo de Notificación (Todo OK)

```
✅ Monitoreo ArgoCD - 05/12/2025, 00:18:28

┌─────────────────────────────────────────┐
│ Total Aplicaciones: 11                  │
│ Total Pods: 55                          │
│ ✅ Pods Listos: 55                      │
│ ❌ Pods No Listos: 0                    │
└─────────────────────────────────────────┘

Detalle por Aplicación:
✅ lotobet-rqi-api: 10/10 listos
✅ lotobet-rqi-orchestrator: 1/1 listos
✅ lotobet-rqi-ui: 3/3 listos
✅ prd-rd-rqi-ui: 3/3 listos
✅ video-api-aia-prd: 10/10 listos
✅ video-api-dom-prd: 4/4 listos
✅ video-api-g3-prd: 2/2 listos
✅ video-api-g5-prd: 2/2 listos
✅ video-api-r18-prd: 10/10 listos
✅ video-api-r36-prd: 10/10 listos
```

## 🚨 Ejemplo de Notificación (Con Problemas)

```
⚠️ Monitoreo ArgoCD - 05/12/2025, 00:18:28

┌─────────────────────────────────────────┐
│ Total Aplicaciones: 11                  │
│ Total Pods: 55                          │
│ ✅ Pods Listos: 50                      │
│ ❌ Pods No Listos: 5                    │
└─────────────────────────────────────────┘

⚠️ Aplicaciones con Pods No Listos:
• video-api-r36-prd: 5/10 pods no listos

Detalle por Aplicación:
✅ lotobet-rqi-api: 10/10 listos
✅ lotobet-rqi-orchestrator: 1/1 listos
⚠️ video-api-r36-prd: 5/10 listos (5 no listos)
✅ video-api-aia-prd: 10/10 listos
...
```

## ⚙️ Configuración Actual

```javascript
const SLACK_CONFIG = {
  notifyOnErrors: true,        // ✅ Notificar errores
  notifyOnUnreadyPods: true,   // ✅ Notificar cuando hay pods no listos
  notifySummaryHourly: true,   // ✅ Enviar resumen cada hora
  notifySummaryAlways: false   // ❌ NO enviar en cada ejecución
};
```

## 📊 Resumen

- **Monitoreo cada minuto**: ✅ (en consola/logs)
- **Notificación Slack cada minuto**: ❌ NO
- **Notificación cuando hay problemas**: ✅ SÍ (inmediato)
- **Resumen horario**: ✅ SÍ (si está habilitado)


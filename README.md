# Monitoreo de ArgoCD - RQI

Aplicación Node.js para monitorear el estado de las aplicaciones y pods en ArgoCD.

## Instalación

```bash
npm install
```

## Uso

### Modo Monitoreo Continuo (cada minuto)

```bash
npm start
```

Este comando ejecutará el monitoreo inmediatamente y luego cada minuto automáticamente.

### Modo Ejecución Única

```bash
npm run once
```

Ejecuta el monitoreo una sola vez y termina.

## Opciones de Ejecución en Producción

### Opción 1: Con node-cron (incluido)
Simplemente ejecuta `npm start` y el proceso correrá continuamente ejecutándose cada minuto.

**Pros:**
- Simple y directo
- No requiere software adicional

**Contras:**
- Si el proceso se cae, necesitas reiniciarlo manualmente
- No tiene gestión automática de logs

### Opción 2: Con PM2 (Recomendado para producción)

1. Instalar PM2 globalmente:
```bash
npm install -g pm2
```

2. Crear directorio de logs:
```bash
mkdir -p logs
```

3. Iniciar con PM2:
```bash
pm2 start ecosystem.config.js
```

4. Ver logs en tiempo real:
```bash
pm2 logs rqi-monitoreo-argocd
```

5. Ver estado:
```bash
pm2 status
```

6. Detener:
```bash
pm2 stop rqi-monitoreo-argocd
```

7. Configurar para iniciar al arrancar el sistema:
```bash
pm2 startup
pm2 save
```

**Pros:**
- Reinicio automático si falla
- Gestión de logs automática
- Inicio automático al reiniciar el servidor
- Monitoreo de recursos (CPU, memoria)
- Dashboard web disponible

**Contras:**
- Requiere instalar PM2

### Opción 3: Con systemd (Linux) o launchd (macOS)

Para servicios del sistema, puedes crear un servicio systemd o un LaunchAgent en macOS.

## Configuración

Las credenciales y URL están configuradas en `index.js`:
- URL: https://argocd.alproyect.store
- Usuario: admin
- Contraseña: QTSK97LQXPeIekdt

## Salida

La aplicación mostrará:
1. Detalle de cada aplicación con sus pods
2. Resumen final con conteo de pods por ambiente
3. Totales generales

Cada ejecución muestra la fecha y hora para facilitar el seguimiento.


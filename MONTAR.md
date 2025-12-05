# 📋 Guía de Instalación y Configuración

## 🚀 Instalación Rápida

### Opción A: Con PM2 (Recomendado para producción)

1. **Ejecutar el script de inicio:**
```bash
chmod +x start.sh
./start.sh
```

O manualmente:

```bash
# 1. Instalar PM2 (si no está instalado)
npm install -g pm2

# 2. Crear directorio de logs
mkdir -p logs

# 3. Iniciar el servicio
pm2 start ecosystem.config.cjs

# 4. Ver estado
pm2 status
```

2. **Ver logs en tiempo real:**
```bash
pm2 logs rqi-monitoreo-argocd
```

3. **Configurar para iniciar automáticamente al reiniciar el servidor:**
```bash
pm2 startup
pm2 save
```

### Opción B: Modo Simple (sin PM2)

```bash
npm start
```

Este comando ejecutará el monitoreo cada minuto. Para detener, presiona `Ctrl+C`.

---

## 📊 Comandos Útiles con PM2

```bash
# Ver estado
pm2 status

# Ver logs
pm2 logs rqi-monitoreo-argocd

# Ver logs de las últimas 100 líneas
pm2 logs rqi-monitoreo-argocd --lines 100

# Reiniciar servicio
pm2 restart rqi-monitoreo-argocd

# Detener servicio
pm2 stop rqi-monitoreo-argocd

# Eliminar servicio
pm2 delete rqi-monitoreo-argocd

# Monitoreo en tiempo real (CPU, memoria)
pm2 monit

# Ver información detallada
pm2 describe rqi-monitoreo-argocd
```

---

## 🔍 Ubicación de Logs

Los logs se guardan en el directorio `logs/`:
- `logs/out.log` - Salida estándar
- `logs/error.log` - Errores

---

## ✅ Verificación

Para verificar que está funcionando:

1. Revisa el estado:
```bash
pm2 status
```

2. Revisa los logs:
```bash
pm2 logs rqi-monitoreo-argocd --lines 50
```

Deberías ver mensajes de monitoreo cada minuto con la fecha y hora.

---

## 🛠️ Solución de Problemas

### Si el servicio no inicia:
```bash
# Ver logs de error
pm2 logs rqi-monitoreo-argocd --err

# Reiniciar
pm2 restart rqi-monitoreo-argocd
```

### Si necesitas cambiar la frecuencia:
Edita `ecosystem.config.js` y cambia `cron_restart: '* * * * *'`:
- Cada minuto: `* * * * *`
- Cada 5 minutos: `*/5 * * * *`
- Cada hora: `0 * * * *`

### Si PM2 no inicia al arrancar:
```bash
pm2 startup
# Copia y ejecuta el comando que te muestre
pm2 save
```


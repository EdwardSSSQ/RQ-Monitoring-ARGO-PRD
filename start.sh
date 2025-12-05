#!/bin/bash

# Script para iniciar el monitoreo de ArgoCD

echo "🚀 Iniciando monitoreo de ArgoCD RQI..."
echo ""

# Verificar si PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "⚠️  PM2 no está instalado. Instalando..."
    npm install -g pm2
fi

# Crear directorio de logs si no existe
mkdir -p logs

# Detener el servicio si ya está corriendo
pm2 stop rqi-monitoreo-argocd 2>/dev/null
pm2 delete rqi-monitoreo-argocd 2>/dev/null

# Iniciar el servicio
echo "✅ Iniciando servicio con PM2..."
pm2 start ecosystem.config.cjs

# Mostrar estado
echo ""
echo "📊 Estado del servicio:"
pm2 status

echo ""
echo "📋 Para ver los logs en tiempo real:"
echo "   pm2 logs rqi-monitoreo-argocd"
echo ""
echo "📋 Para ver el estado:"
echo "   pm2 status"
echo ""
echo "📋 Para detener el servicio:"
echo "   pm2 stop rqi-monitoreo-argocd"
echo ""
echo "📋 Para configurar inicio automático al reiniciar:"
echo "   pm2 startup"
echo "   pm2 save"
echo ""


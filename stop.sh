#!/bin/bash

# Script para detener el monitoreo de ArgoCD

echo "🛑 Deteniendo monitoreo de ArgoCD RQI..."
pm2 stop rqi-monitoreo-argocd
echo "✅ Servicio detenido"


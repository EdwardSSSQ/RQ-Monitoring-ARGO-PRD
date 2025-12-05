#!/bin/bash

# Script para desplegar el monitoreo en un servidor remoto
# Uso: ./deploy.sh usuario@servidor

if [ -z "$1" ]; then
    echo "❌ Error: Debes proporcionar la dirección del servidor"
    echo "Uso: ./deploy.sh usuario@servidor"
    echo "Ejemplo: ./deploy.sh edward@192.168.1.100"
    exit 1
fi

SERVER=$1
REMOTE_DIR="~/rqi-monitoreo-argocd"

echo "🚀 Desplegando monitoreo de ArgoCD al servidor: $SERVER"
echo ""

# Crear directorio en el servidor
echo "📁 Creando directorio en el servidor..."
ssh $SERVER "mkdir -p $REMOTE_DIR"

# Transferir archivos
echo "📤 Transfiriendo archivos..."
rsync -avz --exclude 'node_modules' --exclude 'logs' --exclude '.git' \
    ./ $SERVER:$REMOTE_DIR/

# Instalar dependencias y configurar en el servidor
echo "📦 Instalando dependencias en el servidor..."
ssh $SERVER << 'ENDSSH'
cd ~/rqi-monitoreo-argocd

# Instalar Node.js si no está instalado (verificar primero)
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js no está instalado. Por favor instálalo primero."
    exit 1
fi

# Instalar PM2 si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# Instalar dependencias del proyecto
echo "📦 Instalando dependencias del proyecto..."
npm install

# Crear directorio de logs
mkdir -p logs

# Detener servicio si existe
pm2 stop rqi-monitoreo-argocd 2>/dev/null
pm2 delete rqi-monitoreo-argocd 2>/dev/null

# Iniciar servicio
echo "🚀 Iniciando servicio..."
pm2 start ecosystem.config.cjs

# Configurar inicio automático
echo "⚙️  Configurando inicio automático..."
pm2 startup
pm2 save

echo ""
echo "✅ Despliegue completado!"
echo ""
echo "📋 Comandos útiles en el servidor:"
echo "   pm2 status                    # Ver estado"
echo "   pm2 logs rqi-monitoreo-argocd # Ver logs"
echo "   pm2 restart rqi-monitoreo-argocd # Reiniciar"
ENDSSH

echo ""
echo "✅ Despliegue completado en $SERVER"
echo "📋 Para acceder al servidor: ssh $SERVER"


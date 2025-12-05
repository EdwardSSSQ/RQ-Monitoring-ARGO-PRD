#!/bin/bash

# Script completo para crear repo, subir código y desplegar

set -e

echo "🚀 DESPLIEGUE COMPLETO AUTOMATIZADO"
echo "===================================="
echo ""

REPO_NAME="rqi-monitoreo-argocd"
GITHUB_USER=""

# Detectar usuario de GitHub desde git config
if git config --global user.name &>/dev/null; then
    GITHUB_USER=$(git config --global user.name)
    echo "📝 Usuario detectado: $GITHUB_USER"
    read -p "¿Es correcto? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        read -p "Ingresa tu usuario de GitHub: " GITHUB_USER
    fi
else
    read -p "Ingresa tu usuario de GitHub: " GITHUB_USER
fi

echo ""
echo "📦 Paso 1: Verificando código local..."
git status

echo ""
echo "📦 Paso 2: Verificando si ya existe remote..."
if git remote get-url origin &>/dev/null; then
    echo "✅ Ya hay un remote configurado:"
    git remote get-url origin
    echo ""
    read -p "¿Usar este repo? (s/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[SsYy]$ ]]; then
        git remote remove origin
        REMOTE_URL=""
    else
        REMOTE_URL=$(git remote get-url origin)
    fi
else
    REMOTE_URL=""
fi

if [ -z "$REMOTE_URL" ]; then
    echo ""
    echo "📝 Paso 3: Crear repositorio en GitHub"
    echo "Opción A: Crear automáticamente (necesitas token de GitHub)"
    echo "Opción B: Crear manualmente en https://github.com/new"
    read -p "¿Crear automáticamente? (s/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        if [ -z "$GITHUB_TOKEN" ]; then
            echo ""
            echo "🔑 Necesitas un token de GitHub:"
            echo "1. Ve a: https://github.com/settings/tokens"
            echo "2. Generate new token (classic)"
            echo "3. Marca: repo (full control)"
            echo "4. Copia el token"
            echo ""
            read -p "Pega tu token de GitHub: " GITHUB_TOKEN
            export GITHUB_TOKEN
        fi
        
        echo "🔄 Creando repositorio en GitHub..."
        RESPONSE=$(curl -s -X POST \
            -H "Authorization: token $GITHUB_TOKEN" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/user/repos \
            -d "{\"name\":\"$REPO_NAME\",\"private\":false,\"auto_init\":false}")
        
        if echo "$RESPONSE" | grep -q "already exists"; then
            echo "⚠️  El repositorio ya existe en GitHub"
        elif echo "$RESPONSE" | grep -q "Bad credentials"; then
            echo "❌ Token inválido. Creando manualmente..."
            REMOTE_URL=""
        elif echo "$RESPONSE" | grep -q '"clone_url"'; then
            echo "✅ Repositorio creado exitosamente"
            REMOTE_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"
        else
            echo "❌ Error: $RESPONSE"
            REMOTE_URL=""
        fi
    fi
    
    if [ -z "$REMOTE_URL" ]; then
        echo ""
        echo "📝 Pasos manuales:"
        echo "1. Ve a: https://github.com/new"
        echo "2. Crea repo: $REPO_NAME"
        echo "3. NO marques 'Initialize with README'"
        echo ""
        read -p "Pega la URL del repo (ej: https://github.com/$GITHUB_USER/$REPO_NAME.git): " REMOTE_URL
    fi
    
    echo ""
    echo "🔗 Configurando remote..."
    git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
    git branch -M main
fi

echo ""
echo "📤 Paso 4: Subiendo código a GitHub..."
git push -u origin main || {
    echo ""
    echo "⚠️  Error al subir. Intentando con force..."
    read -p "¿Forzar push? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        git push -u origin main --force
    else
        echo "❌ No se pudo subir el código"
        exit 1
    fi
}

echo ""
echo "✅ Código subido a GitHub: $REMOTE_URL"
echo ""
echo "🚂 Paso 5: Desplegar en Railway"
echo ""
echo "Tienes dos opciones:"
echo ""
echo "A) Usar Railway CLI (interactivo):"
echo "   1. Ejecuta: railway login"
echo "   2. Luego: railway init"
echo "   3. Luego: railway up"
echo ""
echo "B) Usar Railway Web (más fácil):"
echo "   1. Ve a: https://railway.app"
echo "   2. Login con GitHub"
echo "   3. New Project → Deploy from GitHub repo"
echo "   4. Selecciona: $REPO_NAME"
echo "   5. ¡Listo! Se despliega automáticamente"
echo ""

read -p "¿Intentar con Railway CLI ahora? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo "🔐 Iniciando Railway login..."
    railway login
    echo ""
    echo "🚀 Inicializando proyecto en Railway..."
    railway init
    echo ""
    echo "📤 Desplegando..."
    railway up
    echo ""
    echo "✅ ¡Desplegado exitosamente!"
    echo ""
    echo "📊 Para ver logs: railway logs"
else
    echo ""
    echo "📋 Instrucciones para Railway Web:"
    echo "1. Abre: https://railway.app"
    echo "2. Login con GitHub"
    echo "3. New Project → Deploy from GitHub repo"
    echo "4. Selecciona: $REPO_NAME"
    echo "5. Espera el despliegue (2-3 minutos)"
    echo "6. Ve a Logs para verificar"
    echo ""
fi

echo ""
echo "✅ PROCESO COMPLETADO"
echo ""
echo "📊 Para verificar que funciona:"
echo "- Railway: Dashboard → Logs"
echo "- Espera 1-2 minutos"
echo "- Deberías ver: '🕐 Ejecutando monitoreo...'"
echo ""


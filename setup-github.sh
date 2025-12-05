#!/bin/bash

# Script para subir el código a GitHub y desplegarlo

echo "🚀 Preparando proyecto para GitHub..."
echo ""

# Verificar si ya hay un remote
if git remote get-url origin &>/dev/null; then
    echo "✅ Ya hay un remote configurado:"
    git remote get-url origin
    echo ""
    read -p "¿Subir cambios? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        git add .
        git commit -m "Update monitoreo ArgoCD"
        git push origin main
        echo "✅ Código subido a GitHub"
    fi
else
    echo "📝 Pasos para subir a GitHub:"
    echo ""
    echo "1. Ve a https://github.com/new"
    echo "2. Crea un nuevo repositorio (por ejemplo: rqi-monitoreo-argocd)"
    echo "3. NO marques 'Initialize with README'"
    echo "4. Copia el comando que te muestre GitHub"
    echo ""
    echo "Luego ejecuta:"
    echo "   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git"
    echo "   git branch -M main"
    echo "   git push -u origin main"
    echo ""
    read -p "¿Ya creaste el repo y quieres que lo configure? (s/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[SsYy]$ ]]; then
        read -p "Pega la URL del repo (ej: https://github.com/usuario/repo.git): " REPO_URL
        git remote add origin "$REPO_URL"
        git branch -M main
        git push -u origin main
        echo "✅ Código subido a GitHub!"
        echo ""
        echo "🎉 Ahora puedes desplegarlo en Railway o Render"
    fi
fi


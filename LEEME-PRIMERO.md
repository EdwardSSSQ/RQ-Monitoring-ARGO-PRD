# 🚀 DESPLIEGUE RÁPIDO - 5 MINUTOS

## ✅ TODO ESTÁ LISTO

El código ya está preparado para desplegarse en un servidor gratis.

---

## 🎯 PASO A PASO (El más rápido)

### 1️⃣ Subir a GitHub (2 min)

```bash
# Opción A: Usar el script automático
./setup-github.sh

# Opción B: Manual
# 1. Ve a https://github.com/new
# 2. Crea repo "rqi-monitoreo-argocd"
# 3. Ejecuta:
git remote add origin https://github.com/TU_USUARIO/rqi-monitoreo-argocd.git
git branch -M main
git push -u origin main
```

### 2️⃣ Desplegar en Railway (3 min)

1. **Abre**: https://railway.app
2. **Login**: Con GitHub (más fácil)
3. **Nuevo Proyecto**: "New Project" → "Deploy from GitHub repo"
4. **Selecciona**: Tu repo `rqi-monitoreo-argocd`
5. **¡Listo!** Se despliega automáticamente

### 3️⃣ Verificar

- Dashboard → Tu servicio → **Logs**
- Espera 1-2 minutos
- Deberías ver: `🕐 Ejecutando monitoreo...`

---

## 🎁 ALTERNATIVA: Render.com

Si prefieres Render:

1. **Abre**: https://render.com
2. **Nuevo**: "New +" → "Web Service"
3. **Conecta**: Tu repo de GitHub
4. **Configura**:
   - Build: `npm install`
   - Start: `node index.js`
   - Plan: **Free**
5. **Crear**: ¡Listo!

---

## ✅ ¿Funcionó?

Revisa los logs y deberías ver cada minuto:
- `🕐 Ejecutando monitoreo`
- `📊 RESUMEN GENERAL`
- `Total de pods: 55`

---

## 📚 Más Info

- `RAILWAY-DEPLOY.md` - Guía detallada Railway
- `RENDER-DEPLOY.md` - Guía detallada Render
- `DESPLIEGUE-RAPIDO.md` - Resumen de opciones

---

## ⚡ RECOMENDACIÓN

**Railway.app** es la opción más rápida y fácil:
- ✅ Gratis ($5 crédito/mes)
- ✅ Despliegue automático
- ✅ Logs en tiempo real
- ✅ Sin configuración compleja

**¡Solo 5 minutos y está funcionando!** 🚀


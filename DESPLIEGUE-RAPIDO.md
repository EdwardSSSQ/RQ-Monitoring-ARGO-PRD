# ⚡ DESPLIEGUE RÁPIDO EN SERVIDOR GRATIS

## 🎯 Opción 1: Railway.app (RECOMENDADO - Más fácil)

### ⏱️ Tiempo: 3-5 minutos

1. **Crear cuenta**: https://railway.app → "Login" → "Start a New Project"
2. **Nuevo proyecto**: "New Project" → "Empty Project"
3. **Subir código**:
   - Opción A: Conectar GitHub (más fácil)
     - Primero sube tu código a GitHub
     - En Railway: "Add Service" → "GitHub Repo" → Selecciona tu repo
   - Opción B: Railway CLI
     ```bash
     npm install -g @railway/cli
     railway login
     railway init
     railway up
     ```

4. **¡Listo!** El servicio se despliega automáticamente

**Ver logs**: Dashboard → Tu servicio → "Logs"

---

## 🎯 Opción 2: Render.com (Alternativa)

### ⏱️ Tiempo: 5-7 minutos

1. **Crear cuenta**: https://render.com → "Get Started"
2. **Nuevo servicio**: "New +" → "Web Service"
3. **Conectar repo**: Selecciona tu repositorio de GitHub
4. **Configurar**:
   - Build Command: `npm install`
   - Start Command: `node index.js`
   - Plan: **Free**
5. **Crear**: El servicio se despliega automáticamente

---

## 🚀 Método Rápido: Subir a GitHub Primero

Si aún no tienes el código en GitHub:

```bash
# En el directorio del proyecto
git init
git add .
git commit -m "Monitoreo ArgoCD RQI"
git branch -M main

# Crea un repo en GitHub.com, luego:
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

Luego usa cualquiera de las opciones arriba y conecta el repo.

---

## ✅ Verificar que Funciona

Después de desplegar, espera 1-2 minutos y revisa los logs:

**Railway**: Dashboard → Service → Logs  
**Render**: Dashboard → Service → Logs

Deberías ver:
```
🕐 Ejecutando monitoreo - ...
📊 RESUMEN GENERAL - CONteo de PODS por AMBIENTE
```

---

## 🎁 ¿Cuál elegir?

- **Railway**: Más crédito gratis, mejor para procesos continuos
- **Render**: Más conocido, plan free con algunas limitaciones

**Recomendación**: Railway.app para este caso de uso.

---

## 📞 ¿Necesitas ayuda?

Si tienes problemas:
1. Verifica los logs en el dashboard
2. Asegúrate de que el código está en GitHub
3. Verifica que las dependencias están en package.json (ya están)


# ⚡ EJECUTA ESTO AHORA - Despliegue Rápido

## 🚀 Opción 1: Script Automatizado (Recomendado)

Ejecuta este comando y sigue las instrucciones:

```bash
cd "/Users/edward/Proyectos/RQ/RQI-Monitoreo RD"
./deploy-completo.sh
```

El script te guiará paso a paso para:
- ✅ Crear el repo en GitHub
- ✅ Subir el código
- ✅ Desplegar en Railway

---

## 🚀 Opción 2: Manual Rápido (5 minutos)

### Paso 1: Crear repo en GitHub (1 min)

1. Ve a: https://github.com/new
2. Nombre: `rqi-monitoreo-argocd`
3. NO marques "Initialize with README"
4. Haz clic en "Create repository"

### Paso 2: Subir código (1 min)

Ejecuta estos comandos (reemplaza `EdwardSSSQ` si tu usuario es diferente):

```bash
cd "/Users/edward/Proyectos/RQ/RQI-Monitoreo RD"
git remote add origin https://github.com/EdwardSSSQ/rqi-monitoreo-argocd.git
git branch -M main
git push -u origin main
```

### Paso 3: Desplegar en Railway (3 min)

1. **Abre**: https://railway.app
2. **Login**: Haz clic en "Login" → Selecciona "GitHub"
3. **Nuevo Proyecto**: Haz clic en "New Project"
4. **Conectar Repo**: Selecciona "Deploy from GitHub repo"
5. **Elegir Repo**: Busca y selecciona `rqi-monitoreo-argocd`
6. **¡Listo!** Railway empezará a desplegar automáticamente

### Paso 4: Verificar (1 min)

1. En Railway, ve a tu servicio
2. Haz clic en la pestaña **"Logs"**
3. Espera 1-2 minutos
4. Deberías ver:
   ```
   🕐 Ejecutando monitoreo - ...
   📊 RESUMEN GENERAL - CONteo de PODS por AMBIENTE
   Total de pods: 55
   ```

---

## ✅ ¿Funcionó?

Si ves los logs con el monitoreo ejecutándose cada minuto, ¡está funcionando perfectamente!

---

## 🔧 Problemas Comunes

**Error al hacer push:**
```bash
git push -u origin main --force
```

**Railway no encuentra el repo:**
- Verifica que el repo esté público o que Railway tenga acceso

**No veo logs:**
- Espera 2-3 minutos
- Refresca la página de logs
- Verifica que el deployment terminó correctamente

---

## 📊 Después del Despliegue

El monitoreo estará corriendo 24/7 y ejecutándose cada minuto automáticamente.

Para ver los logs en cualquier momento:
- Railway Dashboard → Tu servicio → Logs


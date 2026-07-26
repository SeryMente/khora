# Runbook de Despliegue (DEPLOY-01)
# @l0 L0-002-R · @req DEPLOY-01/REQ-5 · @acr ACR-5.1

## 1. Crear el servicio en Render vía API REST (PowerShell)
```powershell
$RENDER_API_KEY = "<DESDE_BOVEDA:RENDER_API_KEY>"
$HEADERS = @{
    "Authorization" = "Bearer $RENDER_API_KEY"
    "Accept"        = "application/json"
    "Content-Type"  = "application/json"
}
$BODY = @{
    serviceDetails = @{
        env = "python"
        envSpecificDetails = @{
            buildCommand = "pip install -r api/requirements.txt"
            startCommand = "uvicorn api.main:app --host 0.0.0.0 --port `$PORT"
        }
        plan = "free"
        pullRequestBound = "none"
    }
    type = "web_service"
    name = "khora-api"
    autoDeploy = "yes"
    branch = "main"
    repo = "https://github.com/JulesAI/khora"
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "https://api.render.com/v1/services" -Method Post -Headers $HEADERS -Body $BODY
```

## 2. Configurar Variables de Entorno en Render
```powershell
$SERVICE_ID = "<DESDE_BOVEDA:RENDER_SERVICE_ID>"
$ENV_VARS = @(
    @{ envVar = @{ key = "NEO4J_URI"; value = "<DESDE_BOVEDA:NEO4J_URI>" } },
    @{ envVar = @{ key = "NEO4J_USER"; value = "<DESDE_BOVEDA:NEO4J_USER>" } },
    @{ envVar = @{ key = "NEO4J_PASSWORD"; value = "<DESDE_BOVEDA:NEO4J_PASSWORD>" } },
    @{ envVar = @{ key = "KHORA_API_KEY"; value = "<DESDE_BOVEDA:KHORA_API_KEY>" } },
    @{ envVar = @{ key = "GROQ_API_KEY"; value = "<DESDE_BOVEDA:GROQ_API_KEY>" } },
    @{ envVar = @{ key = "KHORA_WEB_ORIGIN"; value = "https://khora-web.vercel.app" } },

    # Familia Principal
    @{ envVar = @{ key = "KHORA_LLM_API_KEY"; value = "<DESDE_BOVEDA:KHORA_LLM_API_KEY>" } },
    @{ envVar = @{ key = "KHORA_LLM_BASE_URL"; value = "<DESDE_BOVEDA:KHORA_LLM_BASE_URL>" } },
    @{ envVar = @{ key = "KHORA_LLM_MODEL"; value = "<DESDE_BOVEDA:KHORA_LLM_MODEL>" } },

    # Familia Barata / Fallback (Dualidad actual hasta 0.9.1)
    @{ envVar = @{ key = "LLM_CHEAP_API_KEY"; value = "<DESDE_BOVEDA:LLM_CHEAP_API_KEY>" } },
    @{ envVar = @{ key = "LLM_CHEAP_API_URL"; value = "<DESDE_BOVEDA:LLM_CHEAP_API_URL>" } },
    @{ envVar = @{ key = "LLM_CHEAP_MODEL"; value = "<DESDE_BOVEDA:LLM_CHEAP_MODEL>" } },

    @{ envVar = @{ key = "PYTHON_VERSION"; value = "3.11" } }
) | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "https://api.render.com/v1/services/$SERVICE_ID/env-vars" -Method Put -Headers $HEADERS -Body $ENV_VARS
```

## 3. Configurar Vercel Post-deploy (khora-web)
```powershell
# Configuración del frontend (sin Vercel CLI token asume sesión activa)
vercel env add KHORA_API_URL production
# (Ingresar la URL del backend de Render: https://khora-api-XXXX.onrender.com)

vercel env add NEXT_PUBLIC_API_URL production
# (Ingresar la ruta relativa: /api)

vercel env add KHORA_API_KEY production
# (Ingresar <DESDE_BOVEDA:KHORA_API_KEY>)

vercel env add X_KHORA_KEY production
# (Ingresar <DESDE_BOVEDA:KHORA_API_KEY> - alias requerido por REQ-5)
```

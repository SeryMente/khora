# Catálogo e Instalación de Modelos Locales (Ollama)

Este documento detalla la especificación del perfil de proveedor `"local"` en Khora, que ejecuta inferencia directamente en la máquina del usuario mediante [Ollama](https://ollama.com).

## §4 — Catálogo de modelos por VRAM (verificado, agosto–septiembre 2026)

| Modelo (tag Ollama) | VRAM aprox. | Contexto | Benchmark verificado | Uso recomendado |
|---|---|---|---|---|
| gpt-oss:20b | ~14–16 GB | 128K | Nivel o3-mini (razonamiento ajustable) | Equipo con 16GB, generalista |
| devstral:24b | 14 GB | — | SWE-bench Verified 46.8% | Mejor agente de código "benchmarkeado" en ese tamaño |
| qwen3-coder:30b | 19 GB | 256K | Mejor calidad/GB en GPU de 24–32GB | Codificación, mejor pick de consumo |
| qwen3.8:27b | 18 GB (o 24GB a Q4) | 256K | SWE-bench 61.7% | Mejor pick general en hardware de consumidor (publicado agosto 2026) |
| gpt-oss:120b | ~80 GB | 128K | — | Solo GPU de clase workstation/servidor |

> **Advertencia de hardware (MXFP4):** gpt-oss en cuantización MXFP4 a veces cae a ejecución por CPU si el driver/GPU no tiene aceleración MXFP4 completa.

## §6 — Comando de instalación en PowerShell

El script automático de instalación y arranque para Windows configura el origen CORS exacto de producción de Khora (`https://khora-web.vercel.app`) y descarga el modelo seleccionado:

```powershell
$ErrorActionPreference = "Stop"
if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    winget install --id Ollama.Ollama -e --silent `
      --accept-package-agreements --accept-source-agreements
  } else {
    $inst = "$env:TEMP\OllamaSetup.exe"
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $inst
    Start-Process -FilePath $inst `
      -ArgumentList "/SP- /VERYSILENT /SUPPRESSMSGBOXES /NORESTART" -Wait
  }
}
$deadline = (Get-Date).AddSeconds(30)
while (-not (Test-NetConnection 127.0.0.1 -Port 11434 -InformationLevel Quiet `
    -WarningAction SilentlyContinue) -and (Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 1
}
[Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "https://khora-web.vercel.app", "User")
$env:OLLAMA_ORIGINS = "https://khora-web.vercel.app"
ollama pull <MODELO_SEGUN_VRAM>
```

> **Nota de Seguridad:** Se prohíbe el uso de `OLLAMA_ORIGINS="*"`. Se debe configurar explícitamente el origen de producción `https://khora-web.vercel.app`.

# ScriptPWS

Módulo operativo de Entorno Persistente para automatización PowerShell de Windows y arranque de RDC.

- Objeto canónico: [OBJETO-CANONICO.md](OBJETO-CANONICO.md)
- Baseline vigente: **BASELINE-002 · v2.0 · CURRENT**
- Fallback: BASELINE-001 · v1.0
- Retención: las tres versiones exitosas más recientes; actualmente hay dos aceptadas y una plaza disponible.
- Índice/puntero: [BASELINE-INDEX.json](BASELINE-INDEX.json)

## Punto de entrada en el host materializado

```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; & "$env:LOCALAPPDATA\\ScriptPWS\\START-RDC.ps1"
```

El baseline se ejecuta mediante el wrapper local para conservar transcript en `Desktop\\log.txt` y copia de diagnóstico al portapapeles al finalizar.

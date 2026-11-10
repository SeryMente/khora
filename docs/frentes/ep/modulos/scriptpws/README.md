# ScriptPWS

Módulo PowerShell de Windows subordinado al frente Entorno Persistente (EP). Su objeto canónico vive en este directorio del repositorio privado `SeryMente/khora`.

- Objeto canónico: [OBJETO-CANONICO.md](OBJETO-CANONICO.md)
- Índice: [BASELINE-INDEX.json](BASELINE-INDEX.json)
- Baseline vigente: **BASELINE-002 · v2.0 · CURRENT**
- Fallback: **BASELINE-001 · v1.0**
- Espejo: `baselines/BASELINE-CURRENT.ps1` (no cuenta como baseline adicional).
- Lanzador runtime preservado por separado: [artifacts/RDC-Remote.generated-from-BASELINE-002.ps1](artifacts/RDC-Remote.generated-from-BASELINE-002.ps1).

## Ubicación en el workspace OEP

Cuando el repositorio KHORA se selecciona y materializa dentro de una sesión de Entorno Persistente, esta carpeta queda disponible mediante:

`<Escritorio>\EP\khora\docs\frentes\ep\modulos\scriptpws\`

La junction `Desktop\EP` apunta al workspace dentro del VHDX cifrado de la sesión. Esta carpeta no debe tratarse como una copia local persistente independiente.

## Ejecutar el baseline vigente

Desde la raíz del repositorio KHORA, ejecutar en PowerShell:

```powershell
& ".\docs\frentes\ep\modulos\scriptpws\baselines\BASELINE-CURRENT.ps1"
```

**El archivo contiene el bootstrap completo de una sola línea.** Si el operador pide el comando vigente, entregar todo su contenido; no sustituirlo por `START-RDC.ps1`, un wrapper o una ruta de acceso directo.

## Operación y aceptación

El bootstrap vigente V2.0 instala/detecta Node.js 24, verifica NPM/NPX mediante `npm.cmd`/`npx.cmd`, prepara el lanzador oficial de RDC, valida su sintaxis, registra `Desktop\log.txt`, crea el acceso directo y arranca RDC.

La autenticación nueva por ejecución es un requisito aceptado pero aún no probado. La opción upstream `--no-persist-session` se reserva para una candidata BASELINE-003 · v2.1. No modifica BASELINE-002 hasta que el operador la pruebe y acepte.

Retención: hasta tres baselines exitosos y aceptados. Actualmente hay dos; el espejo CURRENT no cuenta como tercera versión.

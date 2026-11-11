# R4 · Verificación de ejecutor de Custodia y alcance real

**Fecha:** 2026-11-11  
**Frente/tarea:** CUSTODIA / CUSTODIA-01  
**Objetivo del ciclo:** localizar un ejecutor existente que pueda archivar checkpoints huérfanos con titularidad, cifrado y procedencia preservados, sin utilizar la interfaz local.  
**Resultado:** se encontró un worker CLI optativo de trabajos secundarios; no es un ejecutor de archivo de capturas. CUSTODIA-01 permanece abierta.

## 1. Contrato y código examinados

Fuente consultada: `main`, commit `c708901caa2500eb48d6723b709cee7db0d9904b`. Los blobs se recuperaron por GitHub y se leyeron completos:

| Archivo | Blob SHA |
|---|---|
| `khora-web/scripts/custodia-worker.ts` | `e31f48f1a65d6f0e28ce8c8d8d51e85652ea2614` |
| `khora-web/lib/server/custodia-trabajos.ts` | `753ee3a8dbb7a001ab1bcaa250d9530d83243c3d` |
| `khora-web/app/api/dictado/reconciliar/route.ts` | `74ac130c4c370f34d7717c51cf4863f75649e458` |
| `khora-web/app/api/dictado/route.ts` | `5371878d65ca35f4fd13601679509a6898a0dd77` |
| `khora-web/lib/server/custodia-schema.ts` | `3c46ac96470fa95c77cb5f5ad47822033aedd4da` |
| `khora-web/docs/CUSTODIA-DICTADOS.md` | `39885f487d361ac810b0d3accfe631fd1fce9ec5` |
| `khora-web/package.json` | `9e13d43390ddf272c88005d88fb60fff4c9c5283` |

## 2. Qué hace realmente el worker

`scripts/custodia-worker.ts` es explícitamente optativo y consume el entorno de servicio existente. Sin argumentos, consulta y muestra estado de la cola en modo solo lectura. `--execute --once` realiza una pasada; `--execute` repite cada 30 segundos.

El ejecutor obtiene los propietarios registrados por `COALESCE(custodia_owner, checkpoint_usuario, volcado.usuario)` y llama a `reconciliarCustodia(usuario, 2)`. Esa función:
- intenta generar/reconciliar MP3 para sesiones que ya tienen partes de audio marcadas verificadas;
- procesa `dictado_custodia_trabajo`, cuyas tareas son generación de título y espejo secundario de Volcados existentes;
- no lee checkpoints huérfanos para crear un Volcado;
- no invoca `guardarDictado()` ni `reclamarSesion()` y no realiza el archivo primario de CUSTODIA-01.

El worker puede recorrer varios titulares y disparar operaciones secundarias de MP3/Notion. Esas operaciones no son el objetivo de esta tarea y no se ejecutaron.

## 3. Compuerta de identidad y ruta canónica

- `POST /api/dictado/reconciliar` exige `auth()` y correo de sesión NextAuth. Su `202` significa solicitado, no completado; únicamente inicia reconciliación secundaria.
- `POST /api/dictado` también exige sesión NextAuth. Obtiene el correo del titular de esa sesión, llama a `reclamarSesion(sessionId, email)` y después a `guardarDictado()`.
- `reclamarSesion()` contrasta la propiedad ya asociada a la sesión/checkpoint/Volcado; no convierte el rol de base de datos en identidad de usuario.
- `guardarDictado()` conserva el flujo canónico de cifrado, manifiesto e idempotencia. No debe sustituirse por escrituras SQL directas ni por un script que invente el propietario a partir de un contexto de servicio.

Por tanto, el worker encontrado no resuelve el bloqueo de las capturas pendientes ni ofrece una vía de archivo autónoma con identidad del titular.

## 4. Activación y entorno

- `khora-web/docs/CUSTODIA-DICTADOS.md` declara que el worker no se activa por build ni por `npm install`, y que no se había activado proceso productivo, cron o servicio.
- `khora-web/package.json` no define un script npm para arrancarlo.
- No se encontró `vercel.json` en la raíz ni en `khora-web/`.
- La consulta Vercel del proyecto `khora-web` devolvió el proyecto Next.js y el deployment Production READY; su respuesta no expone configuración de cron/worker. La superficie de herramientas disponible tampoco ofrece una operación de lectura de Cron.
- Esto no equivale a una inspección visual del dashboard; no se usó monitor, navegador local, Chrome ni RDC. El dictamen se apoya en el contrato del repositorio, los archivos versionados y la metadata Vercel disponible.

## 5. No-acciones y resultado

No se ejecutó el worker, ni siquiera con `--execute`; tampoco se llamó al endpoint auxiliar. No se leyeron secretos, no se obtuvieron checkpoints en plaintext, no se hizo GET/read-back B2 o Blob y no hubo escrituras Neon, B2 o Blob. No se alteraron código de producto, variables, buckets, deployment, control de responsabilidad ni datos productivos.

El inventario R3 no cambia: 95 sesiones atribuibles; 16 ya enlazadas excluidas de reproceso; 79 sin Volcado; 1.039 partes de audio, de las que 785 se localizan por metadata B2 y 254 por metadata Blob; 29 checkpoints textuales potencialmente significativos; 216 fragmentos locales preservados sin acceso por el canal excluido. No se creó ningún Volcado en este ciclo.

## 6. Dictamen y siguiente ciclo

**Hallazgo confirmado:** existe un worker para trabajo secundario posterior al archivo, no un worker de archivo primario para checkpoints huérfanos. Activarlo no cerraría CUSTODIA-01 y podría ejecutar acciones fuera del objetivo.

**Bloqueo vigente:** se necesita un contexto de ejecución que proporcione simultáneamente la clave KHC1, los accesos físicos de almacenamiento que correspondan y una identidad del titular acreditada por el flujo autorizado. No se usará el worker secundario como bypass de NextAuth ni se derivará identidad de la mera conexión privilegiada Neon.

**Siguiente objetivo:** establecer una ruta de ejecución de archivo primario que preserve la identidad del propietario y utilice las funciones canónicas, o mantener únicamente los registros concretamente bloqueados. Cualquier nuevo ejecutor de servicio requiere diseño y autorización explícitos fuera del worker secundario ya existente; no se creó ni desplegó uno en este ciclo.

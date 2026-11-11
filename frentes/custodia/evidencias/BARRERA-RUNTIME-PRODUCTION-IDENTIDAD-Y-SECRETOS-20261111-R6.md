# R6 · Runtime Production, configuración secreta e identidad no interactiva

**Fecha:** 2026-11-11  
**Frente/tarea:** CUSTODIA / CUSTODIA-01  
**Objetivo del ciclo:** comprobar por metadatos administrativos y contratos versionados si Production ofrece una identidad de titular no interactiva y acceso ejecutable a KHC1/almacenamiento sin revelar secretos.  
**Resultado:** existen entradas de variables de Production para KHC1, B2, API de servicio y NextAuth, pero el plano administrativo devuelve secretos sin descifrar. No se encontró un consumidor de Custodia asociado a `INTERNAL_TRIGGER_SECRET`; los disparadores existentes son para Jules/orquestación. No hay identidad NextAuth del titular disponible para la ejecución actual.

## 1. Metadatos de variables Production

Se consultó el inventario Vercel del proyecto KHORA con `decrypt=false`. Solo se conservaron nombres, targets, tipo y condición de descifrado; no se solicitó plaintext.

Registradas en target Production:
- `X_KHORA_KEY`
- `KHORA_B2_MASTER_APPLICATION_KEY_ID`
- `KHORA_B2_MASTER_APPLICATION_KEY`
- `KHORA_B2_BUCKET_NAME`
- `KHORA_B2_BUCKET_ID`
- `KHORA_API_KEY`
- `AUTH_SECRET`
- `DATABASE_URL`
- `INTERNAL_TRIGGER_SECRET`
- `KHORA_OBJECT_STORAGE` (metadato plain; el selector está configurado para B2)
- `BLOB_READ_WRITE_TOKEN` (objeto de tipo encrypted)

Los secretos de la lista se devuelven con `decrypted=false` y sin un valor plaintext utilizable. La presencia de la entrada no demuestra que el valor esté completo, sea válido o pueda autenticarse contra el proveedor. No se solicitó descifrado, no se imprimió ni copió ningún valor y no se alteró ninguna variable.

**Cambio relevante respecto de diagnósticos históricos:** el inventario actual sí muestra los nombres canónicos de Master Application Key y su Key ID en Production. Esto corrige la afirmación histórica de que esas entradas no existían. No demuestra que sean credenciales válidas ni que este canal pueda usarlas. Los nombres heredados `KHORA_B2_APPLICATION_KEY`/`KHORA_B2_KEY_ID` también permanecen como compatibilidad del código; los valores tampoco se leyeron.

## 2. Secreto de disparo interno

El nombre `INTERNAL_TRIGGER_SECRET` figura en Production, sin plaintext. Se rastrearon todas las coincidencias de código versionado:

| Consumidor | Finalidad demostrada |
|---|---|
| `POST /api/jules/trigger` | Iniciar una sesión de Jules con repo/branch/prompt. |
| `POST /api/jules/approve` | Aprobar un plan de sesión Jules identificada. |
| `POST /api/board/orchestrate/tick` | Ejecutar un tick del orquestador de tablero, con Notion, locks y sesiones Jules. |

Los workflows `.github/workflows/board-orchestrator.yml` (programación cada 10 minutos) y `.github/workflows/jules-autorespond-cron.yml` (cada 5 minutos) llaman a esos endpoints. No hay coincidencia de este secreto en rutas/worker de Custodia ni contrato que lo convierta en identidad de propietario. No se llamó a estos endpoints, no se disparó Jules y no se reutilizó el secreto.

## 3. Observabilidad de ejecución

- Consulta Vercel Runtime Logs de Production, ventana reciente de 30 minutos: **sin logs devueltos**.
- Consulta separada con filtro `source=daemon`, misma ventana: **sin logs devueltos**.
- Consulta de 7 días rechazada por Vercel antes de devolver registros: la retención del plan no cubre esa ventana. No equivale a ausencia de logs o de ejecución histórica.
- No hay en la superficie de herramientas disponible una operación para listar cron jobs Vercel; el repositorio carece de `vercel.json` en raíz y en `khora-web/`. Los dos workflows programados hallados son externos en GitHub Actions y de alcance Jules/tablero, no Custodia.

Por tanto, no se afirma que no haya ningún proceso activo fuera de lo observable; solo que no existe evidencia de un daemon Custodia en esta ventana reciente ni un cron Custodia versionado.

## 4. Identidad de titular

`AUTH_SECRET` y variables de OIDC aparecen como entradas de Production, pero sus valores permanecen ocultos. Este canal no dispone de una cookie/sesión NextAuth real del titular ni de un mecanismo de emisión de identidad de propietario autorizado. No se intenta fabricar JWT/cookie a partir de secretos, tomar una identidad de la base de datos o inferir que una API key equivale al titular.

Las rutas canónicas `POST /api/dictado` y `POST /api/dictado/checkpoint` derivan al propietario mediante `auth()`. El rol de Neon, `X_KHORA_KEY`, `KHORA_API_KEY` e `INTERNAL_TRIGGER_SECRET` no son equivalentes a esa identidad.

## 5. No-acciones y conclusión

No se solicitaron valores descifrados, no se leyó plaintext de secretos, no se modificó configuración, no se llamó a endpoints internos, no se ejecutaron workflows, no se accedió a logs de aplicación fuera de la consulta de lectura anterior, y no hubo escrituras en Neon/B2/Blob, Volcados, deployment o código de producto. No se usaron monitor, Chrome local ni RDC.

**Conclusión:** Production parece tener configuradas entradas de KHC1, B2 y NextAuth, pero el canal de administración disponible no entrega sus valores ni proporciona una sesión autenticada del titular. El secreto interno visible por metadatos se destina a Jules/orquestación y no autoriza Custodia. El bloqueo de ejecución no es ya la ausencia nominal de variables: es la falta de un canal permitido que ejecute dentro del runtime con esos secretos y una identidad real del propietario.

**Inventario inalterado:** 95 sesiones atribuibles; 16 ya enlazadas excluidas; 79 sin Volcado; 1.039 partes de audio por metadata (785 B2/254 Blob), 29 checkpoints textuales potencialmente significativos y 216 fragmentos locales preservados. Cero Volcados nuevos y cero cambios de datos en este ciclo. CUSTODIA-01 permanece EN CURSO.

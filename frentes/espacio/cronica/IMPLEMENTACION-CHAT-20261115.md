# Crónica · Incorporación de MOD-CHAT conservando Consulta

**Fecha:** 2026-11-15 · **Frente:** ESPACIO · **Módulo:** MOD-CHAT · **Generación:** 1.

## A · Entrada del operador

> O mejor, entonces, nmo elimines CONSULTA; dejalo, y añade chat. Para que no toquemos eso todavia.

Procedencia: instrucción literal del operador en esta conversación. Esta orden sustituye el alcance destructivo anterior: Consulta debe permanecer y Chat se agrega en paralelo.

## Decisión aplicada

- Mantener `/sistema/consulta` y todo su circuito existente.
- Agregar `/chat` como superficie independiente para Open WebUI.
- Usar un proxy de mismo origen, posterior a autenticación Khora, con firma HMAC hacia el runtime.
- Mantener activa la compuerta existente; esta iteración no activa Chat en producción.
- No portar la rama histórica completa del runtime: está 775 commits detrás de `main` y contiene cambios ajenos. Se reutiliza únicamente el diseño y código web pertinente.

## Auditoría de la integración preexistente

- El antiguo PR #360 sustituía Consulta, eliminaba `ConsultaView` y cambiaba `/sistema/consulta` a `/chat`; por ello no se adopta.
- El antiguo PR #331 contiene un runtime Open WebUI nativo montado bajo `/khora-chat`, pero su rama `fix/chat-epistwin-ent01-main-20261019` está divergida de `main` (775 commits detrás).
- Render conserva el servicio `khora` (`srv-d9i21ld8nd3s73aurdug`) con auto-deploy desactivado y el último despliegue `live` `dep-dbbrbbfavr4c73dbu600`, commit `5192ec3232244f8d709b7c163b4643c52afd7c0e`, terminado el 2026-10-20.
- Un intento posterior de actualización de Render del 2026-11-08 quedó `update_failed`; no se cambió el servicio.
- La configuración Vercel inspeccionada incluye `KHORA_CHAT_ENABLED` en producción con estado deshabilitado y una habilitación de preview limitada a la rama histórica de PR #360. No se leyó ningún secreto ni valor descifrado.
- Evidencia histórica aislada Open WebUI 0.12.3: `/health` 200, `/` 200, `/api/v1/auths/` 401 sin autenticación. El propio recibo limita ese ensayo: no demostró arranque combinado, binding autenticado, carga Render, persistencia durable ni despliegue productivo.

## B · Salida del asistente

Se incorpora Chat como nueva entrada de navegación y ruta `/chat`, manteniendo Consulta en `/sistema/consulta` con su pantalla, endpoint, proxy, recuperador GraphRAG y pruebas. La capa web de Chat usa `auth()` y el proxy firmado de Khora para enrutar al runtime existente bajo `/khora-chat`. No se copia ni se integra a ciegas la rama antigua de Chat. La compuerta productiva permanece desactivada hasta verificar el recorrido real.

## Persistencia

- Rama aislada: `feat/espacio-chat-openwebui-preserve-consulta-20261115`.
- Base auditada: `main` en `50683d06f8acdbcb13bec38ee9f35dfe599db38f`.
- Persistencia de esta crónica y del cambio: se completará con el commit y PR al terminar la lectura de vuelta.
- Archivos de Consulta expresamente no modificados: `khora-web/app/sistema/consulta/page.tsx`, `khora-web/app/api/consulta/route.ts`, `khora-web/app/api/chat/route.ts`, `khora-web/app/components/shared/ConsultaView.tsx`, `kernel/src/khora_kernel/consulta/retriever.py` y el código GraphRAG.

## Estado y límites

La incorporación de la interfaz/proxy es código en una rama, no Chat activo ni conversación E2E aceptada. CI, lectura de vuelta y revisión de PR se informarán por separado. No hubo cambio de Render, Vercel production, secretos, base de datos, flags ni despliegue.

FOL1 sigue PREPARADO/NO ACTIVO; no se asignan folios CV/CY/A/B ni SES.

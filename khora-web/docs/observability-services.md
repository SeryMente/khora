# Observabilidad de Servicios de Cora

**Estado:** CANÓNICO
**Versión:** v0.1.0 — Cobertura Transversal de Fronteras de Servicio
**Fecha:** 2026-10-06

## Propósito

Cora debe poder reconstruir la operación de sus servicios tanto cuando una capacidad es utilizada por la propia aplicación como cuando es consumida por un agente o plataforma externa.

La observabilidad se compone de dos capas:

1. **Evento de dominio:** operación interna relevante, como captura, transcripción, ingesta, revisión o grafo.
2. **Evento de frontera de servicio:** invocación, resultado, duración, correlación y motivo de fallo, sin almacenar payloads, secretos, prompts o respuestas completas.

La segunda capa complementa a la primera y no la sustituye.

## Cobertura

| Superficie | Cobertura |
|---|---|
| Todas las rutas HTTP de `khora-web` | ✅ middleware transversal |
| MCP `/api/mcp` | ✅ request + tool call |
| MCP normativo OPEN/VERIFY | ✅ incluido como tool call |
| OAuth / Bearer manual / revocación | ✅ frontera HTTP |
| EP bootstrap / eventos / logs | ✅ frontera HTTP + ledger especializado |
| FastAPI bridge | ✅ middleware HTTP + correlación |
| Streaming LLM | ✅ cierre de stream en FastAPI |
| Jules | ✅ dependencia externa común |
| Notion | ✅ dependencia externa |
| Ollama local | ✅ cliente directo, sin atravesar el servidor |
| Eventos de dominio | ✅ preservados en `eventos_sistema` |
| Consulta de runtime | ✅ MCP/UI |
| Sumidero `/api/eventos` | ⛔ fuera del middleware para evitar autoreferencia |

## Correlación

Toda petición HTTP puede portar `X-Khora-Correlation-Id`. Cora genera un UUID cuando no existe uno válido y devuelve el identificador en la respuesta cuando la superficie lo permite.

Los eventos internos pueden heredar la correlación mediante contexto asíncrono.

La cadena reconstruible es:

`request → servicio → dominio → dependencia → resultado`

## Contrato de frontera

Un evento de frontera debe contener como mínimo:

- servicio;
- operación;
- ruta y método cuando apliquen;
- correlation_id;
- outcome;
- status_code cuando exista;
- duración;
- reason_code cuando corresponda;
- componente;
- proveedor/dependencia cuando exista;
- release SHA cuando esté disponible.

No deben persistirse por defecto payloads, prompts, respuestas completas, credenciales ni tokens.

## MCP

`/api/mcp` registra la entrada HTTP y cada herramienta ejecutada. Los rechazos del gate se registran con `NORMATIVE_TURN_REQUIRED`.

El gate normativo continúa siendo server-side: las herramientas sustantivas requieren `_norm_turn_token`; `khora_norm_open_turn` abre y fija el snapshot; `khora_norm_verify_turn` verifica; solo `VERIFIED` permite cerrar.

## Servicios externos

Las dependencias externas críticas deben registrar su resultado terminal sin duplicar cada reintento transitorio.

Jules queda instrumentado en su cliente común. Notion y Ollama registran éxito/fallo de sus operaciones de servicio sin almacenar secretos ni contenido de usuario.

## FastAPI

El bridge registra tanto solicitudes normales como finalización de respuestas streaming. El `correlation_id` se mantiene entre Cora web y el bridge.

Los errores de autenticación se clasifican como `autorizacion`; los errores y resultados de operación como `manejo`.

## Persistencia

El almacenamiento durable existente de eventos conserva UUID/idempotencia, cadena hash, correlación, causación, sesión, intento, release, duración, métricas, reason code y clase de privacidad.

La instrumentación de frontera no crea un segundo almacén.

## Regla de evolución

Una nueva ruta HTTP queda cubierta automáticamente por el middleware transversal. Un nuevo dominio debe seguir emitiendo sus eventos propios cuando sean materialmente relevantes.

La prueba de cobertura debe fallar si desaparece la instrumentación del middleware o si se elimina la capacidad de observar MCP, FastAPI o dependencias críticas.

## Límites

La observabilidad demuestra que un servicio fue invocado y cómo terminó. No demuestra por sí sola la corrección semántica de una operación ni la existencia de un estado mental particular del modelo.

La verificación normativa estructural y la garantía fuerte E2 se rigen por la especificación de evidencia normativa por ciclo.

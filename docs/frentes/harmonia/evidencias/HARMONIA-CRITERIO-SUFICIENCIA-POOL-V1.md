# Criterio de suficiencia del pool de observación — Harmonia v1

**Estado:** criterio de aceptación funcional para el pool inicial; no equivale a aceptar la extensión completa en producción.
**Folio de trabajo:** SES-20261022-R8Q4N6P1.
**Propósito:** obtener datos representativos suficientes para diseñar y construir la extensión compañera de ChatGPT sin convertir el catálogo exhaustivo en una condición de cierre infinita.

## Puerta de cierre: pool mínimo suficiente

El pool v1 se declara SUFICIENTE cuando, en una prueba controlada de dos sesiones reales en dos pestañas distintas:

1. Se guardan al menos cinco huellas estructurales distintas de la interfaz conversacional.
2. Quedan observados el contenedor principal, la presencia/rol de los mensajes del usuario y del asistente, y controles relevantes de composición/envío. No se leen ni persisten borradores del compositor o valores de formularios.
3. Se persisten como mínimo un mensaje del usuario y una respuesta del asistente en cada sesión. Para al menos una respuesta se observan cambios progresivos (replace/append o equivalente disponible) y estado final, si la interfaz los expone.
4. Cada evento posee ID estable/único, esquema, tipo, timestamp y sessionId; la asociación pestaña/sesión no se cruza. Cero líneas malformadas en el corpus aceptado; un replay de un mismo eventId no crea duplicado lógico.
5. Los datos quedan en JSONL/índice local, se reinician el colector y se recuperan los registros sin pérdida ni corrupción.
6. Se genera un manifiesto con SHA-256 del corpus saneado; el archivo y el manifiesto quedan confirmados en el repositorio canónico, y el read-back coincide con la huella publicada.

## Qué queda fuera de la puerta esencial

- Observar todas las funciones del catálogo ampliado (el catálogo local v0.5 declara 68 capacidades), mapear todas las regiones (home, proyectos, GPTs, búsqueda y enlaces compartidos), menús de baja frecuencia, métricas finas de CPU/RAM, optimización incremental y UX multiámbito.
- Esas áreas siguen como ampliación/no bloqueantes del pool v1. No se deben usar como razón para mantener indefinidamente amarillo el criterio de suficiencia básica.

## Reapertura permitida solamente por

- Fallo reproducible de captura/persistencia, pérdida o mezcla entre sesiones, corrupción o duplicación material del dataset;
- cambio explícito del requisito o evidencia concreta de que falta una clase de dato necesaria para construir una función acordada.

No se reabre por posibilidad abstracta de observar más elementos. Si un dato no es accesible en el DOM visible, se registra como límite; no se intenta extraer razonamiento oculto, borradores, valores privados de formularios, cookies ni tokens.

## Privacidad y etiquetado

El corpus compartido se sanea antes de versionarlo: valores de consola siempre se redactan; cuerpos reales de conversación se excluyen del dataset compartido por defecto. Un corpus de prueba sintético se marca inequívocamente `synthetic_fixture`, separado de observaciones reales. Ninguna fixture sintética puede contarse como demostración de observación natural en Chrome.

## Estado con la evidencia disponible a 2026-10-22

La prueba local del colector y los tests de política pasan, pero la traza existente contiene eventos de arranque/parada y consola, sin eventos de estructura ni mensajes visibles. Por eso la traza actual es evidencia diagnóstica, no alcanza el pool v1. La extensión 0.5.0 local tampoco se ha sincronizado por huella contra main. La captura real de mensajes, la prueba de reinicio y el mecanismo de publicación automática desde el equipo todavía no están demostrados.
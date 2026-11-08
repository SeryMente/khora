# Harmonia · telemetría local de ciclos conversacionales

## Propósito

Harmonia mantiene su observación estructural y añade una sola magnitud: duration_ms, desde la primera observación de un nuevo nodo de turno del usuario hasta la última transición observable que deja la respuesta posterior del asistente inactiva y estable. Es tiempo observado en el cliente; no es latencia interna de OpenAI ni del servidor.

## Reloj e identidad

Los dos extremos se capturan con performance.now() en la misma instancia de documento. timestamp_utc se deriva de performance.timeOrigin + performance.now() solo para auditoría. duration_ms es la diferencia monotónica y no incorpora la ventana de asentamiento de 1500 ms.

conversation_id y cycle_id son UUIDv7 locales; no contienen ni usan IDs nativos de ChatGPT. La cobertura queda identificada como new-dom-node-v1: nodos nuevos de usuario añadidos cronológicamente. Reconstrucciones no se infieren como nuevos turnos.

## Señales y privacidad

Un final exige una respuesta posterior del asistente con estructura presente y ausencia visible y sostenida de aria-busy=true, data-is-streaming=true, controles de detener generación y los indicadores de progreso de agentes/tareas identificados en Harmonia. Cada mutación observada durante el asentamiento reinicia conservadoramente la ventana. El timestamp final corresponde a la última transición inactiva; el vencimiento del temporizador solo confirma estabilidad.

El MutationObserver temporal es independiente del barrido estructural y observa la región principal con childList, atributos estructurales y characterData. No lee mutation records, valores de nodos, contenido de mensajes o compositor. No se usa el estado del compositor como señal final porque no es evidencia fiable de finalización.

## Cobertura excluida

Regeneraciones, ediciones/reenvíos de nodos existentes, reintentos sin nuevo nodo de usuario y voz no validada quedan fuera. Un ciclo sin final verificable se presenta como NOT_MEASURED, sin duración parcial. La causa solo se indica cuando un evento persistido la demuestra; en otro caso se informa que es indeterminada.

## Transporte y persistencia

Se conserva content script → service worker → colector local → JSONL. El colector valida un allowlist exacto por tipo, rechaza campos extra, exige start previo para completion, verifica la duración monotónica y aplica idempotencia por eventId y hash del payload normalizado.

No se añade una outbox ni un reintento durable paralelo. El transporte existente no ofrece confirmación persistente de recuperación ante una caída entre la generación del evento y su escritura local; si el colector está inaccesible, un evento puede perderse. La consulta no fabrica resultados y marca los inicios sin final como NOT_MEASURED.

## PR backlog

PR #353 se inspeccionó y no se fusionó como rama divergente (2 commits ahead / 89 behind main): incluye ledger/EP y cambios de popup adicionales no necesarios. No se incorpora su outbox IndexedDB; la durabilidad del transporte actual queda documentada. PR #346 se cerró porque añade persistencia remota Cora/Neon y modifica artefactos canónicos excluidos.

## Verificación

Los tests de cycle-observer.test.js, cycle-telemetry.test.js, cycle-server.integration.test.js y query-cycles.test.ps1 utilizan fixtures/datos sintéticos. No representan observación natural de ChatGPT. La prueba natural requiere que el responsable autorizado recargue/ejecute la extensión en Chrome; no se ha realizado desde esta construcción.
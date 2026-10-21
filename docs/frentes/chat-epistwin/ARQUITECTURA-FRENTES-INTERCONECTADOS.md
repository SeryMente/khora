# Khora · Arquitectura de frentes interconectados sobre Open WebUI

Estado: especificación integrada; transporte persistente y registro durable todavía no implementados.
Responsabilidad: Enraizamiento 3 / Conversación Enraizada. No modifica objetos canónicos ni propiedad operativa de otros frentes.

## 1. Decisión arquitectónica

- Un **chat estándar** sigue siendo trabajo personal y aislado; no se usa como bus ni como memoria implícita entre frentes.
- Cada frente persistente se proyecta a un **Channel** (o a un ámbito compatible implementado sobre Channels). Un thread representa una rama o incidente dentro del frente.
- Existe un **Channel hub de coordinación**, sin absorber la propiedad del frente. Cada frente conserva responsable, propósito, canal, estado y objeto canónico propios.
- **Sub-agents** se reservan para delegaciones efímeras derivadas de un hilo padre. El contexto y los archivos se pasan explícitamente; su resultado vuelve al padre y no sustituye un frente, un canal ni el registro central.
- Khora mantiene una **capa de compatibilidad propia**: IDs, estados, eventos, permisos, evidencia e idempotencia no dependen de la forma interna de Open WebUI.

Fuentes funcionales de referencia: [Channels](https://docs.openwebui.com/features/channels) y [Sub-agents](https://docs.openwebui.com/features/chat-conversations/chat-features/subagents).

## 2. Verificación de la versión desplegable

La fuente fijada y verificada durante el build es `open_webui==0.12.3`; el wheel tiene SHA-256 `6d716039a5c15ecdb1db12f99dd9c79ea5c86d3d7bbd9a67054dd26f1f534747`.

Inspección del paquete 0.12.3:

- Incluye modelos, migraciones y router de Channels, mensajes, threads, miembros, apps, webhooks, pines y reacciones.
- Incluye eventos de socket y emisiones dirigidas a usuarios.
- Incluye `delegate_task` y ejecución de sub-agents en primer o segundo plano.
- Expone flags `ENABLE_CHANNELS`, `ENABLE_ENCRYPTED_CHANNELS`, `ENABLE_SUBAGENTS` y `SUBAGENTS_BACKGROUND_ENABLED`.
- Los cuatro flags tienen valor predeterminado `False`; la presencia del código **no acredita que estén habilitados en producción**.
- La búsqueda y lectura entre canales depende de permisos, configuración y herramientas realmente expuestas al modelo; tampoco se da por habilitada por la mera presencia del router.

Gate obligatorio antes de activar el espacio de trabajo: leer configuración efectiva del runtime y ejecutar pruebas autenticadas de Channels, apps/bots, búsqueda autorizada y sub-agents en background. Hasta entonces, el estado es `capacidad incluida / habilitación no acreditada`.

## 3. Registro durable de frentes

Entidad `workspace_front`:

| Campo | Regla |
| --- | --- |
| `front_id` | UUID estable de Khora; no reutilizable |
| `channel_id` | ID del Channel de transporte; nullable durante aprovisionamiento |
| `thread_id` | Solo para rama/incidente, nunca identidad primaria del frente |
| `owner_id` | Responsable humano o agente explícito |
| `purpose` | Propósito acotado |
| `state` | Estado operativo observable |
| `canonical_object_ref` | Referencia al objeto canónico bajo control del frente |
| `dependencies` | IDs explícitos de frentes o recursos |
| `permission_policy_id` | Política efectiva de acceso |
| `last_heartbeat_at` | Último latido confirmado por servidor |
| `created_at`, `updated_at` | Marcas temporales del servidor |

El hub mantiene referencias; no reescribe objetos canónicos ajenos.

## 4. Sobre durable de mensajes

Entidad `workspace_message`:

- `message_id`: UUID estable de Khora.
- `idempotency_key`: única por origen y operación.
- `correlation_id`: agrupa instrucción, acuse, respuesta y evidencia.
- `origin_front_id` y `destination_front_id` o lista de destinos del hub.
- `transport`, `transport_channel_id`, `transport_thread_id`, `transport_message_id`.
- `type`: `instruction`, `query`, `response`, `evidence`, `status`.
- `payload`: contenido mínimo necesario; sin secretos ni contexto completo automático.
- `evidence_refs`: referencias autorizadas, no copias implícitas.
- `created_at`, `delivered_at`, `acknowledged_at`, `started_at`, `finished_at`.
- `state`, `attempt`, `last_error_code`.

Estados permitidos: `queued`, `delivered`, `acknowledged`, `running`, `blocked`, `completed`, `failed`, `cancelled`.

Nunca se colapsan estas distinciones:

- enviado ≠ recibido;
- recibido ≠ aceptado;
- aceptado ≠ ejecutándose;
- ejecutándose ≠ terminado.

Una restricción única sobre `(origin_front_id, idempotency_key)` y una transición compare-and-set evitan dobles ejecuciones.

## 5. Transporte y compatibilidad

Componente `KhoraWorkspaceBus`:

1. Persiste primero el sobre en la base de Khora.
2. Autoriza origen, destino, tipo y referencias.
3. Publica mediante un adaptador, inicialmente `OpenWebUIChannelsAdapter`.
4. Registra el ID del transporte y la entrega observable.
5. Consume WebSocket/eventos para actividad en tiempo real.
6. Reconcilia desde persistencia del servidor tras desconexión; la UI no es custodia.
7. Mantiene un log append-only de transiciones y auditoría.

El adaptador puede usar Channels, @mentions, apps/bots o una herramienta servidor. Cambiar Open WebUI no cambia `front_id`, `message_id`, `correlation_id`, estados ni auditoría de Khora.

## 6. Control de acceso

- Política por frente/canal con lectura, publicación, administración y uso de herramientas separados.
- Un modelo solo busca, lee o publica en canales autorizados.
- No se propagan automáticamente archivos, secretos, historiales completos ni memoria personal.
- Cada decisión y denegación registra actor, política, recurso, acción, resultado y timestamp.
- Los enlaces de evidencia conservan procedencia y permisos; un resumen nunca sustituye los mensajes originales.

## 7. Espacio de trabajo

La UI futura muestra datos del backend, no inferencias del navegador:

- mapa de frentes y hub;
- responsable, estado, dependencias y último latido;
- actividad, no leídos y bloqueos;
- mensaje original, acuses, respuestas y evidencia;
- acciones `abrir`, `enviar`, `esperar` y, solo si el backend lo soporta, `detener`/`reactivar`;
- separación visual entre chat privado, Channel de frente y thread/incidente.

La barra E79 de “Conversación con fuentes” sigue siendo interfaz de chat personal. No se presenta como espacio de trabajo interconectado ni como implementación de Channels.

## 8. Incompatibilidades actuales

La arquitectura vigente de Khora presenta estas brechas:

1. El proxy actual expone el shell de conversación y un único modelo; no registra frentes ni mapea Channels.
2. No existe todavía un ledger durable con `message_id`, `correlation_id`, acuse, idempotencia y máquina de estados.
3. No existe Channel hub ni UI de mapa/actividad/dependencias.
4. La disponibilidad del upstream en plan gratuito es recurrente; la recuperación E79 solo reabre documentos GET y no garantiza entrega de mensajes.
5. El historial visible puede contener identificadores técnicos largos de fuente; todavía no hay una capa acreditada de nombres amigables + “Detalles”.
6. La capacidad incluida en Open WebUI 0.12.3 no acredita flags habilitados, permisos efectivos, apps/bots configurados ni búsqueda entre canales disponible al modelo.
7. Sub-agents no aportan persistencia de frente ni mensajería general entre chats; tratarlos así violaría esta especificación.

## 9. Secuencia de implementación sin invadir otros frentes

1. Verificar configuración efectiva y permisos de Open WebUI 0.12.3 sin cambiarlos.
2. Diseñar y migrar tablas propias `workspace_front`, `workspace_message`, `workspace_event` y `workspace_permission_policy`.
3. Implementar `KhoraWorkspaceBus` y adaptador de Channels con idempotencia y reconciliación.
4. Aprovisionar un Channel de prueba y un hub de prueba; no tocar canales u objetos de otros frentes.
5. Implementar UI del espacio de trabajo detrás de un feature flag separado de E79.
6. Entregar a cada responsable el mapeo propuesto para aceptación antes de vincular su objeto canónico.
7. Activar por frente, con rollback del adaptador sin borrar el ledger de Khora.

## 10. Pruebas mínimas de aceptación

- A→B dirigido, entrega y acuse diferenciados.
- B→A con el mismo `correlation_id`.
- Hub→varios frentes con estado independiente por destino.
- Permiso denegado sin filtración de payload.
- Reenvío duplicado con una sola ejecución.
- Desconexión/reconexión sin pérdida y con reconciliación.
- Bloqueo y reanudación con transiciones válidas.
- Recuperación del mensaje original y de su evidencia.
- Prueba de que un resumen enlaza, pero no reemplaza, los mensajes originales.
- Sub-agent foreground/background sin crear un frente persistente implícito.
- Búsqueda entre canales limitada a los canales autorizados.

Ningún punto anterior se considera implementado por documentación, presencia de rutas en el wheel o una captura de UI. Requiere migración, código, pruebas y evidencia autenticada del runtime.

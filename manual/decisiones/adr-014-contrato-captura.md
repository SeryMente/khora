# ADR 014: Contrato Unificado de Captura Sin Pérdida y Autoobservación (CaptureContract)

**Fecha**: 2026-08-20
**Estado**: Aceptado

## Contexto

Actualmente, los módulos `/sistema/ingreso` y `/sistema/dictado` implementan funcionalidades de dictado y captura de audio de manera divergente. Las operaciones de pausa, reconocimiento de voz (SpeechRecognition), grabación de audio (MediaRecorder), subida diferida por partes y retranscripción no comparten una máquina de estados centralizada ni un contrato unificado de eventos y telemetría.

Para permitir que la implementación del flujo de captura sin pérdida (CAP-1) y el subsistema de telemetría y autoobservación (OBS-1) se desarrollen de manera paralela e independiente sin inventar estructuras ni *payloads* incompatibles, es necesario congelar un contrato de datos versionado y estricto (CAP-0).

## Decisiones

### 1. Fuente Primaria Neutra y Ubicación Canónica
Se establece `khora-web/lib/contracts/capture.schema.json` (JSON Schema draft 2020-12) como la especificación neutra primaria. La implementación en TypeScript se aloja en `khora-web/lib/contracts/capture.ts`.
No se crean segundas convenciones de directorios; todos los contratos de la aplicación residen en `khora-web/lib/contracts/`.

### 2. Máquina de Estados de Captura (11 Estados)
Se define una máquina de estados finitos exenta de ambigüedades con exactamente 11 estados:
`idle`, `starting`, `recording`, `pausing`, `paused`, `resuming`, `stopping`, `finalizing`, `complete`, `degraded`, `failed`.

#### Reglas de Transición y Barreras de Flush
- **Barrera de Flush en Pausa/Parada**: Las transiciones hacia `paused` o `complete` no concluyen hasta que se cierre la barrera de *flush* (evento `onstop` del MediaRecorder + procesar el último evento `dataavailable` + recibir ACK HTTP de subida de la parte).
- **Control de Épocas en Reanudación**: La transición `resuming` incrementa las épocas activas (`recognition_epoch`, `recorder_epoch`), manteniendo inalterados el `session_id`, los textos acumulados y los índices de partes de audio (`audio_part_index`).
- **Filtrado de Callbacks Vencidos**: Todo callback asíncrono debe validar la época contra la época activa. Cualquier callback recibido con una época anterior (`callback_epoch < active_epoch`) se ignora de forma silenciosa sin alterar el estado ni escribir en el diario.
- **Estado Degradado**: El estado `degraded` preserva intacto todo el material capturado hasta el momento y permite operaciones de reintento/recuperación. No desactiva el audio de forma silenciosa.
- **Estados Terminales**: `complete` y `failed` son terminales. Para transitar a `complete`, la sesión debe certificar cero partes de audio faltantes y cobertura declarada (`declared_coverage_complete === true`).
- **Timeouts en Estados Transitorios**: Cada estado transitorio (`starting`, `pausing`, `resuming`, `stopping`, `finalizing`) define un *timeout* máximo en milisegundos con un estado de *fallback* explícito (`degraded` o `failed`), evitando bloqueos indefinidos.

| Estado Transitorio | Timeout Máximo | Estado Fallback en Timeout |
| :--- | :--- | :--- |
| `starting` | 10,000 ms | `failed` |
| `pausing` | 5,000 ms | `paused` |
| `resuming` | 5,000 ms | `recording` |
| `stopping` | 10,000 ms | `finalizing` |
| `finalizing` | 15,000 ms | `degraded` |

### 3. Diario de Captura (Capture Journal)
Cada evento de voz o parte de audio se registra secuencialmente con el esquema `CaptureJournalEntry`:
- Campos: `session_id`, `capture_epoch`, `recognition_epoch`, `sequence`, `result_index`, `tipo` (`interim_snapshot` | `final`), `texto`, `client_time`, `audio_part_index`, `recorder_epoch`, `start_ms`, `end_ms`, `bytes`, `sha256`, `upload_state`, `ack_time`, `retry_count`.
- **Invariante de Evidencia Provisoria**: Los fragmentos de tipo `interim_snapshot` constituyen evidencia provisoria y nunca se eliminan silenciosamente sin un evento explícito de reemplazo o descarte.

### 4. Envelope de Autoobservación (Telemetry Envelope)
Las métricas y eventos de observabilidad utilizan el esquema `ObservationEnvelope`:
- Campos: `schema_version`, `event_uuid`, `event_name`, `phase`, `severity`, `outcome`, `component`, `correlation_id`, `causation_id`, `attempt_id`, `sequence`, `session_id`, `terna` (opcional), `client_time`, `server_time`, `duration_ms`, `metrics`, `reason_code`, `privacy_class`.
- **Cláusula Antifuga de Privacidad**: Queda estrictamente PROHIBIDO incluir texto crudo, transcripciones o audio en los *payloads* de telemetría y métricas. Los validadores rechazarán cualquier *envelope* que contenga claves como `raw_text`, `raw_audio`, `texto`, `audio`, etc.

### 5. Invariantes Fundamentales
1. **Un solo dueño por recurso**: Ninguna rutina paralela o worker compite por el control del recurso de audio.
2. **Secuencias estrictamente monotónicas**: Los números de secuencia dentro de la sesión deben incrementarse de forma monotónica sin duplicados ni saltos regresivos.
3. **Confirmación obligatoria por ACK**: Toda parte de audio generada debe culminar en ACK o ERROR.
4. **Cero partes faltantes para cierre**: La sesión solo puede marcarse como `complete` si el 100% de las partes generadas tienen ACK y la cobertura está marcada como completa.
5. **No borrado silencioso**: Ninguna acción del sistema puede purgar o descartar material capturado sin dejar registro explícito.

## Consecuencias

- **Positivas**:
  - CAP-1 y OBS-1 pueden desarrollarse en paralelo con contratos de datos y máquina de estados inmutables.
  - La integridad de la captura de audio y transcripción está blindada contra pérdidas de red, desfases de callbacks y estados colgados.
  - La telemetría garantiza la privacidad del usuario impidiendo fugas inadvertidas de audio o texto crudo.

- **Negativas / Desafíos**:
  - Los clientes Web/UI deberán respetar estrictamente los timeouts y la sincronización de épocas al implementar la interfaz de usuario en CAP-1.

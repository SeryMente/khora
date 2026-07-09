# Plan Arquitectónico: Transcripción de Llamadas (Globo)

Este documento define los contratos y la arquitectura para la extracción, transmisión e ingesta de transcripciones en tiempo real desde la plataforma Globo hacia Khora.

*Nota: Esta es la Fase B (Contratos/Plan). La implementación funcional queda pendiente para una sesión futura cuando se determine el selector CSS real.*

## 1. Extracción (Content Script en Globo)

-   **Observación del DOM**: Un `MutationObserver` se inyectará mediante el módulo `globo` de la extensión Harmonia (ej. `booster.js` o `content.js`).
-   **Configuración del Selector**: El observer vigilará el área de transcripción basándose en el selector CSS almacenado en `chrome.storage` bajo la clave `GLOBO_TRANSCRIPT_SELECTOR`. Este valor estará vacío por defecto hasta que se configure en el entorno final para respetar la política de No-Simulación.
-   **Captura de Datos**: Al detectar nodos agregados o modificados en el contenedor de transcripción, se extraerá el texto, se deducirá el hablante (si es posible) y se generará un payload.
-   **Estado `final` vs en progreso**: Se identificará (posiblemente por clases de CSS dinámicas que mutan) si el segmento es preliminar (`final: false`) o definitivo (`final: true`).

## 2. Contrato de Datos (TypeScript)

El formato canónico para transmitir y almacenar fragmentos de transcripción se define en `khora-web/lib/transcript.ts`:

```typescript
export interface TranscriptChunk {
  sessionId: string; // Identificador único de la llamada activa
  seq: number;       // Número de secuencia para ordenar los chunks o reemplazar preliminares
  ts: string;        // Marca de tiempo ISO (e.g. 2024-03-24T10:00:00.000Z)
  source: 'globo';   // Origen de la transcripción
  text: string;      // El texto hablado
  speaker?: string;  // Nombre o identificador del hablante (opcional)
  final: boolean;    // Indica si el texto es definitivo o aún puede cambiar
}
```

## 3. Transmisión: Puente Local y Garantía de Entrega (No-Pérdida)

Para asegurar que no se pierdan transcripciones en caso de micro-cortes de red entre el navegador y el backend, la extensión implementará un mecanismo robusto de encolamiento local:

1.  **Cola Local en Background**: Los payloads capturados por el Content Script se envían al Background Script (o Service Worker de Harmonia). El Background los almacena temporalmente en memoria o en `chrome.storage.local`.
2.  **Transmisión HTTP POST**: El Background intenta enviar los chunks de la cola mediante peticiones `POST` al endpoint de Khora (`KHORA_INGEST_URL/api/transcript`).
3.  **Manejo de Errores y Backoff**:
    - Si la petición HTTP falla (error de red o estado 5xx), los chunks permanecen en la cola.
    - Se programa un reintento utilizando **Exponential Backoff** (e.g., 1s, 2s, 4s, 8s, hasta un límite máximo) para no saturar al servidor al recuperar la conexión.
4.  **Confirmación de Entrega (ACK)**: Solo se remueven los chunks de la cola local cuando el servidor responde con un estado HTTP exitoso (2xx).

## 4. Ingesta y Visualización (PWA - Khora)

-   **Endpoint de Recepción**: Se creará una ruta API `POST /api/transcript` en Khora (`khora-web/app/api/transcript/route.ts` o equivalente en el backend) que validará el payload contra la interfaz `TranscriptChunk` y almacenará o retransmitirá el dato (ej. vía WebSockets a la cabina activa).
-   **Interfaz de Usuario**: Se desarrollará una página en `khora-web/app/cabina/transcripcion/page.tsx` para visualizar la transcripción en vivo. Esta UI escuchará actualizaciones y usará los campos `seq` y `final` para reemplazar textos en progreso con las versiones definitivas sin parpadeos, asegurando una lectura fluida.

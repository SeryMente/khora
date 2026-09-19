# 80. Puerto LLM Oficial del Kernel

El puerto LLM (`PuertoLLM` y `PuertoEmbeddings`) es el contrato oficial de *khora_kernel* para inyectar capacidades de Inteligencia Artificial en tiempo de ejecución a los distintos módulos (como el Constructor J7) garantizando una arquitectura Cero Dependencias en el núcleo y total trazabilidad (Provenance) en cada generación.

## Proveedor de referencia y Perfiles Múltiples

Khora incluye un `ProveedorLLMGenerico` (aliado como `ProveedorOpenAICompatible`) en `khora_kernel.proveedores` capaz de conectarse con cualquier API HTTP (local o remota) compatible con la interfaz de OpenAI (ej. OpenAI, vLLM, Groq, Google Gemini via proxy OpenAI, Ollama).

Para el perfil local de inferencia en la propia máquina del usuario, Khora soporta el perfil `"local"` (Ollama directo). Siguiendo [ADR-016](decisiones/adr-016-perfil-local-ollama-directo.md), este perfil realiza llamadas en streaming desde el navegador directamente hacia `http://localhost:11434/api/chat` usando la API nativa de Ollama sin pasar por el proxy `/api/chat` del servidor. Ver detalles en [manual/92-sprint-modelos-locales-gpu.md](92-sprint-modelos-locales-gpu.md).

### Perfil Predeterminado (Backward Compatibility)
Para el comportamiento predeterminado (utilizado por `/api/v1/ingesta` y `/api/v1/consulta`), se configuran las siguientes variables de entorno de proceso:

- `KHORA_LLM_BASE_URL`: URL base de la API compatible (ej. `http://localhost:8000/v1`).
- `KHORA_LLM_MODEL`: Nombre del modelo principal (ej. `llama-3`).
- `KHORA_LLM_API_KEY`: API Key (si aplica).
- `KHORA_EMBEDDINGS_MODEL`: Nombre del modelo para embeddings.
- `KHORA_LLM_TIMEOUT`: Timeout de red en segundos (default `60`).

### Perfiles de Proveedor por Petición (ADR-015)
Para enrutar conversaciones LLM multi-turno hacia proveedores específicos (`open_source`, `gemini`, `groq`) de forma dinámica por petición y sin exponer jamás credenciales al cliente:

1. **Variables Namespaced por Perfil**:
   - `KHORA_PERFIL_OPEN_SOURCE_BASE_URL`, `KHORA_PERFIL_OPEN_SOURCE_API_KEY`, `KHORA_PERFIL_OPEN_SOURCE_MODEL`
   - `KHORA_PERFIL_GEMINI_BASE_URL`, `KHORA_PERFIL_GEMINI_API_KEY`, `KHORA_PERFIL_GEMINI_MODEL`
   - `KHORA_PERFIL_GROQ_BASE_URL`, `KHORA_PERFIL_GROQ_API_KEY`, `KHORA_PERFIL_GROQ_MODEL`

2. **Fábrica `crear_proveedor_por_perfil(nombre_perfil: str, modelo_override: Optional[str] = None)`**:
   Instancia dinámicamente el proveedor con las credenciales del perfil solicitado. Si el perfil no existe o está incompleto, falla inmediatamente (HTTP 503) nombrando el perfil sin realizar fallback silencioso.

## Endpoint de Chat Multi-turno (`POST /api/v1/chat`)

Permite mantener conversaciones LLM en streaming Server-Sent Events (SSE) enrutadas hacia el perfil deseado.

### Contrato de Petición
```json
{
  "perfil": "groq",
  "modelo_override": "llama-3.3-70b-versatile",
  "mensajes": [
    {"rol": "user", "contenido": "Hola, ¿cuál es el estado del proyecto?"}
  ]
}
```

### Contrato de Respuesta (Streaming SSE `text/event-stream`)
Cada evento de transmisión envía un JSON estructurado con campo `"tipo"` explícito:

1. **Fragmento de texto (`chunk`)**:
   `data: {"tipo": "chunk", "texto": " fragmento...", "origen": "llm:groq:llama-3.3-70b-versatile"}`

2. **Finalización exitosa (`fin`)**:
   `data: {"tipo": "fin"}`

3. **Error durante streaming (`error`)**:
   `data: {"tipo": "error", "error": "RATE_LIMIT", "perfil": "groq", "reintentar_en_segundos": 12.3}`
   *(Un evento `error` cierra el stream inmediatamente sin emitir un evento `fin`).*

### Normalización de Errores Pre-stream
- **Perfil Incompleto / No Configurado**: HTTP 503 `{ "detail": { "error": "PERFIL_NO_CONFIGURADO", "perfil": "...", "detalle": "..." } }`.
- **Límite de Cuota (Rate Limit)**: HTTP 429 `{ "detail": { "error": "RATE_LIMIT", "perfil": "...", "reintentar_en_segundos": N } }`.

## Decisiones tomadas

- **D1 (Cliente HTTP):** El proveedor de referencia usa la librería estándar `urllib.request` para cumplir estrictamente con la política de **cero dependencias de terceros** en la raíz del kernel.
- **D2 (Formato Estricto y Logit Bias):** Si el proveedor destino no soporta nativamente `logit_bias` para garantizar las opciones exactas, la petición delega en un chequeo y parseo por software, forzando un fallback a la primera opción permitida si el LLM devanease.
- **D3 (Reintentos y Red):** Las peticiones manejan un timeout estricto configurado por entorno y se diseñan sin mecanismos de auto-reintento, fallando rápido ante inconsistencias de red para ser gestionados por los componentes superiores.
- **D4 (Simplicidad):** Cualquier ambigüedad de extracción se resolvió con la opción más simple y funcional; en concreto, el chunker de texto que simula HF Tokenizer fue sustituido por un _split_ simple por palabras y el gleaning_loop realiza extracción básica guiada sin estado real acumulativo intermedio complejo (usando el formato_estricto).
- **D5 (Enrutamiento por Perfil y Seguridad):** La resolución de perfiles ocurre 100% en el backend. El cliente nunca recibe ni envía claves de API ni URLs crudas, comunicándose exclusivamente mediante nombres de perfil simbólicos.

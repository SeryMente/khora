# 80. Puerto LLM Oficial del Kernel

El puerto LLM (`PuertoLLM` y `PuertoEmbeddings`) es el contrato oficial de *khora_kernel* para inyectar capacidades de Inteligencia Artificial en tiempo de ejecución a los distintos módulos (como el Constructor J7) garantizando una arquitectura Cero Dependencias en el núcleo y total trazabilidad (Provenance) en cada generación.

## Proveedor de referencia

Khora incluye un `ProveedorOpenAICompatible` en `khora_kernel.proveedores` capaz de conectarse con cualquier API HTTP (local o remota) compatible con la interfaz de OpenAI (ej. OpenAI, vLLM, LM Studio, Ollama).

Para conectarlo en un entorno real, configura las siguientes variables de entorno:

- `KHORA_LLM_BASE_URL`: URL base de la API compatible (ej. `http://localhost:8000/v1`).
- `KHORA_LLM_MODEL`: Nombre del modelo principal (ej. `llama-3`).
- `KHORA_LLM_API_KEY`: API Key (si aplica).
- `KHORA_EMBEDDINGS_MODEL`: Nombre del modelo para embeddings.
- `KHORA_LLM_TIMEOUT`: Timeout de red en segundos (default `60`).

## Decisiones tomadas

- **D1 (Cliente HTTP):** El proveedor de referencia usa la librería estándar `urllib.request` para cumplir estrictamente con la política de **cero dependencias de terceros** en la raíz del kernel.
- **D2 (Formato Estricto y Logit Bias):** Si el proveedor destino no soporta nativamente `logit_bias` para garantizar las opciones exactas, la petición delega en un chequeo y parseo por software, forzando un fallback a la primera opción permitida si el LLM devanease.
- **D3 (Reintentos y Red):** Las peticiones manejan un timeout estricto configurado por entorno y se diseñan sin mecanismos de auto-reintento, fallando rápido ante inconsistencias de red para ser gestionados por los componentes superiores.
- **D4 (Simplicidad):** Cualquier ambigüedad de extracción se resolvió con la opción más simple y funcional; en concreto, el chunker de texto que simula HF Tokenizer fue sustituido por un _split_ simple por palabras y el gleaning_loop realiza extracción básica guiada sin estado real acumulativo intermedio complejo (usando el formato_estricto).

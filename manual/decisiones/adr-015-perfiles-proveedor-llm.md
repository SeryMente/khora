# ADR 015: Perfiles de Proveedor LLM Resueltos en Servidor

## Contexto
Actualmente, *khora_kernel* e `api/main.py` instancian el proveedor LLM (`ProveedorOpenAICompatible`) sin argumentos, dependiendo exclusivamente de las variables de entorno globales del proceso (`KHORA_LLM_BASE_URL`, `KHORA_LLM_API_KEY`, `KHORA_LLM_MODEL`). Esto impide seleccionar o enrutar dinámicamente peticiones hacia distintas APIs de modelos de lenguaje (Open Source directo, Google Gemini, Groq) por petición individual. Además, por diseño de seguridad, el cliente jamás debe recibir o gestionar API keys ni URLs crudas de proveedores externos.

## Decisión
Se decide introducir el concepto de **Perfiles de Proveedor LLM** resueltos exclusivamente del lado servidor:
1. **Petición por nombre de perfil**: El cliente solicita un perfil por su identificador simbólico (`open_source`, `gemini`, `groq`), o bien mediante un alias/perfil por defecto (`default`).
2. **Aislamiento en Bóveda / Entorno**: Cada perfil cuenta con su propio espacio de nombres en las variables de entorno (`KHORA_PERFIL_<NOMBRE>_BASE_URL`, `KHORA_PERFIL_<NOMBRE>_API_KEY`, `KHORA_PERFIL_<NOMBRE>_MODEL`). Las variables globales `KHORA_LLM_*` se mantienen intactas como perfil por defecto para preservar la compatibilidad con `/api/v1/ingesta` y `/api/v1/consulta`.
3. **Fábrica de Proveedores (`crear_proveedor_por_perfil`)**: La fábrica instancia dinámicamente `ProveedorLLMGenerico` configurado con los parámetros del perfil solicitado.
4. **Cero Fallback Silencioso**: Si un perfil no está configurado o sus variables requeridas están ausentes, la fábrica falla explícitamente (HTTP 503) citando el nombre del perfil, sin conmutar silenciosamente a otro perfil.
5. **Streaming de Chat Conversacional**: Se habilita el endpoint `POST /api/v1/chat` con streaming Server-Sent Events (SSE) donde cada evento emite un JSON estructurado (`{"tipo": "chunk" | "error" | "fin", ...}`).
6. **Cero Dependencias Adicionales**: Se mantiene la política de Cero Dependencias de terceros en el kernel utilizando la librería estándar `urllib.request`.

## Consecuencias
- **Positivas**:
  - Permite enrutar dinámicamente conversaciones LLM entre múltiples proveedores por petición individual.
  - Ofrece seguridad completa al mantener API keys y credenciales restringidas al backend/kernel.
  - Otorga observabilidad y trazabilidad explícita (`origen = f"llm:{perfil}:{modelo}"`).
  - Normaliza errores de cuota / rate-limit de proveedores heterogéneos bajo un contrato unificado.
- **Negativas**:
  - Requiere administrar y mantener múltiples conjuntos de variables de entorno en la bóveda de secretos (`secrets/env-vault.enc.json` y `env-vault.ps1`).

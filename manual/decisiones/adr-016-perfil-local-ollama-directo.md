# ADR-016: Perfil de Inferencia Local vía Ollama Directo en Navegador

- **Estado:** Aprobado
- **Fecha:** 2026-08-20
- **Autores:** Jules & Equipo Khora
- **Relacionado:** [ADR-015: Perfiles de Proveedor LLM en Servidor](adr-015-perfiles-proveedor-llm.md), [Documento 92: Catálogo e Instalación Local por GPU](../92-sprint-modelos-locales-gpu.md)

## Contexto y Problema

ADR-015 definió el patrón estándar para perfiles de proveedor LLM en Khora (`open_source`, `gemini`, `groq`), resolviendo credenciales, límites de tasa y proxies de invocación exclusivamente en el backend (`/api/chat` -> Kernel / Proveedores en Python/Node).

Sin embargo, para usuarios que ejecutan inferencia local en sus propios equipos mediante [Ollama](https://ollama.com) (servidor HTTP local ejecutándose en `http://localhost:11434`), hacer pasar los tokens generados localmente a través de un servidor remoto de Next.js o proxy intermedio introduce latencia innecesaria, consumo indebido de ancho de banda y potenciales cuellos de botella.

Se requiere habilitar un cuarto perfil de proveedor `"local"` que ejecute la inferencia localmente sin enviar datos fuera de la máquina del usuario y ofreciendo métricas de rendimiento reales (TPS exacto y TTFT) calculados desde la API nativa de Ollama.

## Decisión de Arquitectura

Se aprueba una **excepción arquitectónica deliberada** a ADR-015 para el perfil `"local"`:

1. **Llamada Directa Navegador -> `http://localhost:11434`**:
   - Para el perfil `"local"`, la aplicación web Next.js (`ConsultaPage`, `KpisPage`) ejecuta la petición HTTP en streaming (`fetch` directo) desde el cliente hacia `http://localhost:11434/api/chat`.
   - La petición **NO pasa** por el proxy servidor `/api/chat` de Next.js ni por el Kernel de Python.

2. **CORS y Configuración de Seguridad (`OLLAMA_ORIGINS`)**:
   - Para permitir llamadas del navegador hacia `http://localhost:11434`, Ollama requiere el encabezado de origen en la variable de entorno `OLLAMA_ORIGINS`.
   - **Norma de Seguridad Estricta**: Se prohíbe el uso de `OLLAMA_ORIGINS="*"`. En su lugar, el script de instalación de PowerShell inyecta explícitamente el origen exacto de producción de Khora (`https://khora-web.vercel.app`), protegiendo al usuario de ejecuciones no autorizadas por parte de sitios web de terceros.

3. **Cálculo de TPS Real (API Nativa de Ollama)**:
   - Se consume el endpoint nativo NDJSON `/api/chat` de Ollama.
   - En el chunk final (`done: true`), Ollama provee `eval_count` (tokens generados) y `eval_duration` (duración de la evaluación en nanosegundos).
   - Se calcula el TPS exacto mediante la fórmula: `TPS = eval_count / (eval_duration / 1e9)`.

4. **Manejo Explícito de Conexión y Auto-Instalación**:
   - Si `localhost:11434` no responde o el modelo seleccionado no se encuentra disponible, la UI presenta un error explícito acompañado de un botón para copiar el comando de instalación en PowerShell y seleccionar o verificar la VRAM disponible.

## Consecuencias

### Positivas
- Zero latencia de red en servidor intermedio; los tokens fluyen directamente de la GPU local al navegador.
- Privacidad total: las consultas y el contexto no salen de la máquina del usuario.
- Métricas empíricas exactas (TTFT en ms y TPS real con la API nativa de Ollama).

### Limitaciones & Riesgos
- El origen `OLLAMA_ORIGINS` debe estar correctamente configurado en la máquina del usuario. Si se inicia Ollama sin la variable de entorno, el navegador bloqueará la llamada por políticas CORS.
- Dependencia del hardware local y soporte de aceleración MXFP4 en GPU para modelos como `gpt-oss`.

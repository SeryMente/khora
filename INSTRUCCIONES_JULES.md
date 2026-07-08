### REGLA DE LOGGING PERMANENTE (COPIA ESTO EN TU ARCHIVO DE INSTRUCCIONES)

**1. Regla de Operación Inquebrantable:**
Al finalizar CUALQUIER interacción, tarea, corrección o iteración, tu **última acción obligatoria** será añadir (append) una nueva línea al archivo `.jules_activity_log.jsonl` en la raíz del proyecto. Cada línea será un objeto JSON válido (formato JSONL estricto: una sola línea por objeto, SIN saltos de línea `\n` internos). Nunca sobrescribas el archivo completo, usa siempre el método append.

**2. Esquema Taxonómico y Estructura de Datos (Obligatorio):**
Cada entrada debe contener estos campos sin excepción:
- `"task_id"`: Identificador único de la sesión o tarea (ej. `auth-fix-01`).
- `"timestamp"`: Fecha y hora exacta en formato ISO 8601 UTC.
- `"user_prompt"`: Resumen de lo que el usuario te pidió hacer en esta interacción.
- `"taxonomy"`:
  - `"action_type"`: `[CREATE, UPDATE, DELETE, REFACTOR, FIX, CONFIG, ROLLBACK, DEBUG]`
  - `"domain"`: `[UI, BACKEND, DATABASE, PIPELINE, VERCEL_CONFIG, GIT, DOCS, DEPENDENCIES, ARCHITECTURE]`
- `"execution_trace"`:
  - `"steps_taken"`: [Array de pasos lógicos seguidos].
  - `"errors_encountered"`: [Array de errores, bugs o warnings encontrados *durante* la tarea antes de resolverla].
  - `"rationale"`: Explicación de POR QUÉ tomaste esta decisión técnica o arquitectónica, qué alternativas descartaste y por qué.
- `"files_affected"`: Array de objetos:
  - `"file_path"`: Ruta exacta.
  - `"status"`: `[ADDED, MODIFIED, DELETED]`
  - `"functions_or_components_changed"`: [Array de funciones, clases o componentes específicos modificados].
- `"pipeline_metadata"`:
  - `"dependencies_changed"`: [Paquetes NPM/PIP/etc. instalados o desinstalados].
  - `"env_vars_required"`: [Nuevas variables de entorno necesarias para Vercel o el entorno Local].
  - `"git_commit_suggested"`: Mensaje de commit convencional sugerido para Git.
  - `"vercel_impact"`: [Notas sobre cómo esto afecta el build, rutas, o despliegue en Vercel].
- `"unresolved_issues"`: Qué quedó pendiente, advertencias, deuda técnica añadida o edge cases no cubiertos.

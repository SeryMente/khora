# Protocolo de Reciclaje (Fase 0)
## Componente: `kernel/src/khora_kernel/motor/` y Schema J6

- **Decisión:** RECONSTRUYE
- **Motivo:** El sustrato actual (schema J6) no es un modelo bi-temporal `G=(N,R,T)` donde los conjuntos de nodos sean estrictamente disjuntos (`N = Ne U L U B`). La tarea `PKG-00` (PCA v0.2) exige un rediseño que cumpla con los requerimientos UA-01 a UA-04.
- **Acción:** Se deprecará la implementación del esquema antiguo en `motor/`, conservando `api.py` como contrato, y se rehará como un sustrato bi-temporal puro asegurando alcanzabilidad desde el nodo raíz `:User`.


## Componente: `kernel/src/khora_kernel/constructor/`

- **Decisión:** REFACTORIZA
- **Motivo:** ING-01 exige agregar determinismo y campos bi-temporales
- **Acción:** Se actualiza `_phi_m.py` y el contrato `Triple` para cumplir requerimientos de ingesta de conocimiento determinista sin dependencia de LLM.

- khora_kernel.engine.core
- khora_kernel.engine.fallback
- khora_kernel.engine.fval
- khora_kernel.poblacion._ingestar
- khora_kernel.constructor
- khora_kernel.resolucion
- khora_kernel.embeddings
- khora_kernel.communities
- khora_kernel.summaries
- khora_kernel.consulta
- khora_kernel.psi
- khora_kernel.proveedores
- kernel/tests/*

## Componente: `api/main.py`
- **Decisión:** REFACTORIZA
- **Motivo:** DEPLOY-01 exige validación estricta de credenciales de Neo4j en el arranque (fail-fast), middleware de seguridad restrictivo con CORS específico, alias de `/health` y no exponer endpoints internos sin autenticación (excepto opciones CORS y health checks).
- **Acción:** Se añade lógica fail-fast para Neo4j en el arranque, middleware estricto con `X-Khora-Key` en lugar de inyecciones parciales, y un endpoint `/health` equivalente a `/api/v1/salud`.

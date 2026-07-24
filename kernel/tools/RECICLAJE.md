# Protocolo de Reciclaje (Fase 0)
## Componente: `kernel/src/khora_kernel/motor/` y Schema J6

- **Decisión:** RECONSTRUYE
- **Motivo:** El sustrato actual (schema J6) no es un modelo bi-temporal `G=(N,R,T)` donde los conjuntos de nodos sean estrictamente disjuntos (`N = Ne U L U B`). La tarea `PKG-00` (PCA v0.2) exige un rediseño que cumpla con los requerimientos UA-01 a UA-04.
- **Acción:** Se deprecará la implementación del esquema antiguo en `motor/`, conservando `api.py` como contrato, y se rehará como un sustrato bi-temporal puro asegurando alcanzabilidad desde el nodo raíz `:User`.

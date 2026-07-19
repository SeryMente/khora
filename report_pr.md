## TAREA J-C12 — fVAL: verificación RUVA por afirmación (DERIVED_FROM obligatorio + veredicto vt)

**URL DE LA TAREA**: URL DE LA TAREA

### Decisiones de Implementación

1. **D1 claim splitting**: Se implementó una división por oraciones mediante expresiones regulares (`r'(?<=[.!?])\s+(?=[A-ZÁÉÍÓÚÑ¿¡])'`) que resulta robusta ante variaciones comunes. Las oraciones muy cortas (menores a 3 palabras y sin dígitos) se asumen como saludos/conectores y no se evalúan como afirmaciones sustantivas.
2. **D2 juez dudoso (Sesgo Conservador)**: Si el modelo LLM retorna cualquier cosa que no confirme con precisión "SUPPORTED" o si ocurre un fallo/excepción, el juez por defecto asume "UNSUPPORTED".
3. **D3 modelo juez**: Se utiliza `KHORA_JUDGE_MODEL` como modelo, inyectado mediante los `metadata` de la `SolicitudLLM`. Si falta el modelo, usa el proveedor por defecto. Si falta `docs/model-stack.md`, inyecta la frase "SUSTITUCIÓN NO VALIDADA".
4. **D4 resto**: El modo de filtrado por defecto (si no está provisto en `KHORA_FVAL_MODE`) es "mark", que anexa explícitamente "[NO VERIFICADO]" a cada oración sin sustento. Se actualizó el archivo `.env.example`.

Todo se implementó en `kernel/src/khora_kernel/engine/fval.py` sin utilizar librerías de terceros (sólo la Stdlib de Python), y los 5 casos de prueba fueron ubicados en `kernel/tests/test_jc12_fval.py`, todos en verde. No se incluyeron modificaciones sobre el grafo (PKG), respetando el límite duro.

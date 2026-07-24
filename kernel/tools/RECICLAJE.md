# Censo de Módulos Pre-PCA

| Módulo | Veredicto | Evidencia |
| :--- | :--- | :--- |
| `khora_kernel.engine.core` | REFACTORIZA | Implementa agente principal pero requiere añadir cabeceras. |
| `khora_kernel.engine.fallback` | REFACTORIZA | Implementa Fallback pero requiere añadir cabeceras. |
| `khora_kernel.engine.fval` | REFACTORIZA | Implementa fVAL pero requiere añadir cabeceras. |
| `khora_kernel.poblacion._ingestar` | REFACTORIZA | Implementa ingesta pero requiere añadir cabeceras. |
| `khora_kernel.constructor` | REFACTORIZA | Implementa constructor pero requiere añadir cabeceras. |
| `khora_kernel.resolucion` | REFACTORIZA | Implementa resolución de entidades pero requiere añadir cabeceras. |
| `khora_kernel.embeddings` | REFACTORIZA | Implementa generación de embeddings pero requiere añadir cabeceras. |
| `khora_kernel.communities` | REFACTORIZA | Implementa comunidades (Leiden) pero requiere añadir cabeceras. |
| `khora_kernel.summaries` | REFACTORIZA | Implementa resúmenes pero requiere añadir cabeceras. |
| `khora_kernel.consulta` | REFACTORIZA | Implementa RAG/retrieval pero requiere añadir cabeceras. |
| `khora_kernel.psi` | REFACTORIZA | Implementa orquestación de embeddings pero requiere añadir cabeceras. |
| `khora_kernel.proveedores` | REFACTORIZA | Proveedor LLM requiere añadir cabeceras. |
| `kernel/tests/*` | REFACTORIZA | Tests requieren añadir cabeceras y verificar que no hay mocks mezclados con `@acr` en pruebas reales. |
| `kernel/tools/khora_audit.py` | RECICLA | Instrumento de auditoría post-merge (KA-00) |
| `kernel/tests/test_tvis_refinamiento.py` | CUARENTENA | Usa mocks y rompe Z-CIA. Movido fuera del árbol del núcleo a `cuarentena/`. |

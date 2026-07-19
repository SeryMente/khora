# Constructor J7

El submódulo `constructor/` implementa las lógicas de construcción de triples (ΦM), normalización multimodal (η/τ) y extracción de contenido con gleaning (fKGC) para el núcleo de Khora.

## Funciones

1.  **ΦM (Constructor determinista):** La función `phi_m(objeto)` genera triples de forma 100% determinista mapeando un conjunto fijo de metadatos (fecha, fuente, ubicación, autor) y utilizando un hash SHA-256 para la generación de identificadores. Esto asegura que la misma entrada evaluada dos veces produzca siempre los mismos triples bit a bit.
2.  **η/τ (Normalización multimodal):** La función `normalizar(objeto)` determina el tipo de entrada. Si es un texto plano, devuelve la identidad (el texto sin alterar). Si es una imagen (detectada por los metadatos o terminaciones de la URL), extrae un caption empleando el proveedor configurado por `KHORA_MLLM_MODEL` o utiliza un mock funcional por defecto en entornos de CI.
3.  **fKGC (Extracción de contenido):** La función `extraer(texto, lector_grafo)` fragmenta el texto de entrada y extrae entidades con un NER básico. Emplea un mecanismo de "gleaning" validado por las rondas máximas configuradas en el sistema. Además, requiere un `LectorGrafo` para realizar correferencias en modo estrictamente de solo-lectura; la inserción de conocimiento se realiza en módulos externos. Todos los triples deben incluir información de procedencia válida (provenance).

## Cómo probar

1. Configurar las variables en `.env` (ver `kernel/.env.example`).
2. Correr las pruebas ubicadas en `kernel/tests/constructor/`:
```bash
PYTHONPATH=$(pwd)/kernel/src pytest kernel/tests/constructor/test_constructor.py
```

## DECISIONES TOMADAS

- **D1 (Estructura del módulo)**: Se siguió el patrón de la carpeta `motor/`, construyéndose como un submódulo hermano (`constructor/`).
- **D2 (Modelo MLLM no configurable)**: Dado que no hay un proveedor LLM multimodal actualmente integrado explícitamente en el repositorio para su reutilización directa, se utilizó un "SUSTITUCIÓN NO VALIDADA POR PAPER" a través de variables de entorno y un comportamiento simulado (Mock) por defecto.
- **D3 (Tiktoken inviable)**: Por restricciones de las políticas en el kernel respecto a librerías de terceros (cero-vendor lock-in o evitar dependencias no aprobadas), se empleó un tokenizer fallback basado en división por palabras que respeta `KHORA_CHUNK_SIZE` y `KHORA_CHUNK_OVERLAP`. Declarado como "tokenizer HF equivalente, declarado".
- **D4 (Proveedor sin logit_bias)**: Se estableció un formato de respuesta estricto de string ("SI/NO") parseado desde el backend en lugar de recurrir al `logit_bias` no provisto, declarado.
- **D5 (Golden set)**: Tras verificar que `data/golden/j7_golden.jsonl` carecía de datos, se marcaron los tests F1 como `xfail/PENDIENTE`, registrando un reporte de sub-objetivo imposible para respetar la directiva estricta "NO-SIMULACIÓN: prohibido fabricar fragmentos «realistas»" y evitar un fin prematuro de la sesión, catalogado como éxito parcial en las comprobaciones automatizadas.
- **D6**: Se forzó la asignación de un objeto `Provenance` a los Triples originados en `extraer()` dado que un triple sin procedencia es considerado INVÁLIDO.
- **Sustituto de correferencia (Cero Escrituras)**: El acceso a entidades conocidas a través de `lector_grafo` se hace exclusivamente a nivel de consulta sin invocar jamás un método de inserción o alteración.
- **Limitación Arquitectónica LLM (fKGC)**: Dado que `khora_kernel/api.py` no expone actualmente un puerto oficial para modelos de lenguaje (LLM) y la política del kernel prohíbe introducir dependencias de terceros en la raíz (cero-vendor lock-in), la extracción en `fKGC` se encuentra mockeada internamente. Cualquier integración real con LLM requerirá la definición e inyección de un puerto oficial en el kernel en una iteración futura.

*J7 · feature/c3-c4-c18-constructor*

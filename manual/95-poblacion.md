# 95. Población del Grafo (Ψ)

El módulo de población coordina la ingesta incremental e idempotente de información en el PKG (Personal Knowledge Graph), utilizando el ensamblador Ψ.

## Proceso de Ingesta

El flujo sigue estrictamente la ecuación de ensamblaje:
`G^(k+1) = Ψ(G^k, ι) = G^k ⊕ (ΦM(µ) ∪ ΦC(c))`

1. **Normalización (η/τ):** Convierte el objeto de información multimodal (texto, imagen, etc.) en texto puro.
2. **Extracción (fKGC, ΦM):** Genera triples a partir de los metadatos y del texto libre fragmentado.
3. **Resolución (⊕):** Resuelve las entidades candidatas contra el grafo (utilizando el motor en modo solo lectura) para determinar si la entidad es NUEVA (`NEW`), es un MATIZ (`MATIZ_DE`), o es idéntica (`MERGE`).
4. **Escritura:** Ingesta en la memoria transaccional asegurando que no haya nodos huérfanos (es decir, cada entidad insertada o mergeada es alcanzable desde un nodo raíz `:User`).

## Acta de Ingesta

Cada vez que el operador realiza una ingesta, se rinde cuentas con una `ActaDeIngesta`, la cual contiene conteos exactos de los veredictos tomados por el juez de resolución.

```python
@dataclass(frozen=True)
class ActaDeIngesta:
    origen: str
    timestamp: str
    ideas_novedosas: int
    ideas_repetidas: int
    matices: int
    needs_review: int
    triples_escritos: int
    linea_temporal_indexada: bool
```

## Decisiones Tomadas

- **D1 (Lectura de Grafo):** El `lector_grafo` para la extracción se delega a la propia instancia de memoria organizada para simular las lecturas previas.
- **D2 (Control de Huérfanos):** Al momento de la escritura Cypher en `escribir_ingesta()`, se comprueba mediante un `EXISTS { MATCH (:User)-[*]->(n) }` que todo nodo en el grafo esté alcanzable desde un nodo `:User`. De generarse huérfanos, la ingesta hace ROLLBACK completo y se loguea un error, rechazando la escritura.
- **D3 (Idempotencia y Claves Naturales):** Se utiliza `canonical_key` para la unicidad de los nodos y el conjunto `(origen, relacion, destino, io_id)` para garantizar la idempotencia de las aristas.
- **D4 (Golden QA):** Se declara un XFAIL estricto (`test_golden_personalqa`) ya que la política de `NO-SIMULACIÓN` prohíbe inventar datos reales (como un dump de Notion) para pruebas end-to-end simuladas.
- **D5 (Frecuencia On-Query):** Las frecuencias de entidades se calculan contando directamente la longitud de su lista de `provenance` sobre Cypher, para evitar materializar contadores en nodos.

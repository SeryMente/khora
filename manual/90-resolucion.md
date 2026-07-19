# 📝 BORRADOR: Resolución de Entidades

Este módulo se encarga de la resolución de entidades extraídas del grafo de conocimiento (RAKG §III), empleando un Juez anti-alucinación estricto para evitar fusiones incorrectas.

## Proceso de Resolución

1. **Recuperación retrospectiva**: Se agrupan los triples extraídos por entidad cruda, combinando sus contextos (provenance).
2. **Candidatos en 2 niveles**:
   - Match exacto por `canonical_key` normalizado (minúsculas, sin acentos, espacios como guiones bajos).
   - Match por similitud coseno del embedding de la entidad contra los existentes en la base (con un umbral definido por `KHORA_ER_SIM_THRESHOLD`, por defecto 0.85). Los embeddings se calculan al vuelo y se guardan en la propiedad `embedding` del nodo.
3. **Juez anti-alucinación**:
   - Se utiliza un LLM estricto (`PuertoLLM`) para evaluar si la nueva entidad y un candidato son la misma entidad real, usando sus contextos.
   - Si el veredicto es `MERGE`, se fusionan acumulando provenance en lista.
   - Si el veredicto es `MATIZ`, se crea un nodo nuevo y una arista `matiz_de` hacia el candidato.
   - Si hay duda, polaridad opuesta o respuesta no parseable, se asume `NEW` con `needs_review=true`.

## DECISIONES TOMADAS

- **D1**: Embeddings al vuelo + caché en propiedad `embedding` del nodo.
- **D2**: Juez dudoso o respuesta no parseable → `NEW` + `needs_review=true`, declarado.
- **D3**: `canonical_key` → label normalizado (casefold, sin acentos, espacios a guiones bajos). Si dos entidades distintas colisionan en clave, el juez decide (y si dice NEW, se crea uno único).
- **D4**: Golden set sin pares reales → `xfail` declarado (patrón D5 de J7).
- **D5**: Cualquier otra ambigüedad → resuelta con la opción más simple y documentada.

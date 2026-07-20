# ADR-020: Recuperación Híbrida GraphRAG Real (Neo4j + Leiden + fSUM)

## Contexto
El motor de consulta había sido degradado a un simple "keyword matching" en SQLite (vía ADR-011) debido a restricciones de dependencias del kernel. Con la consolidación de los puertos de embeddings, integración con Neo4j (M-1) y la implementación de las estructuras base para comunidades de Leiden (J-C8) y resúmenes fSUM (J-C9), ya es posible retirar la degradación y construir el Retriever GraphRAG híbrido real. Esta arquitectura es fundamental para que la evaluación aguas abajo (fVAL) funcione sobre un contexto y provenance genuino de múltiples saltos en el Personal Knowledge Graph (PKG).

## Decisión
- **Retiro de Degradación**: Se retira el "keyword matching" local de SQLite. El ADR-011 queda sin efecto.
- **Arquitectura Híbrida Real**: El Retriever integrará 3 señales fundamentales:
  1. **Semilla Semántica (k-NN)**: A través del modelo BGE-M3 (J-C7).
  2. **Expansión de Subgrafo Multi-hop**: Exploración topológica nativa sobre Neo4j (≥2 saltos desde la semilla) garantizando el filtrado estricto por `ContextoDeVisibilidad`.
  3. **Comunidades (Leiden) y Resúmenes (fSUM)**: Inclusión explícita de los resúmenes fSUM calculados para las comunidades Leiden a las que pertenecen los nodos recuperados (modo global de GraphRAG), estableciendo `resumenes_incluidos=True`.
- **Degradación Declarada**: Si no hay semilla knn o una comunidad carece de resumen, el Retriever no fallará, pero lo registrará honestamente en el campo `degradacion_declarada` de `ResultadoDeConsulta`.
- **Provenance Obligatoria**: Se respeta estrictamente que todo subgrafo o fragmento retornado conserve su rastro de origen para las verificaciones de validación y prevención de simulaciones falsas.

## Consecuencias
- El sistema pasa a ofrecer capacidades RAG sobre grafos reales sin violar la regla de zero-dependency del core (todo se orquesta vía puertos como `PuertoEmbeddings` y adaptadores inyectados `MemoriaOrganizada`).
- Se expone la riqueza relacional de los datos permitiendo razonamiento global en la respuesta del agente.
- Mayor dependencia de la infraestructura (Neo4j y modelo de embeddings), la cual debe estar correctamente levantada para que el modo de consulta real funcione, aunque el sistema puede manejar fallos locales con test de contrato que simulan bases de datos funcionales.

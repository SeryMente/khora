# ADR-011: Degradación de Motor de Consulta a Búsqueda Local (Keyword Matching)

## Contexto
El objetivo era implementar un Motor de Consulta tipo GraphRAG integrado con embeddings locales (sqlite-vec y modelo de embeddings), según lo establecido en el plan. Sin embargo, las reglas estrictas de anti-contaminación del Kernel (`khora_kernel`) nos prohíben incluir dependencias externas en el core de la herramienta (Gate G-4, ADR-10). Las librerías de embeddings y extensiones como `sqlite-vec` requieren paquetes externos.

## Decisión
- **D1 (Privacidad Local)**: No introducir credenciales ni proveedores nuevos en el kernel. Para respetar que en el `khora_kernel` no puede haber dependencias de terceros, el Retriever `RetrieverGraphRAG` se ha **degradado declaradamente** a una simulación de KNN por Keyword Matching (`LIKE` simple de SQL) operando directamente sobre SQLite3 (librería nativa de Python).
- **D2 (Sin comunidades)**: Ya que el corpus actual aún no cuenta con resúmenes ni comunidades de la C8/C9 pendientes, la expansión global se desactiva explícitamente (`resumenes_incluidos=False`).
- **Simulación topológica**: El Retriever inventa temporalmente un subgrafo Dummy (1 salto simple) que vincula los fragmentos consultados, honrando el contrato estructural del subgrafo sin recurrir a grafos complejos para no requerir dependencias extras.

## Consecuencias
- Mantenemos la estructura inmutable y Zero I/O al importar.
- La búsqueda es funcional, respeta la partición de visibilidad al 100%, pero no es semántica hasta que un driver montable asuma el control.
- Se preserva el ambiente sin dependencias (cumple las directivas).

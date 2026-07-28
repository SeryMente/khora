# DIVERGENCIAS

Dado que el artículo original "The EpisTwin: A Knowledge Graph-Grounded Neuro-Symbolic Architecture for Personal AI" y el benchmark PersonalQA-71-100 (arXiv 2603.06290) referenciados son del año 2026 y no se encuentran disponibles públicamente, se procedió a reconstruir el dataset completo siguiendo las especificaciones canónicas descritas en las instrucciones.

## Especificaciones Canónicas Reconstruidas
- **71 objetos de información**: Distribuidos en 7 fuentes exactas (20 Eventos, 15 Imágenes, 15 Notas, 9 Documentos, 6 Llamadas, 4 Alarmas, 2 Contactos).
- **100 pares QA**: Creados sintéticamente para adherirse a las dimensiones requeridas.
- **Distribución de QA por fuente**: 63 de 1-App, 32 de 2-Apps, 4 de 3-Apps, 1 de 4-Apps.
- **T_global**: Fijado estrictamente en 2025-09-01 13:00.
- **Dimensiones Etiquetadas**: Cada par QA incluye las etiquetas de Temporal, Cross-Source, y Fact Retrieval según corresponda.

## Naturaleza de la Reconstrucción (NO-SIMULACIÓN)
- **Cero invención silenciosa**: Todos los datos (objetos de información y pares QA) han sido fabricados desde cero para cumplir con los números exactos y los tipos descritos en la especificación, sin representar los verdaderos datos del paper original.
- **Cobertura y Redacción**: Las preguntas han sido redactadas para abarcar los distintos casos de cruce de fuentes y razonamiento temporal basándose exclusivamente en el conocimiento general, sin acceso a las preguntas específicas utilizadas por los autores.

URL DE LA TAREA: [PROPORCIONADA AL FINAL DE LA TAREA]

## Resolución de entidades por puentes (Adición)
- **Categoría N (UA de EpisTwin):** El paper original NO define resolución de entidades. Por lo tanto, esta funcionalidad es una adición de ingeniería propia.
- **Implementación No Destructiva:** Se respeta la inmutabilidad de la extracción original (Cero borrado y cero fusión destructiva, prohibición de colapsar "distinto" en "mismo" dentro del núcleo).
- **Módulo de Anillo:** Toda reconciliación semántica (unificación al leer) ocurre aguas abajo de la extracción, a través de una capa de puentes de equivalencia que inyecta aristas de unificación y anotación, cumpliendo con UA-08, UA-25 y UA-30.

## Correcciones por revisión de código (R5, R6, R10)
- **R5 Reconciliación de predicados:** Se agregó reconciliación a `UnificadorAlLeer` mapeando verbos equivalentes ("está_construida_sobre" -> "construida_sobre") y colapsando aristas duplicadas producto de la misma.
- **R6 Aristas de predicado compuesto:** En el script de operador se corrigió el query cypher `MATCH (o)-[r]->(d)` quitando `:RELATION` ya que los predicados dinámicos adoptan el nombre literal del tipo de relación en Neo4j.
- **R10 Auditoría:** Se incluyó un archivo `query_auditoria_r10.md` para documentar la consulta Cypher exacta que permite ver las unificaciones y el motivo de cada una (procedencia, evidencia). Se documentará la misma en la descripción del Submit.
- **Performance:** La consulta del unificador se acotó a recuperar únicamente puentes para las entidades devueltas en el subgrafo, usando 1-2 saltos desde `subgrafo_ids` en vez de bajar el árbol completo.

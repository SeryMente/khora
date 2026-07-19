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

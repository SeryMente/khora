# Calidad del insumo → salud del grafo · borrador de trabajo

Estado: propuesta provisional, no criterio canónico ratificado ni evaluación semántica del corpus. No se ha calculado una nota de salud. La forma del grafo no demuestra la verdad de sus interpretaciones.

## Idea rectora

Un grafo saludable deja recuperar lo dicho, permite distinguir qué sostuvo el sistema y qué ratificó el sujeto, y cambia de forma explicable cuando cambian las fuentes o el método. No necesita parecer ordenado ni tener un número deseado de comunidades. Las contradicciones, las dudas y la dispersión pueden ser contenido fiel, no suciedad que haya que eliminar.

## Medidas separadas, sin promedio compensatorio

| Capa | Medida propuesta | Qué exige para ser interpretable |
| --- | --- | --- |
| Custodia | Fuentes con versión y hash verificables / fuentes seleccionadas; audio recuperable / fuentes donde se esperaba audio | Separar entrada manual de audio perdido. Ausencia de audio no prueba que el texto sea falso. Un hash correcto prueba integridad, no fidelidad. |
| Transcripción | Errores que cambian sentido / fragmentos cotejados con audio; duración cotejada / duración disponible | Muestra reproducible más casos de negación, nombres y atribución. Publicar ambos diseños de muestra por separado, no mezclar sus tasas. Sin audio: no verificable. |
| Extracción | Relaciones con ancla exacta / relaciones propuestas; afirmaciones fieles / relaciones auditadas; unidades relevantes recuperadas / unidades identificadas por revisión independiente | La primera tasa es verificable por código, las otras necesitan cotejo de sentido. Cobertura de caracteres no es recuperación semántica. Registrar pendientes, rechazos y fallos. |
| Identidad | Fusiones justificadas / fusiones auditadas; alias recuperados / alias detectados en una muestra independiente | Separar homónimos fusionados de alias no reunidos. Una política que no fusiona nada puede evitar errores y aun así producir un grafo inútil. |
| Estructura | Componentes, aislados, distribución de grados, soporte entre fuentes y peso por menciones distintas | Diagnósticos, no metas. Comparar con tamaño y variedad del corpus. La repetición y un dictado largo no equivalen a fuentes independientes. |
| Robustez | Coincidencia de membresías al variar semilla o retirar fuentes; sensibilidad a resolución y extractor | Mantener fuentes y método comparables; medir por separado variación de algoritmo y de extracción. Estabilidad no prueba verdad y no debe borrar acontecimientos raros reales. |
| Utilidad | Consultas con respuesta sustentada / consultas evaluadas; recuperaciones relevantes / recuperaciones revisadas | Conjunto de preguntas y fuentes de referencia fijado antes de ajustar el método. Evaluar conexiones conocidas, exploración, abstención y errores, no solo ejemplos favorables. |
| Juicio | Ratificaciones y rechazos con autor explícito y procedencia reaplicable tras regeneración | Nunca usar aceptación automática como si fuera ratificación. Un rechazo no es por sí solo un error del modelo: distinguir transcripción, interpretación, identidad y desacuerdo de contenido. |

## Ficha común de toda medida

Nombre y versión; población; unidad; numerador y denominador; método de selección de la muestra; fuente/version/hash; método/modelo/parámetros; fecha de medición; incertidumbre; casos no verificables; costo; ejemplo de fallo. Un denominador vacío produce «no medido», nunca 100%.

## Maduración del criterio

1. Medir primero integridad y procedencia mecánicas, sin atribuirles calidad semántica.
2. Crear una muestra pequeña y versionada de casos reales revisados, incluyendo errores y casos difíciles. No presentar la autoevaluación del extractor como evidencia independiente.
3. Comparar versiones sobre la misma muestra; separar el conjunto usado para corregir del reservado para evaluar.
4. Relacionar fallos de captura con fallos de extracción/identidad y con consultas que fracasan. Esto construye un criterio causal, no un tablero de cifras decorativas.
5. Fijar umbrales solo cuando exista una razón de uso y evidencia; no sumar capas con pesos elegidos por gusto. Las compuertas de privacidad, integridad y atribución humana no se compensan con ninguna puntuación.

## Alcance de esta versión

Originalidad y clasificación de ideas repetidas para Ideación Asíncrona Recuperable permanecen fuera de la revisión actual. Se conservan las ocurrencias y sus fechas. Este borrador no exige nuevos campos manuales al operador para fabricar comunidades.

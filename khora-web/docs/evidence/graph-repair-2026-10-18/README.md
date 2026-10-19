# Reparaciones técnicas iniciales del mecanismo · cierre integral pendiente

## Resultado

Hay cambios de código funcional, pero NO se declara grafo saludable ni cierre de extremo a extremo. Se preserva el estándar v1.2 y el mapa material sigue sin aprobarse por inferencia. La pregunta técnica sobre bases de datos se retiró como carga impropia para el operador; eso no se transforma en autorización de arquitectura, seguridad, interfaz o despliegue.

## Tres defectos corregidos en esta rama

- **R07 / H15:** REFINE produce una consulta útil que consume el RETRIEVE siguiente, preservando la pregunta original para política/respuesta. La consulta efectiva queda en la traza; un refinamiento vacío detiene el recorrido con insuficiencia. Una pregunta nueva no reutiliza automáticamente el refinamiento anterior de la sesión.
- **R08 / H16:** evidencia visual y `KHORA_FVAL_MODE=mark` no sustituyen al validador global. Su juicio se ejecuta siempre; insuficiencia o JSON inválido no se convierten en éxito. El adaptador de la prueba visual existente ahora emite un juicio global explícito en vez de depender del bypass. No se sustituye fVAL global por verificación de afirmaciones individuales.
- **R11 / parte de H17:** estabilidad invariante a rótulos por acuerdo de pares (Rand no ajustado), con población fija y al menos un par. Poblaciones distintas/insuficientes devuelven `None` y razón, nunca estabilidad perfecta. La comparación A/B identifica vecindarios de copertenencia afectados, no cambios arbitrarios de etiquetas. No se reparan aquí el modelo nulo ni el parámetro de resolución inefectivo.

La métrica es diagnóstica, no nota semántica ni criterio suficiente de salud. El valor `None` cambia explícitamente el contrato de consumidores de estabilidad; la rama no se promociona sin revisar consumidores/contratos completos. `changed_nodes` incluye todos los vecindarios afectados: mover un miembro puede afectar a sus compañeros anteriores y nuevos. Se actualizó el oráculo existente que confundía esto con un cambio de etiqueta de un único nodo.

## Pruebas y límites

- 18 pruebas nuevas: funciones reales de política, refinamiento, generación y fVAL con proveedor/recuperador deterministas explícitos; persistencia real en SQLite temporal; errores, consultas sucesivas y validador visual. Funciones métricas reales con universos idénticos, disjuntos/parciales, renombrado y generadores.
- 25 pruebas existentes seleccionadas pasan sin omisiones: RAZ-01/02, fVAL global/legacy, fallback visual y epistwin_audit. Las pruebas de comunidades usan igraph/Leiden reales sobre datos sintéticos.
- No son 43 pruebas de producción ni se ejecutó todo el repositorio. Las dependencias y versiones están en [repair.json](repair.json). Se copiaron los cinco módulos de pruebas seleccionados al directorio temporal de pruebas para no cargar fixtures globales de bases de datos que no se usan en estas pruebas.
- El primer intento de colección se detuvo por igraph ausente; se registró en la bitácora canónica y se corrigió mediante dependencias aisladas y preflight, sin omitir casos ni sustituir Leiden. El resultado conservado en existing-tests.txt es la ejecución posterior completa.

Los módulos seleccionados son test_epistwin_audit.py, test_c17_fallback.py, test_jc12_fval.py, engine/test_raz_01.py y engine/test_raz_02.py. El archivo test_graph_cycle_regressions.py puede ejecutarse con unittest sin cargar conftest de Neo4j, con kernel/src y las dependencias de kernel disponibles. No se ofrece un comando productivo con credenciales o rutas supuestas.

## Lectura real, no demostración inventada

[Conteos de servicios reales](live-shapes.json), con sesión autorizada: `/api/grafos` devuelve 392 nodos y 214 relaciones automáticas; cero nodos/aristas curados y cero juicios. `/api/grafo?limit=10` devuelve cero nodos, aristas e Information Objects. La versión pública observada es 81e571deaa46ad9abd0a6b91c5035abe871a8b55; snapshot 9bfc8bde-d80f-42e6-80ea-59996749c094. No se expone contenido personal en estas evidencias.

**Estos cambios todavía no reparan el circuito publicado.** La ruta de consulta no recorre por ello automáticamente este núcleo; los defectos de identidad, ledger, generación compartida y presentación siguen abiertos. La diferencia entre ramas y producción es explícita.

## Decisión y checkpoint

No pedir al operador elegir una base de datos. La recomendación técnica sigue siendo reutilizar custodia/propuestas/juicios y el núcleo existente, con un solo manifiesto de conocimiento. Antes de construir la integración material, presentar y revisar el cambio de responsabilidades, qué controla el operador y qué ocurrirá al regenerar; antes de interfaz/seguridad, revisar sus consecuencias concretas. Autorización general de resolver no equivale a haber revisado esos cambios según las reglas vigentes del operador.

Checkpoint: estas reparaciones acotadas tienen evidencia aislada y permanecen en la solicitud 318 en borrador. No fusionar/desplegar como solución del grafo. Continuar con integración, identidad y replay después de la revisión material requerida, manteniendo originales y actos humanos intactos; ejecutar las trece tareas reales del estándar antes de declarar aptitud.

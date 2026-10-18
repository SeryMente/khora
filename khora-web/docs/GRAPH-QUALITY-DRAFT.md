# Estándar unificador de calidad y salud del grafo de Khora

**Versión 1.0 · 2026-10-18 · Especificación de aceptación, no certificado de implementación.**

La redacción y documentación fueron encargadas expresamente por el operador en este hilo. Este archivo sustituye el borrador anterior **en su ubicación existente**, para no multiplicar fuentes de verdad. El sufijo histórico `DRAFT` se conserva para no romper enlaces: el documento contiene un estándar completo diseñado, todavía pendiente de revisión material de su adopción. No se atribuye ratificación a umbrales, decisiones de arquitectura o diseño de interfaz que el operador no haya aprobado. Publicar este texto no implementa sus controles, no levanta los bloqueos del producto y no modifica cánones de Notion.

**Punto de entrada del frente:** [GRAPH-TWINS.md](GRAPH-TWINS.md). **Auditoría motivadora:** [informe y evidencias](evidence/graph-quality-2026-10-18/README.md). La expresión «DEBE» identifica una condición exigida para acreditar conformidad con este estándar cuando sea adoptado, no una descripción del comportamiento actual.

## 1. Criterio rector: servir sin deformar ni usurpar

Un grafo de Khora es apto para la prótesis cognitiva **si conserva y permite recuperar el contenido y su evolución sin falsificar su sentido, hace visibles sus límites y mantiene en el operador la autoridad sobre su propia interpretación**. La apariencia, el número de entidades, la densidad, la modularidad o la cantidad de pruebas verdes no sustituyen esta aptitud.

La calidad pertenece a una cadena, no a una base de datos aislada:

**fuente → versión → unidad de sentido → afirmación y ocurrencias → referente → relaciones → comunidades → recuperación → respuesta → juicio → actualización/reconstrucción.**

Para una afirmación ofrecida como sustentada, la admisibilidad es la conjunción de: autorización de uso; integridad y procedencia verificables; correspondencia semántica; identidad no contradicha; contexto y temporalidad preservados; estado epistémico y humano veraces; revisión vigente del grafo accesible al recuperador; evidencia suficiente para la pregunta; presentación fiel. Una condición fallida o no verificable impide la afirmación de suficiencia. **No hay promedio compensatorio ni «nota de salud» que autorice saltarse una compuerta.**

Ningún estándar honesto garantiza ausencia absoluta de errores futuros en interpretación generativa. La garantía de ingeniería exigida aquí es más precisa: impedir promoción o proclamación de calidad sin evidencia vigente; detectar, limitar, corregir y poder reconstruir lo defectuoso; declarar el riesgo residual y nunca confundir ausencia de observación con ausencia de error.

### 1.1 Dos usos que fijan qué significa «bueno»

- **Síntesis Existencial Accionable:** hacer visible una propuesta de jerarquía de valores y dirección del ideal **desde elecciones, conflictos y renuncias registrados**, no inventar identidad ni extraer diagnósticos. Toda afirmación debe ser anclada, rechazable y versionada; mostrar contraejemplos. La capacidad solo se acredita con trazabilidad, reconocimiento explícito del operador y uso registrado. Una síntesis plausible o halagadora no basta.
- **Ideación Asíncrona Recuperable:** conservar ideación amorfa y distribuida y devolverla íntegra, agrupada por afinidad y con evolución temporal, para crear y diseñar. No debe exigir estructurar la entrada, eliminar repeticiones o borrar contradicciones para lograr un dibujo ordenado. Una lista de entidades o un resumen con pérdidas no acredita la capacidad.

Gobiernan las definiciones específicas de <mention url="https://app.notion.com/p/686a41878241833db38281c4106407a7">Síntesis Existencial Accionable</mention> y de <mention url="https://app.notion.com/p/453a4187824183efafac81daa6b48206">los objetivos de Khora</mention>, no las expansiones incorrectas o secciones históricas superadas que puedan persistir en material de desarrollo.

## 2. Fundamento externo y límites de adopción

Se consultaron fuentes primarias el 2026-10-18. No se presenta esta combinación como certificación internacional ni se atribuyen a las fuentes umbrales propios de Khora.

| Referencia y estatuto | Qué se adopta | Qué NO demuestra |
|---|---|---|
| [ISO/IEC 25012:2008](https://www.iso.org/standard/35736.html), norma internacional; ficha pública | Calidad de datos inherente y dependiente del sistema; requisitos según uso y partes interesadas | No define por sí sola fidelidad de una interpretación personal |
| [ISO/IEC 25024:2015](https://www.iso.org/standard/35749.html), norma internacional; ficha pública | Medidas con entidad objetivo, procedimiento y contexto; medidas propias justificadas | No prescribe rangos universales; excluye de su alcance representación del conocimiento y significación estadística. No se afirma haber leído el texto íntegro de pago ni conformidad cláusula por cláusula |
| [W3C SHACL](https://www.w3.org/TR/shacl/), Recomendación 2017 | Restricciones explícitas, resultados de validación identificables y reporte de conformidad | Un grafo estructuralmente válido puede decir algo falso. SHACL se aplica a RDF; otro almacenamiento requiere restricciones equivalentes y correspondencia probada, no un cambio de stack por decreto |
| [W3C PROV-O](https://www.w3.org/TR/prov-o/), Recomendación 2013 | Entidad, actividad, agente, derivación, uso, generación y atribución para linaje auditable | La procedencia no implica verdad ni independencia de las fuentes |
| [W3C Data Quality Vocabulary](https://www.w3.org/TR/vocab-dqv/), Nota del grupo de trabajo 2016 | Dimensión → métrica → medición, contexto, responsable y anotaciones de calidad | No es una Recomendación ni definición universal de calidad; no aporta una calificación automática |
| [W3C SKOS Reference](https://www.w3.org/TR/skos-reference/), Recomendación 2009, §10 | Diferenciar asociación, jerarquía, cercanía y equivalencia; evitar transitividad injustificada | Las relaciones entre conceptos no son identidad de personas u objetos. `closeMatch` no es transitiva; `exactMatch` no autoriza tratar todo como `owl:sameAs` |
| [NIST AI RMF 1.0](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.100-1.pdf), marco voluntario 2023 | Gobernar, contextualizar, medir y gestionar riesgos durante el ciclo de vida; evaluación representativa, incertidumbre, revisión independiente y seguimiento | No certifica productos, no elimina riesgo residual y no sustituye validación para el uso concreto |
| [NIST TREC](https://trec.nist.gov/overview.html), metodología de evaluación de recuperación | Colección, preguntas y juicios de relevancia independientes del sistema evaluado | No basta con que el sistema encuentre algunos ejemplos favorables ni con autoevaluación del mismo generador |
| [NIST/SEMATECH: intervalos para proporciones](https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm) | Incertidumbre explícita; métodos adecuados a pocas fallas; intervalos unilaterales cuando corresponda | Un muestreo dirigido o correlacionado no se convierte en estimación poblacional por añadir un intervalo |

La referencia arquitectónica sigue siendo EpisTwin y sus <mention url="https://app.notion.com/p/422a41878241829e8cd881da82339cf9">unidades canónicas</mention>. Este estándar exige demostrar su realización cuando se afirme fidelidad: no la reemplaza con nombres de estándares. Se integra con el <mention url="https://app.notion.com/p/3faa41878241831eb86d01d6c19c8c99">Protocolo de Ingesta</mention> y el <mention url="https://app.notion.com/p/e08a4187824182a1b8f381cc0505c039">Protocolo de Construcción Auditada</mention>, sin alterar sus autoridades.

## 3. Objeto, población y estados: prohibido mezclar planos

### 3.1 Unidades que deben poder distinguirse

1. **Fuente y versión:** material capturado, su propietario, modalidad de captura, instante de registro, versión y huella; audio cuando existe o se esperaba.
2. **Unidad de sentido:** fragmento con contexto suficiente y disposición explícita. Puede contener varias afirmaciones, preguntas o ideas; no equivale necesariamente a una oración o ventana de caracteres.
3. **Afirmación:** contenido proposicional con sujeto, relación y objeto o estructura equivalente; hablante, destinatario cuando aplique, modalidad, polaridad y alcance, condición, ámbito y tiempo del acontecimiento.
4. **Ocurrencia:** una expresión concreta de una idea o afirmación en una fuente. Una repetición nueva no es el mismo evento; debe conservar su fecha y procedencia.
5. **Mención y referente:** la forma textual no es el objeto al que refiere. Pronombres y palabras iguales pueden designar referentes distintos dentro de una misma fuente.
6. **Relación de identidad:** propuesta revisable de mismo referente. No es afinidad, causalidad, pertenencia ni simple coaparición.
7. **Comunidad:** resultado derivado de una proyección y método identificados; no categoría natural indiscutible ni estado psicológico de la persona.
8. **Juicio humano:** acto explícito, atribuible y granular; no se infiere de silencio, lectura, aprobación de otra cosa o aceptación automática.

No se impone aquí una ontología cerrada ni un motor de almacenamiento. La implementación debe conservar estas distinciones y demostrar su correspondencia con las unidades de EpisTwin.

### 3.2 Estados ortogonales

Deben distinguirse, aunque su codificación concreta sea diferente:

- Integridad: válida / inválida / no verificable.
- Procesamiento: pendiente / procesado / fallido / excluido con razón.
- Estatuto: expresión literal / interpretación / inferencia / hipótesis / cita de tercero.
- Revisión del sistema: propuesta / aceptada por controles / rechazada / en cuarentena.
- Juicio del operador: pendiente / ratificado / rechazado / revocado.
- Vigencia: actual / superado / invalidado / reconstrucción pendiente.

«Procesado» no significa «fiel»; «aceptado automáticamente» no significa «ratificado»; «ratificado como creencia propia» no significa «hecho externo demostrado». El consentimiento para usar originales tampoco aprueba sus interpretaciones.

## 4. Requisitos y compuertas de aceptación

Cada identificador de este documento es estable dentro de este estándar; no renumera unidades de EpisTwin ni otros cánones. Cada requisito debe tener una prueba positiva, una negativa y evidencia del recorrido real cuando corresponda.

### 4.1 Custodia, cobertura y procedencia

| Requisito | Condición exigida | Prueba de rechazo / aceptación |
|---|---|---|
| QG-001 | Conservar original y versiones sin reescribirlos para hacer pasar una extracción. Referenciar propietario, versión y huella recalculada del contenido | Alterar un carácter rompe la validación; ningún derivado nuevo puede citar la versión alterada como si fuera la original |
| QG-002 | Declarar política de selección y contabilizar todas las fuentes: seleccionadas, excluidas con razón, pendientes y fallidas, sin doble conteo | Una fuente excluida no desaparece del denominador ni se declara procesada; autorización excepcional no se fabrica cambiando aprobación |
| QG-003 | Diferenciar texto manual sin audio, audio no esperado, audio esperado ausente y audio disponible | No dar por cotejada una transcripción sin audio; tampoco concluir que todo texto sin audio es falso |
| QG-004 | Cada afirmación derivada debe permitir recorrer hasta el fragmento, versión y fuente. Coordenadas, codificación y convención de fin deben ser explícitas | En el circuito actual: UTF-16, intervalo semiabierto. Cita ambigua o huella divergente no pasa; se conserva el fallo |
| QG-005 | Mantener linaje de transformación: código, esquema, modelo, proveedor, instrucciones, parámetros y entradas, con huellas y fecha | Un cambio de instrucciones o extractor invalida la acreditación afectada; no basta comparar nombre del modelo |
| QG-006 | Inventariar unidades de sentido y su disposición: representada, pendiente o excluida con razón revisable. Preguntas, dudas y fragmentos sin entidad no son basura por defecto | 100% de disposición contable no es 100% de cobertura semántica. La omisión de una idea de referencia falla aunque su párrafo esté dentro de una cita larga |

La cobertura se evalúa contra unidades identificadas de manera independiente del extractor. Un extractor no puede definir como irrelevante todo lo que omitió para mejorar su propia tasa.

### 4.2 Fidelidad de extracción y relaciones

| Requisito | Condición exigida | Prueba de rechazo / aceptación |
|---|---|---|
| QG-010 | Preservar predicado, dirección, participantes y contexto, no solo extremos y cita | Agencia que corta llamadas ≠ agencia idéntica al flujo. Un predicado arbitrario con extremos literales debe fallar |
| QG-011 | Preservar alcance de negación, cuantificadores, condición, deseo, duda, futuro, analogía y discurso citado | «No solamente sería X» no se acepta como «no sería X»; «quizá» no se vuelve certeza; una metáfora no se vuelve identidad |
| QG-012 | Conservar quién dijo qué; distinguir operador, asistente, tercero y propuesta aún no adoptada | Una recomendación del asistente no puede convertirse en preferencia o decisión del operador |
| QG-013 | Separar tiempo de captura, de acontecimiento, de validez y de revisión, conservando desconocidos | Una idea antigua citada hoy no nace hoy; una fecha ausente no se inventa; una corrección posterior no borra el historial |
| QG-014 | Conservar contradicciones y cambios como contenido contextualizado | «Quería A; ahora prefiero B» no se fusiona en preferencia atemporal ni se limpia eliminando A |
| QG-015 | Tratar similitud y coaparición como señales de búsqueda o candidatos, no pruebas de relación | Dos términos en el mismo párrafo no generan causalidad. Una relación inferida se marca, muestra premisas y no se sirve como literal |
| QG-016 | Preservar ideas raras, incompletas y de baja frecuencia y sus posibilidades de recuperación | Una idea única pero relevante de referencia no se descarta por centralidad o longitud; falta de estructura inicial no bloquea captura |

Validación estructural y semántica son pruebas diferentes. Un segundo modelo puede ayudar a revisar, pero no convierte automáticamente una interpretación en prueba independiente. Las discrepancias sin resolver quedan pendientes; no se decide por mayoría de modelos para fijar identidad personal.

### 4.3 Identidad, deduplicación e incrementalidad

| Requisito | Condición exigida | Prueba de rechazo / aceptación |
|---|---|---|
| QG-020 | Proponer identidad solo con evidencia contextual específica; igualdad lexical o vectorial no basta | Homónimos, persona/producto, autor/citado y agente/objeto deben permanecer distintos sin prueba adicional |
| QG-021 | Registrar evidencia a ambos lados, justificación, contradicciones consideradas y alcance de cada unión | Referencias correctas a citas no validan por sí mismas la conclusión de identidad; controlar componentes completos, no solo pares |
| QG-022 | No cerrar transitivamente vínculos de cercanía, afinidad, analogía o equivalencia parcial como mismo referente | Si A es similar a B y B a C, no se deduce identidad A=C. Una cadena con par incompatible no se materializa silenciosamente |
| QG-023 | Toda fusión debe poder deshacerse y rederivar aristas, comunidades, resúmenes y respuestas afectadas | Una corrección de homónimo no puede dejar menciones o resúmenes contaminados en cachés o índices |
| QG-024 | Deduplicar representación sin borrar ocurrencias, fechas ni proveniencias | Reintentar la misma ingesta no duplica; repetir la misma idea en otro momento sí conserva otra ocurrencia |
| QG-025 | Medir falsas fusiones y alias no recuperados por separado | No fusionar nada no es una solución aceptable si impide recuperar el hilo. La precisión de un conjunto vacío no se informa como 100% |
| QG-026 | Separar novedad de expresión, novedad de idea, repetición y evolución respecto al universo procesado | «No apareció en este lote» no significa «original en todo el archivo». Backlog o archivo parcial limita explícitamente la conclusión |

### 4.4 Comunidades y salud topológica

| Requisito | Condición exigida | Prueba de rechazo / aceptación |
|---|---|---|
| QG-030 | Calcular comunidades sobre una proyección declarada, con versión, parámetros, semilla, pesos y reglas sobre dirección/tipos | No reclasificar comunidades desde el diseño visual ni forzar una cantidad deseada. Vistas filtradas deben declarar si conservan partición global o calculan otra |
| QG-031 | Verificar cobertura y membresías según método; tratar aislados y múltiples componentes explícitamente | Un algoritmo de partición no crea relaciones ausentes. No fabricar aristas para que aparezcan comunidades entre componentes desconectados |
| QG-032 | Evaluar afinidad semántica contra tareas y juicios de referencia, además de estructura | Una partición puede ser matemáticamente válida e inútil para recuperar ideas. Modularidad alta o pocas comunidades no son criterio suficiente |
| QG-033 | Cuando se afirme fidelidad a EpisTwin, materializar sus comunidades, pertenencias y resúmenes con la correspondencia canónica requerida | Un atributo `communityId` por nodo, sin esa realización ni trazas causales, no acredita por sí solo el mecanismo de comunidades de EpisTwin |
| QG-034 | Anclar cada afirmación del resumen al subgrafo inducido y sus fuentes; identificar versión de resumen y entradas | Un resumen no puede inventar un tema psicológico, introducir hechos externos sin declaración ni tomar una ocurrencia por patrón longitudinal |
| QG-035 | Medir sensibilidad a semillas, resolución, retiro de fuentes y cambios de extracción por separado | La comparación no mezcla diferentes corpus o proyecciones sin control. Estabilidad no implica verdad; inestabilidad no autoriza borrar material real |
| QG-036 | Usar componentes, aislados, grados, concentración por fuente, pesos y autoaristas como diagnóstico causal | No se fijan cuotas universales de densidad, tamaño o interconexión. Una autoarista puede ser real; una causada por falsa fusión exige revisión |

Comparaciones de membresía deben ser invariantes a la numeración arbitraria de comunidades. Puede usarse acuerdo de pares o una medida documentada como índice de Rand ajustado; debe especificarse población y tratamiento de nodos ausentes. Una agrupación conceptual transversal puede tener otro estatuto que una partición topológica: se declara como tal, sin afirmar que Leiden descubrió aristas que no existen.

### 4.5 Integración, recuperación, respuesta y presentación

| Requisito | Condición exigida | Prueba de rechazo / aceptación |
|---|---|---|
| QG-040 | Declarar una revisión lógica del conocimiento y demostrar qué consumen mapa, recuperador, resúmenes, generador y validador | Pueden existir varios almacenes, pero una sincronización no demostrada impide afirmar que la consulta usa el grafo visible. No se escoge aquí PostgreSQL o Neo4j |
| QG-041 | Verificar recuperación con preguntas y fuentes esperadas fijadas antes de ajustar el sistema | Evaluar consultas locales, globales, multifuente, temporales, de alias, de contradicción y sin respuesta. Hallar una coincidencia no demuestra exhaustividad |
| QG-042 | Separar precisión, recuperación de evidencia, cobertura de respuesta, fidelidad y abstención | Un servicio que solo devuelve fragmentos no se presenta como motor completo de respuesta. Abstenerse siempre no pasa las consultas respondibles |
| QG-043 | Mantener contrato tipado y cerrado de suficiencia; desconocido, error y vacío no equivalen a suficiente | La cadena `"insuficiente"` nunca se convierte mediante truthiness en aprobación. Valores desconocidos y campos ausentes se rechazan o degradan explícitamente |
| QG-044 | Conservar el estado real desde servicio hasta pantalla, exportación y registro | Error técnico, fuente ausente, permiso denegado e insuficiencia son estados diferentes. Debe comprobarse la representación real, no solo un componente simulado |
| QG-045 | Hacer rastreable cada afirmación de la respuesta a evidencia pertinente y suficiente; separar inferencias y conocimiento externo | Citas a documentos reales pero no sustentadores no pasan. No atribuir al operador una inferencia sin marcarla |
| QG-046 | Ofrecer acceso verificable al contexto y evolución, con límites y truncamiento explícitos | Una vista total que hace ilegible todo no acredita utilidad. Una vista parcial no puede anunciar exhaustividad del archivo |
| QG-047 | Probar utilidad como operador-usuario, no solo como desarrollador | Recuperar una idea completa, distinguir su evolución y cotejar una propuesta sin inspeccionar código. Diseño concreto y aceptación final de interfaz requieren presencia del operador |

La especificación no impone un nuevo contrato de interfaz por iniciativa técnica: exige que el contrato finalmente adoptado sea inequívoco y se pruebe a través de todas las fronteras. Latencias del producto deben respetar el canon de versión aplicable, medirse con población y percentiles declarados y no convertirse en resultados inventados por este documento.

### 4.6 Juicio, seguridad, regeneración y operación

| Requisito | Condición exigida | Prueba de rechazo / aceptación |
|---|---|---|
| QG-050 | Atribuir ratificación, rechazo y revocación a actor autenticado, objeto preciso y revisión vista; preservar historial | Aceptar usar fuentes o construir no ratifica relaciones. Una decisión del sistema no entra al ledger como decisión humana |
| QG-051 | Distinguir rechazo de trazabilidad de rechazo jerárquico en la Síntesis Existencial Accionable | «Leíste mal» abre defecto de calidad; no se convierte en rasgo personal. «Es fiel pero menos-yo» solo se interpreta por el acto y clasificación confirmados del operador |
| QG-052 | Invalidar derivados y acreditaciones ante cambios relevantes, incluidos instrucciones, política de identidad, esquema, código y fuentes | No basta conservar `pipeline` y modelo. Declarar el cono de impacto y las pruebas reusables, sin invalidar evidencia no afectada por comodidad |
| QG-053 | Reconstruir en entorno aislado desde originales/versiones, con derivaciones y juicios identificados | Repetir una proyección desde propuestas guardadas es nivel parcial, no reconstrucción completa. Usar un ledger de prueba no vacío con aceptación, rechazo y revocación |
| QG-054 | Separar reproducibilidad de derivados persistidos y variabilidad de nueva extracción | Temperatura cero no garantiza determinismo del proveedor. Conservar respuestas/huellas; comparar nueva extracción semánticamente con tolerancias declaradas, no solo IDs |
| QG-055 | Probar idempotencia, concurrencia, cambios de fuente durante ejecución y atomicidad de publicación | Reintentos no duplican; procesos simultáneos no mezclan revisiones ni pisan juicios. Una prueba de conexión única no acredita concurrencia distribuida |
| QG-056 | Proteger aislamiento por propietario, claves, textos y auditorías; tratar contenido como datos no instrucciones | Preguntas, nodos, embeddings, logs, cachés, resúmenes y exportaciones no deben filtrar otro propietario. Pruebas adversarias incluyen instrucciones maliciosas dentro del corpus |
| QG-057 | Tener procedimiento explícito de borrado autorizado y ausencia de residuos en derivados, compatible con la autoridad de custodia | No se ejecuta borrado por esta norma. Un tombstone sin retirar contenido de índices/cachés no basta; la retención de originales y copias exige una política autorizada, no una excepción tácita |
| QG-058 | Publicar solo revisiones completas con manifiesto verificable y posibilidad de reversión autorizada | Snapshot incompleto, backlog oculto o release sin identidad verificable bloquea promoción. Rollback no borra originales ni decisiones posteriores |
| QG-059 | Vigilar calidad en operación y convertir incidentes en regresiones | Un cambio de proveedor o distribución no hereda indefinidamente el certificado anterior; defecto crítico abre incidente y retira la confianza del alcance afectado |

## 5. Referencia evaluativa: cómo evitar autoengaño y fuga de evaluación

### 5.1 Construcción y custodia

El conjunto de referencia debe versionar: fuentes autorizadas y huellas; unidades de sentido; menciones/referentes; relaciones correctas, incorrectas e inciertas; ocurrencias y tiempos; pares que deben unirse y que no deben; preguntas, respuestas admisibles y evidencia requerida; resultado esperado de abstención; justificación de adjudicación. Los casos inciertos no se fuerzan a verdad binaria: se informa su proporción y se prueba la preservación de incertidumbre.

- Separar **desarrollo**, **regresión conocida**, **evaluación reservada** y **seguimiento longitudinal**. Los cuatro fallos de esta auditoría ya son regresiones conocidas, no evaluación ciega.
- Separar por familia de fuentes, acontecimientos y periodo; paráfrasis de un mismo dictado no se reparten entre ajuste y evaluación como si fueran independientes.
- Cubrir español oral, errores de dictado, pronombres, elipsis, citas de asistentes, negaciones, analogías, deseos, cambios de opinión, conceptos raros, ideas largas y repeticiones multifuente. No premiar solo nombres fáciles de extraer.
- El constructor puede preparar anotaciones; no acredita sus propias interpretaciones como único juez. Debe existir revisión separada y trazable, desacuerdos y adjudicación. Para reconocimiento o identidad personal, la última autoridad es el operador.
- No exigir al operador limpiar y etiquetar todo el archivo para compensar un extractor deficiente. Su intervención se concentra en juicio material o subjetivo; el trabajo técnico de preparación y comprobación corresponde al equipo constructor.
- Una referencia incompleta limita las afirmaciones sobre recuperación. Cuando no se conocen todas las fuentes relevantes, el denominador se declara como conjunto juzgado, no como universo exhaustivo.

### 5.2 Denominadores y sesgos

Las muestras probabilísticas estiman población solo bajo un diseño válido; las dirigidas prueban riesgos concretos. Informar ambas por separado. Estratificar por fuente, longitud, modalidad, periodo y tipo de riesgo; publicar tamaños, pendientes y no verificables. Relaciones del mismo dictado están correlacionadas: no tratarlas como cientos de observaciones independientes. Usar incertidumbre agrupada por fuente cuando el diseño lo requiera.

Si se mide el corpus finito completo, el resultado se limita a ese corpus/revisión. Si se pretende generalizar al material futuro, debe justificarse la población y la estabilidad de sus supuestos. Cero errores observados no significa tasa real cero. Para cero fallas en n observaciones binomiales independientes, el límite unilateral superior al 95% es `1 - 0.05^(1/n)`; con observaciones correlacionadas o muestreo dirigido no se aplica mecánicamente. Ajustar inferencias simultáneas cuando se hagan afirmaciones conjuntas sobre varios estratos.

## 6. Medidas obligatorias y regla de decisión

Toda medida registra: identificador y versión; pregunta de calidad; población y unidad; numerador y denominador; selección; fuentes/versiones/huellas; implementación; responsable y adjudicador; fecha; resultado e incertidumbre; no verificables/exclusiones; costo; ejemplos de fallo; umbral y justificación aprobados; alcance de la conclusión. Denominador cero = **NO MEDIDO**, nunca 100%.

| Dimensión | Definición operacional mínima | Riesgo que no debe ocultarse |
|---|---|---|
| Integridad y anclaje | Fuentes válidas / seleccionadas; afirmaciones con cadena de procedencia íntegra / materializadas | Un hash o cita correctos no demuestran fidelidad |
| Fidelidad semántica | Afirmaciones adjudicadas fieles / afirmaciones adjudicadas; errores por polaridad, rol, atribución, tiempo y relación | Reportar errores críticos individualmente, no diluidos en promedio |
| Cobertura | Unidades de referencia relevantes representadas y recuperables / unidades de referencia relevantes; separar disposición contable | Ni cobertura de caracteres ni cantidad de triples es recuperación semántica |
| Identidad | Precisión y recuperación sobre pares juzgados, más errores por componente y recuperación de alias en consultas | Muchos pares triviales negativos inflan exactitud; una falsa unión contamina más que un nodo |
| Repetición y evolución | Ocurrencias y cambios de referencia conservados / esperados; originalidad referida al universo realmente procesado | Deduplicación no debe borrar intensidad, secuencia ni cambios |
| Comunidad | Pares de afinidad juzgados recuperables, fragmentación de hilos y mezcla de referentes incompatibles; estabilidad controlada | No hay una única partición verdadera universal; fallos semánticos no se arreglan maximizando modularidad |
| Recuperación | Precisión a k y recuperación a k con k y relevancia fijados; evaluación de ranking graduado si procede | Unidades no juzgadas no son automáticamente irrelevantes; declarar truncamiento |
| Respuesta | Afirmaciones sustentadas / afirmaciones emitidas; cobertura de requisitos de pregunta; citas sustentadoras / citas examinadas | Una respuesta corta sin errores puede omitir lo importante |
| Abstención | Insuficiencias correctamente declaradas / casos insuficientes; falsas abstenciones / casos respondibles | Abstenerse en todo no produce una prótesis útil |
| Autoridad y veracidad | Juicios humanos atribuibles / mostrados como humanos; estados visibles coincidentes / estados evaluados | Una sola atribución humana falsa o insuficiencia anunciada como suficiencia es crítica |
| Reconstrucción y operación | Requisitos de equivalencia, replay e idempotencia satisfechos / requisitos fijados; latencia y antigüedad con distribución | Igual conteo de nodos no demuestra mismo conocimiento |
| Utilidad de la prótesis | Tareas de recuperación íntegra y evolución realizadas; afirmaciones de síntesis trazables, reconocidas y usadas | No sustituir uso real por demostración técnica, plausibilidad o auto-reporte del constructor |

### 6.1 Severidad y compuertas, sin compensación

- **Crítico:** exposición entre propietarios; alteración/pérdida de fuente; falsa atribución humana; identidad incompatible que contamina un hilo; inversión de negación/atribución/temporalidad que cambia sentido; afirmación personal no sustentada servida como suficiente; falso estado de éxito; pérdida de juicio o reconstrucción engañosa. Una ocurrencia confirmada bloquea acreditación del alcance afectado y exige determinar propagación. No se espera a que una media caiga.
- **Mayor:** omisión relevante, alias no recuperado, fragmentación que impide una tarea, resumen incompleto, vista inutilizable o deriva sin resolver. Bloquea la tarea/capacidad afectada hasta corrección o reducción explícita de alcance aprobada; no se esconde como detalle visual.
- **Menor:** defecto de forma sin pérdida de significado, acceso o capacidad. Puede tener plan de corrección registrado si no incumple otra compuerta.

Errores del generador contenidos **antes de promoción**, conservados y marcados como rechazados, demuestran eficacia de contención; no son lo mismo que errores servidos como conocimiento confiable. Deben medirse igualmente para no esconder costo o fragilidad. La cuarentena no cuenta como cobertura resuelta.

### 6.2 Perfil de aceptación y umbrales

**Invariantes no negociables de aceptación:** 100% de comprobaciones mecánicas aplicables sobre la revisión candidata; cero fallas críticas conocidas sin resolver; todos los casos adversarios obligatorios pasan; ningún resultado requerido queda no verificable; ningún denominador vacío acredita una capacidad. Son condiciones de promoción, no afirmación metafísica de error futuro cero.

Para calidad semántica y recuperación no se inventa un 95%, 98% o 99% con apariencia científica. Antes de abrir la evaluación reservada se debe aprobar y congelar un perfil con: población/uso; severidades; mínimo aceptable por dimensión y estrato; riesgo residual máximo; incertidumbre y potencia/muestra necesarias; tareas obligatorias; condiciones de degradación; responsable. Cada mínimo debe justificarse por daño de error y pérdida de capacidad tolerables, no por el resultado que ya se obtuvo.

**Perfil inicial para el corpus piloto:** todos los casos adjudicados críticos y todas las tareas obligatorias de referencia deben pasar, sin generalización a población futura; se exige revisión semántica de las fusiones y afirmaciones usadas en las demostraciones. La ausencia de una referencia suficientemente cubierta o de un perfil cuantitativo aprobado impide la acreditación de producción general, pero no impide capturar fuentes ni experimentar en una proyección rotulada como candidata.

**Decisión global:** CONFORME solo si pasan conjuntamente todas las compuertas aplicables, el perfil congelado y las tareas de producto; PARCIAL identifica exactamente lo que sí pasó; NO CONFORME si hay incumplimiento; NO VERIFICABLE si falta evidencia; NO APLICA requiere justificación registrada. PARCIAL y NO VERIFICABLE no autorizan proclamar cierre integral. No se pueden excluir retrospectivamente casos difíciles ni rebajar el perfil después de ver el resultado para aprobar la misma versión.

## 7. Pruebas de aceptación de extremo a extremo

Se distingue: prueba de unidad, integración aislada, integración con servicios reales, recorrido publicado y utilidad del operador. Un simulador puede pasar las primeras sin acreditar las últimas.

### 7.1 Escenario positivo obligatorio

En un entorno autorizado, con caso controlado y versión del sistema fijada:

1. Capturar una fuente con elipsis, una idea rara, una condición y una referencia temporal; verificar su modalidad, versión e integridad. Incluir una segunda fuente que repita y luego modifique una idea.
2. Preparar referencia independiente; probar unidad por unidad extracción, roles, alcance, incertidumbre y disposiciones pendientes.
3. Resolver un alias inequívoco, mantener un homónimo distinto y conservar cada ocurrencia. Verificar que la mera relación no genera identidad.
4. Materializar la revisión completa, comunidades y resúmenes exigidos por el perfil; demostrar pertenencias y anclaje. Registrar los almacenes y consumidores reales.
5. Consultar desde la interfaz publicada: recuperar idea íntegra, reunir fuentes relevantes, mostrar evolución y contraejemplo, producir respuesta sustentada y seguir sus fuentes hasta el original.
6. Preguntar algo que el caso no permite responder: debe declarar insuficiencia sin fuentes inventadas ni señal de éxito engañosa.
7. Registrar aceptación, rechazo y revocación de prueba mediante actor explícito; regenerar derivados aislados desde las fuentes y reaplicar el ledger no vacío; verificar conservación y conflictos de versión.
8. Reintentar, ejecutar concurrencia controlada e introducir un cambio de fuente; ninguna salida puede mezclar revisiones. Verificar invalidación de índices, resúmenes y cachés afectados.
9. Registrar traza correlacionada de todo el recorrido y resultado de usuario; terminar con un certificado de alcance, no con una captura de pantalla o un código HTTP 200.

### 7.2 Matriz adversaria mínima

Los ejemplos son especificaciones de pruebas, **no pruebas implementadas ni ejecutadas por publicar esta tabla**. Las regresiones efectivamente ejecutadas tienen evidencia separada.

| Caso | Estímulo | Resultado exigido |
|---|---|---|
| N01 | Huella alterada o cita de otra versión | Bloquear materialización y conservar diagnóstico |
| N02 | Cita repetida sin posición inequívoca | No inventar ancla |
| N03 | «No solamente sería X» → «no sería X» | Rechazar o contener como interpretación inválida |
| N04 | «Quizá», «si», «quisiera», analogía | Mantener modalidad; no producir hecho actual |
| N05 | Agencia corta flujo de llamadas | Conservar relación agente/objeto; rechazar identidad |
| N06 | Dos homónimos, narrador y citado | No unir sin prueba contextual |
| N07 | Alias inequívoco en fuentes diferentes | Recuperar conjuntamente sin perder ocurrencias |
| N08 | Predicado inventado con extremos literales | No aceptar por anclaje solamente |
| N09 | Propuesta del asistente no ratificada | No atribuir al operador |
| N10 | Preferencia antigua contradicha por revisión posterior | Conservar ambas con tiempo y vigencia |
| N11 | Idea única extensa y poco central | Recuperar contenido de referencia sin recortarlo a un triple irrelevante |
| N12 | Reingesta idéntica y repetición en fecha nueva | Idempotencia del reintento; ocurrencia nueva conservada |
| N13 | Referencias de contexto válidas con razón de identidad falsa | No tomar formato válido como semántica válida |
| N14 | `suficiencia="insuficiente"`, evidencia vacía | Servicio, pantalla y exportación muestran insuficiencia |
| N15 | Valor de estado desconocido o error técnico | No mostrar suficiente ni vacío exitoso |
| N16 | Grafo visible poblado, recuperador de otra revisión vacío | Bloquear acreditación de integración; no simular respuesta |
| N17 | Falta de permisos u otro propietario | No filtrar existencia ni contenido protegido |
| N18 | Instrucciones maliciosas dentro del dictado | Tratar como contenido; no ejecutar ni alterar gobierno |
| N19 | Cambio de extractor/instrucciones con snapshot anterior | Invalidar evidencia afectada y declarar revisión obsoleta |
| N20 | Fuente modificada durante dos procesos simultáneos | Publicación atómica y revisión coherente, sin pérdida de juicios |
| N21 | Rechazo de trazabilidad en síntesis | Abrir defecto; no aprenderlo como rasgo del sujeto |
| N22 | Rechazo jerárquico confirmado | Conservar acto con autoría y efecto declarado, sin inferir diagnóstico |
| N23 | Fusión revocada tras generar resúmenes | Deshacer contaminación en todos los derivados y dejar trazas |
| N24 | Denominador vacío, backlog o límite excedido | NO MEDIDO/pendiente/límite explícito; nunca 100% o completitud |
| N25 | Falta de audio esperado | Audio no verificable; no inventar cotejo ni reparar con texto a voz |
| N26 | Grafo correcto pero ilegible o sin recuperar evolución | No acreditar utilidad por validez topológica |
| N27 | Borrado autorizado en entorno de prueba | Ausencia comprobada en los derivados incluidos en la política; declarar copias/retención restantes |
| N28 | Reconstrucción con decisiones aceptada/rechazada/revocada | Reaplicar con revisión y resolver conflictos; no usar ledger vacío como prueba suficiente |

## 8. Acreditación específica de las capacidades

### 8.1 Ideación Asíncrona Recuperable

El operador debe poder pedir un hilo creativo y recibir las ideas de referencia pertinentes **completas y contextualizadas**, sus afinidades y evolución entre fuentes: primeras formulaciones, repeticiones, variaciones, dudas, decisiones y abandonos cuando existan. Se conserva el acceso al original. La clasificación de originalidad solo cubre el universo efectivamente procesado; nunca confunde novedad lingüística con novedad conceptual.

Tareas obligatorias: recuperar una idea rara; reunir un hilo expresado con alias; separar dos temas lexicalmente parecidos; reconstruir un cambio de diseño; distinguir repetición de cambio; declarar incompletitud del archivo. Una omisión relevante no se perdona porque el mapa tenga comunidades atractivas.

### 8.2 Síntesis Existencial Accionable

La propuesta debe separar elección registrada, expresión de deseo, cita ajena e inferencia. Cada afirmación enlaza a sus anclas, exhibe tensiones y contraejemplos pertinentes, conserva estatuto de borrador y admite juicio granular. No se aplica puntuación de personalidad ni diagnóstico; no se atribuye a teoría externa el estatuto de dato personal. Una afirmación fiel no autoriza definir al sujeto.

Deben registrarse separadamente: (a) trazabilidad mecánica y fidelidad comprobadas; (b) reconocimiento/ratificación del operador; (c) uso en decisiones reales. El estándar **no fija por sí solo cuánto uso acredita**: ese umbral está abierto en el canon específico y requiere decisión expresa. Una demostración técnica no acredita (b) ni (c). Ningún revisor automático sustituye esos actos.

## 9. Certificado de revisión y expediente de evidencia

Cada candidato debe tener un expediente legible y verificable con:

- Identidad de despliegue y código; esquema, política de fuentes, modelo/proveedor, instrucciones y parámetros; huellas de corpus, propuestas, ledger, proyección, índices y resúmenes; marcas de tiempo.
- Perfil de aceptación versionado y aprobado antes de evaluar; requisitos aplicables y justificación de no aplicables; tareas y población.
- Inventario de controles existentes, faltantes y ejecutados; resultados, fallos, incertidumbre y exclusiones; cero confusión entre especificar una prueba y ejecutarla.
- Cadena **requisito → riesgo → símbolo/ruta → prueba positiva/negativa → traza real → resultado → remedio → responsable**. La matriz debe enlazar artefactos y revisiones concretas, no «tests verdes» en abstracto.
- Argumento de aseguramiento: qué se afirma, por qué la evidencia basta para ese alcance, objeciones y riesgo residual. La auditoría no se acredita a sí misma solo porque encuentra números.
- Vínculo entre el servicio y su representación visible. El estado de la base, el servicio, la interfaz y el texto de entrega deben concordar.
- Responsable de aceptación técnica y autoridad material del operador; sello de aprobación, caducidad por evento e historial de sustituciones.

No incluir secretos ni el corpus completo en logs o evidencia innecesaria. Conservar referencias/huellas y controles de acceso adecuados. Una evidencia fuera del repositorio requiere ubicación autorizada, responsable y verificación de integridad; no depende de recordar un chat.

## 10. Salud continua, incidentes y cambios

**Cadencias:** controles mecánicos en cada materialización; contratos y regresiones afectadas en cada cambio; recorrido real antes de promoción de una revisión; revisión periódica de muestra de calidad y tareas longitudinales según perfil aprobado; reevaluación inmediata tras incidente o cambio de proveedor, instrucciones, política, ontología o distribución. La cadencia periódica y sus responsables deben fijarse antes de acreditar operación continuada; no se inventa un historial de salud por registrar esta obligación.

**Procedimiento ante fallo:** identificar revisión y población afectadas → contener promoción/uso como conocimiento confiable → preservar fuente y evidencia → determinar propagación → corregir causa → ejecutar prueba causal y compuertas afectadas → regenerar/reaplicar en entorno autorizado → verificar usuario/servicio/pantalla → emitir nueva acreditación y delta. No sustituir reparación por cambio de etiquetas, limpieza visual o reescritura del original.

No detener la captura segura solo porque un derivado esté en cuarentena. Separar continuidad de custodia de confianza semántica. No ejecutar backfill, borrado, migración de stack, cambios de seguridad o rediseño de experiencia por autorización implícita de este documento.

## 11. Aplicación a los hallazgos de este hilo

Corte observado: código `a0975ffaef17830471fff3adcdb804c47490ff0b`; snapshot `9bfc8bde-d80f-42e6-80ea-59996749c094`, release persistido `0a7b5ef100b66cdbdd64d80de647c6d354a9fe7e`. Los hallazgos son de ese corte, no una nueva medición tras cada edición documental.

| Hallazgo | Requisitos comprometidos | Dictamen del corte y prueba necesaria para cerrar |
|---|---|---|
| Grafo PostgreSQL visible; consulta por Python/Neo4j y proyección vacía | QG-040/041/042 | NO CONFORME como integración. Probar mismo conocimiento/revisión y pregunta real respondible, sin escoger aquí stack |
| Endpoint de consulta devuelve recuperación, no recorre motor completo | QG-042/045 | Alcance parcial; demostrar generación/validación conectadas y traza causal antes de afirmar EpisTwin integral |
| Anclaje literal íntegro pero relaciones/identidades semánticamente inválidas aceptadas | QG-010/011/020/021 | NO CONFORME. Rechazar o contener las cuatro regresiones y evaluar referencia independiente |
| Insuficiencia real mostrada como «Evidencia suficiente» | QG-043/044 | Crítico, NO CONFORME. Prueba de contrato y recorrido visible con insuficiente, error, desconocido y suficiente |
| Comunidades como atributos; sin materialización completa exigida en esa proyección | QG-032/033/034 | No acredita comunidades integrales de EpisTwin; probar realización y recuperación útil, no solo partición |
| Snapshot previo al código actual y vigencia que no cubre todo cambio relevante | QG-005/052 | Identificar impacto y regeneración necesaria; no asumir que un parche reparó lo persistido |
| 12 registros clasificados texto sin audio | QG-003 | Trazabilidad universal al audio NO VERIFICABLE; distinguir modalidades e historia antes de atribuir pérdida |
| 21 pruebas unitarias verdes; prueba de ciclo con servicios simulados | QG-041/044 y §7 | Evidencia limitada válida en su alcance; falta recorrido real que no pase por vacío/error |
| Reconstrucción repetida desde propuestas; ledger vacío | QG-053/054 | PARCIAL; falta extracción/reconstrucción desde fuente y replay no vacío |

Las cifras del mapa —392 entidades, 214 relaciones, 193 comunidades— no constituyen nota de salud. La correspondencia literal de 214 relaciones no certifica la fidelidad de su interpretación ni la cobertura del archivo. La autorización del operador de usar originales verificados es explícita y no se reclasifica como fallo de gobierno.

## 12. Adopción y siguiente checkpoint

1. Revisar materialmente este estándar con el operador: alcance inicial de aceptación, riesgo tolerable, perfil y autoridad de aprobación. No pedirle que arbitre detalles técnicos decidibles.
2. Resolver y registrar **la revisión lógica canónica del conocimiento y su integración**; cualquier cambio de mapa arquitectónico conserva su compuerta de aprobación. Varios almacenes son admisibles si su equivalencia/consistencia está probada.
3. Crear referencia independiente con casos reales y separar evaluación reservada; no volver a presentar regresiones conocidas como pruebas ciegas.
4. Implementar controles y pruebas trazables empezando por los fallos críticos comprobados; no ampliar la confianza en un grafo que ya falla ni prometer que el estándar textual lo reparó.
5. Ejecutar el recorrido del §7 y las tareas de §8; publicar expediente y dictamen de alcance.

**Estado de cierre documental:** estándar diseñado y hallazgos documentados. **Estado de producto:** NO CONFORME en el corte auditado; acreditación integral pendiente. **Bloqueo material:** adopción del perfil y decisión de integración requieren revisión explícita; publicar documentación no las autoemite. Ningún merge, despliegue o cambio de fuentes se autoriza con este cierre.

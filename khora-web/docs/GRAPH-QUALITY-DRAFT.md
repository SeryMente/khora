# Estándar unificador de calidad y salud del grafo de Khora

**Versión 1.2 · 2026-10-18 · Contrato operativo de aptitud, con verificador de evidencia; producto NO APTO en el corte auditado.**

La redacción y documentación fueron encargadas expresamente por el operador en este hilo. Este archivo sustituye el borrador anterior **en su ubicación existente**, para no multiplicar fuentes de verdad. El sufijo histórico `DRAFT` se conserva para no romper enlaces: el documento contiene un estándar de aceptación y un perfil de realización diseñados; su adopción material y la implementación siguen pendientes. No se atribuye ratificación a umbrales, decisiones de arquitectura o diseño de interfaz que el operador no haya aprobado. Publicar este texto no implementa sus controles, no levanta los bloqueos del producto y no modifica cánones de Notion.

La revisión 1.2 responde a una insuficiencia de v1.1: la lista de requisitos no obligaba operativamente a demostrar orientación, recuperación íntegra y uso, y podía interpretarse como avance aunque solo creciera la documentación. Se corrige mediante el contrato de producto del §0, un perfil técnico fijado y un verificador de evidencia con pruebas adversarias. No se afirma que el mecanismo productivo haya sido reparado.

**Punto de entrada del frente:** [GRAPH-TWINS.md](GRAPH-TWINS.md). **Auditoría motivadora:** [informe y evidencias](evidence/graph-quality-2026-10-18/README.md). La expresión «DEBE» identifica una condición exigida para acreditar conformidad con este estándar cuando sea adoptado, no una descripción del comportamiento actual.

## 0. Decisión operativa: si no permite hacer el trabajo, no es un grafo apto

**Criterio único:** una revisión de Khora solo es apta para el alcance declarado cuando permite **orientarse, recuperar íntegramente, distinguir y reconstruir el pensamiento relevante sin falsificarlo**, sobre la misma evidencia autorizada en mapa y consulta, y conserva ese resultado al corregir o regenerar. La aptitud se demuestra con tareas completas y revisión independiente, no se deduce de haber implementado componentes.

**Madurez:** significado preservado, identidad contextual reversible, procedencia y límites verificables, una revisión consistente y operación recuperable. **Sobriedad:** la representación reduce la carga de encontrar y entender sin ocultar incertidumbre ni inventar orden. **Utilidad:** completar las tareas siguientes sin inspeccionar código ni explorar cientos de etiquetas ilegibles. No son estilos decorativos ni una cantidad objetivo de comunidades.

### 0.1 Pruebas de producto obligatorias, fijadas antes de construir

Cada tarea guarda pregunta/objetivo, fuentes y unidades esperadas, contenido prohibido, resultado observado, recorrido en la versión real y adjudicación. La referencia no puede provenir exclusivamente de lo que el extractor decidió conservar. Los nombres de casos son estables en [el perfil ejecutable](graph-quality-profile.json).

| Caso | Trabajo que debe poder hacerse | Fracaso que bloquea la capacidad |
|---|---|---|
| IAR_RARE | Recuperar una idea única completa, con condición, duda y contexto | Una entidad o resumen omite la parte que permite usar la idea |
| IAR_ALIAS | Reunir formulaciones del mismo hilo distribuidas en fuentes | Solo encuentra la misma palabra o una fuente favorable |
| IAR_DISTINCT | Separar temas/personas parecidos y conservar sus conexiones reales | Confunde afinidad, homonimia o analogía con identidad |
| IAR_EVOLUTION | Reconstruir propuesta inicial, cambio, motivo y estado posterior | Devuelve una preferencia atemporal o borra la versión antigua |
| IAR_REPEAT | Distinguir repetición de variación sin perder ocurrencias | Duplicados inflan evidencia o deduplicación borra evolución |
| IAR_INCOMPLETE | Identificar qué del hilo está recuperado y qué archivo quedó fuera | Respuesta exhaustiva sobre corpus parcial o pendientes ocultos |
| SEA_CHOICES | Separar elección realizada, deseo, cita e inferencia | Fabrica una elección o identidad del operador |
| SEA_COUNTEREVIDENCE | Mostrar tensiones y contraejemplos pertinentes | Síntesis plausible pero unilateral o halagadora |
| SEA_AUTHORITY | Cotejar y rechazar una interpretación sin convertir el rechazo en rasgo | Una inferencia del sistema se presenta como juicio humano |
| MAP_ORIENT | Reconocer los hilos/comunidades relevantes y explicar su alcance | La única entrada útil es una cuadrícula total de tarjetas ilegibles |
| MAP_FOCUS | Seguir un hilo manteniendo contexto y distinguir afinidad de identidad | El enfoque solo oculta nodos, pierde contexto o cambia silenciosamente de revisión |
| MAP_EVIDENCE | Ir de comunidad a idea/afirmación y de esta al original correcto | Color, título o resumen no tienen sustento localizable |
| ANSWER_ABSTAIN | Reconocer una pregunta no respondible sin éxito falso | Respuesta inventada, fuente de otro ámbito o suficiencia engañosa |

La aptitud de orientación NO exige una partición semántica única ni eliminar aislados reales. Una comunidad topológica debe ser válida; además debe demostrarse su utilidad en las tareas. Una afinidad conceptual transversal se declara como tal. No se crean aristas, fusiones o temas psicológicos para conseguir una imagen convincente.

### 0.2 Prueba de sobriedad, sin imponer todavía un diseño visual

La revisión real debe permitir: reconocer alcance y estado; leer los rótulos necesarios en la escala de trabajo; elegir un hilo sin recorrer manualmente todo el inventario; comprender por qué sus piezas están relacionadas; abrir evidencia y regresar sin perder contexto; distinguir propuesta, juicio, pendiente y error. La vista exhaustiva puede existir como inspección, pero su existencia no satisface orientación. El zoom o una distribución por fuerzas no prueban ninguna de esas condiciones por sí solos.

La adjudicación registra recorrido, capturas pertinentes y éxito/fracaso de MAP_ORIENT/MAP_FOCUS/MAP_EVIDENCE, no «me gusta». Latencia, número de interacciones y problemas de lectura se registran; no se inventan umbrales universales. El equipo prepara alternativas y evidencia; el operador revisa las decisiones materiales de interfaz en persona antes de implementarlas. Este estándar no autoriza ese rediseño en ausencia del operador.

### 0.3 Regla de rechazo y expediente mínimo

- **NO APTO:** existe un defecto crítico o mayor sin resolver dentro del alcance reclamado, o falla una tarea obligatoria. Es el dictamen del corte auditado, no una nueva medición de producción.
- **EVIDENCIA INCOMPLETA:** falta una comprobación, una referencia válida, una parte del recorrido real o una autoridad exigida. No equivale a aprobación ni a defecto productivo probado.
- **CANDIDATO TÉCNICO:** pasan las comprobaciones técnicas y existe expediente real completo; todavía no se confunde con reconocimiento autobiográfico, aprobación de diseño o autorización de despliegue.
- **APTO PARA PILOTO FINITO:** además existe adjudicación semántica independiente y verificación de los actos humanos exigidos, para corpus/revisión/tareas explícitos. No generaliza al material futuro ni acredita por sí solo el uso existencial sostenido.

No se permite una puntuación global compensatoria. No se rebajan casos ni se ocultan pendientes para producir verde. Rechazar todo tampoco pasa: las tareas respondibles deben recuperar y responder. Los casos difíciles, raros y contradictorios permanecen en la evaluación. Captura segura puede continuar mientras derivados no aptos se contienen.

**Compuertas P01–P11:** integridad del expediente/contexto; fuentes y unidades; grafo y anclas; partición y resúmenes; índice/generación; recorrido real y estado visible; tareas; regresiones; recuperación/replay/aislamiento; revisión independiente/operador; inventario de defectos abiertos. Se conserva el detalle QG del resto del documento como trazabilidad, no como otra nota de salud.

### 0.4 Qué se ejecuta ahora y qué todavía no

[graph_quality_gate.py](../scripts/graph_quality_gate.py) es un **validador offline de un expediente exportado**, de solo lectura y sin servicios. Verifica huellas, contexto fijado por quien invoca, forma cerrada de estados, reconciliación de fuentes/unidades, referencias y anclas exactas UTF-16, cobertura declarada, partición/conectividad, evidencias de resúmenes, espacio vectorial, cadena de etapas, tareas y observaciones estructuradas de operaciones. Rechaza archivos ausentes, mezclados, alterados y rutas externas. El perfil queda ligado por huella al código para impedir su debilitamiento accidental.

**Límite decisivo:** la herramienta no ejecuta las cuarenta regresiones del producto ni autentica recibos humanos o de servicios; valida los resultados entregados. No decide si una proposición o resumen es fiel, si la referencia anotada omitió una idea, si un rótulo es legible o si los registros fueron fabricados. Esas afirmaciones necesitan prueba real, adjudicación independiente y verificación en la autoridad correspondiente. Un expediente internamente consistente puede ser falso: sus campos no son un sustituto de esa verificación.

No hay aún exportador productivo, integración de la compuerta en publicación ni verificación automática de recibos. **Por ello el instrumento no vuelve operante de extremo a extremo al producto.** Su salida positiva se denomina `EVIDENCE_CHECKS_PASSED_REQUIRES_AUTHORITY_VERIFICATION`, nunca «grafo certificado». Los datos sintéticos siempre producen `SYNTHETIC_ONLY` y salida no exitosa para promoción. Ninguna salida autoriza producción. [Instrucciones, pruebas y estado de implementación](evidence/graph-gate-2026-10-18/README.md).

### 0.5 Orden de corrección, no expansión

1. Contener estados falsos y atribuciones humanas fabricadas; conservar fuentes y ledger auténtico.
2. Resolver el mapa de integración con el operador; después conectar identidad, afirmaciones y consumidores a una revisión compartida sin romper los contratos de ingesta/EpisTwin.
3. Reparar identidad/replay y publicación recuperable; cerrar defectos conocidos con pruebas causales.
4. Ejecutar las trece tareas sobre la cadena real, con referencia preparada independientemente; cerrar la orientación/comunidades sin ocultar significado.
5. Exportar evidencia verificada de esa misma revisión, conectar el rechazo en publicación y obtener adjudicación/actos humanos pendientes. Solo entonces considerar aptitud del piloto.

Hacer pasar las pruebas del validador o publicar este contrato no cierra ninguno de esos arreglos productivos. No se inicia migración, backfill, redefinición de seguridad ni cambio de interfaz bajo una autorización documental.

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

**Perfil técnico inicial fijado en v1.2:** [graph-quality-profile.json](graph-quality-profile.json), P01–P11, N01–N40 y las trece tareas del §0 deben satisfacerse sin omisión ni sustitución. No requiere otra decisión de trámite para preparar pruebas. Para el corpus piloto, todos los casos adjudicados críticos y todas las tareas obligatorias de referencia deben pasar, sin generalización a población futura; se exige revisión semántica independiente de las fusiones y afirmaciones usadas en las demostraciones. La ausencia de una referencia suficientemente cubierta o de un perfil cuantitativo aprobado impide la acreditación de producción general, pero no impide capturar fuentes ni experimentar en una proyección rotulada como candidata.

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

1. Aplicar el perfil técnico v1.2 ya fijado para preparar/correr pruebas. Someter al operador solo las decisiones materiales pendientes: integración, diseño/seguridad y reconocimiento personal; no usar una aprobación genérica de cada requisito técnico como excusa para no avanzar.
2. Resolver y registrar **la revisión lógica canónica del conocimiento y su integración**; cualquier cambio de mapa arquitectónico conserva su compuerta de aprobación. Varios almacenes son admisibles si su equivalencia/consistencia está probada.
3. Crear referencia independiente con casos reales y separar evaluación reservada; no volver a presentar regresiones conocidas como pruebas ciegas.
4. Implementar controles y pruebas trazables empezando por los fallos críticos comprobados; no ampliar la confianza en un grafo que ya falla ni prometer que el estándar textual lo reparó.
5. Ejecutar el recorrido del §7 y las tareas de §8; publicar expediente y dictamen de alcance.

**Estado de v1.2:** criterio de producto y perfil técnico fijados; validador offline implementado y probado aisladamente. **Estado de producto:** NO APTO en el corte auditado; exportación desde servicios, compuerta conectada, reparación y acreditación integral pendientes. **Bloqueo material:** integración, diseño/seguridad y actos de reconocimiento conservan su revisión explícita; publicar documentación o pasar el validador no los autoemite. Ningún merge, despliegue o cambio de fuentes se autoriza con este cierre.

## 13. Perfil de realización integral · revisión 1.1

### 13.1 Corrección de suficiencia del propio estándar

La versión 1.0 era un marco riguroso de aceptación, **no una receta suficiente de construcción ni una solución ya realizada**. Dejaba indeterminados los límites entre propuesta y conocimiento, el contrato de revisión compartida, la interoperabilidad real de propuestas, el replay y la validez de los instrumentos de evaluación. Esta revisión hace esos contratos obligatorios y los acompaña de un diseño de cambios trazable en [la auditoría de arquitectura](evidence/graph-architecture-2026-10-18/README.md). No promete infalibilidad semántica ni acredita requisitos solo por escribirlos.

No se reemplaza el Protocolo de Ingesta ni el patrón EpisTwin. La resolución de entidades, el aseguramiento semántico, la contabilidad de cobertura y la preservación de juicios son extensiones necesarias de Khora; no se atribuyen como teoremas o prestaciones demostradas del artículo. La aprobación del texto de una transcripción **no es** aprobación de sus interpretaciones.

### 13.2 Contratos adicionales obligatorios

| ID | Obligación de construcción y operación | Prueba de aceptación |
|---|---|---|
| QG-060 | Separar estados de captura íntegra, propuesta, validación mecánica, evaluación semántica, juicio humano y publicación. Conservar razón y autoridad de cada transición | Una función de compatibilidad no puede crear `accept` con actor `operador` y luego presentarlo como ratificación humana |
| QG-061 | Las proyecciones automática/candidata y curada usan el mismo modelo de evidencia y constructor; cambia la política de admisión, no el significado ni el esquema | La autorización de procesar originales solo habilita el plano candidato; no escribe el conocimiento ratificado ni cambia la aprobación de custodia |
| QG-062 | Aplicar las restricciones estructurales de EpisTwin al perfil que lo reivindique: clases Entity/Literal/Blank disjuntas, sin Literal como cabeza, usuario sin cola semántica, alcance desde raíz e Information Objects y metadatos deterministas | Rechazar tipo incompatible y extremo rechazado; aceptar literales válidos en todos los contratos y preservar su trazabilidad |
| QG-063 | Distinguir mención/ocurrencia y referente incluso dentro de una misma fuente. El identificador de mención no puede ser solo texto+fuente | Dos personas llamadas Ana en el mismo dictado siguen siendo dos menciones sin unión implícita; preservar cada aparición repetida |
| QG-064 | Un único manifiesto lógico identifica propietario, política/plano, fuentes y versiones, esquema, código, modelos/instrucciones, propuestas, juicios, proyección, partición, resúmenes e índice. Los consumidores fijan la misma revisión | Un cambio solo de metadatos o procedencia relevante invalida lo afectado; un índice de otra revisión o espacio vectorial se rechaza, no se consulta silenciosamente |
| QG-065 | Publicar por generación preparada y verificada con cambio atómico de puntero. Persistir trabajo de actualización y permitir reanudación tras fallo posterior al commit | Matar el proceso después de asentar y antes de indexar; el reintento completa derivados antes de acreditar éxito, sin doble asentamiento ni mezcla de versiones |
| QG-066 | Dar identidad durable al objeto juzgado, separada de la instancia de extracción; definir mapeo exacto, conflicto y orfandad al regenerar. Ningún juicio cambia de sentido por similitud | Cambiar UUID de propuesta conservando ítems idénticos no pierde juicios; significado/fuente cambiados no heredan aceptación automáticamente |
| QG-067 | Contrato interoperable de propuestas y consultas, con esquema único versionado, vectores de prueba y equivalencia entre Python y TypeScript | `literal` válido debe aceptarse en ambos; JSON malformado, hash divergente, juicio sin actor, estado desconocido y dependencias rechazadas fallan en ambos |
| QG-068 | Validar los instrumentos de evaluación antes de usarlos para acreditar: invariancia al renombrar particiones, universo comparable, nulos apropiados y ablaciones efectivas | Misma partición con etiquetas permutadas da estabilidad máxima; población disjunta da NO COMPARABLE, no 1; parámetro inefectivo no cuenta como sensibilidad probada |
| QG-069 | Comprobar causalidad de los operadores de razonamiento, lectura de historial, recuperación, generación separada, fVAL global y refinamiento visual efímero | REFINE debe afectar al RETRIEVE siguiente; presencia de hallazgo visual no sustituye fVAL; ningún modo de pruebas autoaprueba respuestas en operación |

### 13.3 Plano epistémico, admisión y suficiencia

La implementación debe representar por separado: **integridad de fuente**, **validez del esquema**, **fidelidad semántica evaluada**, **decisión humana**, **completitud de generación**, **suficiencia de recuperación** y **suficiencia de respuesta**. No se reducen a un booleano `verified` ni a `needs_review=false`.

- **Captura:** puede continuar aunque fallen todos los derivados; original, audio esperado y versión quedan custodiados.
- **Candidato automático:** puede mostrar hipótesis con anclas válidas, incertidumbre, pendientes y fuente seleccionada por política autorizada. No equivale a hecho, persona ratificada ni capacidad acreditada. Una evidencia automáticamente rechazada por semántica no se promueve como aceptable. El efecto de un rechazo humano sobre este plano debe declararse; conservar la propuesta para auditoría no autoriza servirla como cierta.
- **Curado:** solo admite juicios humanos auténticos, vigentes, ligados al objeto y revisión vistos. Una relación aceptada con extremos rechazados es conflicto de admisión, no permiso para recrear los extremos.
- **Respuesta:** toda petición fija plano, propietario y revisión autorizados. Si usa candidatos, debe declararlo y limitar sus afirmaciones a ese estatuto. No presenta una inferencia como elección del operador. Una recuperación no vacía no acredita por sí sola suficiencia global.
- **Acreditación:** los casos críticos adjudicados y tareas respondibles deben pasar; casos sin respuesta deben abstenerse. Ninguna segunda llamada a un modelo o voto entre modelos convierte por sí sola una interpretación en infalible. Para el piloto, revisión independiente y del operador donde el canon exige reconocimiento; para generalizar, perfil estadístico y riesgo residual aprobados previamente.

Las menciones preservan posición y contexto local; las unidades de sentido pueden ocupar varios fragmentos contiguos o referenciados y conservar dudas sin forzar triples. La capa semántica conserva proposición, participantes, alcance, modalidad, atribución, tiempo y evidencia. Las relaciones directas son proyecciones de afirmaciones/ocurrencias trazables, no un reemplazo destructivo de estas. La normalización lexical y vectorial solo genera candidatos de identidad; la fusión exige evidencia contextual y consistencia del componente completo, con separación reversible.

### 13.4 Consistencia, derivación y memoria humana

La identidad de una revisión no es un UUID nuevo por cada lectura ni únicamente el hash de nodos/aristas. Debe identificar el contenido y las dependencias que justifican servirlo, incluidos fuente, política, juicios y transformaciones. Se distingue identificador de ejecución, revisión de conocimiento y revisión de presentación. Un trabajo parcial puede tener checkpoint consultable como tal, pero no sustituir el puntero de revisión acreditada.

La generación comprende datos, comunidades reificadas y pertenencias, resúmenes con fuentes y límites, índice con modelo/revisión/dimensión/normalización y contrato de consulta. Un puntero actual solo avanza después de verificar todos los derivados obligatorios del perfil. El conjunto de fuentes puede cambiar mientras se calcula: la generación se fija a su corte, comprueba vigencia al publicar y conserva el resultado anterior si queda obsoleta. No se presume transacción distribuida entre PostgreSQL, Neo4j y archivos; debe implementarse coordinación durable, reconciliación y cambio de puntero verificables.

El replay distingue: (1) reproyección determinista de propuestas conservadas; (2) regeneración de extracción desde fuentes, sujeta a variación; (3) reaplicación no vacía del ledger por correspondencia demostrada. Eliminar todos los derivados no puede exigir eliminar primero juicios ligados por una clave foránea a una propuesta efímera. Los juicios permanecen, los objetos regenerados se reconcilian y los conflictos se detienen. Revocar una fusión invalida todos los derivados afectados; las respuestas históricas permanecen como evidencia inmutable de lo emitido, marcadas como obsoletas cuando corresponda, no reescritas retroactivamente.

### 13.5 Comunidades útiles, no decorativas

La proyección de Leiden declara tipos incluidos, dirección, pesos, autoaristas, aislados y revisión; la definición debe coincidir con lo que consume el algoritmo. Repeticiones por solape del segmentador no son evidencia independiente. Las comunidades son entidades derivadas con pertenencias, subgrafo inducido, resumen, entradas y revisión. El resumen no puede incorporar aristas inválidas ni contenido de un ámbito que el solicitante no puede leer; su autorización se calcula sobre todas sus fuentes, no se copia del parámetro de la consulta.

La afinidad ideacional para la Ideación Asíncrona Recuperable puede requerir relaciones propuestas entre formulaciones distintas. No se consigue unificando por parecido ni inventando causalidad. Tales relaciones conservan tipo, evidencia y estatuto inferido; su utilidad se evalúa recuperando ideas completas y evolución, no reduciendo el número de comunidades. No se exige que temas semánticos coincidan exactamente con una partición modular.

Las métricas longitudinales separan partición de identidad de comunidad, aparición/desaparición de nodos y división/fusión real; usan alineación o métricas invariantes a etiquetas. Un modelo nulo debe contrastar la misma operación de optimización y pregunta que la estadística observada; no se presenta como prueba de significación lo que solo es un contraste diagnóstico. Ningún barrido de resolución es evidencia si el objetivo no utiliza ese parámetro.

### 13.6 Casos adicionales obligatorios

Estos son **casos especificados**, no una afirmación de que el producto ya los pasa.

| Caso | Estímulo | Resultado exigido |
|---|---|---|
| N29 | `ingestar()` legado sin juicios humanos | Proponer o bloquear; nunca fabricar actor humano |
| N30 | Relación aceptada, extremos rechazados | Conflicto explícito, sin nodos recreados automáticamente |
| N31 | Dos homónimos dentro de una fuente | Menciones distintas antes de resolución contextual |
| N32 | Misma proposición, nuevo UUID de propuesta | Reaplicar juicio solo por correspondencia demostrada |
| N33 | Literal válido cruzando Python/TypeScript | Igual aceptación y representación, sin perder ΦM |
| N34 | Caída tras commit y antes de Leiden/índice | Reanudar trabajo durable; no éxito idempotente prematuro |
| N35 | Índice de otra revisión o modelo | No consulta silenciosa ni mezcla de espacios |
| N36 | REFINE emite consulta distinta | El siguiente RETRIEVE la ejecuta y deja traza |
| N37 | Hallazgo visual presente, juicio insuficiente | No autoaprobar por configuración de compatibilidad |
| N38 | Resumen de comunidad con contenido no autorizado/invalidado | Excluir o reconstruir con alcance autorizado, nunca etiquetarlo público por defecto |
| N39 | Partición renombrada o sin miembros comunes | Invariancia a etiquetas / NO COMPARABLE |
| N40 | Corrección solo de fuente, juicio o política sin cambiar topología | Nueva revisión lógica e invalidación causal de derivados afectados |

**Compatibilidad exigida:** mantener las tres zonas de ingesta, el original y sus versiones, el ledger auténtico y separado, ΦM determinista, ΦC/fKGC distinto del razonamiento, comunidades y recuperación topológicas, generador separado, historial vinculante, fVAL global y refinamiento visual sin escritura al grafo. No se cambia de stack ni se acredita la facultad autobiográfica por añadir esta sección. Las unidades canónicas de EpisTwin siguen siendo la fuente normativa; el mapeo de esta revisión es diagnóstico, no auto-ratificación formal.

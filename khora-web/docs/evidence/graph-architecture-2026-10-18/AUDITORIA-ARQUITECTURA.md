# Dictamen de arquitectura y código frente al estándar de calidad

2026-10-18 · Código fijado a `f820192d02ccc48e294e83ceb38f34df2c287036` (documentación sobre el código funcional de `a0975ffaef17830471fff3adcdb804c47490ff0b`).

## 1. Respuesta y responsabilidad

**No: Khora no es consistente integralmente con el estándar.** Hay piezas reales y aprovechables de EpisTwin, pero la composición publicada no forma una sola cadena acreditada. Tampoco era correcto considerar la versión 1.0 del estándar una solución de construcción completa: definía condiciones de aceptación, no todos los contratos necesarios para realizarlas. Se corrige esa insuficiencia en v1.1, sin afirmar que una norma escrita repare el software o vuelva infalible la interpretación.

La responsabilidad no recae en que el operador estructure mejor sus dictados. La entrada amorfa es parte del caso de uso. El mecanismo debe preservar su sentido, distinguir lo que sabe de lo que propone, recuperar lo relevante y demostrarlo. Tener varias piezas no es por sí solo una mala arquitectura; no poder demostrar cómo componen el mismo conocimiento sí es un defecto integral.

## 2. Método, evidencia y límites

Se recuperó un lote completo de 239 archivos seleccionados (222 blobs faltantes y 17 ya disponibles cotejados con el árbol), más rutas de interfaz y evidencia previamente recuperadas. El manifiesto `source-manifest.json` diferencia archivos identificados por hash, procedencia y alcance. **Adquirido no significa revisado línea por línea.** La inspección detallada siguió las rutas causales enumeradas en §3, sus implementaciones efectivas y los oráculos de prueba pertinentes; no es una auditoría exhaustiva de todo el repositorio, dependencias o infraestructura.

Se ejecutaron 11 controles adicionales R01–R11: diez muestran incumplimientos/defectos de contrato o instrumentación; R03 documenta una política aún ambigua, no se cuenta como infracción automática. Se conservan programas y resultados. Las pruebas usan funciones reales con datos controlados y, donde corresponde, adaptadores explícitos. No usan proveedores nuevos ni escriben datos productivos. R09 demuestra insuficiencia del contrato de índice; no acredita un incidente vivo de índice obsoleto. R11 ejecuta tres funciones puras extraídas del árbol sintáctico del archivo real porque `networkx` no está instalado en este entorno; no ejecuta Leiden.

Se reutiliza, con corte identificado, la auditoría integral anterior del mismo código funcional: consulta autenticada insuficiente, interfaz que muestra suficiencia, cuatro controles negativos semánticos y 21 pruebas unitarias seleccionadas. No se reejecutó producción para presentar como nuevo lo ya comprobado. No se ejecutaron borrado/reconstrucción de producción, prueba multitenant ofensiva, nueva extracción total, pruebas distribuidas de fallos ni acreditación de uso de la prótesis. Esas ausencias figuran como pendientes, no como aprobaciones.

Se contrastaron íntegramente los documentos cargados de ingesta, las 59 unidades de EpisTwin y Construcción Auditada; se consultó la planeación de Ideación Asíncrona Recuperable y el artículo primario. Su historial se interpreta por vigencia, no como estado actual. Esta matriz diagnóstica no constituye una ratificación formal de requisitos o criterios de aceptación del Protocolo de Construcción Auditada.

## 3. Cadena real y puntos de bifurcación

### 3.1 Ruta visible nueva

`/api/grafos` → `graph-twins-store.readPair/nextChunk/judge` → originales por política → propuestas cifradas `grafo_par_propuesta` → `validateExtraction` → resolución propuesta → `project` → Leiden JavaScript → snapshot PostgreSQL → visualización.

Hay controles reales: hashes y posiciones, rechazo de anclas ambiguas, propietario en selección, ledger append-only autenticado, control de concurrencia por revisión, límites explícitos y conectividad de partición. Son valiosos. No prueban semántica y no conectan por sí mismos este grafo al recuperador Python.

### 3.2 Ruta canónica de ingesta hacia el núcleo

`/api/ingesta` → versión aprobada y triple de procedencia → `/api/v1/ingesta` → `proponer` (normalizar + ΦM + fKGC + resolver) → **`ratificar_propuesta` automática** → `asentar` → método efectivo `Neo4jMemoriaOrganizada.asentar_transaccional` → hook posterior `psi.on_node_upserted` → Leiden/reificación → resúmenes → publicación → índice local.

La aprobación de custodia se verifica, pero el contenido extraído se acepta por defecto dentro del núcleo. La función `asentar` rechaza propuestas sin juicios; `ingestar` sortea el sentido de esa protección fabricándolos. La existencia del contrato puro no basta si el endpoint llama a otra ruta.

### 3.3 Ruta publicada de consulta

Pantalla → `/api/consulta` → `/api/v1/consulta` → `RetrieverGraphRAG` → índice local + Neo4j → `UnificadorAlLeer` → fragmentos/subgrafo/suficiencia. **No llama al ciclo completo de razonamiento.** `/api/v1/chat` es otra generación directa. El núcleo `engine.core.ask` sí existe, pero no se acredita conexión a la ruta publicada.

### 3.4 Implementación efectiva, no apariencia de archivo

`_memoria.py` redefine y asigna al final `asentar_transaccional` y `reificar_comunidades`; `embeddings.py` redefine `_save_index` y `knn`. Se revisaron las definiciones efectivas. `summaries.py` es un shim; la implementación efectiva vive en `summaries/fsum.py` a través del paquete. No se reportan como defectos efectivos la consulta ilustrativa no usada de `ComunidadesReificadas.add_community` ni parámetros gamma/theta supuestamente activos: el manifiesto Python **sí declara** resolución no utilizada y theta inefectivo. El problema es qué se acredita con esos instrumentos, no inventar un uso que el código niega.

## 4. Hallazgos trazables y cambios requeridos

Severidades: **crítico** bloquea confianza/publicación del alcance; **mayor** bloquea capacidad afectada; **riesgo pendiente** exige comprobar antes de acreditar, sin afirmar incidente explotado.

### H01 · Crítico · Dos circuitos de conocimiento sin integración demostrada

Evidencia: `graph-twins-store.ts`, `grafo-proyeccion.ts`, `api/main.py:endpoint_consulta`; evidencia real anterior `/api/grafos` poblado frente a `/api/grafo` vacío y consulta sin semillas. Requisitos QG-040/041/042/064.

**Cambio:** revisión lógica compartida, política/plano explícito, mismo constructor y consumidores fijados al manifiesto. No basta copiar nodos de PostgreSQL a Neo4j sin preservar proposiciones, juicios y tipos. Aceptación: fuente nueva controlada aparece en mapa, recuperación y respuesta con las mismas fuentes/revisión; cambiar consumidor a otra revisión debe fallar.

### H02 · Crítico · Ratificación humana fabricada en la ruta de ingesta

Evidencia: `poblacion/_ingestar.py:ingestar`, `persistir`, `ratificar_propuesta`; R05 asienta sin juicio humano, con actor sintético `operador`. No se atribuye fraude a cada juicio histórico sin revisar su origen. QG-050/060/061.

**Cambio:** ruta pública propone y retorna propuesta; asentamiento exige ledger autenticado, versión vista y dependencias aceptadas. Compatibilidad nunca eleva aceptación del sistema a humana. Aceptación: sin acto humano no hay escritura curada; aprobación de transcripción no satisface este requisito.

### H03 · Crítico · Identidad lexical implícita dentro de una fuente y en el núcleo

Evidencia: `graph-twins.lexicalKey/entityRefs` colapsa etiqueta+fuente; R01 dos Anas generan un solo nodo. `resolucion._resolver.resolver` hace MERGE exacto sin revisión; R04. Su prueba existente `test_fusion_real_coincidencia_exacta` exige justamente ese comportamiento defectuoso para homónimos. QG-020/021/063.

**Cambio:** identificador de mención por ocurrencia/contexto, referente separado; igualdad lexical y vectores solo proponen candidatos. Contexto de hablante/cita antes de resolver «yo» a raíz. Aceptación: homónimos intra/interfuente separados, alias real recuperado y pronombre citado no apropiado por el operador.

### H04 · Crítico · Ancla literal no valida proposición ni identidad

Evidencia anterior: cuatro controles negativos; `validateExtraction` y validadores de identidad verifican forma/anclas, no verdad del predicado ni conclusión. fKGC Python emite CSV sin campos obligatorios de alcance, atribución o citas. QG-004/010/011/012/020.

**Cambio:** contrato de afirmación con evidencia exacta, alcance, participantes, modalidad, atribución y tiempos; evaluación semántica independiente del control mecánico; cuarentena ante contradicción/ambigüedad. No vender «segundo modelo» como garantía. Aceptación: negar el predicado inventado y la falsa identidad aunque sus referencias sean válidas; pasar ejemplos positivos y recuperación de idea rara completa.

### H05 · Mayor · Anclas sintéticas y pérdida de ocurrencias en el núcleo

Evidencia: `proponer` usa `Anchor(exact_text=f"{origen} {relacion} {destino}")` después de normalizar identidades, sin probar que sea un fragmento del original; los IDs de relaciones incluyen índice de enumeración. `_extraer._chunk_text` reconstruye texto por palabras; `_extraer` genera IDs de triple sin posición/fuente. QG-004/006/024/066.

**Cambio:** preservar mapa de coordenadas de normalización, menciones y ocurrencias, distinguir clave de contenido de clave de evento/ejecución. Aceptación: repetición/solape no duplica evidencia y repetición real en otra fecha no desaparece.

### H06 · Crítico · Juicios no sobreviven por sí solos a regenerar propuestas

Evidencia: `project` filtra ledger por `active.has(proposal_id)`; R02 conserva ítems pero cambia UUID de propuesta: curado pasa de dos relaciones a cero. `032_graph_twins.sql` tiene clave foránea a propuesta efímera y trigger que impide borrar juicios: borrado indiscriminado de propuestas no es una reconstrucción viable. QG-053/054/066.

**Cambio:** identidad durable de objeto juzgado, ledger independiente, correspondencia exacta auditable y cola de conflictos/huérfanos. No copiar aceptación por semejanza. Aceptación: reconstrucción aislada desde fuentes con ledger no vacío y cambio de instancia; preservar aceptados/rechazados/revocaciones o bloquear conflicto explícito.

### H07 · Crítico · Relación aceptada puede recrear extremos rechazados

Evidencia: R06 `asentar` entrega relación aceptada con cero entidades aceptadas; el método efectivo de Neo4j añade sus extremos a `claves_anchor` y los crea con MERGE. No hay prueba distribuida ejecutada de esa escritura; el conflicto de admisión está reproducido antes del adaptador. QG-050/062.

**Cambio:** validar cierre de dependencias y tipos antes de transacción; ninguna aceptación de relación suplanta un rechazo de referente. Aceptación: conflicto bloqueado sin escritura parcial; literales y origen InformationObject se resuelven por su tipo, no por «desconocido».

### H08 · Mayor · Python y TypeScript discrepan sobre el mismo contrato

Evidencia R10: envelope con `kind=literal` y hash correcto es válido en Python; el validador TypeScript solo admite entity/relation. Esto rompe una ruta de integración posible; no se afirma que la ruta nueva JavaScript use ese envelope. QG-062/067; ΦM/UA-06.

**Cambio:** esquema compartido versionado, tipos generados o vectores canónicos de equivalencia, validación de referencias y juicios; migración contractual compatible. Aceptación: mismo corpus de objetos válidos/invalidos produce resultados iguales en ambos lenguajes, incluidos Unicode, nulos y fechas.

### H09 · Crítico · Éxito prematuro tras commit y fallo de derivados

Evidencia: `asentar_transaccional` hace commit antes del hook; `psi` ejecuta derivados después. `endpoint_ingesta` retorna éxito idempotente si encuentra IO con tupla igual, antes de verificar/reanudar derivados. Una caída posterior al commit puede dejar IO asentado y proceso incompleto; **hipótesis de fallo por inspección, no incidente inyectado en vivo**. QG-055/058/065.

**Cambio:** trabajo durable/outbox con etapas, leases, deduplicación y reconciliación; distinguir «asentado» de «publicado íntegro». Aceptación: inyectar caída en cada frontera y demostrar reanudación; reintento no declara cierre por existencia del IO.

### H10 · Crítico · Revisión topológica no alcanza para consistencia integral

Evidencia: `get_graph_revision` hashea nodos/aristas semánticos, pero no todo el tuple de fuentes, ledger, políticas e instrucciones. `readPair` compara pipeline/modelo/source_stamp, no todos los hashes causales; snapshot usa instrucciones actuales junto a chunks antiguos. QG-005/052/064.

**Cambio:** manifiesto de conocimiento con dependencias separadas por componente, artefactos inmutables y cono de invalidación. Aceptación: cambiar solo prompt, juicio, fuente o política invalida lo afectado; preservar evidencia no afectada. UUID de snapshot y revisión lógica no son lo mismo.

### H11 · Crítico · Índice vectorial sin contrato suficiente de espacio/revisión

Evidencia: `embeddings.knn` no recibe revisión requerida ni coteja manifiesto; metadatos guardan graph_revision/invalidated, no identidad completa del modelo/normalización. `embed_text` cae silenciosamente a hashing por error o dimensión incorrecta; una generación puede mezclar espacios. R09 demuestra el contrato insuficiente, no mezcla productiva observada. QG-005/040/052/064.

**Cambio:** índice por generación/modelo, fijación de proveedor y espacio; fallback solo como modo distinto declarado con índice reconstruido completo. Escritura atómica de matriz/mapa/textos/meta y validación de lectura. Aceptación: modelo/revisión distintos bloquean consulta; caída durante escritura no deja un conjunto híbrido consultable.

### H12 · Mayor · Publicación de comunidades y datos no es un corte único

Evidencia: `psi` publica comunidades incluso con fSUM degradado y reconstruye índice después; Neo4j prepara comunidad por revisión pero no congela todas las lecturas. `recalcular_leiden` toma proyección y revisión en consultas separadas. Snapshot JavaScript publica acumulación de chunks parciales. QG-033/055/058/065.

**Cambio:** perfiles explícitos: checkpoint candidato incompleto puede mostrarse como tal; revisión acreditada requiere todas las etapas obligatorias. Preparar generación y cambiar puntero después de verificar conjunto. Aceptación: sin mezcla de datos actuales/partición vieja/índice viejo; backlog visible y no completitud fingida.

### H13 · Mayor y riesgo de confidencialidad · Resúmenes no tienen alcance seguro suficiente

Evidencia: `summaries/fsum.get_community_edges` no restringe aristas a RELATION activa ni filtra invalid_at de aristas/miembros; retriever filtra nodos visibles pero añade resúmenes de comunidades completas y les asigna la visibilidad del contexto solicitado. Puede incluir contenido no autorizado/invalidado si existe. **No se ejecutó exfiltración ni se afirma incidente productivo.** QG-034/056.

**Cambio:** subgrafo inducido exacto y versionado, autorización sobre todas las entradas del resumen, filtro temporal/tipo/owner; resúmenes por ámbito autorizado o exclusión segura. Aceptación: caso mixto privado/transparente y arista invalidada no contaminan respuesta ni resumen mostrado.

### H14 · Crítico · Recuperación y respuesta se confunden, incluida la pantalla

Evidencia real anterior y código: endpoint devuelve ResultadoDeConsulta, no motor; UI truthiness de cadena; proxy registra éxito HTTP y busca `fuentes`, no `fragmentos`. Retriever devuelve SUFICIENTE por recorrido no excepcionado aun con poca evidencia, no por fVAL global. QG-042/043/044/045/067.

**Cambio:** contratos distintos de recuperación y respuesta; endpoint de razonamiento conectado a motor; enumeraciones cerradas con error/insuficiencia/desconocido. El chat general no se presenta como prótesis si no usa ese recorrido. Aceptación: mismos estados reales en servicio, pantalla y logs; positiva respondible y negativa sin respuesta.

### H15 · Mayor · REFINE existe pero no gobierna la siguiente recuperación

Evidencia R07: `_refine` guarda consulta refinada en historial, pero el ciclo vuelve a pasar `pregunta` original a `_retrieve`. QG-069; UA-17/19/45.

**Cambio:** estado explícito de consulta vigente, operador ejecutable y observación rastreable; lectura de historial completo sin adaptadores activados por atributos de fixtures. Aceptación: consulta refinada cambia petición y, en caso controlado, evidencia recuperada; no basta que aparezca texto REFINE en la traza.

### H16 · Crítico condicional · Modo `mark` puede omitir fVAL

Evidencia R08: con KHORA_FVAL_MODE=mark y evidencia fallback_vqa, `ejecutar_ciclo` declara suficiente sin llamar fVAL. No se afirma que ese modo esté activo en producción. QG-069; UA-20/44.

**Cambio:** retirar bypass del camino operativo; adaptadores de fixtures fuera del runtime productivo. Mantener fVAL GLOBAL, distinto de verificaciones adicionales de afirmaciones. Aceptación: hallazgo visual sin sustento conserva insuficiencia; fallback solo visual y no escribe al grafo.

### H17 · Mayor · Instrumentos de estabilidad pueden producir acreditación falsa

Evidencia R11: misma partición renombrada da estabilidad 0; poblaciones disjuntas dan 1; comparación A/B marca cambio por etiquetas. `resolution_sweep` declara parámetro inefectivo: ese barrido no demuestra sensibilidad. El nulo actual evalúa partición fija sobre redes permutadas; no acredita automáticamente significación frente a optimización nula comparable. QG-025/035/068; UA-53/56/57.

**Cambio:** métricas invariantes a etiquetas (con universo explícito), alineación longitudinal, NO COMPARABLE en vacío, hipótesis/nulo adecuados al objetivo. Aceptación: pruebas metamórficas y controles de reetiquetado, disjunción, división/fusión y ablaciones reales del recuperador.

### H18 · Riesgo pendiente crítico · Identidad y autorización no viajan de extremo a extremo

Evidencia: la ruta web de consulta transmite solo pregunta y clave de servicio; núcleo usa `root` global y almacenes locales compartidos sin owner en ese contrato. Varias rutas de ingesta/segmentación consultan por ID sin filtrar usuario en los símbolos inspeccionados. Los graph-twins nuevos sí filtran propietario: no se generaliza su protección al resto. No se hizo prueba ofensiva multiusuario; despliegue de propietario único puede reducir exposición, no demostrar aislamiento. QG-056/064.

**Cambio:** contexto autenticado de propietario/ámbito propagado y comprobado en cada almacén, no un email enviado libremente por cliente. Historial SQLite, índices, resúmenes y rutas de consulta requieren mismo control. Aceptación: dos propietarios controlados no leen, modifican ni infieren datos ajenos por ID, resumen, caché o sesión; revisión de seguridad con operador.

### H19 · Mayor · Fragmentación puede anclarse a texto distinto de su hash/version

Evidencia: `fragmentos.generarFragmentosAnclados` prioriza `texto_estructurado` aunque almacena sha de versión; no exige estructura_ratificada_en en esa selección ni recalcula hash del texto realmente segmentado. Sus guardianes cotejan slices contra el texto seleccionado, no necesariamente contra el original de esa huella. `ratificarEstructura` registra timestamp sin compare-and-swap de propuesta/version vista. **Riesgo por inspección; no se afirma que todas las filas persistidas estén mal.** QG-004/005/055.

**Cambio:** estructura derivada versionada con su hash y mapa al original; ratificación ligada a propuesta vista y control concurrente. Aceptación: cambios de espacios/párrafos conservan anclas al original; propuesta vieja no se ratifica después de una corrección silenciosa.

### H20 · Mayor · Salud, pruebas y despliegue no acreditan facultad integral

Evidencia: salud_grafo mide defectos estructurales; grafo vacío puede tener cero defectos. API tests pueden hacer skip en 500/503. Prueba golden de identidad está xfail. `khora_audit.py` acepta cabecera ACR por sintaxis y heterogeneidad por simple import; no valida ratificación ni ablación. CI tiene pruebas reales del núcleo, pero no cadena poblada con proveedores y utilidad. `post-deploy-smoke.yml` apunta a khora-ten y busca 200/marcador; otro flujo prueba solo home del dominio actual. No se afirma estado actual de checks ni de protección de rama sin consultar. QG-041/047/059/068.

**Cambio:** pruebas reales positivas y negativas, prerrequisitos obligatorios del perfil sin skip exitoso, prueba del mecanismo poblado y dominio/corte exactos. Auditor conserva alcance: cabecera no equivale a criterio ratificado. Aceptación: desconectar deliberadamente un tramo hace fallar la acreditación aunque siga respondiendo home y los tests de unidad pasen.

### H21 · Mayor · IAR y SEA siguen sin acreditación de producto

El extractor produce relaciones; el mapa no acredita unidades ideacionales íntegras, originalidad contra archivo completo, hilos longitudinales, reconocimiento de la síntesis ni uso. No basta añadir etiquetas de comunidades. QG-006/016/026/032/046/047/051.

**Cambio:** recuperación híbrida anclada a unidades de sentido, ocurrencias y evolución; relaciones de afinidad tipadas y propuestas, no identidades inventadas. Para Síntesis Existencial Accionable separar fidelidad, reconocimiento humano y uso. Para Ideación Asíncrona Recuperable recuperar idea rara completa, alias, variaciones y contradicciones. Criterios de uso que el canon deja abiertos no se autoasignan.

### H22 · Pendiente · Borrado y memoria histórica requieren alcance conjunto

El núcleo implementa barrera de índice y regeneración tras borrar IO: preservar esa intención y sus controles, no sustituirlos por un tombstone. Sin embargo historial de respuesta SQLite, archivos de índice/manifiestos, proyecciones PostgreSQL, versiones de fuentes y copias requieren una política coordinada. Se observó borrado de comunidades en el núcleo, no se ejecutó una prueba global ni se acredita ausencia universal de residuos. QG-023/053/057.

**Cambio:** grafo de dependencias y política explícita de retención, invalidación de evidencias históricas sin reescribir lo emitido, borrado solo autorizado. Aceptación: fuente de prueba retirada deja de influir en todos los derivados incluidos en la política y declara retención restante.

## 5. Lo que se conserva y por qué no hay que romper EpisTwin

Conservar: archivo original/versiones/audio, triple de procedencia y barreras de integridad; separación propuesta/asentamiento; ledger append-only auténtico; ΦM determinista; normalización/caption y fKGC separados; esquema Entity/Literal/Blank y alcance desde usuario; Leiden con manifiesto, pertenencias y comunidades; recuperación topológica; separación funcional de política/recuperación/generación; historial, fVAL global, refinamiento visual efímero; barrera de borrado e índice. Corregir conexiones y contratos, no borrar todo por frustración.

No convertir a fVAL en validador de cada afirmación: el artículo exige suficiencia global; verificaciones semánticas de afirmaciones son una capa adicional. No forzar comunidades autobiográficas por modularidad. No adoptar un benchmark sintético como prueba de la vida del operador. No afirmar que Neo4j sea obligatorio para el artículo; sí es la implementación existente a evaluar antes de reemplazarla.

## 6. Diseño de cambios recomendado, no aprobado ni implementado

Recomiendo **convergencia incremental con una sola espina de evidencia y proyecciones reconstruibles**, reutilizando PostgreSQL para custodia/propuestas/ledger y el núcleo Neo4j ya existente para el mecanismo de grafo, sujeto a resolver sus defectos y demostrar la integración. Evita construir un tercer motor. La elección material de este mapa requiere revisión del operador; esta recomendación no es su aprobación.

Alternativa: portar todo el mecanismo a PostgreSQL con equivalencia demostrada. Es válida en abstracto porque EpisTwin no impone Neo4j, pero exige realizar de nuevo topología, tipos, comunidades/resúmenes, ciclo, borrado e instrumentos; no se justifica por tener ya un snapshot. Mantener dos motores independientes sin correspondencia no es una solución.

### Contratos mínimos del diseño

- **Fuente versionada:** propietario, ID, versión, hash, modalidad, capture_time/event_time, política/autorización de selección y disponibilidad de audio. No cambiar originales para aprobar extracción.
- **Unidad y ocurrencia:** anclas al original, mapa de normalización, contenido íntegro/contexto, disposiciones representada/pendiente/excluida con razón. No forzar toda unidad a entidad.
- **Afirmación:** participantes por menciones/referentes, predicado, dirección, alcance/modalidad/atribución, tiempos y conjunto de evidencias; estatuto candidato/revisado y evaluación semántica distinguibles.
- **Referente/identidad:** ID durable, decisiones de unión/separación versionadas, evidencias y contradicciones, componentes consistentes; etiquetas como atributos, no claves ontológicas.
- **Juicio:** actor autenticado, objeto estable/revisión vista, decisión y acto revocado, idempotency key/orden; aceptación de contenido distinta de autorización de procesamiento. Ledger independiente de una instancia efímera.
- **Generación:** manifest de fuentes+transformaciones+juicios, plano y propietario; artefactos preparados e inmutables; trabajo durable; puntero de publicación con compare-and-swap. El control mecánico no se denomina validación semántica.
- **Consulta:** pregunta, sesión autorizada, plano/revisión fijados; evidencia con anclas y comunidades; operadores causales; respuesta, inferencias, citas pertinentes, suficiencia global y degradación tipadas. Nunca transformar automáticamente cadena no vacía en verdad.
- **Derivados de comunidad:** tipos/edges/pesos/proyección fijados, partición verificada, resumen de subgrafo inducido con cobertura/límites; acceso según todas las fuentes. Afinidad y identidad son relaciones distintas.

La secuencia es captura → propuestas de unidades/afirmaciones → validación mecánica → evaluación semántica y juicios según plano → asentamiento tipado en generación → Leiden → resúmenes → índice → compuertas → publicación del manifiesto → consulta/razonamiento → presentación → juicio/reconstrucción. Cada error tiene estado durable, impacto y posibilidad de reanudación. No se simula transacción distribuida.

## 7. Paquetes de trabajo y cierre falsable

| Orden | Paquete y símbolos principales | Depende de | Aceptación que desbloquea |
|---|---|---|---|
| 0 | Congelar alcance, revisión y plano; reparar contrato de suficiencia (`api/main.py`, proxy, UI) | Ninguna para especificar; ejecución sujeta a compuertas UX/seguridad | Insuficiente/error/desconocido se ven correctamente; no confundir contención con cierre de prótesis |
| 1 | Decisión de convergencia y contratos compartidos (`contracts/proposal`, esquema de revisión/consulta) | Revisión material de mapa/seguridad | Esquemas y vectores de paridad; literales/juicios/errores iguales entre lenguajes |
| 2 | Fuente, normalización y cobertura (`fragmentos`, `pulido`, `_extraer`, `proponer`) | 1 | Anclas a fuente exacta y unidades íntegras; N01–N04/N11/N25/N31/N33 |
| 3 | Identidad contextual y admisión (`resolver`, `lexicalKey`, `project`, `asentar`) | 1–2 | Homónimos separados, alias unido con prueba, contradicción transitiva bloqueada, extremos rechazados no recreados |
| 4 | Ledger durable/replay y eliminación de auto-ratificación (`ingestar`, `persistir`, store/migraciones) | 1–3 | N09/N28/N29/N30/N32, aceptación/rechazo/revocación conservados y conflictos explícitos |
| 5 | Coordinación de generaciones (`asentar_transaccional`, `psi`, `readPair`, `snapshot`) | 1–4 | Inyección de fallos y concurrencia; N19/N20/N34/N40; reintento no cierra antes de derivados |
| 6 | Comunidades/resúmenes exactos y autorizados (`communities`, `fsum`, reificación) | 3–5 | Cobertura/conectividad, subgrafo inducido, summary lineage, autorización y N38 |
| 7 | Índice/recuperación de revisión (`embeddings`, `retriever`, `UnificadorAlLeer`) | 5–6 | Un solo espacio y revisión; afinidad no es identidad; N16/N17/N35 y casos multifuente |
| 8 | Ciclo de razonamiento conectado (`core`, `orchestrator`, endpoint) | 7 | REFINE causal; historial vinculante; generador y fVAL separados; N36/N37 y fallback sin writeback |
| 9 | Instrumentación y acreditación (`epistwin_audit`, `khora_audit`, CI/smoke) | Puede desarrollarse en paralelo desde 1; cierre sobre 2–8 | N39, particiones invariantes, nulos/ablaciones efectivos; cortar cualquier tramo hace fallar |
| 10 | Reconstrucción/borrado aislados y pruebas longitudinales | 2–9 | Replay no vacío, ausencia de residuos según política, cambio/corrección/repetición trazables |
| 11 | Acreditación de Ideación Asíncrona Recuperable y Síntesis Existencial Accionable | Todos los técnicos + actos humanos específicos | Tareas completas del estándar, reconocimiento/uso donde corresponde, límites estadísticos explícitos |

Los paquetes son unidades de cambio con compuertas, no once prompts delegables sin revisión ni una autorización de despliegue. No se promete duración sin medir alcance de implementación. No ampliar el grafo ni pulir su dibujo en lugar de resolver los defectos que contaminan el significado.

## 8. Qué falta para poder decir «sí, es consistente»

1. Aprobar materialmente el diseño de convergencia y seguridad; congelar perfil piloto sin inventar decisiones del operador.
2. Implementar y pasar controles nuevos y previos, positivos y negativos, sin alterar originales ni auto-ratificar juicios.
3. Recorrido real poblado desde captura autorizada hasta respuesta visible; mismo propietario/plano/revisión, anclas y trazas en cada frontera.
4. Caídas/reintentos/concurrencia, correcciones y replay no vacío en entorno aislado con servicios reales.
5. Demostrar utilidad de ambas capacidades y reconocimiento/uso según canon. La implementación de EpisTwin no acredita automáticamente facultad autobiográfica.

**Estado al cierre de esta auditoría:** dictamen negativo sustentado, estándar refinado y diseño de remediación documentados. Producto sin modificación; adopción material, implementación y acreditación pendientes. Esta revisión no autoriza merge, migración, backfill, borrado ni despliegue.

# Matriz diagnóstica del estándar v1.1

55 requisitos; no porcentaje compensatorio ni certificación formal. NO CONFORME incluye incumplimiento del contrato inspeccionado, aunque aún falte prueba productiva; el informe distingue esa evidencia. PARCIAL no significa aprobado.

| Requisito | Obligación | Dictamen | Evidencia / hallazgo | Brecha |
|---|---|---|---|---|
| QG-001 | Conservar original y versiones sin reescribirlos para hacer pasar una extracción. Referenciar propietario, versión y huella recalculada del contenido | PARCIAL | H05/H19 | Hay hashes/versiones; no toda ancla deriva del contenido con esa huella. |
| QG-002 | Declarar política de selección y contabilizar todas las fuentes: seleccionadas, excluidas con razón, pendientes y fallidas, sin doble conteo | PARCIAL | H01/H12 | Política explícita, sin disposición individual completa de excluidos. |
| QG-003 | Diferenciar texto manual sin audio, audio no esperado, audio esperado ausente y audio disponible | NO VERIFICABLE | Auditoría integral anterior | No nuevo cotejo audio/texto; ausencia clasificada no explica causa. |
| QG-004 | Cada afirmación derivada debe permitir recorrer hasta el fragmento, versión y fuente. Coordenadas, codificación y convención de fin deben ser explícitas | NO CONFORME | H04/H05/H19 | Ancla del núcleo sintética; transformación sin mapa íntegro. |
| QG-005 | Mantener linaje de transformación: código, esquema, modelo, proveedor, instrucciones, parámetros y entradas, con huellas y fecha | NO CONFORME | H10/H11 | Linaje y vigencia no cubren todas las dependencias. |
| QG-006 | Inventariar unidades de sentido y su disposición: representada, pendiente o excluida con razón revisable. Preguntas, dudas y fragmentos sin entidad no son basura por defecto | NO VERIFICABLE | H05/H21 | Disposición semántica integral no acreditada. |
| QG-010 | Preservar predicado, dirección, participantes y contexto, no solo extremos y cita | NO CONFORME | H04 | Predicado no sustentado aceptado en regresión anterior. |
| QG-011 | Preservar alcance de negación, cuantificadores, condición, deseo, duda, futuro, analogía y discurso citado | NO CONFORME | H04 | Negación de alcance deformada aceptada. |
| QG-012 | Conservar quién dijo qué; distinguir operador, asistente, tercero y propuesta aún no adoptada | PARCIAL | H03/H04 | Campo en nueva ruta, no garantía compartida del núcleo. |
| QG-013 | Separar tiempo de captura, de acontecimiento, de validez y de revisión, conservando desconocidos | PARCIAL | H05/H10 | Campos temporales existen, pero faltan propagación y semántica completa. |
| QG-014 | Conservar contradicciones y cambios como contenido contextualizado | NO VERIFICABLE | H04/H21 | No prueba longitudinal de contradicciones preservadas. |
| QG-015 | Tratar similitud y coaparición como señales de búsqueda o candidatos, no pruebas de relación | NO CONFORME | H03/H04 | Señales lexicales participan en fusión sin contexto suficiente. |
| QG-016 | Preservar ideas raras, incompletas y de baja frecuencia y sus posibilidades de recuperación | NO VERIFICABLE | H21 | No tarea acreditada de idea rara íntegra. |
| QG-020 | Proponer identidad solo con evidencia contextual específica; igualdad lexical o vectorial no basta | NO CONFORME | H03/R01/R04 | Fusión por nombre normalizado o etiqueta dentro de fuente. |
| QG-021 | Registrar evidencia a ambos lados, justificación, contradicciones consideradas y alcance de cada unión | NO CONFORME | H04 | Referencias correctas no bloquean identidad falsa. |
| QG-022 | No cerrar transitivamente vínculos de cercanía, afinidad, analogía o equivalencia parcial como mismo referente | PARCIAL | H03/H04 | Union-find y puentes sin prueba de consistencia semántica global. |
| QG-023 | Toda fusión debe poder deshacerse y rederivar aristas, comunidades, resúmenes y respuestas afectadas | NO VERIFICABLE | H06/H22 | No reconstrucción global tras deshacer fusión. |
| QG-024 | Deduplicar representación sin borrar ocurrencias, fechas ni proveniencias | PARCIAL | H05/H09 | Idempotencia de IO existe; ocurrencias/derivados no totalmente preservados. |
| QG-025 | Medir falsas fusiones y alias no recuperados por separado | NO VERIFICABLE | H17/H21 | Sin estimación independiente de falsas fusiones y alias omitidos. |
| QG-026 | Separar novedad de expresión, novedad de idea, repetición y evolución respecto al universo procesado | NO VERIFICABLE | H21 | La nueva ruta declara que no coteja originalidad/repetición. |
| QG-030 | Calcular comunidades sobre una proyección declarada, con versión, parámetros, semilla, pesos y reglas sobre dirección/tipos | PARCIAL | H12/H17 | Manifiesto y semilla reales; equivalencia entre circuitos no probada. |
| QG-031 | Verificar cobertura y membresías según método; tratar aislados y múltiples componentes explícitamente | PARCIAL | H12 | Cobertura/conectividad implementadas; no certificación compartida. |
| QG-032 | Evaluar afinidad semántica contra tareas y juicios de referencia, además de estructura | NO VERIFICABLE | H17/H21 | Partición no acredita afinidad útil. |
| QG-033 | Cuando se afirme fidelidad a EpisTwin, materializar sus comunidades, pertenencias y resúmenes con la correspondencia canónica requerida | NO CONFORME | H01/H12 | Núcleo reifica; nueva proyección visible no realiza ese circuito integral. |
| QG-034 | Anclar cada afirmación del resumen al subgrafo inducido y sus fuentes; identificar versión de resumen y entradas | NO CONFORME | H13 | Consulta de resumen no restringe todas las entradas activas/permitidas. |
| QG-035 | Medir sensibilidad a semillas, resolución, retiro de fuentes y cambios de extracción por separado | NO CONFORME | H17/R11 | Métrica sensible a etiquetas y barrido inefectivo. |
| QG-036 | Usar componentes, aislados, grados, concentración por fuente, pesos y autoaristas como diagnóstico causal | PARCIAL | Auditoría previa/H17 | Diagnóstico estructural existe, no nota de salud. |
| QG-040 | Declarar una revisión lógica del conocimiento y demostrar qué consumen mapa, recuperador, resúmenes, generador y validador | NO CONFORME | H01/H10 | No revisión lógica probada entre consumidores. |
| QG-041 | Verificar recuperación con preguntas y fuentes esperadas fijadas antes de ajustar el sistema | NO CONFORME | H01/H14/H20 | Caso real respondible insuficiente; cadena desconectada. |
| QG-042 | Separar precisión, recuperación de evidencia, cobertura de respuesta, fidelidad y abstención | NO CONFORME | H14 | Recuperación se presenta como respuesta procesada. |
| QG-043 | Mantener contrato tipado y cerrado de suficiencia; desconocido, error y vacío no equivalen a suficiente | NO CONFORME | H14 | Truthiness de cadena insuficiente. |
| QG-044 | Conservar el estado real desde servicio hasta pantalla, exportación y registro | NO CONFORME | H14 | Pantalla contradice servicio. |
| QG-045 | Hacer rastreable cada afirmación de la respuesta a evidencia pertinente y suficiente; separar inferencias y conocimiento externo | NO VERIFICABLE | H14/H16 | Generación/validación integral no acreditada en ruta. |
| QG-046 | Ofrecer acceso verificable al contexto y evolución, con límites y truncamiento explícitos | NO CONFORME | H01/H21 | Mapa y consulta no demuestran recuperación contextual íntegra. |
| QG-047 | Probar utilidad como operador-usuario, no solo como desarrollador | NO VERIFICABLE | H21 | Sin aceptación de utilidad completa del operador. |
| QG-050 | Atribuir ratificación, rechazo y revocación a actor autenticado, objeto preciso y revisión vista; preservar historial | NO CONFORME | H02/H07 | Autoaceptación como operador y dependencias contradictorias. |
| QG-051 | Distinguir rechazo de trazabilidad de rechazo jerárquico en la Síntesis Existencial Accionable | NO VERIFICABLE | H21 | Actos específicos SEA no acreditados. |
| QG-052 | Invalidar derivados y acreditaciones ante cambios relevantes, incluidos instrucciones, política de identidad, esquema, código y fuentes | NO CONFORME | H10/H11 | Vigencia omite dependencias. |
| QG-053 | Reconstruir en entorno aislado desde originales/versiones, con derivaciones y juicios identificados | NO CONFORME | H06/R02 | Ledger no reaplicado ante nueva instancia idéntica. |
| QG-054 | Separar reproducibilidad de derivados persistidos y variabilidad de nueva extracción | PARCIAL | H06 | Reproyección conservada repetible; no regeneración integral. |
| QG-055 | Probar idempotencia, concurrencia, cambios de fuente durante ejecución y atomicidad de publicación | NO CONFORME | H09/H12 | Reintento por IO no repara necesariamente derivados. |
| QG-056 | Proteger aislamiento por propietario, claves, textos y auditorías; tratar contenido como datos no instrucciones | NO VERIFICABLE | H13/H18 | Riesgos de acceso por inspección; no prueba ofensiva realizada. |
| QG-057 | Tener procedimiento explícito de borrado autorizado y ausencia de residuos en derivados, compatible con la autoridad de custodia | PARCIAL | H22 | Barrera de borrado real; alcance global sin acreditar. |
| QG-058 | Publicar solo revisiones completas con manifiesto verificable y posibilidad de reversión autorizada | NO CONFORME | H09/H12 | Commit/publicación/índice en fronteras separadas sin cierre durable probado. |
| QG-059 | Vigilar calidad en operación y convertir incidentes en regresiones | PARCIAL | H20 | Controles limitados no vigilan calidad integral. |
| QG-060 | Separar estados de captura íntegra, propuesta, validación mecánica, evaluación semántica, juicio humano y publicación. Conservar razón y autoridad de cada transición | NO CONFORME | H02 | Accept sintético. |
| QG-061 | Las proyecciones automática/candidata y curada usan el mismo modelo de evidencia y constructor; cambia la política de admisión, no el significado ni el esquema | NO CONFORME | H01/H02 | Modelos/motores distintos sin integración. |
| QG-062 | Aplicar las restricciones estructurales de EpisTwin al perfil que lo reivindique: clases Entity/Literal/Blank disjuntas, sin Literal como cabeza, usuario sin cola semántica, alcance desde raíz e Information Objects y metadatos deterministas | NO CONFORME | H07/H08 | Conflicto de extremos y discrepancia literal. |
| QG-063 | Distinguir mención/ocurrencia y referente incluso dentro de una misma fuente. El identificador de mención no puede ser solo texto+fuente | NO CONFORME | H03/R01 | Mención keyed por etiqueta+fuente. |
| QG-064 | Un único manifiesto lógico identifica propietario, política/plano, fuentes y versiones, esquema, código, modelos/instrucciones, propuestas, juicios, proyección, partición, resúmenes e índice. Los consumidores fijan la misma revisión | NO CONFORME | H10/H11/H18 | Sin manifiesto integral compartido. |
| QG-065 | Publicar por generación preparada y verificada con cambio atómico de puntero. Persistir trabajo de actualización y permitir reanudación tras fallo posterior al commit | NO CONFORME | H09/H12 | Fallo tras commit no reanudado por precheck idempotente. |
| QG-066 | Dar identidad durable al objeto juzgado, separada de la instancia de extracción; definir mapeo exacto, conflicto y orfandad al regenerar. Ningún juicio cambia de sentido por similitud | NO CONFORME | H05/H06 | IDs de instancia/índice no garantizan replay. |
| QG-067 | Contrato interoperable de propuestas y consultas, con esquema único versionado, vectores de prueba y equivalencia entre Python y TypeScript | NO CONFORME | H08/H14 | Paridad de literal falla, contrato de consulta divergente. |
| QG-068 | Validar los instrumentos de evaluación antes de usarlos para acreditar: invariancia al renombrar particiones, universo comparable, nulos apropiados y ablaciones efectivas | NO CONFORME | H17/H20 | Instrumentos pueden inducir afirmación falsa de estabilidad. |
| QG-069 | Comprobar causalidad de los operadores de razonamiento, lectura de historial, recuperación, generación separada, fVAL global y refinamiento visual efímero | NO CONFORME | H15/H16 | REFINE no cambia consulta; mark puede saltar fVAL. |

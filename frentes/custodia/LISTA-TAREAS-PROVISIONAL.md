<!-- LIST_VERSION=0.9; LIST_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Lista provisional de tareas · Frente Custodia

> **ESTADO: PROVISIONAL · NO CERTIFICADA CONTRA EL DISEÑO METODOLÓGICO FINAL.** Se conserva aquí por instrucción expresa del operador. CUSTODIA-02 fue retirada de las tareas activas por instrucción del operador; no se reutiliza su identificador. Esa retirada no certifica metodológicamente esta materialización. Este archivo no crea un segundo objeto canónico ni otro control de responsabilidad; el núcleo único del frente sigue siendo [OBJETO-CANONICO.md](OBJETO-CANONICO.md).

- **Frente:** Custodia.
- **Versión de esta lista provisional:** 0.9.
- **Última actualización:** 2026-10-29.
- **Metodología en la primera redacción:** Samantha v348 · NX-348m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; fuente `a4c90bd8ff1cd360b1f1662ff55371bd1b56b4cd`.
- **Revalidación antes del cierre (intermedia):** Samantha v351 · NX-351m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; fuente `f069d2385f47731ac9d0f0ca76bfd3cef859cdd2`.
- **Última lectura de metodología del ciclo 2 (referencia histórica):** Samantha v352 · NX-352m; Metacanon 1.21; GOW v2.3; blob `94473eccb6fa71303d5908ce678f7efeb191c215`.
- **Última lectura metodológica histórica (ciclo 4):** Samantha v356 · NX-356m; Metacanon 1.22; GOW v2.6; blob `c364e179e8e9b6a3d566a8e690dfa1a7cce91798`.
- **Última lectura metodológica histórica (C008):** Samantha v358 · NX-358m; Metacanon 1.23; GOW v2.7; blob `89a28e4d05f5baab9c4b86abdb9fbfc532690c75`.
- **Revalidación metodológica del relevo C009:** Samantha v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`, adquirido de `SeryMente/metodologia/main` el 2026-10-29. La lista sigue provisional; el relevo no certifica su diseño.
- **Alcance actual del plan:** tres tareas activas: recuperar y verificar las unidades visibles (CUSTODIA-01); investigar capturas ausentes o aparentemente irrecuperables y cuantificar las lagunas (CUSTODIA-03); completar la investigación y actualizar/certificar el sistema de recuperabilidad mediante correcciones y pruebas de extremo a extremo (CUSTODIA-04). No se afirma que sean el inventario exhaustivo de todas las obligaciones futuras del frente.
- **Regla provisional de custodia de información:** no copiar a este repositorio el texto o audio de dictados reales, secretos, credenciales ni identificadores personales innecesarios. Registrar resultados mediante evidencia minimizada y sanitizada, en el soporte autorizado que corresponda.

- **Secuencia de ejecución acordada en el ciclo C006:**
  1. **Fase de entrada compartida (antes de recuperar o modificar):** en CUSTODIA-03 adquirir y reconciliar, de forma no destructiva y bajo sesión autorizada, el catálogo completo por paginación, las identidades local/remoto, el archivo de Custodia pertinente y los checkpoints accesibles. Esta línea base es la entrada de CUSTODIA-01 y evita confundir una ausencia de la interfaz con pérdida.
  2. **CUSTODIA-01 y continuación de CUSTODIA-03:** una vez preservada la línea base, recuperar y verificar cada unidad visible en paralelo con la búsqueda del dictado ausente y de otras lagunas; no esperar a que la investigación histórica cierre para rescatar lo ya identificable.
  3. **CUSTODIA-04:** consolidar las causas demostradas, corregir el producto, añadir pruebas de regresión y validar la recuperación de extremo a extremo en el entorno autorizado. Su cierre depende de la evidencia de las dos tareas anteriores y de pruebas del sistema actualizado.
  La secuencia no autoriza a alterar originales ni a declarar recuperabilidad productiva antes de una lectura real verificada.

---

## CUSTODIA-01 · Recuperar y verificar las unidades que muestra Ingresos → Dictado → Recuperación

**Prioridad:** P0 · URGENTE · Primera tarea operativa.

**Estado:** EN CURSO — investigación de código ampliada con defectos de conteo/paginación y un incidente de dictado ausente; catálogo real completo y recuperaciones por unidad pendientes. La ejecución del objetivo principal no está cerrada.

**Avance documentado en el ciclo CUSTODIA-INV-RECUP-SES-20261028-R6K2M9Q4**

- Se creó [el inventario provisional de hallazgos](evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md), versión 0.1, enlazado desde el OCP. Contiene hallazgos de código, límites de evidencia, los datos auxiliares del almacén local identificados por separado, clases de resultados por unidad y requisitos de aceptación.
- La lectura de código de main confirmó que el catálogo construye `audioParts` a partir del manifiesto/corte y no del conteo `audio_count` de partes verificadas; el flujo de recuperación remota limita también las partes copiadas al corte/manifiesto declarado. Esto explica un defecto potencial real, pero no cuantifica cuántas unidades visibles están afectadas.
- No se pudo obtener el catálogo autenticado de Ingresos → Dictado → Recuperación ni cotejar la disponibilidad real de los objetos remotos. Unidades reales cotejadas individualmente: 0; recuperaciones de producción confirmadas: 0. Cero cotejos no significa catálogo vacío.
- No se modificó código ni se alteraron sesiones/objetos de producción. La auditoría previa de cinco snapshots locales se conserva como evidencia auxiliar y no se usa como inventario de las unidades de la UI.

**Registro de lo conocido y lo desconocido**
- El operador informó inicialmente que la interfaz indicaba **20 dictados recuperables** y luego estimó que podrían ser aproximadamente 21. El número exacto no ha sido adquirido de la interfaz en este ciclo; ese dato no se debe usar como denominador cerrado.
- La unidad de inventario es el conjunto real que devuelve la sección **Ingresos → Dictado → Recuperación**; no se debe reemplazar por snapshots arbitrarios del navegador.
- El operador aún no ha revisado qué contienen las entradas del conjunto, y este ciclo tampoco obtuvo el catálogo autenticado.
- No se dispone todavía de una lista verificada de elementos, su contenido, sus identificadores, sus fuentes ni su estado individual.
- No se ha intentado aquí la recuperación de esos dictados y no se afirma que alguno ya haya sido recuperado o validado.

**Objetivo:** recuperar efectivamente el conjunto completo de unidades que aparece en Ingresos → Dictado → Recuperación, incluyendo todas las páginas y reconciliando entradas locales/remotas, y comprobar individualmente la efectividad del mecanismo. Esta tarea cubre el conjunto actualmente visible; la investigación de unidades esperadas que no aparecen se separa en CUSTODIA-03. El reporte inicial mencionó 20 unidades y una estimación posterior habló de aproximadamente 21; la cifra definitiva debe obtenerse de la interfaz autenticada y registrarse como evidencia.

**Secuencia prevista**
1. Acceder a la interfaz autenticada de Khora, observar el conjunto completo que ofrece Recuperación y registrar su número real, fechas, procedencia y metadatos mínimos sin copiar contenido privado. El número anterior de 20/21 es solo una referencia reportada, no el denominador comprobado.
2. Identificar cada entrada real de ese conjunto con una referencia anónima estable y registrar evidencia mínima suficiente para distinguir sus resultados, sin volcar contenido personal real a GitHub.
3. Recuperar las unidades mediante el flujo apropiado, evitando sobrescribir, borrar o sustituir sus originales.
4. Verificar individualmente el resultado de cada recuperación y cotejar contenido, integridad, partes de audio, disponibilidad del objeto y procedencia hasta donde el sistema lo permita. No confundir el contador de elementos disponibles con la recuperación consumada.
5. Evaluar el diseño y la efectividad observada del mecanismo para el conjunto completo, diferenciando recuperación demostrada, recuperación parcial, error, duplicado y resultado no verificable.
6. Documentar los resultados y brechas con evidencia sanitizada. Si algún elemento no se puede recuperar, mantenerlo explícitamente abierto y describir el impedimento; no declarar completa la tarea por haber intentado la operación.

**Criterio de cierre:** se adquiere y registra el conjunto real de entradas de Recuperación; cada unidad queda clasificada y sometida al flujo de recuperación apropiado; las recuperaciones exitosas se cotejan individualmente en texto, audio, integridad y procedencia con el original intacto. El conteo objetivo será el que muestre la interfaz en la revisión autenticada registrada, no una cifra inferida. Si alguna unidad no puede recuperarse, la tarea permanece abierta para esa unidad y la limitación queda explícita.

**Siguiente acción:** obtener el catálogo autenticado real de Recuperación, recorrer todas las páginas hasta cursor nulo, deduplicar por identidad y registrarlo de forma sanitizada; cotejar cada entrada con las partes y objetos correspondientes. Después, definir y ejecutar una recuperación por unidad sin sobrescribir ni borrar originales; cotejar el destino antes de declararlo recuperado. Esta lista registra el estado y el criterio, pero no afirma que la recuperación se haya ejecutado.

### Incidente añadido a CUSTODIA-01 · dictado ausente y contador 40→20 · 2026-10-28

- El operador informa que falta un dictado realizado hacia el final de una sesión de terminal; la última entrada que ve en Recuperación fecha del 28-10-2026 a las 17:08. También informa que el contador pasa de 40 a 20 cuando termina de cargar.
- Se inspeccionó el código: la hidratación inicial concatena copias locales y remotas sin la misma deduplicación usada por la recarga; el contador refleja `recoveryItems.length`; el catálogo remoto pagina de 20 en 20. Esto ofrece una explicación plausible para el contador, no una prueba de qué contienen las 20 diferencias.
- Se documentó el incidente en [INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md](evidencias/INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md) y se preservó la instrucción literal del operador.
- La captura ausente sigue sin localizarse: no se obtuvo catálogo autenticado, acuse del checkpoint, fila de base de datos ni estado del perfil tras el reinicio. La pérdida definitiva no está demostrada.
- Siguiente acción dentro de CUSTODIA-01: recorrer las páginas autenticadas hasta cursor nulo, deduplicar por identidad de sesión, revisar Custodia para posibles capturas archivadas y cotejar de forma autorizada la ventana de checkpoints del incidente. No copiar texto privado/UUID reales a GitHub ni intentar acceso a otro perfil o cuenta.
- La lista muestra ahora los defectos de código conocidos y las pruebas de cierre R-06 a R-08 en el inventario; no se ha autorizado ni realizado un cambio de producto.


---

## CUSTODIA-03 · Investigar las capturas esperadas que no aparecen o parecen no recuperables y determinar el alcance real de la posible pérdida

**Prioridad:** P0 · CRÍTICA · En paralelo con CUSTODIA-01; no esperar a cerrar el inventario de las capturas visibles.

**Estado:** ABIERTA — tarea formalizada en este ciclo; investigación productiva, localización y cuantificación pendientes.

**Motivo:** el incidente reportado el 28-10-2026 dejó de permitir asumir que todas las capturas relevantes están presentes en el inventario visible. El operador informa que falta un dictado realizado hacia el final de una sesión de terminal y que la última entrada visible en Recuperación fecha del 28-10-2026 a las 17:08. También reporta un contador que cambia de 40 a 20. La explicación de duplicados local/remoto es plausible por el código inspeccionado, pero no se ha comparado el catálogo real y no cuantifica las capturas ausentes.

**Objetivo:** establecer qué ocurrió con la captura denunciada y con cualquier otra captura esperada que no esté disponible; determinar cuántas unidades pueden identificarse como ausentes, duplicadas, archivadas, locales solamente, incompletas, inaccesibles o irrecuperables; recuperar las que puedan rescatarse de forma segura; y dejar un diagnóstico trazable sobre el alcance real de las lagunas. No se tomará «no visible» como sinónimo de «perdido».

**Secuencia prevista**
1. Con la identidad autenticada y autorización correctas, recorrer todas las páginas remotas de Recuperación hasta `nextCursor=null`, reconciliar el inventario por identidad estable y comparar el resultado con el estado local que siga disponible. No inferir que el delta 40→20 equivale a 20 dictados perdidos.
2. Investigar la ventana del incidente: la última unidad visible reportada a las 17:08 del 28-10-2026 y el dictado que el operador esperaba haber realizado después. Buscarlo tanto entre capturas abiertas/checkpoints como en el catálogo de Custodia si pudo haber sido archivado; distinguir las horas del cliente de las horas de recepción del servidor.
3. Bajo acceso autorizado de solo lectura, cotejar las filas de checkpoint, el acuse de envío, los estados de sesión y las referencias de objetos que puedan asociarse a la ventana. No entrar a otros perfiles/cuentas ni eludir límites de autenticación.
4. Establecer una clasificación por unidad, con evidencia mínima: visible y recuperable; localizada pero archivada; local solamente; duplicada; parcial/incompleta; existe el registro pero no se verifica el objeto; no localizada tras revisar las fuentes disponibles; o irrecuperabilidad demostrada. Si falta evidencia, conservar «NO DETERMINADO», sin convertir la ausencia de resultado en prueba de pérdida.
5. Si una unidad se encuentra, crear/usar un destino separado, preservar el origen y verificar por lectura de vuelta su contenido, integridad y procedencia antes de declararla recuperada. No sobrescribir o borrar originales ni sacar contenido sensible al repositorio documental.
6. Cuantificar el universo observado y sus límites: número de sesiones únicas, solapamientos local/remoto, páginas recorridas, entradas ocultas por filtros/estado, capturas recuperadas, parciales, no localizadas y efectivamente irrecuperables cuando eso se pueda demostrar. Documentar el método y la revisión exacta del despliegue si se logra obtenerla.
7. Determinar causa(s) raíz y medidas preventivas del incidente. Separar la corrección de la evidencia forense; proponer las modificaciones y pruebas de producto necesarias. No cambiar código, base de producción, credenciales, configuración ni despliegue sin la autorización específica del ciclo de implementación.

**Criterio de cierre**
- La captura individual denunciada tiene un estado sustentado por evidencia: recuperada y validada, localizada pero aún bloqueada, no localizada con un registro exacto de fuentes revisadas, o irrecuperabilidad demostrada con las pruebas disponibles.
- Se ha reconciliado el inventario visible y las fuentes históricas accesibles hasta el límite autorizado, con conteos únicos y paginación completa; se cuantifican los casos no disponibles sin presentar hipótesis como hechos.
- Cada unidad que se rescate pasa cotejo de lectura de vuelta, integridad y procedencia, con el original preservado.
- Se conserva un dictamen causal, los límites de evidencia y un plan de prevención. Si la fuente necesaria no está disponible o quedan capturas sin estado demostrable, la tarea permanece abierta.

**Dependencias:** catálogo autenticado, acceso a Custodia y, si procede, consulta de solo lectura de los registros de checkpoint y del estado del perfil/terminal. La falta de estos medios bloquea las conclusiones dependientes, no autoriza a inferir ni a declarar pérdida definitiva.

**Evidencia inicial:** [informe provisional del incidente](evidencias/INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md); [inventario provisional de recuperabilidad](evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md).

---

## CUSTODIA-04 · Completar la investigación y actualizar el sistema para restablecer la recuperabilidad comprobable

**Prioridad:** P0 · CRÍTICA · Depende de la línea base y de los hallazgos de CUSTODIA-01 y CUSTODIA-03.

**Estado:** EN CURSO — la corrección permanece aislada; PR #339 sigue abierta en borrador, sin fusionar ni desplegar. En C009 se verificó que la rama `fix/custodia-recovery-reconcile-20261028` está divergida respecto de `main` (la comparación confirma divergencia; la distancia exacta se recalculará antes de integrar). Los controles y pruebas registrados en C008 corresponden a aquella punta, no a una rama reconciliada con el `main` actual. No hay catálogo productivo cotejado ni recuperaciones de producción.

**Objetivo:** concluir la investigación de las brechas de recuperabilidad identificadas y actualizar KHORA para que las unidades admisibles puedan catalogarse, recuperarse y verificarse de manera consistente. No se considera lograda la recuperabilidad por el mero hecho de modificar o compilar código.

**Estado factual de ejecución (C008):** la punta de la rama `fix/custodia-recovery-reconcile-20261028` es `cbb9efd89048daf3bd9f07cc69c2e6d7209aa55d`; PR [#339](https://github.com/SeryMente/khora/pull/339) sigue en borrador y no se fusionó. `typecheck` pasó en el worktree con el arnés actualizado; `ui-review:check` y `ui:contract` habían pasado en la validación previa y después solo cambió el arnés de integración. La suite unitaria registró 549/550: una prueba de sincronización canónica agotó tiempo (`TLS handshake timeout`); el esquema local/canónico fue comparado aparte y coincide por blob SHA. La integración PostgreSQL/PGlite ya pasó **15 comprobaciones** en un motor WASM aislado, con usuario/clave sintéticos y sin servicios productivos. Los workflows de GitHub Actions fueron reintentados y terminaron fallidos en 2–3 segundos sin runner ni pasos, logs no disponibles; causa exacta no determinada. No se recorrió catálogo autenticado ni se recuperaron dictados de producción.



**Estado factual de continuación (C009, 2026-10-29):** `main` observado en `e463e0c6efa857f4c4229894a96fab747a8a7574`. PR [#339](https://github.com/SeryMente/khora/pull/339) continúa abierta en borrador. El último despliegue de producción observado para `khora-web` está en estado READY, pero apunta a `main` en `b528660e16552633d232a2397cbe42441a03438c`, anterior a los cambios de este ciclo; la corrección de Custodia no está publicada. No se realizó ninguna acción de despliegue ni se accedió al catálogo autenticado. La rama no debe fusionarse en su estado divergido; primero debe reconstruirse/reaplicarse sobre `main` vigente y volver a validarse.

**Alcance mínimo**
1. Consolidar el inventario y las causas que CUSTODIA-01 y CUSTODIA-03 hayan demostrado, separando defectos de código, incidentes productivos confirmados e hipótesis todavía abiertas.
2. Corregir la reconciliación de las capturas locales/remotas para que la carga inicial y la recarga compartan reglas deterministas de identidad, deduplicación y elección de la versión sin ocultar una copia local más reciente.
3. Corregir el contrato de audio y la recuperación de capturas legacy: las partes, su orden, integridad y referencias deben comprobarse y preservarse explícitamente. No inventar alineación ni descartar audio existente por la mera ausencia de un manifiesto.
4. Dar al contador un significado fiable y visible: total único comprobado por el servidor o etiqueta inequívoca de elementos cargados, con paginación hasta el fin del catálogo. No presentar una página de veinte como total global.
5. Probar fallos de checkpoint, interrupción de solicitud, recarga, cierre, reinicio/cambio de perfil, recuperación parcial, duplicados, múltiples páginas y ausencia de audio/manifest. Mantener separada la copia local de la confirmación remota.
6. Añadir/ajustar pruebas unitarias, integración y navegador con datos sintéticos; ejecutar los controles aplicables del proyecto y registrar revisión, resultados y limitaciones.
7. Verificar la actualización efectiva en el entorno autorizado. Cuando las autorizaciones y la vía de publicación lo permitan, comprobar el despliegue/revisión correspondiente y realizar una recuperación real de prueba con lectura de vuelta; no tocar contenido personal sin autorización.
8. Documentar qué garantías quedaron demostradas, qué brechas continúan abiertas y el siguiente paso de cada brecha. Si no hay acceso productivo autorizado o falta evidencia de lectura real, mantener explícitamente el estado sin certificar.

**Criterio de cierre:** causas y alcance documentados con evidencia; defectos de código demostrados corregidos; pruebas automatizadas pertinentes aprobadas y reproducibles; inventario/contador/paginación coherentes; recuperación de referencia de texto y audio comprobada con integridad y procedencia, preservando los originales; y estado del entorno actualizado verificado. Cualquier parte que dependa de acceso productivo no disponible permanece abierta y no puede declararse garantizada.

**Dependencias:** línea base no destructiva de CUSTODIA-03; resultados y casos recuperados/verificados de CUSTODIA-01; revisión identificable de rama/despliegue; entorno de prueba y acceso productivo autorizados. La tarea puede preparar correcciones en cuanto exista evidencia suficiente de un defecto reproducible, pero su aceptación final espera la validación integrada.

**Relación con las otras tareas:** CUSTODIA-04 resuelve las causas sistémicas y deja la capacidad de recuperación al corriente; no sustituye la recuperación individual de CUSTODIA-01 ni demuestra por sí misma el destino del dictado ausente investigado por CUSTODIA-03.

---

## Registro de cambios

- **2026-10-28 · Creación provisional:** se añaden únicamente las dos tareas expresamente solicitadas. CUSTODIA-01 queda primera por urgencia; CUSTODIA-02 queda pendiente para revisar el diseño de la propia lista.
- **2026-10-28 · Revisión documental previa al cierre del ciclo 2:** se actualizó la referencia metodológica hasta Samantha v352 y se confirmó por lectura de vuelta que el documento conserva exactamente dos tareas. La versión 0.2 no validaba el diseño.
- **2026-10-28 · Ciclo 3, inventario de recuperabilidad:** versión 0.3. CUSTODIA-01 pasa de «PENDIENTE — NO INICIADA» a «EN CURSO» por haber ejecutado análisis estático y documentado hallazgos; el catálogo autenticado y la recuperación real siguen pendientes. Se enlaza el inventario provisional sin guardar datos reales de dictados. El OCP se actualizó a CUSTODIA-v0.3; el diseño de esta lista sigue sin certificar.
- **2026-10-28 · CUSTODIA-INC-RECUP-SES-20261028-R6K2M9Q4-C004 · versión 0.4:** documenta el incidente del dictado ausente, el conteo reportado 40→20 y la discrepancia entre hidratación inicial/recarga, y deja explícito que el catálogo completo, la fila de checkpoint y la causa raíz siguen sin verificar.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005 · versión 0.5:** se formaliza CUSTODIA-03 para investigar el dictado no visible y cualquier otra captura esperada que no aparezca o parezca irrecuperable. CUSTODIA-01 y CUSTODIA-03 quedan como prioridades operativas P0; CUSTODIA-02 se registró entonces como revisión metodológica P1.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C006 · versión 0.6:** por nueva instrucción del operador, CUSTODIA-02 se retira de la lista activa y su identificador histórico no se reutiliza. Se agrega CUSTODIA-04 y se define la secuencia de línea base no destructiva, recuperación paralela a la investigación de ausencias y validación sistémica.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C007 · versión 0.7:** CUSTODIA-04 pasa a EN CURSO; se propone la reconciliación local/remota y la preservación de audio legacy en la PR #339 en borrador. La integración PGlite estaba pendiente y la suite unitaria tenía una falla ambiental de red.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C008 · versión 0.8:** se ejecuta con éxito el ensayo PostgreSQL/PGlite aislado (15 comprobaciones), y `typecheck` vuelve a pasar sobre el worktree. Se documentan por separado el timeout de la prueba de contrato canónico y los fallos de los jobs remotos sin runner/pasos. La PR #339 sigue en borrador; no se ha adquirido el catálogo autenticado ni se han realizado recuperaciones productivas. Las garantías siguen sin certificar.
- **2026-10-29 · CUSTODIA-TRANSFERENCIA-SES-20261029-C9K4M2R8 · C009 · versión 0.9:** se transfiere la responsabilidad a la sesión de alias operativo `chatgpt-custodia-SES-20261029-C9K4M2R8`, generación 3, tras autorización directa del operador. Se leyó la metodología Samantha v359 / Metacanon 1.24 / GOW 2.8. La rama de corrección se confirmó divergida de `main` (branch diverged; exact ahead/behind counts must be recalculated before integration); PR #339 permanece en borrador. El despliegue de producción comprobado corresponde a un SHA anterior; el catálogo autenticado sigue sin cotejar (0 unidades), y no hubo recuperación de producción. La continuación C009 queda documentada sin afirmar garantías no verificadas.
- **Fuente del encargo literal inicial:** [originales/INSTRUCCION-PENDIENTES-2026-10-28.md](originales/INSTRUCCION-PENDIENTES-2026-10-28.md).
- **Fuente de ampliación del alcance:** [originales/INSTRUCCION-AMPLIACION-TAREAS-RECUPERABILIDAD-2026-10-28.md](originales/INSTRUCCION-AMPLIACION-TAREAS-RECUPERABILIDAD-2026-10-28.md), commit d3c84153bbdc8844e7c3147e4ab0a6375be3dc68.
- **Nueva instrucción literal:** [originales/INSTRUCCION-REORDENAMIENTO-Y-ACTUALIZACION-RECUPERABILIDAD-2026-10-28.md](originales/INSTRUCCION-REORDENAMIENTO-Y-ACTUALIZACION-RECUPERABILIDAD-2026-10-28.md).
- **Salida de ejecución parcial C007:** [originales/SALIDA-MODELO-CUSTODIA-IMPLEMENTACION-PARCIAL-2026-10-28.md](originales/SALIDA-MODELO-CUSTODIA-IMPLEMENTACION-PARCIAL-2026-10-28.md), commit `423115ff56c8ae10fb9abd02d0fd978eddfaf2a8`.
- **Salida de validación de integración C008:** [originales/SALIDA-MODELO-CUSTODIA-VALIDACION-INTEGRACION-2026-10-28.md](originales/SALIDA-MODELO-CUSTODIA-VALIDACION-INTEGRACION-2026-10-28.md), commit `ba57b98cf4045f57e841add13e5d1b9d64895d41`.
- **Estado de ejecución:** no se recuperaron ni inspeccionaron dictados como parte de esta modificación documental.

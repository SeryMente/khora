<!-- LIST_VERSION=0.5; LIST_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Lista provisional de tareas · Frente Custodia

> **ESTADO: PROVISIONAL · NO VALIDADA CONTRA EL DISEÑO METODOLÓGICO FINAL.** Se conserva aquí por instrucción expresa del operador. La tarea CUSTODIA-02 debe revisar si esta materialización, sus campos y su relación con el OCP son adecuados. Este archivo no crea un segundo objeto canónico ni otro control de responsabilidad; el núcleo único del frente sigue siendo [OBJETO-CANONICO.md](OBJETO-CANONICO.md).

- **Frente:** Custodia.
- **Versión de esta lista provisional:** 0.5.
- **Última actualización:** 2026-10-28.
- **Metodología en la primera redacción:** Samantha v348 · NX-348m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; fuente `a4c90bd8ff1cd360b1f1662ff55371bd1b56b4cd`.
- **Revalidación antes del cierre (intermedia):** Samantha v351 · NX-351m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; fuente `f069d2385f47731ac9d0f0ca76bfd3cef859cdd2`.
- **Última lectura de metodología del ciclo 2 (referencia histórica):** Samantha v352 · NX-352m; Metacanon 1.21; GOW v2.3; blob `94473eccb6fa71303d5908ce678f7efeb191c215`.
- **Última lectura metodológica histórica (ciclo 4):** Samantha v356 · NX-356m; Metacanon 1.22; GOW v2.6; blob `c364e179e8e9b6a3d566a8e690dfa1a7cce91798`.
- **Lectura metodológica vigente de este ciclo:** Samantha v358 · NX-358m; Metacanon 1.23; GOW v2.7; blob `89a28e4d05f5baab9c4b86abdb9fbfc532690c75`. La lista sigue provisional; CUSTODIA-02 debe revisar su diseño frente a este canon vigente.
- **Alcance actual del plan:** tres tareas documentadas hasta este ciclo: recuperar y comprobar las unidades visibles; investigar las capturas esperadas que no aparecen o parecen irrecuperables; y revisar el diseño metodológico de la lista. No se afirma que sean el inventario exhaustivo de todas las obligaciones futuras del frente.
- **Regla provisional de custodia de información:** no copiar a este repositorio el texto o audio de dictados reales, secretos, credenciales ni identificadores personales innecesarios. Registrar resultados mediante evidencia minimizada y sanitizada, en el soporte autorizado que corresponda.

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

## CUSTODIA-02 · Revisar si esta lista provisional está bien diseñada conforme a la metodología vigente de OCP/FT

**Prioridad:** P1 · Después de encaminar las dos tareas operativas P0 (CUSTODIA-01 y CUSTODIA-03).

**Estado:** PENDIENTE — NO INICIADA.

**Motivo:** el operador ha indicado que todavía no sabe hasta qué punto el diseño de una lista de tareas de frente corresponde con el diseño metodológico de los Objetos Canónicos de Persistencia para frentes de trabajo. Por ello, su diseño se conserva provisionalmente en Custodia y debe revisarse en lugar de tratarse como una convención ya validada.

**Objetivo:** contrastar esta materialización y su relación con el núcleo OCP contra el Metacanon vigente, especialmente la anatomía de trece bloques, el registro verificable de cada ciclo y las reglas del directorio OCP, sus materializaciones y la ausencia de estados/control paralelos.

**Preguntas que debe resolver la revisión**
1. Si una lista separada `LISTA-TAREAS-PROVISIONAL.md` es una materialización adecuada dentro de `frentes/custodia/`, o si el detalle operativo debe ubicarse de otra manera dentro del único OCP.
2. Qué campos mínimos necesitan las tareas para que se puedan retomar y verificar: prioridad, estado, objetivo, procedencia, criterio de cierre, evidencia/límites y siguiente acción.
3. Cómo enlazar la lista con el estado vivo y la crónica del objeto canónico sin mantener versiones contradictorias ni crear un segundo núcleo operativo.
4. Qué revisión del historial, de la persistencia y de la lectura de vuelta requiere el método antes de considerar esta lista conforme.

**Criterio de cierre:** revisión documentada contra la versión vigente de la metodología, con hallazgos y recomendación explícita. Cualquier reorganización posterior se hará manteniendo la historia y mediante los cambios autorizados que correspondan; esta lista no se declara conforme de antemano.

---

## Registro de cambios

- **2026-10-28 · Creación provisional:** se añaden únicamente las dos tareas expresamente solicitadas. CUSTODIA-01 queda primera por urgencia; CUSTODIA-02 queda pendiente para revisar el diseño de la propia lista.
- **2026-10-28 · Revisión documental previa al cierre del ciclo 2:** se actualizó la referencia metodológica hasta Samantha v352 y se confirmó por lectura de vuelta que el documento conserva exactamente dos tareas. La versión 0.2 no validaba el diseño.
- **2026-10-28 · Ciclo 3, inventario de recuperabilidad:** versión 0.3. CUSTODIA-01 pasa de «PENDIENTE — NO INICIADA» a «EN CURSO» por haber ejecutado análisis estático y documentado hallazgos; el catálogo autenticado y la recuperación real siguen pendientes. Se enlaza el inventario provisional sin guardar datos reales de dictados. El OCP se actualizó a CUSTODIA-v0.3; el diseño de esta lista sigue sin certificar.
- **2026-10-28 · CUSTODIA-INC-RECUP-SES-20261028-R6K2M9Q4-C004 · versión 0.4:** documenta el incidente del dictado ausente, el conteo reportado 40→20 y la discrepancia entre hidratación inicial/recarga, y deja explícito que el catálogo completo, la fila de checkpoint y la causa raíz siguen sin verificar.
- **2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005 · versión 0.5:** se formaliza CUSTODIA-03 para investigar el dictado no visible y cualquier otra captura esperada que no aparezca o parezca irrecuperable. CUSTODIA-01 y CUSTODIA-03 quedan como prioridades operativas P0; CUSTODIA-02 mantiene el identificador original y pasa a P1 metodológico. Se refresca la referencia normativa a Samantha v358, Metacanon 1.23, GOW v2.7.
- **Fuente del encargo literal inicial:** [originales/INSTRUCCION-PENDIENTES-2026-10-28.md](originales/INSTRUCCION-PENDIENTES-2026-10-28.md).
- **Fuente de ampliación del alcance:** [originales/INSTRUCCION-AMPLIACION-TAREAS-RECUPERABILIDAD-2026-10-28.md](originales/INSTRUCCION-AMPLIACION-TAREAS-RECUPERABILIDAD-2026-10-28.md), commit d3c84153bbdc8844e7c3147e4ab0a6375be3dc68.
- **Estado de ejecución:** no se recuperaron ni inspeccionaron dictados como parte de esta modificación documental.

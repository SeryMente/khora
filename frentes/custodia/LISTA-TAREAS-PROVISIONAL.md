<!-- LIST_VERSION=0.3; LIST_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Lista provisional de tareas · Frente Custodia

> **ESTADO: PROVISIONAL · NO VALIDADA CONTRA EL DISEÑO METODOLÓGICO FINAL.** Se conserva aquí por instrucción expresa del operador. La tarea CUSTODIA-02 debe revisar si esta materialización, sus campos y su relación con el OCP son adecuados. Este archivo no crea un segundo objeto canónico ni otro control de responsabilidad; el núcleo único del frente sigue siendo [OBJETO-CANONICO.md](OBJETO-CANONICO.md).

- **Frente:** Custodia.
- **Versión de esta lista provisional:** 0.3.
- **Última actualización:** 2026-10-28.
- **Metodología en la primera redacción:** Samantha v348 · NX-348m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; fuente `a4c90bd8ff1cd360b1f1662ff55371bd1b56b4cd`.
- **Revalidación antes del cierre (intermedia):** Samantha v351 · NX-351m; Metacanon 1.21 · METACANON-OBJETOS-v1.21; GOW v2.3; fuente `f069d2385f47731ac9d0f0ca76bfd3cef859cdd2`.
- **Última lectura de metodología del ciclo 2 (referencia histórica):** Samantha v352 · NX-352m; Metacanon 1.21; GOW v2.3; blob `94473eccb6fa71303d5908ce678f7efeb191c215`.
- **Lectura metodológica del ciclo actual:** Samantha v356 · NX-356m; Metacanon 1.22; GOW v2.6; blob `c364e179e8e9b6a3d566a8e690dfa1a7cce91798`. La lista sigue provisional; CUSTODIA-02 debe revisar su diseño frente al canon vigente.
- **Alcance de esta captura:** las dos tareas enumeradas expresamente por el operador. No se afirma que constituyan un inventario exhaustivo de todas las obligaciones futuras del frente.
- **Regla provisional de custodia de información:** no copiar a este repositorio el texto o audio de dictados reales, secretos, credenciales ni identificadores personales innecesarios. Registrar resultados mediante evidencia minimizada y sanitizada, en el soporte autorizado que corresponda.

---

## CUSTODIA-01 · Recuperar y verificar las unidades que muestra Ingresos → Dictado → Recuperación

**Prioridad:** P0 · URGENTE · Primera tarea operativa.

**Estado:** EN CURSO — investigación de código y documentación parciales; catálogo real y recuperaciones por unidad pendientes. La ejecución del objetivo principal no está cerrada.

**Avance documentado en el ciclo CUSTODIA-INV-RECUP-SES-20261028-R6K2M9Q4**

- Se creó [el inventario provisional de hallazgos](evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md), versión 0.1, enlazado desde el OCP. Contiene hallazgos de código, límites de evidencia, los datos auxiliares del almacén local identificados por separado, clases de resultados por unidad y requisitos de aceptación.
- La lectura de código de main confirmó que el catálogo construye `audioParts` a partir del manifiesto/corte y no del conteo `audio_count` de partes verificadas; el flujo de recuperación remota limita también las partes copiadas al corte/manifiesto declarado. Esto explica un defecto potencial real, pero no cuantifica cuántas unidades visibles están afectadas.
- No se pudo obtener el catálogo autenticado de Ingresos → Dictado → Recuperación ni cotejar la disponibilidad real de los objetos remotos. Unidades reales cotejadas individualmente: 0; recuperaciones de producción confirmadas: 0. Cero cotejos no significa catálogo vacío.
- No se modificó código ni se alteraron sesiones/objetos de producción. La auditoría previa de cinco snapshots locales se conserva como evidencia auxiliar y no se usa como inventario de las unidades de la UI.

**Registro de lo conocido y lo desconocido**
- El operador informó inicialmente que la interfaz indicaba **20 dictados recuperables** y luego estimó que podrían ser aproximadamente 21. El número exacto no ha sido adquirido de la interfaz en este ciclo.
- La unidad de inventario es el conjunto real que devuelve la sección **Ingresos → Dictado → Recuperación**; no se debe reemplazar por snapshots arbitrarios del navegador.
- El operador aún no ha revisado qué contienen las entradas del conjunto, y este ciclo tampoco obtuvo el catálogo autenticado.
- No se dispone todavía de una lista verificada de elementos, su contenido, sus identificadores, sus fuentes ni su estado individual.
- No se ha intentado aquí la recuperación de esos dictados y no se afirma que alguno ya haya sido recuperado o validado.

**Objetivo:** recuperar efectivamente esos 20 dictados y, después, comprobar con evidencia hasta qué punto el mecanismo de recuperabilidad está bien diseñado y funciona de manera efectiva.

**Secuencia prevista**
1. Acceder a la interfaz pertinente de Cora y comprobar el listado que el operador refiere, sin asumir que el número y estado indicados ya fueron verificados por esta sesión.
2. Identificar los elementos que la interfaz ofrece para recuperación y registrar evidencia mínima suficiente para distinguir sus resultados, sin volcar contenido personal real a GitHub.
3. Recuperar los dictados mediante el flujo apropiado, evitando sobrescribir, borrar o sustituir sus originales.
4. Verificar individualmente el resultado de cada recuperación y cotejar, cuando el sistema lo permita, contenido, integridad y procedencia. No confundir el contador de elementos disponibles con la recuperación consumada.
5. Evaluar el diseño y la efectividad observada del mecanismo, diferenciando recuperación demostrada, recuperación parcial, error, duplicado y resultado no verificable.
6. Documentar los resultados y brechas con evidencia sanitizada. Si algún elemento no se puede recuperar, mantenerlo explícitamente abierto y describir el impedimento; no declarar completa la tarea por haber intentado la operación.

**Criterio de cierre:** se adquiere y registra el conjunto real de entradas de Recuperación; cada unidad queda clasificada y sometida al flujo de recuperación apropiado; las recuperaciones exitosas se cotejan individualmente en texto, audio, integridad y procedencia con el original intacto. El conteo objetivo será el que muestre la interfaz en la revisión autenticada registrada, no una cifra inferida. Si alguna unidad no puede recuperarse, la tarea permanece abierta para esa unidad y la limitación queda explícita.

**Siguiente acción:** obtener el catálogo autenticado real de Recuperación, registrarlo de forma sanitizada y cotejar cada entrada con las partes y objetos correspondientes. Después, definir y ejecutar una recuperación por unidad sin sobrescribir ni borrar originales; cotejar el destino antes de declararlo recuperado. Esta lista registra el estado y el criterio, pero no afirma que la recuperación se haya ejecutado.

---

## CUSTODIA-02 · Revisar si esta lista provisional está bien diseñada conforme a la metodología vigente de OCP/FT

**Prioridad:** P1 · Después de asegurar la recuperación urgente.

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
- **Fuente del encargo literal:** [originales/INSTRUCCION-PENDIENTES-2026-10-28.md](originales/INSTRUCCION-PENDIENTES-2026-10-28.md).
- **Estado de ejecución:** no se recuperaron ni inspeccionaron dictados como parte de esta modificación documental.

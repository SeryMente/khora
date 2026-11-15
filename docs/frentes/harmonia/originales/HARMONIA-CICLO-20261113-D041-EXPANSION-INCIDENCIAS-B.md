# D-041 · Diseño de expansión de gobernanza: retroalimentación contextual, incidencias y observabilidad multi-pestaña

**Frente:** Harmonia · **Repositorio:** SeryMente/khora · **OCP base:** v0.82 · **Especificación base:** v1.2.0
**Fecha local:** 2026-11-13 · America/Mexico_City
**Conversación local UUIDv7:** 01a1d679-eb87-7290-b58c-26c4d7104253
**Ciclo local UUIDv7:** 01a1d679-eb8b-7f26-b0fd-eb9c52c95877
**Entrada A:** `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261113-D041.md`
**Tarea paraguas:** OMM-FUT-008 · P1 · PROVISIONAL / NO IMPLEMENTADA
**Versión objetivo propuesta:** Extension 0.7.0, posterior a 0.6.0/OMM-FUT-007; no es versión construida ni publicada.
**Gobierno adquirido de referencia:** Samantha v393 / NX-393m · DUG main commit `67014eb24244651b2e805079930d08082f0fc41c` · HTML blob SHA-1 `844fc507a2a9a0bfc8f4e68884cca9f6d2912c96` · GOW 2.21. Metacanon 1.31 en metadatos frente a 1.30 en objeto embebido: discrepancia abierta. MCP normativo DESACTIVADO.

---

## 1. Resultado de este ciclo

Se leyó y preservó la nueva instrucción del operador como D-041. Se diseña y registra una expansión provisional que integra tres capacidades de producto y un ámbito de gobernanza:

1. **Cobertura multi-pestaña:** completar y validar la observación estructural multi-pestaña que ya aparece parcialmente en la candidata 0.5.0, reforzando inventario, ciclo de vida, recuperación y cobertura por conversación; añadir la persistencia Markdown maestra, aún ausente.
2. **Observabilidad de arquitectura web:** adquirir señales estructurales allowlisted de la aplicación ChatGPT para guiar mantenimiento y mejora continua, separadas del contenido de conversación.
3. **Overlay de retroalimentación contextual:** permitir que el operador valore elementos concretos de una conversación con LIKE o DISLIKE y agregue comentarios.
4. **Gobernanza de refuerzos e incidencias:** conservar la retroalimentación, distinguir patrones positivos de señales correctivas y convertir un DISLIKE en incidencia formal solo después de triage.

El diseño es documental. No se modificó código de Extension/Collector, manifest, permisos, build-info, productores, esquemas ejecutables ni datos operativos. La tarea queda PROVISIONAL / NO IMPLEMENTADA. El alcance solicitado autoriza esta definición y su registro; no se interpreta como aceptación de un contrato técnico final ni como evidencia de ejecución natural.

## 2. Normas operativas extraídas de las instrucciones verbatim

Las instrucciones verbatim son el criterio primario de propósito y requisitos. Su texto fuente permanece intacto; la interpretación y las reglas derivadas se conservan por separado.

| Norma operativa | Aplicación verificable | Fuentes del OCP |
|---|---|---|
| El dictado del operador es fuente primaria de intención. | Guardar cada instrucción sustantiva en `originales/`, literal, con SHA-256 y read-back. | D-005; OMM-01-035; §3 y §5 |
| La interpretación nunca sustituye al original. | Separar A literal, análisis B, decisión, tarea y evidencia. No corregir ortografía ni reconstruir omisiones. | D-005; OMM-01-035 |
| Toda tarea debe tener trazabilidad razonable. | Relacionar D-key → OMM/FUT → criterios → cambios → pruebas → resultado/aceptación. | OMM-01-035, 036 y 037 |
| El agente dirige el trabajo técnico ordinario. | Seleccionar la tarea no bloqueada de mayor prioridad a partir de propósito, instrucciones y evidencia; pedir solo decisiones/acciones indispensables. | D-001; D-005; OMM-01-034 |
| La observabilidad informa el desarrollo, no lo reemplaza. | Auditar datos existentes, comenzar con lo suficiente y no convertir toda brecha posible en una tarea nueva. | OMM-FUT-006; D-039/D-040 |
| No modificar productores o contratos por inferencia. | Presentar evidencia convergente y obtener autorización explícita antes de cambiar capturadores, permisos, esquemas o transporte. | OMM-FUT-006 |
| Mantener calidad e integridad en cada ciclo. | Validar artefactos, conservar baseline, versionar documentos, comprobar SHA/read-back y diferenciar implementado, verificado y aceptado. | D-018; D-021; D-038; OMM-01-040 |
| La persistencia tiene procedencia y límites. | Identidades UUIDv7 locales separadas de IDs nativos; timestamps tipados; FOL1 gobierna folios globales; no afirmar persistencia externa. | OMM-01-036/037; D-038 |
| La privacidad es una propiedad del diseño. | Separar contenido conversacional, metadatos de observabilidad y comentarios; almacenar localmente y usar allowlists. | D-001/D-005; D-040; OMM-FUT-006 |
| Una prueba no acredita un nivel superior. | Separar pruebas estáticas, unitarias/sintéticas, integración aislada, aceptación natural, aceptación de producto y publicación. | OMM-01-038; OMM-01-040 |
| Los originales previos no se reemplazan al mejorar. | Archivar versiones anteriores byte a byte antes de editar OCP/especificación; validar copias y versiones nuevas. | D-038; OMM-01-040 |
| La ampliación requiere continuidad de gobernanza. | Cada nueva tarea provisional se vincula al eje 038 y se revisa en paralelo con OMM-FUT-006. | D-039; D-040; D-041 |

Estas reglas consolidan de forma inicial el modo de trabajo; no crean un segundo backlog ni alteran las instrucciones históricas. La extracción de esta tabla usa las normas ya reflejadas en el OCP y la instrucción D-041; no se afirma que cada original histórico D-001..D-040 haya sido reanalizado línea por línea en este ciclo.

## 3. Revisión del flujo de actualización de observabilidad

### 3.1 Dictamen del flujo vigente

El flujo está **parcialmente claro**. OCP §4.4, OMM-FUT-006, OCP §46.1 y Especificación §18.3 ya ordenan definir los datos requeridos, inspeccionar primero el banco existente, separar fuentes naturales/exportadas/reportadas/sintéticas/inferidas/desconocidas, valorar cobertura/procedencia/precisión/privacidad, comenzar con lo suficiente, acumular brechas y proponer cambios al observador solo cuando converja la evidencia y el operador los autorice.

La regla actual expresa correctamente el principio, pero no exige de forma uniforme una auditoría de entrada, un dictamen de suficiencia, un control durante la ejecución y una auditoría de salida por tarea. Tampoco impone una estructura mínima para registrar la decisión «observabilidad revisada / sin delta». Por ello es posible cumplirla de manera informal sin dejar evidencia comparable entre tareas.

### 3.2 Flujo operativo obligatorio propuesto para OMM-FUT-006

| Fase | Momento | Preguntas/evidencia obligatorias | Resultado persistido |
|---|---|---|---|
| O0 · Definir necesidad | Al crear/seleccionar la tarea | ¿Qué decisión de ingeniería debe apoyar? ¿Qué señales y atributos mínimos la sustentan? ¿Qué queda fuera por privacidad o gobierno? | Contrato de observación requerido y vínculo a la tarea. |
| O1 · Auditar el banco | Antes de cambiar productores | Consultar los datos y esquemas existentes; indicar ventana/fuente, frescura, cobertura, volumen y limitaciones. No crear una base paralela por defecto. | Inventario de señales existentes y fuentes. |
| O2 · Dictaminar | Antes de comenzar el tramo dependiente | Clasificar la evidencia como NATURAL, EXPORTADA, REPORTADA, SINTÉTICA, INFERIDA o DESCONOCIDA. Evaluar completitud, precisión, procedencia, cobertura, frescura y privacidad. | SUFICIENTE, PARCIAL, INSUFICIENTE o BLOQUEADA, con razón. |
| O3 · Ejecutar y observar | Durante el desarrollo | Registrar qué evidencia apareció, qué hipótesis confirmó/descartó y qué brecha nueva se demostró. No derivar métricas temporales bloqueadas por DUG. | Evidencia incremental vinculada al ciclo/tarea. |
| O4 · Cerrar y reevaluar | Al resolver o detener la tarea | Comparar necesidad inicial con evidencia realmente obtenida. Verificar que instrumentación, collector, schema, índice y consultas conservan el mismo contrato cuando aplique. | Auditoría de salida y dictamen de suficiencia actualizado. |
| O5 · Proponer delta | Solo si existe brecha convergente | Describir señal faltante, impacto, evidencia repetida, productor/esquema afectado, alternativa menos invasiva y pruebas necesarias. | Tarea OBS/FUT propuesta; no autorizada hasta decisión del operador. |

**Regla de continuidad:** si la observabilidad es suficiente para una parte de la tarea, esa parte continúa. Una brecha bloquea solo la decisión que depende de ella, no todo el esfuerzo por defecto. Si no hay brecha nueva, registrar literalmente «observabilidad revisada / sin delta» y no expandir el alcance. La autorización de esta expansión documental no autoriza por sí sola cambios futuros de productores o esquemas.

### 3.3 Registro mínimo de auditoría por tarea

Cada revisión debe documentar: identificador de tarea/ciclo; propósito de la observación; señales necesarias; fuentes inspeccionadas; ventana temporal como ámbito de consulta (sin calcular duraciones); versión de esquema/productor; clases de evidencia; cobertura/completitud; frescura; precisión; procedencia; riesgos de privacidad; dictamen; brechas demostradas; decisión de continuar/bloquear; y referencia/hash de la evidencia. No duplicar cuerpos conversacionales en JSONL ni crear otro banco general de telemetría.

## 4. Dominio de gobernanza: retroalimentación e incidencias

### 4.1 Separación semántica fundamental

La valoración del operador y la incidencia técnica son registros diferentes:

- **LIKE → REFUERZO:** documenta un elemento, comportamiento, respuesta o práctica que funciona bien. Se conserva como retroalimentación positiva para reconocer, preservar y replicar patrones de trabajo efectivos.
- **DISLIKE → SEÑAL_CORRECTIVA:** documenta un elemento que requiere revisión. Puede incluir comentario, categoría y contexto.
- **INCIDENCIA:** solo se crea cuando una señal correctiva pasa por triage y se confirma como problema reproducible, desviación de requisito, regresión, fallo o riesgo que amerita seguimiento. Un DISLIKE no se convierte automáticamente en incidencia.

Así se evita que las preferencias subjetivas, los duplicados, los desacuerdos de estilo o los falsos positivos inflen el registro de fallos. Un LIKE tampoco equivale por sí solo a una aprobación formal de producto, prueba o versión.

### 4.2 Entidades del modelo

1. **FeedbackRecord:** hecho inmutable de una valoración explícita del operador: `LIKE` o `DISLIKE`, comentario opcional, fecha local/UTC con procedencia, identidad del elemento y referencias de conversación/ciclo.
2. **ReinforcementRecord:** proyección o clasificación positiva de un LIKE; registra qué práctica conviene conservar, bajo qué contexto y cómo podría reutilizarse. No crea una incidencia.
3. **CorrectionSignal:** proyección de un DISLIKE pendiente de triage. Conserva la razón/comentario original y evita convertirla en diagnóstico técnico no confirmado.
4. **IncidentRecord:** registro de incidencia formal tras triage; incluye clasificación, severidad/prioridad asignadas, estado, evidencia, causa, tarea correctiva y verificación.
5. **ConversationAnchor:** referencia estable al elemento valorado dentro de una conversación; apunta al archivo Markdown maestro y al mensaje/elemento concreto, sin duplicar por defecto el cuerpo del mensaje.
6. **ResolutionEvidence:** vínculo a cambio, commit local, prueba, read-back y aceptación cuando existan. No implica que el cambio esté publicado.

### 4.3 Esquema lógico mínimo propuesto

El siguiente contrato es conceptual; no es JSON Schema implementado ni autoriza todavía a los productores:

~~~json
{
  "schema_version": "1.0.0",
  "feedback_id": "uuidv7-local",
  "kind": "LIKE | DISLIKE",
  "purpose": "REINFORCEMENT | CORRECTION_SIGNAL",
  "created_at": {
    "utc": "timestamp-if-observed",
    "local_timezone": "America/Mexico_City",
    "source": "operator_action"
  },
  "conversation": {
    "native_id": "string-or-null",
    "local_ref": "uuidv7-local",
    "archive_ref": "local-path-or-record-id"
  },
  "target": {
    "type": "MESSAGE | TEXT_SPAN | CODE_BLOCK | TABLE | LINK | ARTIFACT | UI_SURFACE",
    "native_message_id": "string-or-null",
    "role": "user | assistant | tool | unknown",
    "ordinal_at_capture": 0,
    "anchor_fingerprint": "sha256",
    "anchor_quality": "NATIVE | DOM_STABLE | HEURISTIC"
  },
  "comment": "operator-authored-local-text-or-null",
  "incident_ref": null,
  "capture": {
    "tab_id_ephemeral": "runtime-only",
    "producer_version": "semver",
    "source": "explicit_overlay_action"
  }
}
~~~

El `tab_id` es efímero y nunca sustituye al ID de conversación. El identificador nativo de mensaje solo se usa si la interfaz lo expone; cuando no exista, se guarda la calidad de anclaje y no se promete una localización permanente. No almacenar por defecto una cita extensa o copia del mensaje: usar el enlace al archivo local, el ID nativo si existe y una huella del ancla. Cualquier fragmento de contexto adicional requerirá criterio de minimización y retención explícito.

### 4.4 Ciclo de vida de una incidencia

- **CAPTURED:** DISLIKE registrado por acción explícita.
- **TRIAGE:** revisión de significado, contexto, reproducibilidad y duplicados.
- **ACCEPTED:** se acepta como incidencia formal y se asignan categoría, severidad y prioridad; no inferirlas automáticamente del DISLIKE.
- **LINKED_TO_TASK:** asociada a una tarea OMM/FUT correctiva o a una tarea nueva propuesta.
- **IN_PROGRESS:** corrección en curso.
- **VALIDATION:** cambio aplicado y sometido a pruebas/evidencia.
- **RESOLVED:** existe evidencia de que el problema quedó corregido en el alcance verificado.
- **CLOSED:** cierre aceptado y persistido con referencias.
- **REOPENED:** reapertura por regresión o evidencia contraria.

Estados alternos de triage: DUPLICATE, NOT_REPRODUCIBLE, NOT_AN_INCIDENT o DEFERRED. Las transiciones conservan historial append-only, actor, fecha y motivo. «RESOLVED» no equivale a «ACCEPTED»; el cierre debe indicar qué se probó y en qué entorno.

### 4.5 Categorías iniciales

Catálogo provisional, sujeto a revisión después de ejemplos reales: CORRECTNESS, INSTRUCTION_FIDELITY, COMPLETENESS, REASONING, FORMAT, CONTINUITY, PERSISTENCE, OBSERVABILITY, PRIVACY, UX, PERFORMANCE_SIGNAL (sin medir tiempos prohibidos) y OTHER. No autoasignar una categoría por el texto libre; el operador o el triage la confirma.

## 5. Cobertura de conversaciones multi-pestaña

### 5.1 Alcance de supervisión

- Enumerar las pestañas abiertas en las ventanas del perfil de Chrome autorizado que correspondan al host permitido `chatgpt.com`.
- Mantener una relación temporal entre `tabId`/ventana/documento y la conversación nativa identificable. `tabId` es solo identidad de ejecución; puede cambiar y no se usa como clave de archivo.
- Inyectar/activar el observador de forma independiente en cada pestaña autorizada. Detectar creación, actualización, navegación SPA, cierre, suspensión y reaparición mediante eventos de Chrome y señales del content script.
- Rehidratar el inventario de pestañas después de reinicio/suspensión del service worker. MV3 es event-driven: no prometer vigilancia continua cuando Chrome está cerrado, el perfil está cerrado o una pestaña no está disponible.
- Procesar todas las ventanas del mismo perfil compatible; no incluir modo incógnito ni otros perfiles/dispositivos hasta diseñar y autorizar su alcance específico.

### 5.2 Reconciliación y archivo

- Mantener el contrato de OMM-FUT-007 como base de archivo individual. OMM-FUT-008 amplía cobertura a múltiples pestañas; no reemplaza ni declara implementada OMM-FUT-007.
- Un solo Markdown maestro por ID nativo de conversación, independiente de título, ventana o pestaña. Dos pestañas con la misma conversación deben converger en el mismo registro, no crear archivos duplicados.
- Cada pestaña reporta snapshots/deltas con identidad de conversación y mensajes. El escritor local serializa las escrituras por conversación, aplica deduplicación/idempotencia y controla conflictos cuando dos pestañas muestran ramas o ediciones divergentes.
- Si no hay ID nativo, usar una identidad local provisional de captura marcada como no equivalente a una conversación nativa; no fusionar por similitud textual sin confirmación.
- La cobertura se informa por conversación y por pestaña: COMPLETE, PARTIAL, IN_PROGRESS, STALE, UNAVAILABLE o CONFLICT. La captura del DOM no demuestra por sí sola que se hayan materializado todos los mensajes virtualizados.
- Conservar el último snapshot COMPLETE ante fallos; nunca degradarlo silenciosamente con una captura parcial.
- La recolección incremental ocurre ante cambios observables y ciclos, no mediante scraping continuo indiscriminado. No automatizar prompts, clics de ChatGPT, desplazamiento, envío, generación ni controles de la aplicación.

### 5.3 Compuertas de cobertura

Antes de aceptar multi-pestaña deben resolverse la virtualización del historial, pestañas inactivas/suspendidas, navegación SPA, generación en paralelo, conversaciones duplicadas, edición/regeneración de mensajes, ramas, cierre abrupto, escrituras concurrentes, límites de tamaño y recuperación del service worker. La extensión no puede afirmar que capturó conversaciones cerradas antes de que estuviera instalada ni mensajes que nunca se renderizaron/expusieron.

## 6. Overlay contextual

- Se propone un overlay de extensión aislado del DOM de ChatGPT mediante un host propio y Shadow DOM para reducir colisiones de CSS/JS. No modifica el contenido de los mensajes ni reemplaza los controles de la plataforma.
- El operador elige el objetivo: mensaje completo o elemento semántico identificado (texto seleccionado, bloque de código, tabla, enlace, artefacto o superficie). El diseño puede mostrar acciones al pasar el foco o al seleccionar el elemento; debe evitar superponerse a controles críticos.
- Acciones explícitas: LIKE, DISLIKE, abrir/cerrar comentario, guardar y cancelar. El comentario puede ser opcional en LIKE y recomendado en DISLIKE; la obligatoriedad final debe validarse con el operador antes de implementar.
- Accesibilidad mínima: nombre accesible, foco visible, operación por teclado, contraste, lectores de pantalla, posición estable, soporte responsive y cierre sin alterar el estado de ChatGPT.
- Confirmación visual discreta de registro local, edición controlada o anulación con trazabilidad. No enviar el comentario a ChatGPT ni introducirlo en el compositor.
- El overlay no debe interceptar Enter, envío de mensajes, botones nativos, menús, herramientas ni flujos de autenticación.

## 7. Observabilidad de la arquitectura web

### 7.1 Datos que sí pueden estudiarse

La extensión puede ampliar el catálogo estructural existente con atributos allowlisted y señales técnicas de bajo riesgo: regiones y componentes presentes; tipos de nodo/roles semánticos permitidos; presencia de atributos estructurales; clases tokenizadas; conteos; visibilidad/expansión/disabled/modal; fingerprints estructurales; aparición/desaparición y sustitución de subárboles; tipos de transición SPA; número de pestañas/conversaciones cubiertas; versión de productor/esquema y resultados de persistencia/cobertura.

Cuando una versión pública de la aplicación esté expuesta de manera directa y no sensible, podrá considerarse como dato versionado, conservando su fuente. La existencia de un atributo o nombre de archivo no debe interpretarse como arquitectura interna probada.

### 7.2 Datos que quedan fuera

No capturar cuerpos de solicitudes/respuestas, WebSocket, headers, cookies, tokens, almacenamiento privado/local/session, claves, variables de sesión, estado interno React, prompts/respuestas como eventos de telemetría, texto no allowlisted, contenido oculto, rutas completas con parámetros, URL de terceros ni payloads de red. No descargar ni ejecutar código remoto ni inspeccionar endpoints privados. No deducir componentes de backend, modelo, latencia o rendimiento de señales puramente visuales.

### 7.3 Separación de dominios de datos

1. **Archivo de conversaciones:** Markdown local con cuerpo y estructura de mensaje, contrato de OMM-FUT-007/008.
2. **Banco de observabilidad:** eventos estructurales agregados, versionados y allowlisted; sin cuerpo ni comentarios.
3. **Registro de feedback/incidencias:** LIKE/DISLIKE, comentarios escritos por el operador, ancla y ciclo de vida; almacenamiento local segregado del JSONL general.
4. **Documentación de gobernanza:** A verbatim, tareas, decisiones, evidencias, hashes y read-back en el OCP/especificación/procedencia.

La segregación lógica por sensibilidad no implica crear una segunda base general de observabilidad. Se reutiliza el colector y la infraestructura local cuando el contrato lo permita; los comentarios no se inyectan en el JSONL de diagnóstico ni en servicios externos.

## 8. Persistencia, integridad y privacidad

- IDs nativos y UUIDv7 locales se mantienen separados. El ID de pestaña es efímero; no sustituye la identidad conversacional.
- Cada feedback/incidencia tiene ID local UUIDv7, esquema versionado, procedencia, vínculo a conversación/ancla, ciclo y estados.
- Los registros son idempotentes y tienen historial append-only. La edición de un comentario o estado no borra la historia; conserva actor, fecha y motivo.
- El almacenamiento de conversación y de feedback permanece local en el dispositivo/perfil autorizado. Sin envío a GitHub, Groq, modelos externos, analytics ni servicios remotos.
- El hash del archivo de conversación verifica persistencia; no se usa como sustituto de identidad del mensaje o de aceptación.
- Para cada escritura: temporal, validación, replace atómico, SHA-256 y read-back. En concurrencia, lock por conversación y recuperación ante interrupción.
- Los logs generales solo incluyen metadatos mínimos de operación/cobertura; nunca texto de comentario ni contenido del mensaje.
- Retención, borrado explícito, exportación y protección de comentarios quedan como decisión de diseño pendiente antes de producir datos reales.

## 9. Secuencia de trabajo y dependencias

1. **OMM-FUT-007 / 0.6.0:** resolver el MVP de archivo de la conversación actual y sus pruebas de integridad/cobertura. Sigue PROVISIONAL / NO IMPLEMENTADA.
2. **Diseño de OMM-FUT-008:** cerrar contrato de tabs, anclas, feedback, incidentes, permisos MV3, persistencia local y política de datos.
3. **MVP de registro local:** esquema, writer, idempotencia, estados, deduplicación e historial append-only; fixtures sintéticas sanitizadas.
4. **Overlay aislado:** interacción accesible LIKE/DISLIKE/comentario, sin interferir con la UI nativa.
5. **Multi-pestaña:** enumeración/eventos, rehidratación del worker, orquestación y escritor serializado por conversación.
6. **Arquitectura observable:** ampliar catálogo/contratos solo tras aprobar el conjunto exacto de atributos y eventos.
7. **Validación:** sintaxis/esquemas, pruebas unitarias, concurrencia/fallos, perfil headless aislado y aceptación natural separada.
8. **Cierre:** actualizar especificación, OCP, índice, procedencia, auditoría OMM-FUT-006 y registro SemVer. No activar Chrome principal ni publicar automáticamente.

## 10. Criterios de aceptación propuestos

- Inventario correcto de pestañas permitidas, con estado de disponibilidad y cobertura por conversación, sin atribuir continuidad cuando la pestaña no existe/no está accesible.
- Una sola identidad/archivo maestro por ID nativo; concurrencia idempotente entre pestañas; no pérdida ni duplicación silenciosa.
- El archivo conserva orden, roles, timestamps/modelo cuando estén expuestos, formato rico y estado explícito de cobertura.
- El overlay registra solo valoraciones accionadas deliberadamente por el operador, con ancla verificable y comentario vinculado.
- LIKE crea refuerzo; DISLIKE crea señal correctiva; una incidencia formal requiere triage documentado.
- Cada incidencia puede trazarse desde feedback hasta tarea, cambio, prueba y cierre; permite duplicado, no reproducible, diferida y reapertura.
- La observabilidad de arquitectura respeta allowlist, separación de datos y restricciones del DUG; las pruebas no contienen secretos ni cuerpos reales.
- Ningún fallo de escritura destruye el último documento completo; hashes/read-back coinciden.
- La UI de ChatGPT permanece usable y los controles originales no se accionan por el overlay.
- Pruebas sintéticas, integración aislada y aceptación natural se reportan en niveles separados.
- No se afirma instalación, captura real, aceptación natural o publicación sin evidencia específica.

## 11. Decisiones todavía necesarias antes del código

No impiden registrar la tarea provisional, pero sí impiden iniciar una implementación de producción:

1. **Granularidad del objetivo:** si el primer MVP valora mensajes completos y después spans/elementos internos, o si debe nacer con selección arbitraria de subelementos.
2. **Comentario:** opcional en ambas acciones, obligatorio en DISLIKE o recomendado; límites de caracteres y posibilidad de editar/eliminar.
3. **Ámbito de pestañas:** confirmar perfil Chrome, ventanas, incognito excluido, y comportamiento para pestañas suspendidas/no activas.
4. **Cobertura histórica:** aceptar captura incremental de lo que se renderiza y dejar PARTIAL ante virtualización, o diseñar un mecanismo de backfill basado en export oficial.
5. **Identidad de ancla:** disponibilidad real de IDs de mensaje; fallback y umbral mínimo de confianza para reubicar valoraciones tras una regeneración/edición.
6. **Triage:** categorías, severidad, prioridad, quién acepta/cierra y si el operador desea aprobar cada conversión de DISLIKE a incidencia.
7. **Retención:** permanencia, exportación y eliminación de comentarios/feedback/incidencias.
8. **Allowlist de arquitectura:** catálogo exacto de señales, campos y orígenes que aportan valor real sin invadir privacidad.
9. **Ubicación local:** rutas finales y política de backup/restore de archivos de conversación y feedback.
10. **Versionado:** confirmar 0.7.0 como release objetivo una vez que se cierre la secuencia 0.6.0; no mover manifest/build-info por una tarea documental.
11. **Integridad del corpus verbatim:** se revisaron OCP §§5, 16–18 y once archivos HARMONIA-INSTRUCCIONES-VERBATIM disponibles; la matriz `originales/HARMONIA-MATRIZ-NORMAS-OPERATIVAS-VERBATIM-D041.md` registra 32 normas con sus D-key. No se localizaron fuentes literales D-025/D-026; OMM-FUT-010 P2 provisional debe recuperar o confirmar su procedencia sin inventar texto.

## 12. Tarea provisional registrada

**ID:** OMM-FUT-008  
**Nombre:** Observabilidad multi-pestaña, retroalimentación contextual y gobernanza del registro de incidencias.  
**Padre:** OMM-01-038.  
**Prioridad:** P1.  
**Estado:** PROVISIONAL / NO IMPLEMENTADA.  
**Traza:** D-041.  
**Dependencias:** OMM-FUT-006 recurrente; OMM-FUT-007 como base/precedente del archivo individual por conversación; OMM-01-040 para mantenimiento documental.  
**Resultado terminal:** una extensión Harmonia que complete y valide la observación estructural multi-pestaña ya parcial en 0.5.0; mantenga un archivo maestro por conversación; registre telemetría arquitectónica allowlisted; y ofrezca un overlay contextual LIKE/DISLIKE/comentarios conectado a registros locales de refuerzos, señales correctivas e incidencias con triage, estados e historial auditable.  
**Paquetes de diseño:** (A) multi-pestaña y reconciliación; (B) telemetría arquitectónica; (C) overlay y anclas; (D) modelo de feedback/refuerzo/incidencia; (E) persistencia, privacidad, pruebas y aceptación.  
**Versión objetivo propuesta:** 0.7.0 después del cierre verificable de 0.6.0; no implementada.  
**Compuerta de implementación:** cerrar las decisiones §11, aprobar productores/permisos/esquemas y actualizar el contrato mediante una tarea autorizada. Mientras tanto, preservar Extension/Collector 0.5.0 y el baseline anterior.

## 13. Estado y límites del ciclo

- D-041 se conserva como original A; este documento es la salida B de diseño.
- OMM-FUT-008 se crea como tarea paraguas provisional, no como código implementado.
- OMM-FUT-007 permanece intacta: contrato de archivo de la conversación actual desde una pestaña. OMM-FUT-008 no parte de cero: completa y valida la observación estructural multi-pestaña parcial ya presente en 0.5.0 y agrega reconciliación por conversación, archivo Markdown íntegro, overlay y triage; ninguna de estas capacidades nuevas está aceptada naturalmente.
- OMM-FUT-006 se refuerza con una compuerta de observabilidad antes/durante/después de cada tarea provisional.
- DUG v393 / NX-393m, commit 67014eb..., GOW 2.21. La discrepancia Metacanon 1.31/1.30 queda abierta. No se introducen medidas temporales, duración o latencia bloqueadas por §52.
- OCP v0.82 y Especificación v1.2.0 son las bases históricas del diseño; en este ciclo el núcleo se actualizó a OCP v0.83 y Especificación v1.3.0, preservando ambas versiones anteriores byte a byte.
- No se modificó la extensión ni el colector. No se instaló/recargó Chrome, no se hizo aceptación natural, commit, push, PR, merge, deploy o publicación.
- FOL1 sigue PREPARADO / NO ACTIVO; no se asignan folios globales CV/CY/A/B.

**Dictamen:** el esquema conceptual está suficientemente delimitado para registrar OMM-FUT-008 como provisional; faltan decisiones de contrato y privacidad antes de codificar. La compuerta O0–O5 quedó integrada en OCP v0.83 §46.3 y Especificación v1.3.0 §18.5; el modelo de expansión quedó incorporado en Especificación §23 y OCP §50. El trabajo de implementación permanece pendiente.

## 14. Auditoría de la candidata 0.5.0 y brecha temporal identificada en D-041

### 14.1. Capacidad multi-pestaña que ya existe parcialmente

La inspección del código actual (sin ejecutar ni cargar la extensión en Chrome) confirma en `Harmonia/Extension/service-worker.js`:
- `chrome.tabs.query({url:'https://chatgpt.com/*'})` durante inicialización y consultas operativas.
- Reconciliación de sesiones guardadas contra pestañas existentes, limpieza de sesiones cuyo tabId ya no está abierto e inyección de scripts en pestañas existentes.
- `injectExistingTabs()` en inicialización, `onInstalled`, `onStartup` y al activar la observación automática.
- listeners `chrome.tabs.onUpdated` y `chrome.tabs.onRemoved`; la observación estructural y los diagnósticos por pestaña se agregan desde los content scripts.
- el manifest 0.5.0 ya declara `tabs`, `scripting`, `storage`, `alarms`, host permission `https://chatgpt.com/*` y content scripts para ese host.

Esto confirma capacidad implementada en el código candidato para consultar/iniciar observación sobre pestañas de ChatGPT, pero no prueba que todas las pestañas o conversaciones se cubran correctamente en aceptación natural. La sesión se identifica por tabId; aún falta reconciliar varias pestañas a un mismo archivo maestro por ID nativo. El content script inspecciona nodos visibles y roles/conteos para observabilidad, pero no serializa el cuerpo de todos los mensajes como archivo Markdown. No hay overlay de retroalimentación ni registro de incidencias implementados.

El alcance multi-pestaña de OMM-FUT-008 se redefine por tanto como **completar, reconciliar y validar** la capacidad existente más el archivado por conversación y el nuevo dominio de feedback/incidencias, no como empezar de cero.

### 14.2. Compuerta de permisos y ciclo de vida Chrome

El manifest actual ya tiene los permisos base `tabs` y `scripting`, así como host permission específica para `chatgpt.com`. No se recomienda ampliar permisos en esta tarea sin una matriz de necesidad. El permiso `tabs` permite leer campos sensibles como URL/título en pestañas; el código debe limitar el procesamiento al patrón autorizado `https://chatgpt.com/*` y evitar consultar/registrar datos de otras pestañas. La API de tabs está disponible al service worker, y las host permissions se aplican a los sitios coincidentes; la guía oficial MV3 requiere persistir estado y registrar listeners de forma síncrona. Referencias consultadas el 2026-11-13:
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/develop/migrate/checklist
- https://developer.chrome.com/docs/extensions/develop/migrate/known-issues

El service worker MV3 es event-driven, no un proceso persistente garantizado. El contrato debe diseñarse para arranque, suspensión/reinicio, listeners registrados al evaluar el worker, rehidratación desde storage y eventos de ciclo de vida; no prometer supervisión mientras Chrome está cerrado.

### 14.3. Hallazgo temporal no conforme con la compuerta vigente

OCP §13 declara que Metacanon §52 desactiva duración de ciclos, latencia, procesamiento, tiempo activo, esperas y comparativas temporales; el T1/T2 y `duration_ms` son código heredado NO CONFORME y no deben ejecutarse ni presentarse como métricas aceptadas.

La lectura estática de fuentes activas encontró:
- `Harmonia/Extension/service-worker.js`: `summarizePendingCycles()` resta `monotonic_ms`, lee `duration_ms`, clasifica ciclos como `MEASURED` y calcula `meanMs`, `medianMs` y `p90Ms`; `stopSession()` emite `capture.stopped` con `durationMs`.
- `Harmonia/Collector/cycle-telemetry.js`: acepta `durationMs/duration_ms`, valida pares temporales y calcula agregados `meanMs`, `medianMs`, `p90Ms` y equivalentes heredados.
- `Harmonia/Collector/server.js`: persiste el campo `durationMs` en el evento `capture.stopped`.
- `Harmonia/Collector/query.ps1`: interpreta los pares de ciclos y devuelve `duration_ms`/`legacy_duration_ms`.
- `Harmonia/DevTools/GroqAssist/assist.mjs` y `scenario-runner.mjs`: adjuntan `durationMs` a resultados de triage/ejecución local.

La auditoría agregada del banco local explícito `C:\\Users\\fila4\\AppData\\Local\\Harmonia\\surface-index-v0.4.0\\data` leyó 70 archivos JSONL, 3,190 eventos y únicamente contó tipos/campos; no volcó cuerpos ni valores temporales. Encontró 31 eventos `capture.stopped`, y los 31 contienen `payload.durationMs`. No encontró eventos `client.cycle.started` ni `client.cycle.completed` en esos JSONL. El index.json del banco tiene 2,540,167 bytes y SHA-256 `F32F827F6730FC6D9CD2D40A6779A7B6897AC922BB46AB20258EF509EDB80CE7`.

Dictamen: existe evidencia de **persistencia histórica real** de campos de duración de sesión en el banco local; las métricas T1/T2 no aparecen como eventos de ciclo en ese conjunto, pero siguen habilitadas en el código activo. No se afirma aceptación natural ni que los valores sean mediciones aceptadas. Es una no conformidad de gobernanza/código que requiere corrección; no es todavía un IncidentRecord del nuevo sistema de triage, que no está implementado.

### 14.4. Nueva tarea provisional derivada de la auditoría

**OMM-FUT-009 · Alinear y retirar telemetría temporal heredada no conforme con Metacanon §52.** P1 · padre OMM-01-038 · PROVISIONAL / NO IMPLEMENTADA. La propuesta es:
1. Desactivar/eliminar del runtime Extension/Collector cualquier cálculo, emisión, persistencia, API o UI de duración/latencia/tiempo activo/esperas/comparativas temporales bloqueadas.
2. Mantener timestamps solo como datos de procedencia, orden y correlación; no restarlos ni convertirlos en métricas.
3. Revisar GroqAssist/ScenarioRunner para eliminar la exposición de `durationMs` donde caiga bajo la misma prohibición.
4. Mantener fixtures sintéticos y código histórico solo en archivos de archivo/pruebas explícitamente segregados; nunca presentarlos como telemetría aceptada.
5. Diseñar el tratamiento de los 31 eventos JSONL ya persistidos (resguardo byte a byte, minimización/redacción o retención autorizada y verificada). No reescribir ni borrar datos históricos en D-041.
6. Agregar pruebas de contrato que rechacen campos temporales prohibidos en producers, collector, query, API y UI; probar el contenido del JSONL y read-back.

**Criterios terminales:** ninguna ruta activa genera, persiste, calcula, expone o presenta dichas métricas; los metadatos temporales restantes solo ordenan/correlacionan; los 31 registros históricos reciben un dictamen de retención/tratamiento autorizado y verificable; pruebas y read-back pasan. No asignar versión SemVer hasta estimar el impacto.

**Estado:** propuesta provisional surgida de evidencia convergente de D-041 y OMM-FUT-006; no se modificó código, productor, colector, API, UI ni JSONL. Requiere autorización antes de cualquier cambio, especialmente antes de modificar el banco histórico.

## 15. Matriz normativa D-001…D-041 y tarea de integridad del corpus

La revisión de las fuentes locales disponibles está desarrollada en `originales/HARMONIA-MATRIZ-NORMAS-OPERATIVAS-VERBATIM-D041.md`. La matriz contiene 32 normas operativas N-01…N-32, cada una vinculada a los D-key fuente, controles, precedencias y tareas OMM/FUT.

La revisión confirma D-001…D-014 en OCP §§5, 16–18; D-015…D-024 y D-027…D-031 en el registro complementario 2026-11-10; D-032…D-041 en originales específicos. No se localizó fuente para D-025 ni D-026; no se infiere su contenido ni se asigna una clave distinta. OMM-FUT-010 queda P2, PROVISIONAL / NO IMPLEMENTADA, bajo OMM-01-038 y en vínculo con OMM-01-035, para recuperar o confirmar la procedencia del hueco.

La tabla de normas del OCP §4.6.1 es una síntesis de trabajo. La matriz complementa y hace explícita la procedencia; no reemplaza el texto literal. D-015/D-016, D-027…D-031 y D-001…D-004/D-010 mantienen la precedencia y las restricciones detalladas en la matriz, particularmente la limitación posterior de navegación, la separación de Groq del runtime y el bloqueo temporal de Metacanon §52.

# Harmonia · Especificación General Única

**Documento:** ESPECIFICACION-GENERAL.md  
**Versión:** 1.1.0  
**Estado:** ESPECIFICACIÓN OPERATIVA LOCAL · v1.1.0 · REVISADA EN D-039  
**Frente / OCP:** Harmonia · `docs/frentes/harmonia/OBJETO-CANONICO.md`  
**Repositorio:** `SeryMente/khora`  
**Fuente de estado:** OCP Harmonia; esta especificación define y consolida el sistema, pero no crea un segundo OCP ni reemplaza el estado vivo del frente.  
**Gobierno adquirido para esta edición:** Samantha v393 · NX-393m · DUG main commit `67014eb24244651b2e805079930d08082f0fc41c` · blob SHA-1 `844fc507a2a9a0bfc8f4e68884cca9f6d2912c96` · GOW 2.21. El DUG declara Metacanon 1.31 en sus metadatos, mientras el objeto embebido `metacanon.version` declara 1.30; la discrepancia queda abierta y no se resuelve por inferencia.  
**Última revisión:** 2026-11-13T19:26:20.2765088Z · ciclo local `01a1d653-2042-70fc-b73e-2ec4ac841ce8`.

---

## 1. Propósito y autoridad

Harmonia es un sistema de observabilidad local, mínimo y respetuoso de la privacidad, orientado a registrar superficies estructurales de una interfaz web y, cuando el gobierno vigente lo permita y la instrumentación sea aceptada, estados de ciclo que puedan validarse con evidencia. Su propósito operativo actual es construir una base fiable para estudiar la interacción de una interfaz de IA sin extraer el contenido de las conversaciones.

La jerarquía de fuentes es:

1. Políticas obligatorias y permisos reales de la plataforma.
2. DUG vigente de `SeryMente/metodologia/main` y sus principios, con anexos subordinados.
3. Este documento, como especificación técnica consolidada del frente Harmonia.
4. `OBJETO-CANONICO.md`, como única fuente del estado vivo, backlog, decisiones, bloqueos, aceptación y continuidad del frente.
5. Código fuente, contratos, manifiestos, tests y datos de prueba: expresan implementación y evidencia, pero no se autoautorizan ni reemplazan esta especificación.
6. Crónicas, originales y manifiestos de procedencia: acreditan eventos y fuentes según su estado de verificación.

Esta especificación no crea reglas generales de Ser y Mente, no modifica el DUG, no otorga permisos, no activa mecanismos normativos y no convierte una implementación existente en una implementación aceptada. Si existe conflicto, prevalece la fuente superior y el delta se registra explícitamente.

## 2. Objetivos y resultados esperados

- Mantener identificación estructural de superficies de la interfaz web objetivo mediante una lista permitida de atributos y categorías.
- Mantener la continuidad del observador ante cambios de ruta SPA y sustitución de subárboles del documento.
- Mantener un colector local, autenticado y separado del navegador para los eventos que el productor esté autorizado a persistir.
- Conservar evidencia técnica agregada y minimizada para diagnóstico y pruebas de regresión.
- Organizar conversaciones, ciclos y partes A/B con referencias locales y procedencia, cuando las entradas/salidas estén disponibles legítimamente.
- Mantener una especificación general íntegra, actualizada y cotejable en cada ciclo sustantivo.
- Distinguir evidencia sintética, histórica, natural, aceptada y no verificada.

El resultado de ingeniería no es equivalente a la aceptación natural del operador ni a la publicación. Un paquete local construido y probado no demuestra que esté cargado, activo o aceptado en el navegador principal.

## 3. Alcance funcional

### 3.1 Incluido

- Extensión Chromium Manifest V3, limitada por manifest a los dominios explícitamente declarados.
- Observación de regiones y controles estructurales allowlisted.
- Detección local de cambios de navegación SPA mediante eventos History/popstate/hashchange.
- Reinicio controlado de observadores y renovación de referencia local del ciclo/conversación cuando el cambio de ruta lo justifique.
- Outbox local del navegador y transporte autenticado al colector loopback, sujeto a su inicialización.
- Colector local, esquemas de eventos, almacenamiento JSONL, indexación y consultas.
- Diagnóstico agregado, pruebas unitarias/sintéticas y validación de integridad de paquetes.
- Registro de metadatos conversacionales A/B y de procedencia documental dentro del OCP, no captura automática de contenido.

### 3.2 Excluido

- Automatizar ChatGPT, iniciar conversaciones, enviar prompts, accionar controles o sortear límites de uso.
- Extraer programáticamente prompts, respuestas o texto conversacional.
- Leer el texto de navegación, títulos, valores de campos, contenido de menús/diálogos, URL, query string, hash de ruta o estado del historial para telemetría.
- Gestionar credenciales del operador, copiar tokens o transferir secretos.
- Ejecutar llamadas externas de pago o a Groq sin la autorización y credenciales específicas.
- Intervenir el Chrome principal mediante RDC, DevTools, CDP o automatización.
- Afirmar captura omnicanal, sincronización perpetua o disponibilidad de conversaciones no accesibles.
- Publicar, fusionar, desplegar o modificar `main` sin una autorización separada.

## 4. Arquitectura y componentes

### 4.1 Extensión MV3

La extensión vive en `Harmonia/Extension/`. El paquete candidato actualmente verificado es versión **0.5.0**, build `LOCAL-OMM-FUT-004-005-006-FRONT-ACTIVITY-REPORT`; su baseline PRE-D039 0.4.9 se conserva como todo el trabajo anterior. El manifiesto declara Manifest V3, scripts de contenido `cycle-observer.js`, `surface-catalog.js` y `content.js`, service worker `service-worker.js`, y `history-bridge.js` como recurso accesible únicamente en `https://chatgpt.com/*`. La nueva lógica `front-activity.js` y el catálogo `front-registry.json` sustentan la asociación explícita. La versión 0.5.0 es una candidata local: no se declara instalada, recargada ni aceptada en Chrome principal.

### 4.2 Observación estructural

`surface-catalog.js` define el catálogo estructural versionado; el corte vigente es catálogo **0.1.3**. Los resultados se limitan a metadatos estructurales allowlisted como tipo de región, tag, rol allowlisted, test ID tokenizado, clases tokenizadas, cantidades, visibilidad, expansión, popup, estado modal y disabled. No se capturan valores, texto ni payloads de la interfaz.

### 4.3 Continuidad SPA

`history-bridge.js` se ejecuta en el mundo principal como recurso web accesible para chatgpt.com. Envuelve `history.pushState` y `history.replaceState` preservando contexto, argumentos y retorno, y emite solo el evento genérico `harmonia:history-change`, sin URL, argumentos, `history.state` ni texto. `content.js` atiende esa señal más `popstate` y `hashchange`; compara `pathname` solo en memoria. Cuando cambia, reinicia el observador del ciclo, renueva la identidad local y solicita un nuevo barrido. Las observaciones estructurales deben permanecer ancladas a un nodo documental estable para no quedar huérfanas cuando se sustituye `main`.

El diseño de continuidad está implementado localmente y cuenta con pruebas de VM; no se ha demostrado todavía su inyección en una pestaña real ni el comportamiento SPA natural.

### 4.4 Service worker y outbox

`service-worker.js` recibe eventos ya saneados, aplica límites y estados de entrega y conserva la cola en `chrome.storage.local` antes del transporte. `queued_outbox` significa únicamente persistencia local del navegador; no significa que el colector haya recibido ni persistido el evento. `posted` requiere respuesta satisfactoria del colector.

### 4.5 Colector

El colector se mantiene en `Harmonia/Collector/`. Versión candidata local: **0.5.0**, catálogo **0.1.3**. Expone un servicio loopback en `127.0.0.1:47321`, con autenticación local. Los eventos aceptados se almacenan en el JSONL existente y se indexan de forma idempotente; el almacén de actividad por frente extiende el mismo `index.json` sin crear un segundo banco. Las pruebas aisladas de contrato/API pasan, pero el servicio 0.5.0 no se ha iniciado en el perfil del operador ni aceptado en Chrome natural.

### 4.6 Consultas e informes

`Collector/query.ps1` consulta los registros y genera vistas agregadas. Los informes diagnósticos no deben incluir texto conversacional, URL, identificadores nativos ni secretos. Una consulta sintética solo valida la ruta de prueba; no demuestra eventos naturales.

### 4.7 Módulos auxiliares

El código auxiliar de DevTools/GroqAssist permanece fuera de `Extension/` y `Collector/`; no es dependencia del observador ni del colector. El transporte real Groq no se ha ejecutado en este corte. Los adaptadores adicionales OpenWebUI y clientes API/streaming permanecen diferidos.

## 5. Modelo de datos y correlación

- **Conversación:** contexto de intercambio que puede contener uno o más ciclos. Se conserva el ID nativo solo si la plataforma o el export lo expone de forma verificable. De otro modo, `native_conversation_id=null` y estado `NOT_EXPOSED`.
- **Ciclo:** unidad de trabajo sustantiva y trazable. No se crea un ciclo por cada llamada de herramienta, callback o acuse sin delta material.
- **A:** entrada literal del operador disponible en el turno. Se conserva sin corregir su ortografía, espacios, puntuación o saltos.
- **B:** salida final visible del modelo. Se conserva literal o se identifica con una referencia exacta al original persistido.
- **UUIDv7 local:** referencia de correlación creada localmente; no es ID nativo ni folio global.
- **FOL1:** preparado, pero pendiente de activación. Mientras no esté ACTIVO, no se emiten folios globales CV/CY/A/B y no se renumeran referencias heredadas.
- **Asociación:** cada registro debe remitir a `SeryMente/khora`, frente Harmonia y `docs/frentes/harmonia/OBJETO-CANONICO.md`.

Una entrada de ciclo sustantivo es consolidada. A y B pueden ser dos campos de la entrada o referencias a originales existentes; no se exige duplicar almacenamiento en dos registros separados. Ausencias permanecen ausencias y no se reconstruyen desde memoria.

## 6. Contrato de eventos y semántica

Los productores deben declarar esquema, versión, tipo de evento, productor, event_id estable/idempotente, referencia local disponible, operación, estado normalizado y procedencia. Los eventos deben ser minimizados y tipados; no usar texto libre sensible para diagnóstico.

Estados recomendados, siempre que el esquema productor ya los soporte: `SUCCESS`, `FAILED`, `NOT_RUN`, `NOT_VERIFIED`, `NOT_MEASURED`, `PENDING` y `BLOCKED`. Un ACK de transporte no implica durabilidad ni aceptación funcional.

Los nombres de eventos, sus campos y su compatibilidad se rigen por los esquemas versionados del productor. No se inventan eventos a partir de funciones o APIs que solo existan en el código. Una evolución incompatible requiere versión de esquema nueva, migración y tests específicos.

## 7. Privacidad y seguridad

No almacenar ni transmitir prompts, respuestas, texto del compositor, texto de mensajes, transcripciones, audio, registros crudos de DOM, texto de navegación, URLs/títulos privados, valores de campos, cookies, tokens, cabeceras, credenciales ni cuerpos de solicitudes. No incluir identificadores de conversación, sesión o pestaña en informes públicos o telemetría externa. Aplicar allowlist y saneamiento tanto en la extensión como en el colector.

Los logs de errores serán acotados y saneados. Los datos deben quedarse en el entorno local autorizado. El colector no debe aceptar peticiones no autenticadas. No registrar secrets en el repositorio, argumentos, manifests, crónicas ni reportes.

La ruta de acceso RDC autorizada usa la conexión disponible como puente y el workspace destino fila4; se mantienen separados proceso puente, perfil destino y ruta real. No se fija un UUID de dispositivo como pin perpetuo. La ruta verificada del workspace en este ciclo es `C:\Users\fila4\Desktop\SeryMente\KHORA`.

## 8. Contrato de privacidad para navegación

El puente de navegación emite una señal vacía/genérica; no agrega URL, pathname, query, hash, history state, argumentos de navegación o texto al payload. El `pathname` se compara solo en memoria para decidir reinicio de observadores. No se guarda ni transmite. Si una implementación futura necesita una señal adicional, debe probar y documentar que no incorpora contenido identificable.

## 9. Gobierno de métricas y discrepancia normativa bloqueante

El DUG vigente en esta edición es Samantha v393 / NX-393m. Metacanon §52 establece expresamente que no se registra ni estima duración de ciclos, latencia, tiempo de procesamiento, tiempo activo, esperas ni comparativas temporales. La fecha UTC, cuando exista, es exclusivamente para ordenar y auditar; no autoriza derivar duraciones.

Sin embargo, el contrato histórico de Harmonia `CYCLE-TELEMETRY.md` v2.4 y partes del código conservan el candidato T1/T2 y el KPI `chatgpt_ui_generation_ms = T2 - T1`; en una prueba sintética previa se produjo `MEASURED / 600 ms`. Esto es una divergencia entre ingeniería histórica y el gobierno vigente, no una autorización para medir.

**Estado normativo actual:** cualquier cálculo, exposición, exportación o presentación de duration_ms, chatgpt_ui_generation_ms, latencia o métrica temporal queda **NO CONFORME / BLOQUEADO** hasta resolver el gobierno de §52. Las pruebas sintéticas históricas se conservan como evidencia de comportamiento de código, pero no cuentan como métricas válidas ni aceptación funcional. No borrar pruebas ni modificar el sistema temporal por inferencia en este cambio documental.

Para reactivar estas métricas se requiere una decisión expresa del operador sobre el gobierno global y, si procede, una actualización del DUG bajo su procedimiento. La alternativa es retirar o desactivar el cálculo de tiempo en Harmonia para adaptarse a §52. Esta elección afecta el modelo funcional y no se presume. La observación estructural no temporal puede continuar cuando su flujo cumpla el contrato de privacidad y sea probado.

## 10. Contrato de aceptación

La implementación se evalúa por niveles independientes:

1. **Integridad estática:** JSON válido, referencias de archivos, versiones y hashes cotejados.
2. **Pruebas automatizadas/sintéticas:** comportamiento unitario y de contratos con fixtures explícitos.
3. **Integración headless:** carga del paquete, inyección y eventos en perfil temporal aislado.
4. **Aceptación natural:** comportamiento real de la extensión en ChatGPT Web, solo en las condiciones y con la presencia/acción requeridas del operador.
5. **Aceptación del producto:** cumplimiento de la intención original, privacidad, estabilidad, cobertura suficiente y ausencia de conflictos normativos.
6. **Publicación:** commit, revisión, push/PR, merge y despliegue son operaciones separadas y exigen sus propias autorizaciones y verificaciones.

No se usa un estado superior para inferir uno inferior. En particular, PASS sintético no es PASS natural; el paquete local no es instalación; integración headless no es aceptación de producto; persistencia local no es publicación.

## 11. Pruebas y evidencia de la línea base

Corte heredado 2026-11-12:
- Suite Extension/Collector: 7 archivos JavaScript/MJS, 38/38 PASS en la corrida de OMM-01-039.
- `node --check`: content.js, history-bridge.js y service-worker.js PASS.
- JSON: manifest.json, build-info.json y MANIFEST-PROCEDENCIA-LOCAL.json parsean correctamente.
- Windows PowerShell 5.1: parser de INICIAR-HARMONIA.ps1 y Collector/query.ps1 PASS.
- 29 archivos del paquete y 8 artefactos de prueba: SHA-256 y tamaños cotejados en la última validación.
- El fixture oficial query-cycles.test.ps1 no existe en este workspace; no se declara ejecutado.
- Una pareja sintética procesada por query.ps1 se clasificó MEASURED con duration_ms=600; de acuerdo con §9, esto prueba código/fixture, no aceptación ni conformidad temporal.
- No se ejecutó GitHub Actions; no se declara CI PASS.
- No se ejecutó prueba de inyección real en ChatGPT, no se validó navegación SPA natural y no se obtuvo T1/T2 natural.
- BMO-01 continúa NO ALCANZADO.

Estos resultados son antecedentes verificados en el ciclo OMM-01-039 y se revalidan solo cuando cambie materialmente la superficie pertinente. La especificación no convierte automáticamente las pruebas históricas en pruebas corrientes.

## 12. Los cuatro ejes del backlog total

La totalidad del backlog activo de Harmonia se estructura en cuatro responsabilidades rectoras. Las tareas técnicas numeradas existentes se conservan como descomposición, evidencia e historial dentro de esos ejes; no constituyen una cola paralela.

### Eje OMM-01-035 · Instrucciones verbatim y trazabilidad

Conservar en `originales/` cada instrucción sustantiva del operador exactamente como fue recibida, con ruta, fecha de captura/persistencia cuando se observen, SHA-256 y lectura de vuelta. La interpretación normalizada se registra separadamente; nunca corregir el original. Cada instrucción debe apuntar al resultado/artefacto y estado de resolución cuando corresponda.

### Eje OMM-01-036 · Inventario de conversación y disponibilidad temporal

Etiquetar conversaciones y corpus disponibles por nombre/ID solo cuando se expongan, fuente, plataforma, timestamps tipados (created/updated/exported/captured/persisted), zona horaria si está declarada, primera disponibilidad conocida, hashes, rutas, cobertura y lagunas. No convertir el primer export conocido en el comienzo absoluto de toda la historia. Segmentar ciclos históricos solo con evidencia; no inventar cantidades.

### Eje OMM-01-037 · Referencias, folios y asociación A/B

Conservar una identidad local por conversación/ciclo cuando sea útil y posible. Asociar A literal y B visible a la conversación, ciclo, repositorio, frente y OCP. Los UUIDv7 locales no son IDs nativos. Los folios globales y OCP solo se emiten con FOL1 ACTIVO, maestro válido, idempotencia, SHA y lectura de vuelta; hasta entonces NO ASIGNADO.

### Eje OMM-01-038 · Especificación general y observabilidad transversal

Mantener el contrato completo de metadatos de salida, registro conversacional, evidencia, privacidad, observabilidad y continuidad. La especificación general presente es el documento de referencia técnica completo. Cada ciclo sustantivo debe revisar este documento, adquirir el DUG/GOW vigente, incorporar deltas de requisitos/implementación/pruebas/estado, conservar el historial de versiones y registrar una revisión de ciclo incluso cuando el delta material sea nulo. La actualización del documento y su lectura de vuelta forman parte del cierre documental del ciclo.

### OMM-01-040 · Mantenimiento de la especificación general (descomposición subordinada a OMM-01-038)

Resultado requerido: documento completo, autónomo y versionado; mapa de arquitectura real; contratos y metadatos; privacidad; interfaces y dependencias; versiones; criterios de aceptación; pruebas y evidencia; límites normativos; historial de cambios por ciclo. La actualización se realiza en el mismo ciclo sustantivo, sin posponerla a un ciclo futuro. Si no hay cambio material se registra “revisado / sin delta” y no se incrementa la versión por rutina.

## 13. Protocolo obligatorio de mantenimiento ciclo a ciclo

Este protocolo es una operación documental local del frente, subordinada al DUG. No modifica por sí mismo ninguna regla general.

Al inicio de cada ciclo sustantivo:
1. Verificar la fuente DUG `main` (versión, firma, commit y blob); adquirir una sola vez la revisión y reutilizarla mientras no cambie.
2. Leer §ARR completo y resolver los términos necesarios mediante el GOW. §ARR prepara el lenguaje; no gobierna ni concede permisos.
3. Revisar el OCP, control, backlog único y última revisión de esta especificación. Conservar procedencia y ruta heredada.
4. Determinar qué parte de la especificación es pertinente para el ciclo y comprobar el estado real de código, contratos y tests antes de diseñar cambios.

Durante el ciclo:
5. Toda decisión, cambio de requisito, arquitectura, interfaz, esquema, privacidad, implementación, prueba o bloqueo que modifique la definición vigente se refleja en la especificación en el mismo ciclo.
6. No copiar razonamiento interno, secretos ni texto conversacional del producto. Registrar resultados, decisiones explícitas, fuentes y evidencia.
7. Si se detecta discrepancia entre especificación y código, describir ambos estados; no modificar la especificación para legitimar código no conforme.

Antes del cierre:
8. Actualizar la versión semántica solo cuando cambie la especificación; agregar una línea al historial por cada ciclo revisado.
9. Actualizar referencias cruzadas del OCP, backlog y crónica; preservar originales y documentos previos.
10. Validar enlaces/rutas, consistencia de versiones y referencias DUG, JSON cuando aplique y hashes; leer de vuelta todos los archivos escritos.
11. El cierre documental del ciclo requiere que la especificación esté actualizada o que conste revisión sin delta, con ruta, hash y read-back.
12. Si no se puede actualizar o leer de vuelta, declarar el cierre documental INCOMPLETO. El trabajo independiente autorizado puede continuar, pero no afirmar cierre completo.

## 14. Interfaces de persistencia y carpetas

Ruta heredada del OCP: `docs/frentes/harmonia/`. Se preserva; no migrar por convención nueva.

- `OBJETO-CANONICO.md`: estado vivo y autoridad de estado del frente, backlog activo, decisiones, bloqueos, acceptance gates, versión y continuidad.
- `ESPECIFICACION-GENERAL.md`: especificación integral del sistema y registro de revisión ciclo a ciclo.
- `originales/`: entradas verbatim y documentos fuente.
- `cronica/`: salidas visibles/relatos explicativos por ciclo.
- `continuidad/`: índice y esquema de metadatos de conversaciones/ciclos.
- `evidencias/`: pruebas, recibos, hashes y aceptación.
- `archive/`: versiones reemplazadas del OCP y copias históricas que no se editan.
- `Harmonia/`: implementación de extensión/colector y scripts del producto, fuera del OCP pero dentro del repositorio.

No crear otro OCP, otra cola de tareas, otra fuente de estado o copias de código como fuente de verdad.

## 15. Incidencias, decisiones y pendientes materiales

- **Discrepancia de representación del gobierno temporal:** la auditoría incorporada en el commit DUG 67014eb observa divergencia entre §52 humano (describe medición objetiva del procesamiento por ciclo) y la proyección estructurada `metacanon.sections` (marca la medición como desactivada), además de diferencias de representación en §§4 y 37. No adjudicar estas señales ni cambiar la norma desde Harmonia. Esta función registra timestamps observables de actividad del hilo; no calcula T1/T2, duración, latencia ni `duration_ms`.
- **Aceptación natural:** pendiente. La candidata local 0.5.0 se ha probado con suite unitaria/API; aún no ha sido aceptada en una conversación natural de Chrome.
- **Integración headless/natural:** pendiente para la candidata 0.5.0; debe validarse de forma aislada con perfil temporal y la aceptación de ChatGPT natural requiere acción/condiciones del operador, nunca abrir Chrome principal vía RDC.
- **BMO-01:** NO ALCANZADO.
- **FOL1:** PREPARADO / PENDIENTE DE ACTIVACIÓN.
- **Publicación:** no hay commit, push, PR, merge ni deploy del estado de trabajo de esta rama.
- **Metacanon:** el DUG muestra metadato 1.31 y el objeto embebido 1.30; hasta una revisión futura que elimine la discrepancia, registrar ambas señales sin asumir cuál prevalece.
- **DUG / GOW:** Samantha v393 / NX-393m; GOW 2.21; MCP-NORMATIVO DESACTIVADO.

## 16. Historial de versiones y revisiones por ciclo

| Versión | Fecha UTC | Ciclo local | Delta |
|---|---|---|---|
| 1.0.0 | 2026-11-12 | `01a1d1f1-febb-7736-88da-74e3537d2657` | Primera especificación general consolidada; documenta arquitectura candidata, gobierno y límites vigentes. |
| 1.1.0 | 2026-11-13 | `01a1d653-2042-70fc-b73e-2ec4ac841ce8` | Asociación explícita conversación↔frente, eventos front.assignment/front.activity, consulta por ventanas móviles, auditoría de suficiencia del banco y versionado semántico de Extension 0.5.0. |

### Registro append-only de revisión
| Fecha UTC | Ciclo local | Resultado de revisión | SHA-256 de esta revisión |
|---|---|---|---|
| 2026-11-12T22:47:39.966Z | `01a1d1f1-febb-7736-88da-74e3537d2657` | CREADA Y REVISADA EN EL CICLO; SHA-256, ruta y read-back se registran en OCP, crónica y procedencia. | Referenciado externamente tras read-back |
| 2026-11-12T23:01:26.0782954Z | `01a1d1f1-febb-7736-88da-74e3537d2657` | REVISADA / SIN DELTA TECNICO adicional; se cotejo contra OCP v0.80, los cuatro ejes y la descomposicion OMM-01-040. Se mantiene v1.0.0; hashes externos y lectura de vuelta se cierran en PROCEDENCIA.md. | Referenciado externamente tras read-back |
| 2026-11-13T19:26:20.2765088Z | `01a1d653-2042-70fc-b73e-2ec4ac841ce8` | ACTUALIZADA a v1.1.0: modelo de asociación de conversación/frente, eventos y reporte temporal; protocolo recurrente de auditoría de observabilidad; auditoría de suficiencia y propuestas pendientes de autorización. | Ruta y hash final referenciados en PROCEDENCIA.md tras read-back |

---
**Regla de precedencia:** ante cualquier diferencia entre esta especificación y el OCP, el DUG, el control de responsabilidad, el código o las pruebas, registrar el delta; aplicar la fuente superior que corresponda. Este documento no se autoaprueba ni instala funciones.

## 17. Reporte de frentes trabajados · OMM-FUT-004 · D-039

### 17.1. Resultado de producto

La extensión ofrece un listado filtrable de los frentes cuya conversación asociada tuvo una actividad observable dentro de una ventana móvil:

- `24h`: desde ahora menos 24 horas.
- `48h`: desde ahora menos 48 horas.
- `72h`: desde ahora menos 72 horas.
- `7d`: desde ahora menos 168 horas.

Una fila de salida contiene solamente:

1. Nombre del frente.
2. Etiqueta relativa y fecha/hora local de la última actividad.
3. URL canónica de la conversación ChatGPT actual/última asociada al frente.

No presentar frentes sin asociación verificable. No presentar más de una conversación activa por frente.

### 17.2. Asociación conversación ↔ frente

- El catálogo `Extension/front-registry.json` contiene identificadores y nombres estables de frentes, aliases y rutas OCP/control.
- El catálogo identifica el frente que puede asociarse, pero no acredita que su conversación esté activa.
- La asociación se hace explícitamente desde el popup mientras está abierta la conversación ChatGPT correspondiente.
- El operador elige un frente; el worker obtiene el ID nativo desde la ruta de la pestaña validada y guarda la relación en `chrome.storage.local`.
- El acto se registra como `front.assignment`, con `association=operator_selection`.
- No se infiere la relación leyendo nombre, prompt, respuesta, título, etiquetas o contenido del chat.
- Asociar una nueva conversación al mismo frente sustituye la anterior en la vista activa. El historial JSONL previo no se borra.
- Esta asociación no modifica titularidad, responsable, generación ni control de responsabilidad del frente.

### 17.3. URL e identidad

Solo se aceptan rutas HTTPS exactas de `chatgpt.com` que cumplan:

- `/c/{conversation_uuid}`
- `/g/{gpt_uuid}/c/{conversation_uuid}`

La URL persistida contiene el origen y la ruta canónica, sin query ni fragmento. Las rutas de otro host, share links u otras páginas no se aceptan. El identificador de conversación de ChatGPT se conserva como ID nativo expuesto; no se confunde con los UUIDv7 locales de Harmonia para conversación/ciclo/sesión.

### 17.4. Eventos allowlisted

**`front.assignment`**: `front_id`, `front_name`, `conversation_id`, `conversation_url`, `association`, `assigned_at`.

**`front.activity`**: `front_id`, `front_name`, `conversation_id`, `conversation_url`, `activity_kind`, `updated_at`, `local_conversation_id`, `cycle_id`.

Los tipos de actividad válidos son `user_turn_started` y `assistant_response_completed`, derivados de señales de ciclo ya observadas. El timestamp es el del evento de ciclo que alimenta la actualización más reciente. No representa duración, latencia ni procesamiento. La nueva funcionalidad no implementa T1/T2 ni `duration_ms`.

Los payloads se validan con lista exacta de propiedades: los campos desconocidos producen rechazo; no se admiten prompt, response, title, text, DOM, composer, cookies, credenciales o IDs de pestaña.

### 17.5. Persistencia y consulta

La funcionalidad reutiliza el outbox local, el endpoint autenticado `POST /events`, el directorio JSONL y el `index.json` existentes. No crea otro almacén/banco de observabilidad.

- El índice añade `frontActivity.assignments` y `frontActivity.activityByConversation`.
- El JSONL conserva eventos append-only.
- Un reemplazo de asociación actualiza la vista vigente, no borra la traza anterior.
- El colector incorpora `GET /fronts?window=24h|48h|72h|7d`, protegido por el token local.
- El popup permite asociar la conversación activa y filtrar las ventanas.
- Si el colector no está disponible, el worker solo puede combinar seeds de exportación conocidos y eventos front.activity pendientes en outbox; debe preservar el origen y no afirmar sincronización.

### 17.6. Tiempo relativo y fecha visible

La zona de presentación actual es `America/Mexico_City`. Las etiquetas relativas se calculan a partir del timestamp real con reloj local al consultar. La fecha/hora absoluta se conserva al lado de la etiqueta para evitar ambigüedad.

Ejemplos: `hace 2 h`, `hoy · mediodía`, `ayer · tarde`, `fin de semana pasado · sábado`, junto con fecha/hora local absoluta.

La documentación de Todoist sirve como referencia de legibilidad de lenguaje natural y agrupaciones de tiempo, no como dependencia de runtime ni calendario de tareas. Todoist documenta expresiones como “in 2 hours”, “in the afternoon” y “this weekend”. Referencia consultada el 2026-11-13: https://www.todoist.com/help/todoist/features/schedule-a-date-and-time-for-your-todoist-tasks-q7VobO.

Si la fuente es una exportación cuyo encabezado no declara zona horaria, la normalización a `America/Mexico_City` se marca como supuesto/procedencia. No cambiar silenciosamente un timestamp de origen desconocido a UTC confirmado.

## 18. Suficiencia de datos y auditoría continua · OMM-FUT-006 · D-039

### 18.1. Evaluación del pool heredado

Corte examinado: runtime local `%LOCALAPPDATA%\Harmonia\surface-index-v0.4.0\data`.

- 70 archivos JSONL, 3,190 eventos parseados, 0 malformados y 54 sesiones.
- 1,336 fingerprints únicos; 1,271 diagnósticos de etapa de ciclo.
- 53 `capture.started`; 31 `capture.stopped`; 786 `ui.surface.reused`; 1,049 `ui.surface.scan`; 1,271 `diag.cycle.trace`.
- Cobertura natural declarada por el catálogo: 43%; cobertura documental: 78%; combinada: 60%.
- Rango del índice: primer evento `2026-11-10T22:31:33.794Z`, último evento `2026-11-12T18:49:12.513Z`; el pool estaba obsoleto para una consulta del 13 de noviembre en ventana 24h.
- Los eventos heredados no contienen identificador estable de frente, ID nativo de conversación, título ni URL de conversación. El campo `conversation` de la traza general se usa como referencia tab-<id>, y las URLs se anonimizan a `/c/[conversation]`.
- El pool no contiene eventos JSONL `client.cycle.started` / `client.cycle.completed`; las 1,271 trazas diagnósticas no pueden tratarse como ciclos terminados.
- La traza histórica redactada tiene 627 eventos (10 capture.started, 611 console.observed, 6 capture.stopped) sin relación frente/hilo. La fixture sintética tiene 11 eventos y sirve solo para pruebas.
- Los encabezados de exportaciones oficiales sí pueden aportar nombre, ID nativo, URL y Updated, pero solo de los hilos efectivamente exportados; no acreditan que no exista otro hilo más reciente.

**Dictamen:** el conjunto heredado es útil para investigar estructura de la interfaz y fallos del observador, parcial para secuenciar estados de ciclo y, por sí solo, insuficiente para el reporte de frentes. El desarrollo usa esos datos de forma proporcionada: catálogo de frentes + exportaciones verificables como seeds + selección explícita + eventos nuevos de actividad en el flujo existente.

### 18.2. Insumos semilla y límites

El registro inicial localiza fuentes para Harmonia, Dictado y Khora MCP. Para Custodia y Notas hay resúmenes/continuidad recientes sin URL/ID nativo y timestamp suficientemente preciso; para Tareas automáticas no se encontró asociación de conversación. No se deben generar filas completas para estos casos por semejanza o inferencia.

La tabla de versión registra las fuentes seed y sus límites. Hasta que una conversación se asocie expresamente o se importe un export oficial más reciente, no afirmar que el inventario de conversaciones es exhaustivo.

### 18.3. Regla recurrente de calidad de datos

En toda tarea de desarrollo, corrección, optimización o expansión de Extension, ejecutar en paralelo una iteración de mejora continua de la observabilidad y del manejo de los datos:

1. Formular qué señales, campos y evidencia necesita la tarea de desarrollo.
2. Inspeccionar el banco existente antes de solicitar/crear datos adicionales.
3. Clasificar cada evidencia como natural, exportada, reportada, sintética, inferida o desconocida.
4. Evaluar cobertura, frescura, precisión temporal, cardinalidad, procedencia, privacidad, sesgo de selección, estabilidad y reutilización.
5. Comenzar la tarea principal con los datos disponibles; no detener el desarrollo por una mejora posible de telemetría si existe una ruta suficiente.
6. Registrar brechas demostradas y propuestas concretas de mejora. No crear una tarea discreta cada vez por rutina.
7. Acumular evidencias de varios ciclos cuando proceda. Presentar nuevas tareas provisionales de observabilidad al operador solo cuando exista criterio convergente; esperar autorización antes de cambiar los productores/esquemas de la extensión.
8. Si no aparece una brecha nueva, registrar “observabilidad revisada / sin delta”; no aumentar el alcance.

### 18.4. Propuestas surgidas de D-039; no autorizadas

- **OBS-PROP-001 · Coherencia de privacidad de atributos.** La inspección identifica que content.js lee aria-label/placeholder y las capas downstream pueden conservar label/placeholder, aunque los flags declarados indiquen labelsCaptured=false. Se debe investigar el flujo completo, decidir una allowlist alineada, ajustar tests/flags/documentación y verificar el pool. El reporte de frentes no necesita esos atributos. No modificar hasta autorización.
- **OBS-PROP-002 · Importador incremental de exportaciones.** El reporte necesita metadatos de exportación confiables y tiene vacíos en Custodia, Notas y Tareas automáticas. Se propone importar localmente solo encabezados/metadatos de exportaciones oficiales proporcionadas por el titular, preservando timestamp original/zona nula/hash, idempotencia y conflicto entre hilos. No extraer contenido de ChatGPT Web. No implementar hasta autorización.

Estas propuestas permanecen como hallazgos de auditoría; no se asignan IDs OMM-FUT ni se incorporan al backlog activo sin autorización del operador.

## 19. Versionado de la extensión · OMM-FUT-005 · D-039

El paquete Extension usa SemVer `MAJOR.MINOR.PATCH`:

- MAJOR: ruptura de compatibilidad del contrato de eventos/persistencia.
- MINOR: nueva capacidad funcional compatible.
- PATCH: corrección localizada sin cambiar capacidad ni contrato.

El producto sigue en 0.x; BMO-01 no está alcanzado.

- **0.4.9 — Baseline 01 / PRE-D039:** todo el trabajo anterior al primer esfuerzo semiautomatizado descrito por D-039. Se preserva como baseline histórico local; no se reescribe su semántica para hacerlo parecer compatible con la nueva función.
- **0.5.0 — Esfuerzo D-039:** reporte de frentes por ventanas móviles, asociación explícita de la conversación más reciente, eventos front.assignment/front.activity, reporte de fecha/hora y etiquetas relativas, catálogo de frentes y esta primera auditoría recurrente.

Cada fila del `REGISTRO-VERSIONES-EXTENSION.md` corresponde a una tarea provisional del esfuerzo. Una sola versión puede aparecer en varias filas si una versión funcional integra más de una tarea. El archivo es el historial de versiones; el OCP sigue siendo la fuente del backlog y estado de las tareas.

## 20. Criterios de aceptación del reporte de frentes

1. Ventanas móviles exactas de 24h, 48h, 72h y 168h.
2. Una sola conversación actual/última por frente; al asociar un hilo nuevo, el anterior deja de estar activo para el reporte, sin borrar el histórico JSONL.
3. Una fila solo aparece con frente y URL nativa de conversación verificables.
4. La fecha/hora de actualización tiene tipo, zona y procedencia visibles. El rótulo relativo nunca reemplaza la hora absoluta.
5. Los eventos nuevos conservan solo campos allowlisted; prompt/response/título/contenido quedan fuera.
6. Las pruebas unitarias y de API no se usan como sustituto de aceptación natural.
7. La activación/instalación en Chrome y la aceptación BMO-01 siguen siendo compuertas separadas.
8. No se declaran métricas T1/T2, duración o latencia mediante este reporte.


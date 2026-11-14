# Harmonia · Especificación General Única

**Documento:** ESPECIFICACION-GENERAL.md  
**Versión:** 1.0.0  
**Estado:** ESPECIFICACIÓN OPERATIVA LOCAL · PERSISTIDA Y VERIFICADA EN ESTA RAMA  
**Frente / OCP:** Harmonia · `docs/frentes/harmonia/OBJETO-CANONICO.md`  
**Repositorio:** `SeryMente/khora`  
**Fuente de estado:** OCP Harmonia; esta especificación define y consolida el sistema, pero no crea un segundo OCP ni reemplaza el estado vivo del frente.  
**Gobierno adquirido para esta edición:** Samantha v393 · NX-393m · DUG main commit `b62d99bb49c35e6cfe280ebeace5ce5dbde9a675` · blob SHA-1 `844fc507a2a9a0bfc8f4e68884cca9f6d2912c96` · GOW 2.21. El DUG declara Metacanon 1.31 en sus metadatos, mientras el objeto embebido `metacanon.version` declara 1.30; la discrepancia queda abierta y no se resuelve por inferencia.  
**Última revisión:** 2026-11-12T23:01:26.0782954Z · ciclo local `01a1d1f1-febb-7736-88da-74e3537d2657`.

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

La extensión vive en `Harmonia/Extension/`. El paquete candidato actualmente verificado es versión **0.4.9**, build `LOCAL-OMM-01-039-SPA-NAVIGATION-CONTINUITY`. El manifiesto declara Manifest V3, scripts de contenido `cycle-observer.js`, `surface-catalog.js` y `content.js`, service worker `service-worker.js`, y `history-bridge.js` como recurso accesible únicamente en `https://chatgpt.com/*`. La versión 0.4.9 es una candidata local: no se declara instalada, recargada ni aceptada en Chrome principal.

### 4.2 Observación estructural

`surface-catalog.js` define el catálogo estructural versionado; el corte vigente es catálogo **0.1.3**. Los resultados se limitan a metadatos estructurales allowlisted como tipo de región, tag, rol allowlisted, test ID tokenizado, clases tokenizadas, cantidades, visibilidad, expansión, popup, estado modal y disabled. No se capturan valores, texto ni payloads de la interfaz.

### 4.3 Continuidad SPA

`history-bridge.js` se ejecuta en el mundo principal como recurso web accesible para chatgpt.com. Envuelve `history.pushState` y `history.replaceState` preservando contexto, argumentos y retorno, y emite solo el evento genérico `harmonia:history-change`, sin URL, argumentos, `history.state` ni texto. `content.js` atiende esa señal más `popstate` y `hashchange`; compara `pathname` solo en memoria. Cuando cambia, reinicia el observador del ciclo, renueva la identidad local y solicita un nuevo barrido. Las observaciones estructurales deben permanecer ancladas a un nodo documental estable para no quedar huérfanas cuando se sustituye `main`.

El diseño de continuidad está implementado localmente y cuenta con pruebas de VM; no se ha demostrado todavía su inyección en una pestaña real ni el comportamiento SPA natural.

### 4.4 Service worker y outbox

`service-worker.js` recibe eventos ya saneados, aplica límites y estados de entrega y conserva la cola en `chrome.storage.local` antes del transporte. `queued_outbox` significa únicamente persistencia local del navegador; no significa que el colector haya recibido ni persistido el evento. `posted` requiere respuesta satisfactoria del colector.

### 4.5 Colector

El colector se mantiene en `Harmonia/Collector/`. Versión local verificada: **0.4.8.1**, catálogo **0.1.3**. Expone un servicio loopback en `127.0.0.1:47321`, con autenticación local. Los eventos aceptados se almacenan en JSONL y se indexan de forma idempotente. La aceptación HTTP no sustituye la lectura de vuelta del registro persistido. HEALTH=OK y el rechazo 401 sin credencial se han observado en un ciclo previo; no implican aceptación natural de ciclos.

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

- **Conflicto de métricas temporales:** bloqueante de gobierno. Metacanon §52 desactiva métricas temporales, mientras la ingeniería heredada conserva T1/T2/duration_ms. Requiere instrucción expresa del operador para modificar el gobierno global o para retirar/desactivar medición temporal en la ingeniería. No hay autorización implícita en esta especificación.
- **Aceptación natural:** pendiente. La candidata 0.4.9 no se ha probado en ChatGPT Web real.
- **Integración headless:** pendiente. Debe validarse de forma aislada con perfil temporal, nunca abriendo Chrome principal vía RDC.
- **BMO-01:** NO ALCANZADO.
- **FOL1:** PREPARADO / PENDIENTE DE ACTIVACIÓN.
- **Publicación:** no hay commit, push, PR, merge ni deploy del estado de trabajo de esta rama.
- **Metacanon:** el DUG muestra metadato 1.31 y el objeto embebido 1.30; hasta una revisión futura que elimine la discrepancia, registrar ambas señales sin asumir cuál prevalece.
- **DUG / GOW:** Samantha v393 / NX-393m; GOW 2.21; MCP-NORMATIVO DESACTIVADO.

## 16. Historial de versiones y revisiones por ciclo

| Versión | Fecha UTC | Ciclo local | Delta |
|---|---|---|---|
| 1.0.0 | 2026-11-12 | `01a1d1f1-febb-7736-88da-74e3537d2657` | Primera especificación general consolidada; documenta arquitectura candidata, gobierno y límites vigentes. |

### Registro append-only de revisión
| Fecha UTC | Ciclo local | Resultado de revisión | SHA-256 de esta revisión |
|---|---|---|---|
| 2026-11-12T22:47:39.966Z | `01a1d1f1-febb-7736-88da-74e3537d2657` | CREADA Y REVISADA EN EL CICLO; SHA-256, ruta y read-back se registran en OCP, crónica y procedencia. | Referenciado externamente tras read-back |
| 2026-11-12T23:01:26.0782954Z | `01a1d1f1-febb-7736-88da-74e3537d2657` | REVISADA / SIN DELTA TECNICO adicional; se cotejo contra OCP v0.80, los cuatro ejes y la descomposicion OMM-01-040. Se mantiene v1.0.0; hashes externos y lectura de vuelta se cierran en PROCEDENCIA.md. | Referenciado externamente tras read-back |

---
**Regla de precedencia:** ante cualquier diferencia entre esta especificación y el OCP, el DUG, el control de responsabilidad, el código o las pruebas, registrar el delta; aplicar la fuente superior que corresponda. Este documento no se autoaprueba ni instala funciones.

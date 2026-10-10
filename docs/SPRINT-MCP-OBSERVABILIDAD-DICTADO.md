# Sprint KHORA · Acceso MCP a observabilidad y diagnóstico del dictado

**Tipo:** Objeto canónico de continuidad de sprint  
**Estado:** CANÓNICO PARA EL SPRINT · EN EJECUCIÓN · NO CERRADO  
**Versión del objeto:** v0.1.0 — Contexto Portátil de Observabilidad MCP y Dictado  
**Fecha de apertura:** 2026-10-10  
**Repositorio canónico del proyecto:** SeryMente/khora  
**Repositorio de implementación:** SeryMente/khora  
**Punto de entrada del proyecto:** README.md → Documentos canónicos → este objeto  
**Ámbito:** Capacidad general de acceso a registros de observabilidad por el MCP de KHORA, seguida de diagnóstico y corrección del bug de dictado in situ.  
**Fuente única de continuidad del sprint:** este documento. La conversación, la memoria del modelo y las plataformas de ejecución son superficies de trabajo, no fuentes de verdad paralelas.

## 1. Propósito y regla de autoridad

Este objeto conserva las instrucciones del usuario, el alcance, los criterios de aceptación, el estado actual, la evidencia técnica, las decisiones, los incidentes y la crónica de desarrollo. Un modelo nuevo debe poder retomar el trabajo leyéndolo, siguiendo los enlaces de fuente primaria y verificando solamente aquello que pueda haber cambiado. No debe exigir al usuario que reconstruya información ya registrada.

Este es el objeto canónico operativo del sprint de KHORA/Cora. Se rige por SI-METACOGNITIVO.md y METODOLOGIA.md cuando el modelo/plataforma de trabajo esté sujeto a esa metodología, pero la propiedad del objeto, su crónica y las decisiones específicas del sprint corresponden al proyecto SeryMente/khora. No crea principios generales nuevos ni sustituye los contratos de implementación del proyecto; registra el alcance y la continuidad del esfuerzo para cualquier modelo/plataforma compatible que tenga acceso al repositorio. Las conclusiones técnicas se apoyan en código, pruebas o evidencia de ejecución identificada aquí; las hipótesis y decisiones pendientes se etiquetan como tales.

La palabra «MSP» que aparece en la instrucción verbatim de apertura se interpreta, por el contexto inequívoco, como un error de transcripción de «MCP». «Cora» se normaliza al nombre canónico KHORA. Esta normalización no altera las citas verbatim que siguen.

## 2. Norma operativa obligatoria: crónica exhaustiva por ciclo

**En cada ciclo de trabajo de este sprint, antes de darlo por terminado, se debe actualizar este mismo objeto canónico.** No basta una respuesta conversacional, un comentario aislado, un handoff no enlazado ni una actualización de memoria.

Cada entrada de ciclo debe registrar exhaustivamente:

1. **Identidad del ciclo:** folio único del sprint, fecha, plataforma/modelo cuando sea observable, propósito y relación con ciclos previos.
2. **Estado inicial:** HEAD de cada repositorio relevante, versiones y SHA/blob SHA de los contratos realmente consultados; estado heredado del objeto y qué se volvió a verificar.
3. **Instrucciones verbatim nuevas:** conservar sin corregir ortografía, gramática, puntuación, terminología ni intención expresiva. Añadir la interpretación operativa normalizada en un campo separado.
4. **Avances concretos:** inspecciones realizadas, archivos y secciones leídos, decisiones, cambios de código/documentación, commits, despliegues, resultados de pruebas y evidencia de read-back. Distinguir «creado», «publicado», «desplegado» y «verificado en ejecución».
5. **Incidentes y resultados negativos:** síntoma, contexto, hora si está disponible, componente, evidencia, impacto, causa confirmada o hipótesis, mitigación, estado y próximo experimento. Registrar también comandos/pruebas fallidos, accesos denegados, resultados vacíos, divergencias de versión y bloqueos; nunca convertir un fallo en éxito implícito.
6. **Crónica causal:** narrar qué se intentó, qué se observó, qué cambió el diagnóstico y por qué se eligió o descartó cada vía. Preservar tanto los resultados positivos como los negativos.
7. **Evidencia y reproducibilidad:** enlaces estables al código/documento, SHA del commit o blob, nombre de prueba, comando o procedimiento de ejecución, resultado real y límites de esa evidencia. Un enlace a código no prueba que la ruta de producción ejecute esa revisión.
8. **Estado final y continuidad:** qué está demostrado, qué permanece desconocido, qué no debe repetirse, qué dependencia bloquea el siguiente paso, siguiente acción concreta y criterios de cierre aún abiertos.

### 2.1 Integridad del historial

- Mantener arriba un resumen breve del estado operativo vigente, pero conservar la crónica anterior en orden cronológico. No reescribir retrospectivamente el historial para hacerlo parecer más limpio.
- Corregir una entrada previa mediante una nota posterior que explique la discrepancia, la evidencia nueva y la fecha; no borrar incidentes ni resultados negativos.
- Cada ciclo debe terminar con una tabla de acciones/criterios: HECHO Y VERIFICADO, IMPLEMENTADO PERO NO VERIFICADO, PENDIENTE, BLOQUEADO o DESCARTADO CON MOTIVO.
- Si no se realizó una acción, anotarla como no realizada. No afirmar acceso real al MCP, reproducción del bug, ejecución de pruebas, publicación ni despliegue sin evidencia.
- No guardar credenciales, tokens Bearer, secretos, transcripciones verbatim de usuarios, audio ni payloads privados en este repositorio. Registrar solo referencias saneadas, IDs no sensibles, hashes y metadatos suficientes para reproducir.
- Al cambiar de conversación, modelo, proveedor o plataforma, el primer acto de continuidad es leer este objeto; luego comprobar la vigencia de las fuentes que hayan podido cambiar. No se reinicia el diagnóstico desde cero ni se considera la memoria conversacional autoridad.
- El orden de autoridad es: SI y Metodología vigentes; este objeto para alcance, decisiones y continuidad del sprint; repositorio KHORA para implementación real; evidencia de ejecución para afirmar comportamiento desplegado. Un texto histórico de Notion no prevalece sobre código y contratos vigentes.

## 3. Instrucciones canónicas del usuario, conservadas verbatim

### 3.1 Solicitud que originó la auditoría

> Revisa toda la especificacion  del MCP de Khora, en reposiutorio. Notion.  Se exhaustivo. Tomte tu tiempo,  esfuerzte es importnte

### 3.2 Especificación verbatim del sprint

> Bueno, para este sprint vas a documentar un objeto canónico en el repositorio de manera similar a lo que se hizo para entorno persistente en el repositorio de metodología, para que siempre dispongamos de una ventana de contexto de la más alta calidad y que podamos retomar el esfuerzo de desarrollo utilizando únicamente ese objeto canónico, independientemente del modelo o la plataforma que se esté utilizando, permitiendo siempre retomar el trabajo donde se quedó. Esto implica que como norma operativa, y esto lo tienes que anotar en el objeto canónico, cada ciclo debe de documentarse de manera exhaustiva todos los avances, todos los incidentes y toda la crónica del desarrollo. Además, debes de documentar en ese objeto mis instrucciones verbatim para que se tomen como especificación canónica del sprint. Lo que vamos a hacer es asegurarnos que el MSP de Cora permita que cualquier modelo que tenga acceso al MSP pueda acceder a los registros de observabilidad para un esfuerzo específico. Por ejemplo, yo lo que quería hacer era resolver algunas cuestiones que tienen que ver con el proceso de dictado, pero no lo voy a hacer sino hasta que tengas acceso al MSP y que a su vez el MSP te permita tener los registros de eventos con el nivel de riqueza suficiente para que tengas ojos sobre la situación y puedas determinar la solución más adecuada. Entonces, esto supone algunas tareas generales en cuanto a la función de observabilidad del MSP y específicas en cuanto al propósito de desarrollo concreto, que en este caso es resolver el bug de dictado. No sé si lo tengas ya descrito o si lo tenga que volver a describir.

Estas citas constituyen la especificación de intención del sprint. Las decisiones de implementación aún no confirmadas se mantienen como decisiones pendientes; no se inventa una autorización concreta a partir de una hipótesis.

## 4. Objetivo, alcance y exclusiones

### 4.1 Objetivo general

Conseguir que cualquier modelo o agente compatible con MCP, autorizado para el recurso MCP de KHORA y con los permisos necesarios, pueda consultar los registros de observabilidad que sean relevantes para un esfuerzo de desarrollo específico. El acceso debe ser real, autenticado, de solo lectura para observabilidad, filtrable, paginable, suficientemente rico para reconstruir la secuencia causal y verificable en ejecución.

«Cualquier modelo» significa interoperabilidad del protocolo y ausencia de dependencia funcional injustificada de un proveedor concreto. No significa acceso anónimo, omisión de autenticación, concesión indiscriminada de permisos ni exposición de datos sensibles. Cada cliente debe contar con credenciales y scopes autorizados.

### 4.2 Objetivo específico del caso inicial

Resolver el bug de dictado relacionado con la edición in situ de la transcripción y la reanudación del dictado. La reparación del bug es una fase posterior: no se debe iniciar un cambio correctivo de código hasta que el cliente de trabajo haya demostrado acceso al MCP y que el flujo de observabilidad permita examinar el incidente con riqueza suficiente. Se permiten inspecciones estáticas y preparación de pruebas para caracterizar el problema y cerrar las brechas de observabilidad.

### 4.3 Fuera de alcance salvo instrucción posterior

- Rediseñar todo el sistema de telemetría de KHORA sin relación material con el objetivo.
- Dar acceso a los volcados íntegros cuando basten registros saneados.
- Añadir un segundo almacén autoritativo de eventos.
- Resolver o atribuir a este sprint fallos de workflows no investigados que no estén relacionados de forma demostrable.
- Declarar el problema resuelto por mera presencia de código, documentación, tests estáticos o un deployment creado.

## 5. Estado inicial verificado y línea base

### 5.1 Metodología transversal

En la apertura se verificó la rama main de SeryMente/metodologia mediante doble lectura del HEAD:

- HEAD H1: e79fd5c66c15a13af0755e1ddb0e60babad08791
- HEAD H2: e79fd5c66c15a13af0755e1ddb0e60babad08791
- Resultado de estabilidad: H1 = H2.
- SI-METACOGNITIVO.md: versión v1.6.21 — Ordenamiento por Preponderancia y Categorías.
- Git blob SHA del SI en ese snapshot: 151333921ca3214c0adee3996cc80d5f23adb2d5.
- Integridad de recuperación del archivo: 41.280 caracteres, 470 líneas; cabecera y cierre presentes y coherentes con el mismo blob.
- METODOLOGIA.md leído como snapshot de apertura: v0.14.9 — Bootstrap Anclado por Commit y Hash; blob SHA e0dc6157d2bc95bca8dff5fde354d601b163a814.
- BOOTSTRAP-CONTEXTO-GLOBAL.md leído como snapshot de apertura; blob SHA 785e4034bb6eecc01521e573e3c3c16259944057.
- El HEAD indicado es la línea base de apertura, no el HEAD final posterior a esta publicación.

### 5.2 Repositorio de implementación KHORA

- Repositorio: https://github.com/SeryMente/khora
- Rama inspeccionada: main.
- HEAD de referencia observado en la auditoría: e2d89dbdc7aa0f537cea94188abdecb5e99215a3.
- Fecha del commit reportada por GitHub: 2026-10-09 20:44:40 UTC.
- Ruta MCP: khora-web/app/api/mcp/route.ts.
- Versión declarada por el objeto McpServer en el código inspeccionado: 1.3.0.
- Blob SHA de route.ts inspeccionado: 4a6831ac56604b3b02c29d4c63063ba496a6a70e.
- Endpoint canónico de implementación: /api/mcp, sin que esta referencia pruebe por sí sola disponibilidad autenticada desde una conversación externa.

### 5.3 Fuentes de implementación y contrato inspeccionadas

- [Ruta MCP y lista de herramientas](https://github.com/SeryMente/khora/blob/main/khora-web/app/api/mcp/route.ts)
- [Observabilidad MCP](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/mcp-observability.ts)
- [Contrato de eventos de observación](https://github.com/SeryMente/khora/blob/main/khora-web/lib/contracts/observation.ts)
- [Contrato de lotes de observación Harmonia](https://github.com/SeryMente/khora/blob/main/khora-web/lib/contracts/observation-batch.ts)
- [Observabilidad de fronteras de servicio](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/service-observability.ts)
- [Contrato documental de observabilidad](https://github.com/SeryMente/khora/blob/main/khora-web/docs/observability-services.md)
- [Control de tokens manuales](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/mcp-manual-token.ts)
- [Prueba de cobertura de observabilidad](https://github.com/SeryMente/khora/blob/main/khora-web/tests/unit/service_observability_coverage.test.ts)
- [Prueba de metadatos y scopes MCP](https://github.com/SeryMente/khora/blob/main/khora-web/tests/unit/mcp_tool_auth_metadata.test.ts)

El estado de estos archivos deberá actualizarse por read-back tras cualquier cambio. Los SHA de apertura no deben reutilizarse como prueba de la versión futura.

## 6. Arquitectura MCP observada

La implementación inspeccionada publica 15 herramientas agrupables en tres capacidades, además de salud:

| Grupo | Herramientas |
|---|---|
| Observabilidad del runtime | khora_observacion_instantanea, khora_eventos_recientes, khora_eventos_desde, khora_estado_vivo |
| Volcados y revisión | khora_resumen, khora_listar_volcados, khora_leer_volcado, khora_buscar_volcados, khora_versiones_volcado, khora_ui_review |
| Ciclo normativo | khora_norm_open_turn, khora_norm_apply_principle, khora_norm_verify_turn, khora_norm_release_turn |
| Salud | khora_mcp_health |

La implementación del endpoint registra también la versión del servidor y los esquemas que publica. Antes de dar por interoperable una herramienta se debe cotejar el esquema anunciado mediante MCP tools/list con el esquema aceptado por su handler, no solo leer el registro de código.

### 6.1 Scopes y gate de ejecución

Scopes declarados:

- runtime:read — consulta de observabilidad.
- volcados:read — consulta de volcados y revisión.
- norm:turn — operaciones del ciclo normativo y gate que actualmente precede a las herramientas sustantivas.
- offline_access — aparece en metadatos OAuth para el flujo de refresh.

Hallazgo de apertura: las herramientas operativas están envueltas en un gate que exige _norm_turn_token, _thinking_mode y _output_format_version además del scope específico. Por eso runtime:read por sí solo no basta para ejecutar las herramientas de observabilidad en el estado actual del código; el cliente también debe completar la apertura normativa y disponer de norm:turn. La UI de token manual permite elegir scopes, por lo que la dependencia no queda suficientemente anticipada a un usuario que genere un token parcial.

Acción requerida: determinar y documentar el contrato de mínimo privilegio para el caso de uso de observabilidad. La opción inicial a validar es runtime:read + norm:turn con apertura válida de ciclo, sin volcados:read cuando la tarea no necesite contenido de volcados. No ampliar permisos automáticamente ni modificar el gate sin prueba de contrato y evaluación de seguridad.

### 6.2 Clientes y portabilidad entre plataformas

La especificación del sprint requiere verificar un cliente distinto de la plataforma que inspiró el gate. El código normativo actual fija REQUIRED_PLATFORM = ChatGPT y publica instrucciones que mencionan ChatGPT. Aunque el server rellena ese contexto internamente, esto no demuestra por sí solo que un agente de otro proveedor pueda completar el protocolo de manera veraz y estable.

Acción requerida: ensayar la secuencia con al menos un cliente externo compatible con MCP y registrar cada llamada, parámetros admitidos, rechazo y resultado. Determinar si platform debe convertirse en metadato de cliente explícito, normalizado y no falsificable, o si hace falta desacoplar la verificación de observabilidad de los atributos específicos de ChatGPT. No presentar esa decisión como tomada hasta tener prueba y análisis de compatibilidad.

## 7. Almacén y riqueza de la evidencia

### 7.1 Fuentes persistentes detectadas

- eventos_sistema: registro durable de eventos de dominio y eventos de frontera; contempla fase, estado, mensaje, detalle, volcado, versión, correlación, tiempos, hash anterior y hash del evento, UUID/idempotencia, resultado, componente, causación, intento, secuencia, sesión, release SHA, duración, métricas, reason code y clase de privacidad.
- khora_runtime_state: estado semántico del runtime observado, incluyendo sesión, ruta, pantalla, actividad, visibilidad, foco, release SHA, origen y marca temporal.

La instrumentación de fronteras complementa los eventos de dominio. No se debe crear un segundo almacén autoritativo.

### 7.2 Capacidad y límites de las herramientas de observabilidad

khora_observacion_instantanea combina el estado de runtime, la última observación, actividad de los últimos cinco minutos, fallos de los últimos sesenta minutos y un cursor global. Considera obsoleto el estado semántico al superar los 15 segundos sin actualización.

khora_eventos_recientes permite filtrar por intervalo temporal, sesión, componente, severidad, resultado, fase, scope y categoría. La ventana se limita a 86.400 segundos y el máximo a 200 eventos por consulta.

khora_eventos_desde permite consultar de forma incremental desde un cursor global monotónico, filtrar por sesión y paginar hasta 200 eventos por página. Es la vía preferida para reconstruir secuencias largas sin depender de la ventana reciente. La consulta inicial con cursor 0 no debe usarse sin evaluar el volumen y paginar hasta cubrir el intervalo del incidente.

### 7.3 Integridad y correlación

Hallazgos de apertura pendientes de validación de extremo a extremo:

- Las consultas MCP seleccionan event_hash, pero no hash_anterior. Con la salida disponible de estas herramientas el cliente no obtiene todos los elementos para verificar por sí solo la continuidad de la cadena hash.
- El middleware HTTP asigna X-Khora-Correlation-Id, mientras la envoltura de tool calls registra eventos de servicio sin pasar explícitamente el ID de la petición. No se ha demostrado que todos los eventos de frontera y herramienta mantengan una correlación común.
- No se ha validado en producción que todos los dominios relevantes adjunten session_id, attempt_id, causation_id y release_sha de forma consistente.

Estas brechas no implican que todos los eventos sean inútiles; establecen qué pruebas debe superar la observabilidad para ser suficiente para el diagnóstico forense solicitado.

### 7.4 Privacidad

La telemetría de observación de Harmonia prohíbe claves y contenidos identificables como audio crudo, transcripción, tokens, secretos, mensajes y contenido textual; además limita valores de cadenas. Los eventos de dominio tradicionales poseen una ruta de saneamiento distinta y la consulta MCP puede devolver detalle y métricas ya persistidas.

Antes de exponer registros a modelos adicionales, revisar los campos realmente devueltos y añadir pruebas de contrato que impidan la salida de transcript/audio/payloads privados. Los eventos de diagnóstico deben registrar identificadores, transiciones, códigos de error, duraciones y métricas saneadas, no el texto dictado ni audio.

## 8. Instrumentación requerida para el caso de dictado

### 8.1 Ruta de código

La máquina de estados de la interfaz está en [IngresoWorkspace.tsx](https://github.com/SeryMente/khora/blob/main/khora-web/app/components/ingreso/IngresoWorkspace.tsx). El componente de presentación está en [IngresoView.tsx](https://github.com/SeryMente/khora/blob/main/khora-web/app/components/shared/IngresoView.tsx). La persistencia de dictado está en [dictado.ts](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/dictado.ts), la transcripción de audio en [transcribir.ts](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/transcribir.ts), y la retranscripción de una sesión en [transcribirSesion.ts](https://github.com/SeryMente/khora/blob/main/khora-web/lib/server/transcribirSesion.ts).

### 8.2 Eventos que deben poder reconstruirse

La evidencia existente incluye eventos de backend para custodia/registro de partes, fallo de custodia del dictado, fallos de Groq, respuesta vacía, éxito de transcripción, procesamiento incremental y protección frente a pérdida de texto. Los identificadores encontrados incluyen DIC-001, DIC-002, DIC-003, TRS-001, TRS-002 y TRS-003.

Brecha identificada: la interfaz de ingreso no parece persistir eventos suficientemente específicos para reconstruir el ciclo exacto pausa por edición → confirmación/cancelación → reanudación del reconocedor. Los callbacks del reconocedor cambian el estado de UI y reintentan, pero la secuencia no queda documentada íntegramente como traza causal persistente.

El contrato de observabilidad debe permitir, sin guardar transcripción ni audio, reconstruir como mínimo:

- inicio/detención del dictado y modo de entrada;
- comienzo de edición in situ, pausa del reconocedor y detención de grabación;
- confirmación o cancelación de la edición;
- comienzo y resultado de la reanudación;
- inicio, finalización, error o aborto del reconocedor;
- intento de rearme/reintento, instancia obsoleta detectada, reinicio suprimido y número de instancia activa;
- finalización o fallo de subida de audio, transcripción autoritativa, reconciliación y custodia;
- correlación entre evento de UI, sesión de dictado, request de servicio, evento de dominio, dependencia y release.

Los nombres exactos de los eventos y su ubicación final son decisión de implementación pendiente. Los eventos deben usar IDs y métricas saneadas, no texto dictado, y deben sobrevivir al cierre de la página cuando describan trabajo ya enviado al servidor.

## 9. Bug de dictado: definición de trabajo y estatus epistemológico

### 9.1 Lo conocido

El esfuerzo específico busca corregir un bug del proceso de dictado que involucra la edición in situ y la continuidad de la captura/transcripción. El contrato visible actual anuncia que la escucha se reanuda automáticamente al salir de edición cuando el dictado estaba activo; el código pausa el reconocedor durante la edición y lo crea de nuevo al reanudar.

El historial de Notion contiene antecedentes del frente FIX-DICTADO, incluyendo problemas históricos con “recognition: aborted”, timeout y la necesidad de que la transcripción aparezca en vivo. Esos antecedentes son contexto útil, pero no se consideran automáticamente el mismo incidente que el bug actual.

### 9.2 Hipótesis técnica inicial, no causa confirmada

En la implementación estática de IngresoWorkspace.tsx, el callback onend de cada instancia de SpeechRecognition puede programar un rearme si activoRef.current es verdadero. La pausa por edición detiene la instancia anterior y limpia recRef; al reanudar, se activa el flag y se crea un nuevo reconocedor. El callback tardío de la instancia anterior no parece verificar que esa instancia continúe siendo la vigente antes de rearmarse.

Hipótesis: un onend tardío de una instancia vieja podría reactivar el reconocedor anterior después de comenzar una instancia nueva, provocando concurrencia, resultados incoherentes o interrupción de la escucha.

Esta es una hipótesis derivada de lectura estática; no está confirmada por reproducción, logs ni prueba que fuerce la carrera. No cambiar código únicamente sobre esta hipótesis.

### 9.3 Cobertura de pruebas observada

- [edicion_in_situ.test.ts](https://github.com/SeryMente/khora/blob/main/khora-web/tests/unit/edicion_in_situ.test.ts) prueba la decisión confirmar/desactivar y la llamada a reanudar, pero no reproduce el ciclo de vida real de instancias SpeechRecognition concurrentes.
- [dictado-sin-perdida.spec.ts](https://github.com/SeryMente/khora/blob/main/khora-web/e2e/contracts/dictado-sin-perdida.spec.ts) cubre preservación de texto durante dictado normal y detención y la reconciliación de una respuesta autoritativa truncada; no prueba explícitamente editar, confirmar/cancelar y reanudar con un callback tardío del reconocedor anterior.

La cobertura correcta del bug requiere una prueba dirigida que fuerce eventos onend/onerror tardíos de la instancia anterior, confirme identidad de la instancia activa, y compruebe que no se producen dos reconocedores activos ni pérdida/duplicación de texto durante la transición.

### 9.4 Información aún no adjudicada

No está registrada en la especificación inicial una reproducción actual y exacta en producción: secuencia de acciones del operador, síntoma literal, frecuencia, navegador/runtime, hora, ID de sesión y versión desplegada. La tarea no exige al usuario volver a narrar todo: este objeto retiene lo conocido y permite continuar con inspección e instrumentación. Antes de modificar el comportamiento del dictado debe obtenerse una reproducción concreta o evidencia de eventos que identifique cuál de los síntomas históricos corresponde al problema actual. Si se obtiene del operador, registrar sus palabras verbatim en la entrada del ciclo correspondiente.

## 10. Brechas abiertas y plan por fases

| ID | Fase | Condición de salida | Estado inicial |
|---|---|---|---|
| S0 | Canon y continuidad | Objeto creado en el repositorio KHORA, instrucciones verbatim registradas, README de KHORA enlazado y ambos artefactos verificados por read-back | VERIFICADO |
| S1 | Acceso real a MCP | Cliente de trabajo autenticado, llamada real a khora_mcp_health y al menos una herramienta de observabilidad; resultado y herramienta/cliente quedan registrados | PENDIENTE |
| S2 | Portabilidad entre modelos | Un cliente alterno compatible puede abrir/ejecutar el protocolo y consultar eventos sin asumir una plataforma concreta incorrectamente | PENDIENTE |
| S3 | Scopes y mínimo privilegio | Contrato funcional de scopes documentado y probado; errores de insuficiencia de scope claros; no se concede volcados:read sin necesidad | PENDIENTE |
| S4 | Riqueza y causalidad | Se obtienen eventos de sesión y frontera con filtros, cursor, correlación, release y error suficiente; se demuestran integridad y límites | PENDIENTE |
| S5 | Instrumentación de dictado | El ciclo de edición/reanudación y los errores del recognizer se pueden reconstruir mediante una traza saneada | PENDIENTE |
| S6 | Reproducción del bug | Se reproduce el síntoma actual y se identifica causa o conjunto acotado de hipótesis con evidencia | NO INICIADO |
| S7 | Corrección | Parche mínimo más prueba de regresión dirigida a la causa demostrada | NO INICIADO |
| S8 | Verificación de extremo a extremo | Pruebas, build, consulta MCP de evidencia posterior al cambio y read-back de código/versión real | NO INICIADO |
| S9 | Cierre | Evidencia de solución, notas de versión, incidentes cerrados o residuales declarados, estado y siguiente objetivo actualizado | NO INICIADO |

La existencia de herramientas o contratos no satisface S1, S2 ni S4. El endpoint debe ejecutar con credenciales válidas y devolver datos reales del almacén.

## 11. Criterios de aceptación del sprint

El sprint no se cierra hasta demostrar todos los siguientes criterios:

1. Un modelo o agente externo al modelo/plataforma de origen puede conectarse al mismo endpoint MCP por un mecanismo de autenticación soportado, con scopes autorizados y sin workaround informal.
2. El cliente puede ejecutar health y consultar eventos recientes y desde cursor, filtrados por una sesión/esfuerzo de prueba, y recibir evidencia real y paginable del almacén.
3. Las herramientas anuncian esquemas que coinciden con sus validadores; el gate normativo, sus scopes y el comportamiento de errores están documentados y cubiertos por pruebas.
4. Los eventos del esfuerzo concreto son suficientemente ricos para seguir una cadena desde interacción de dictado hasta servicio/transcripción/custodia, incluidos fallos y resultados parciales. La correlación no depende únicamente de inferir por proximidad temporal.
5. Los logs no exponen transcripciones, audio, secretos ni payloads privados innecesarios. Se define el mínimo privilegio de observabilidad.
6. El bug de dictado se reproduce o se diagnostica con evidencia suficiente, se establece causa confirmada o se documenta por qué solo puede concluirse una hipótesis, y el parche cuenta con pruebas de regresión.
7. Se confirma el resultado en la ruta de ejecución pertinente. El test local, el commit o el deployment no sustituyen el read-back de versión y los eventos post-cambio.
8. Toda evidencia negativa y limitación remanente está registrada, y un modelo nuevo puede continuar leyendo únicamente este objeto y sus referencias sin pedir la reconstrucción del historial.

## 12. Documentos Notion relacionados: material histórico, no autoridad superior

- [Capa de Integración · Khora](https://app.notion.com/p/87b5d4a3-b250-83b3-a1f3-81c04ad9860c) — contexto de la capa de integración.
- [Khora · IAR · Planeación provisional consolidada y registro vivo](https://app.notion.com/p/f375d4a3-b250-83aa-818c-0173bcf85e78) — registro de planificación y observabilidad.
- [Observabilidad de Servicios de Cora, contrato de implementación en KHORA](https://github.com/SeryMente/khora/blob/main/khora-web/docs/observability-services.md) — contrato actualmente alojado en el repositorio de código.
- [Handoff FIX-DICTADO de 2026-08-05](https://app.notion.com/p/e3d5d4a3-b250-82d0-96a7-01ed334e76ab) — antecedentes históricos del dictado, no prueba del síntoma actual.

Estas páginas de Notion no sustituyen la comprobación de código, versión y datos actuales. El conector las devolvió como documentos cuyo estado de verificación canónica no se confirmó.

## 13. Incidentes, riesgos y observaciones iniciales

### I-001 · Acceso MCP real aún no demostrado

**Clase:** bloqueo para S1.  
**Evidencia:** la auditoría inicial pudo inspeccionar el repositorio y documentos, pero no ejecutó llamadas autenticadas al MCP de KHORA desde la conversación.  
**Impacto:** no hay evidencia real de que este cliente pueda consultar los eventos de producción.  
**Acción:** comprobar la conectividad y autenticación con una herramienta de observabilidad y registrar respuesta saneada. No guardar tokens.

### I-002 · Scope parcial incompatible con el gate actual

**Clase:** brecha de contrato/experiencia de cliente.  
**Evidencia:** tools de runtime requieren runtime:read y además el gate de ciclo requiere norm:turn y parámetros normativos. La interfaz de tokens manuales permite seleccionar scopes individualmente.  
**Impacto:** un token etiquetado como de lectura de runtime puede no ser suficiente para la operación que el usuario espera.  
**Acción:** prueba negativa con runtime:read únicamente; prueba positiva con la combinación mínima autorizada; aclarar contrato o rediseñar coherentemente. No relajar autorización sin análisis.

### I-003 · Contrato normativo publicado divergente

**Clase:** inconsistencia del esquema MCP.  
**Evidencia:** el contrato canónico de salida en KHORA declara v1.7.6, mientras textos del servidor y normative-check.md aún mencionan v1.7.2. Además, el schema publicado de khora_norm_verify_turn no declara receipt.output como lo requiere el validador de ejecución.  
**Impacto:** clientes MCP pueden construir llamadas a partir de un contrato publicado incompleto o desactualizado y recibir rechazo en el handler.  
**Acción:** sincronizar esquema y validador desde una fuente canónica y comprobar paridad automáticamente. No confundir la versión del servidor MCP 1.3.0 con la versión del contrato de salida.

### I-004 · Correlación de fronteras MCP sin prueba completa

**Clase:** limitación de observabilidad causal.  
**Evidencia:** eventos de servicio del endpoint pueden registrar una correlación generada en el contexto de servicio si no heredan el ID HTTP; no se observó un paso explícito del ID entrante en la envoltura de tool call.  
**Impacto:** reconstrucción causal menos determinista.  
**Acción:** prueba de integración que confirme si request, tool call y dominio comparten correlation_id; corregir si falla.

### I-005 · Carga probatoria insuficiente para el bug de dictado

**Clase:** brecha de instrumentación de UI.  
**Evidencia:** lectura estática de IngresoWorkspace.tsx y tests consultados.  
**Impacto:** no puede afirmarse que el MCP vaya a mostrar cuándo se pausó/reanudó el recognizer o si existieron dos instancias.  
**Acción:** especificar e implementar telemetría saneada y prueba de carrera después de demostrar el acceso S1.

### I-006 · Callback tardío del recognizer, hipótesis

**Clase:** hipótesis técnica.  
**Evidencia:** el callback onend parece basarse en activoRef.current sin comprobar que la instancia que emite el evento sea la actual; la pausa/reanudación sustituye la instancia.  
**Impacto potencial:** rearme de instancia obsoleta y coexistencia de reconocedores.  
**Estado:** NO CONFIRMADO.  
**Acción:** prueba controlada con evento tardío de la instancia previa; no presentar como causa antes de reproducir.

### I-007 · Workflows programados de GitHub en estado failure, sin adjudicar

**Clase:** señal adyacente, fuera de alcance inmediato hasta demostrar relación.  
**Evidencia observada en la lista de ejecuciones del 2026-10-10 sobre el HEAD e2d89db: Sync Todoist and Notion, Board Orchestrator, Khora API Healthcheck y Jules Auto-Respond Cron reportaban conclusión failure en ejecuciones programadas recientes.  
**Impacto:** desconocido. No se leyó aquí el detalle completo de sus logs; no se afirma que causen el problema MCP ni el bug de dictado.  
**Acción:** investigar sus logs solo si el healthcheck o la evidencia de acceso MCP indican una relación material, o si se amplía el alcance.

## 14. Protocolo de ejecución para todo modelo/plataforma

Al retomar el sprint, ejecutar esta secuencia conceptual y registrar las evidencias disponibles:

1. Leer este documento completo y sus secciones finales de crónica/estado.
2. Verificar el HEAD actual de los repositorios de Metodología y KHORA y releer los archivos que sustentan la siguiente acción; no asumir que los SHA de apertura continúan vigentes.
3. Verificar si ya existe una conexión MCP autorizada en la plataforma actual. Si existe, usar el cliente MCP real; si no existe, registrar la limitación exacta y proceder con inspección/documentación solo cuando sea útil. No fingir acceso.
4. Si hay acceso: consultar health, abrir el ciclo normativo requerido por el server, recuperar eventos con los mínimos scopes, identificar ventana/sesión/IDs, paginar hasta cubrir evidencia pertinente y guardar los resultados saneados y referencias de eventos en esta crónica.
5. Comprobar que la riqueza del registro alcanza los criterios de aceptación antes de tocar el bug.
6. Instrumentar, reproducir, formular diagnóstico y corregir en ese orden. Si la reproducción revela un problema distinto de la hipótesis actual, actualizar el diagnóstico y conservar la hipótesis anterior como descartada o no confirmada.
7. Tras cada cambio: inspeccionar diff, ejecutar las pruebas pertinentes, registrar resultados, publicar y verificar read-back cuando la autorización y el alcance lo permitan. Nunca afirmar “producción verificada” si solo se verificó localmente.
8. Actualizar el resumen de estado y añadir la nueva entrada de crónica en este documento antes de finalizar el ciclo.

## 15. Plantilla obligatoria para nuevas entradas de crónica

Copiar esta estructura al final en cada ciclo y rellenar los campos con evidencia concreta:

### MCP-OBS-DICTADO/CNNN · AAAA-MM-DD · Título del ciclo

**Propósito del ciclo:**  
**Instrucciones verbatim recibidas en este ciclo:**  
**Plataforma/modelo y capacidades MCP disponibles (si se conocen):**  
**HEAD inicial Metodología / SHA relevante:**  
**HEAD inicial KHORA / SHA relevantes:**  
**Estado heredado del objeto:**  
**Acciones ejecutadas:**  
**Avances verificados:**  
**Cambios de archivos/commits/diff:**  
**Pruebas ejecutadas y resultado literal:**  
**Llamadas MCP reales, herramienta, filtros/cursor y resultado saneado:**  
**Incidentes/resultados negativos:**  
**Hechos confirmados:**  
**Hipótesis y supuestos:**  
**Decisiones tomadas y motivo:**  
**Decisiones pendientes/bloqueos:**  
**Estado final por fase S0–S9:**  
**Siguiente acción concreta:**  
**Actualización del resumen superior realizada:** sí/no.

Cada ciclo puede incluir varias entradas de evidencia, pero no debe omitir ninguna de estas categorías. Si una categoría no aplica, escribir “No aplica en este ciclo” con el motivo; no dejar que la ausencia de contenido se interprete como ejecución satisfactoria.

## 16. Crónica del sprint

### MCP-OBS-DICTADO/C001 · 2026-10-10 · Auditoría documental inicial del MCP y análisis preliminar del dictado

**Propósito:** inspeccionar la especificación del MCP de KHORA en GitHub y Notion, con énfasis en determinar si su observabilidad sirve para diagnosticar un bug del dictado.

**Fuentes consultadas:** árbol y HEAD de SeryMente/khora; route.ts; módulo de observabilidad MCP; contratos de observación; contratos de observabilidad de servicios; autenticación OAuth y token manual; middleware; pruebas unitarias de scopes, observabilidad y edición in situ; componentes de ingreso y transcripción; búsqueda de documentos Notion relativos al MCP, la capa de integración, los eventos y FIX-DICTADO.

**Avances verificados:**
- Se identificaron las 15 herramientas publicadas en el código y la diferencia entre lectura de eventos y lectura de volcados.
- Se identificaron los scopes runtime:read, volcados:read y norm:turn, además del gate que exige un turno normativo en herramientas sustantivas.
- Se confirmó estáticamente que el registro events_sistema/eventos_sistema y khora_runtime_state están diseñados para consulta MCP y que existen eventos de backend para dictado y transcripción.
- Se identificaron un desajuste de versión del contrato normativo y una diferencia entre el schema publicado de khora_norm_verify_turn y el validador de ejecución.
- Se determinó que Notion aporta antecedentes e integración, pero no se localizó una página única suficientemente completa y versionada que sea la especificación del servidor MCP actual.
- Se identificó una brecha de instrumentación para la transición pausa de edición/confirmación/reanudación del reconocedor.

**Hipótesis registrada:** posible rearme de una instancia SpeechRecognition antigua por callback onend tardío después de reanudar el dictado. No se reprodujo ni confirmó.

**Incidentes/limitaciones:** no se realizaron llamadas MCP autenticadas desde la conversación; no se leyeron registros de producción; no se ejecutó suite de pruebas ni se reprodujo el bug. Ninguna de estas acciones puede declararse completada.

**Resultado:** auditoría estática concluida como línea base documental; acceso runtime, portabilidad entre modelos, riqueza causal y corrección del bug continúan pendientes.

### MCP-OBS-DICTADO/C002 · 2026-10-10 · Corrección de ubicación del objeto y verificación inicial

**Propósito:** crear una fuente de continuidad portable, conservar literalmente las instrucciones del usuario y establecer el protocolo obligatorio de documentación por ciclo.

**Acciones ejecutadas inicialmente:** el primer intento publicó el objeto en SeryMente/metodologia y modificó sus índices. Tras la corrección expresa del usuario —«El objeto canónico es para Cora, no para metodología.»— esa ubicación se reconoce como incorrecta para el sprint. Se decide mantener el objeto canónico en SeryMente/khora y revertir únicamente las modificaciones introducidas por este esfuerzo en Metodología. La instrucción correctiva forma parte de la crónica y no se elimina.

**Revisión normativa:** la cabecera del SI se verificó en el snapshot estable H1=H2, con versión v1.6.21 — Ordenamiento por Preponderancia y Categorías, blob SHA 151333921ca3214c0adee3996cc80d5f23adb2d5. La revisión no implica una actualización del SI.

**Publicación en KHORA verificada:** objeto creado en `docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md`, commit `a221c540c928e8d0ca3a770566c22d413bba1c6b`; read-back del objeto con blob SHA `5413cb303b2f8a7008c9772f6780e6a08fff6b27`, 42.267 caracteres/421 líneas. El índice en `README.md` se publicó en commit `4e91294d09067379a4dfbfa73562498aa15c04d9`; blob SHA posterior de README `64a990f6bbcf030239c39b9c6ac8337cf327c9ca`. El índice y el objeto se relevaron desde `main` y se confirmó que el enlace relativo apunta a la ruta creada.

**Corrección de ubicación completada y verificada por read-back:** la primera publicación en `SeryMente/metodologia` fue una ubicación incorrecta. El objeto canónico operativo reside exclusivamente en `SeryMente/khora/docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md`, enlazado desde el README de KHORA. Se retiró el duplicado de Metodología en commit `e32c499e698204a9ebf25af08cd30c54c5c8a1f2`; los cambios compensatorios fueron `d185f5cb19b5b6f984e41dbec419cae571cbe8fb` (METODOLOGIA.md), `50f643aa023bbcd6f74b2455e95a64f752adeaf6` (BOOTSTRAP-CONTEXTO-GLOBAL.md) y `0d2066f22e02821aa585cd5fdae38f1877d5f559` (README.md). El read-back confirmó que los tres archivos de Metodología volvieron exactamente a sus blobs originales de apertura: `e0dc6157d2bc95bca8dff5fde354d601b163a814`, `785e4034bb6eecc01521e573e3c3c16259944057` y `7ba4ddba0bd6728c36c4e9245895c9f73867a55e`. No se reescribió el historial remoto.

### MCP-OBS-DICTADO/C003 · 2026-10-10 · Instrumentación persistente de checkpoints de dictado

**Propósito:** instrumentar exclusivamente el dictado por GitHub, con checkpoints en las transiciones diagnósticas, persistencia central e integridad de los eventos.

**Instrucción verbatim:**

> Trabaja exclusivamente en la observavilidad de khora
> 
> 1. El sistema debe de guardar en persistencia,  quiza vercel blob,  no estoy sguro,   todo el registro de eventos..  Se consideran datos de usuario.
> 2. Lo debe de persistir,  con la frecuencia neesaria.&#x20;
> 3. Ademas de otros metodos,  ya que no se restringe a esto, checkpoints por proceso se establecen,  en  este momento necesito que veriques de extremo a extremo el proceso dedl dictado, y encuentres checkpoints adecuados,  cuando se inicia el dictado,  cuando se detiene pr edicion ipso facto,  es decir mapea todos lo0s puntoss en los que es posible que ocurra algo que pueda servir observar tanto para el desarrollo y mejroa contina, como para diagnostico de bugs.&#x20;
> 4. Asegurte que los checkpoints desencadenan un envio actualizado del registo de eventos debidamente estriucturado y hecho para que se tenga claridad sobre lo ocurrido.&#x20;
> 5. Por ahjora enfocate nada mas en el proceso de dictado para los checkpoitns.&#x20;
> 6. Trabaja de manera que todo lo que te digo en  est entrdada se cumpla cabalmente.
> 7. No te detengas hjasta terminar. Por nada del mundo.
> 8. Imponte  unmaximo grado  de rigurosa implacable calidad en la atencion al detalle y la calidad
> 9. Trabaja con  github nada mas,  sinrdc.
> 10. Si no has resuelto todo esto en  un solo cilo habras fallado en la ejecucion.&#x20;
> 11. Vuelvo en unas hjoras.&#x20;
> 
> COMIENZA YA

**Interpretación operativa:** instrumentar Micrófono/Web Speech y Chrome Live Caption; marcar eventos como datos de usuario; mantener los registros completos en el sistema de eventos persistentes; enviar los eventos en cada checkpoint; no incluir texto, audio, URL privada ni secretos en la telemetría; no corregir todavía la causa del bug de dictado.

**Línea base:** HEAD main `35d00868758ff5d481983ed2415a8cff71011cc1`. Component `IngresoWorkspace.tsx` blob `eed47f0c7705f2c472d8b87c8c286e060d2a132e`; server `lib/server/eventos.ts` blob `48e59087a125c7155374bfacc64ff860ba2b1bd8`; contract `lib/contracts/observation.ts` blob `e468ef66b1e90914a9e6b5c656ca4ae0a9b7451d`; ingest route `app/api/eventos/route.ts` blob `45329eafb9238c4fb85d294b83426bf0f1790f4f`.

**Persistencia elegida:** se reutiliza POST /api/eventos → registrarEventosBatch → eventos_sistema, con deduplicación por UUID/idempotencia, cadena hash y outbox. No se añade una copia paralela a Vercel Blob: los eventos requieren consulta estructurada y ya hay un almacén canónico. El texto del checkpoint sigue cifrado y separado; la telemetría nunca guarda el texto literal.

**Checkpoints instrumentados:**

| Etapa | Eventos / propósito |
| --- | --- |
| Montaje y recuperación | WORKSPACE_READY, CHECKPOINT_RECUPERADO, ERROR_RECUPERACION_CHECKPOINT y RECUPERACION_OMITIDA_POR_SESION_ACTIVA; estado de recuperación/capacidad sin contenido verbal. |
| Inicio ASR | DICTADO_INICIO_SOLICITADO/ACEPTADO/FALLIDO, CAPACIDAD_RECONOCIMIENTO_AUSENTE, RECONOCEDOR_CONSTRUIDO/INICIADO/START_FALLIDO. Separa solicitud, construcción y start. |
| Micrófono / MediaRecorder | SOLICITUD_MICROFONO, MICROFONO_PERMITIDO, ERROR_INICIO_GRABACION, GRABACION_INICIADA/DETENIDA, ERROR_GRABADORA, FRAGMENTOS_RECIBIDOS, GRABACION_PARO_SOLICITADO/FALLIDO. Mide tiempos, bytes y fragmentos. |
| Resultados de voz | RESULTADO_FINAL_RECIBIDO y RESULTADO_PARCIAL_RECIBIDO; registra longitud/segmentos, no frases. Los parciales se limitan por frecuencia. |
| Errores y rearme | ERROR_RECONOCEDOR, EVENTO_FIN_RECONOCEDOR, RECONEXION_PROGRAMADA/INICIADA/FALLIDA/REINTENTADA y RECONOCIMIENTO_NO_REANUDABLE. |
| Hipótesis de instancia antigua | REARME_INSTANCIA_ANTERIOR compara la instancia del callback con recRef.current. Es señal diagnóstica; no confirma ni corrige la hipótesis I-006. |
| Checkpoint | CHECKPOINT_INICIADO/PERSISTIDO/FALLIDO con carácter-count, duración, modo forzado y resultado HTTP; el texto original no viaja en telemetría. |
| Edición in situ | EDICION_IN_SITU_INICIADA, DICTADO_PAUSA_POR_EDICION, DICTADO_PAUSADO_POR_EDICION, fallo de parada y contadores de longitud. Registra el paro inmediato en el primer cambio del editor. |
| Confirmación/cancelación y reanudación | EDICION_IN_SITU_CIERRE_INICIADO/CONFIRMADA/CANCELADA/CIERRE_FALLIDO y REANUDACION_POR_EDICION_SOLICITADA/COMPLETADA/FALLIDA. Captura espera de finalización/subida y vuelta al recognizer. |
| Chrome Live Caption | CAPTURA_CHROME_PREPARADA, COMANDO_CHROME_ENVIADO, BRIDGE_CHROME_ESTADO, CAPTURA_CHROME_ESTADO/FALLIDA, SEGMENTO_CHROME_RECIBIDO, PARTE_CHROME_INVALIDA/VERIFICADA, CAPTURA_CHROME_DETENIDA/PARO_FALLIDO y PARADA_CHROME_ACK_TIMEOUT. |
| Upload/transcripción | PARTE_AUDIO_SUBIDA_INICIADA/PERSISTIDA/FALLIDA y TRANSCRIPCION_AUTORITATIVA_INICIADA/OMITIDA/COMPLETADA/FALLIDA. Sin URL ni bytes de audio en payload. |
| Cierre/guardado/limpieza | DICTADO_DETENCION_SOLICITADA/DETENIDO, GUARDADO_DICTADO_INICIADO/COMPLETADO/FALLIDO, AUTOBLOQUEO_CHECKPOINT_INICIADO/COMPLETADO y CAPTURA_LIMPIADA. |

**Contrato de evento:** OBS-1 con UUID, fase dictado, componente ingreso_workspace, correlación por sesión, causation_id, intento, secuencia, tiempo de cliente, duración, severity/outcome, reason_code, métricas escalares autorizadas y privacy_class USER_DATA. Las cadenas y claves no autorizadas se descartan en el cliente. El servidor traduce PENDING a START, SKIPPED a SKIP, PARTIAL a INFO y los fallos a FAIL; sequence=1000 produce DIC-001, nunca DIC-000.

**Envío y confirmación:** se encola en sessionStorage con respaldo en memoria y se programa POST en 100 ms; hitos críticos también fuerzan envío y se reintenta en online, pagehide, cambio de visibilidad y checkpoints siguientes. Un lote se retira solamente con acuse donde accepted + duplicates igual al número enviado y rejected=0. La deduplicación reutiliza UUID y clave idempotente. La persistencia central se considera acreditada solo tras acuse del endpoint.

**Límites y no-resultados:** no se añade Blob paralelo; no se modificó intencionalmente la lógica funcional de reconexión para no anticipar el diagnóstico. La hipótesis I-006 permanece NO CONFIRMADA. El HEAD inicial presentaba workflows fallidos; los logs disponibles devolvieron 404 y no se adjudica su causa. No se ejecutó MCP autenticado, ni pruebas de runtime ni validación de producción en este punto.

**Siguiente actualización obligatoria:** C004 deberá añadir el SHA del commit publicado, read-back de cada fichero y resultados reales de GitHub Actions. Hasta que los checks se ejecuten, S2 permanece IMPLEMENTADO/PENDIENTE DE VERIFICACIÓN.

## 17. Estado operativo vigente y siguiente acción

**Estado general:** ABIERTO · IMPLEMENTACIÓN DE OBSERVABILIDAD DEL DICTADO EN VALIDACIÓN.  
**S0:** VERIFICADO. Objeto canónico en KHORA y entrada en README comprobados por read-back.  
**S1:** acceso MCP autenticado y consulta de registros reales siguen pendientes.  
**S2:** instrumentación del dictado, contrato USER_DATA, cola de envío con reintento y pruebas unitarias/E2E están publicadas y leídas de vuelta. Los reintentos más recientes de CI/UI Quality siguen fallando antes de iniciar pasos (runner_id=0); CI, persistencia real y producción permanecen PENDIENTES DE VERIFICACIÓN.  
**El bug de dictado no está diagnosticado ni corregido en este sprint.**  
**No se ha probado una conexión MCP autenticada ni runtime de producción en este ciclo.**  
**No se afirma despliegue ni verificación de producción.**

La siguiente acción es recuperar GitHub Actions y ejecutar CI/UI Quality; sus jobs actuales no asignan runner y no permiten conocer el resultado de las pruebas. Después se debe verificar la ingestión en un entorno autorizado, recuperar eventos por MCP y solo entonces diagnosticar/corregir el bug. La instrumentación registra callbacks tardíos sin dar por probada la causa.

## 18. Referencias canónicas

- [SI-METACOGNITIVO.md](https://github.com/SeryMente/metodologia/blob/main/SI-METACOGNITIVO.md)
- [METODOLOGIA.md](https://github.com/SeryMente/metodologia/blob/main/METODOLOGIA.md)
- [BOOTSTRAP-CONTEXTO-GLOBAL.md](https://github.com/SeryMente/metodologia/blob/main/BOOTSTRAP-CONTEXTO-GLOBAL.md)
- [ANEXO-ENTORNO-PERSISTENTE-HIBRIDO-EP-WP-LAB.md](https://github.com/SeryMente/metodologia/blob/main/ANEXO-ENTORNO-PERSISTENTE-HIBRIDO-EP-WP-LAB.md)
- [Repositorio canónico del proyecto KHORA](https://github.com/SeryMente/khora)
- [Objeto del sprint dentro del repositorio KHORA](https://github.com/SeryMente/khora/blob/main/docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md)
- [MCP endpoint implementation](https://github.com/SeryMente/khora/blob/main/khora-web/app/api/mcp/route.ts)
- [Observability services contract](https://github.com/SeryMente/khora/blob/main/khora-web/docs/observability-services.md)

El objeto se conserva como texto canónico portable. Para cualquier afirmación dinámica —acceso real, estado de producción, contenido actual de eventos, resultado de un test o versión desplegada— se debe obtener evidencia nueva del recurso correspondiente y registrar el resultado en esta crónica.


## 19. Invariantes del colector

- Todos los eventos del flujo se clasifican USER_DATA; el sobre observacional admite únicamente valores escalares permitidos y no transporta texto dictado, audio, URL privada ni tokens.
- El identificador causal apunta al evento más reciente de la misma sesión. La secuencia es ascendente por sesión.
- Una respuesta HTTP 200 que contenga rechazos no confirma persistencia de todo el lote. Cualquier rechazo, resumen incompleto o error conserva la cola.
- Los parciales de reconocimiento se muestrean como máximo cada cinco segundos y las señales de fragmentos se emiten cada diez chunks; los hitos, errores, uploads, checkpoints y transiciones de edición se registran individualmente.
- Vercel Blob no se añade como copia paralela sin una necesidad específica: eventos_sistema/outbox es la fuente estructurada existente, y el texto se conserva en su ruta cifrada separada.
- Los callbacks tardíos se observan sin alterar su comportamiento funcional hasta que una reproducción determine la causa.


### MCP-OBS-DICTADO/C004 · 2026-10-10 · Read-back, endurecimiento de entrega y límites de CI

**Instrucción nueva recibida verbatim:** “Continua”.

**Línea base de continuidad:** KHORA main en el commit bb406c61e4456ea8e7d40fbeaab343ab1f39c8a2, cuyo mensaje es “test(observability): cover inline dictation checkpoint lifecycle”. Se mantuvo el ámbito exclusivamente en la observabilidad del dictado y se trabajó únicamente con GitHub; no se utilizó RDC, no se consultó Vercel como evidencia de publicación y no se alteró deliberadamente la conducta funcional del reconocedor obsoleto.

**Auditoría estática de la instrumentación leída desde main:** el componente Ingreso contiene 68 puntos literales de registro y 61 nombres de evento distintos. Se compararon las claves de métricas presentes en sus objetos de evento con la lista ALLOWED_METRICS del colector: no quedó ninguna clave utilizada fuera de la lista. Ningún nombre de evento literal inspeccionado coincide con los patrones de fuga prohibidos por el colector. Los eventos transmiten longitudes, estados, contadores, tiempos, bytes y reason codes normalizados, no fragmentos de texto ni audio.

**Contrato de persistencia trazado desde el código:** el cliente envía lotes a POST /api/eventos con cookies same-origin. La ruta exige sesión autenticada salvo la excepción interna de pruebas, comprueba el estado del almacén y llama a registrarEventosBatch. El servidor valida el envelope con validateObservationPrivacy, traduce la fase y el estado, conserva fase/severidad/outcome/metrics en el detalle, asigna UUID e idempotencia y escribe en eventos_sistema con la tabla outbox existente. La migración 021 establece privacy_class como TEXT con default SYSTEM_AUDIT, sin un enum que bloquee USER_DATA. El colector considera el lote entregado solo si accepted + duplicates es igual al tamaño del lote y rejected es cero.

**Corrección de robustez adicional:** se añadió reintento automático con backoff exponencial acotado cuando ocurre error HTTP/red, el servidor informa rechazos o quedan eventos tras las rondas máximas de drenaje. El evento conserva UUID y clave idempotente durante el reintento; la cola queda pendiente hasta el acuse completo. La tipificación del timer se ajustó a ReturnType<typeof window.setTimeout> para alinear el tipo del temporizador con la API del navegador y evitar diferencias de ReturnType entre DOM y Node.

**Pruebas escritas para el ciclo:**
- Pruebas unitarias de clase USER_DATA, saneamiento de transcript/unapproved metric, confirmación de lotes, recuperación tras error HTTP, conservación ante rechazo explícito y reintento con UUID estable.
- Pruebas duraderas de ingesta USER_DATA, conservación de severity/phase/outcome, mapeo de FAILURE a FAIL, PENDING a START y SKIPPED a SKIP, además de la secuencia que excede 999.
- Prueba E2E de navegador con un reconocedor simulado: inicio, foco/edición inmediata, pausa, confirmación, reanudación y evento de callback onend tardío de una instancia anterior; también comprueba que el texto simulado y el editado no se filtren a la telemetría. Sus endpoints de eventos/checkpoint están interceptados, por lo que la prueba verifica el flujo cliente, no una escritura real en Postgres.
- Las pruebas se han añadido y se han leído de vuelta desde GitHub, pero no se afirma que hayan sido ejecutadas correctamente.

**GitHub Actions — evidencia y limitación:** el commit de instrumentación y la prueba E2E es bb406c61e4456ea8e7d40fbeaab343ab1f39c8a2. El run CI 38071515684, intento 2, quedó en failure; sus jobs 114269824344 (khora-web-gate), 114269824577 (api-tests) y 114269824693 (calidad) terminaron con runner_id=0 y cero pasos. UI Quality run 38071515845, intento 2, quedó en failure; jobs 114269830277 (UI E2E) y 114269830488 (UI Contract) también terminaron con runner_id=0 y cero pasos. El deploy run 38071515779 y el job 114269705877 concluyeron de igual modo, antes de ejecutar pasos. Los intentos previos de obtener logs devolvieron HTTP 404 de los blobs de logs. Estos resultados acreditan que los workflows no ejecutaron sus pasos; no acreditan un fallo de compilación o de pruebas introducido por este cambio, ni permiten atribuir la causa subyacente.

**Contrato diferente revisado:** ObservationBatchSchema usa otro formato de ingesta para el origen harmonia-extension y exige ANONYMIZED_TELEMETRY. El flujo instrumentado aquí se envía directamente al endpoint POST /api/eventos en formato ObservationEnvelope OBS-1, que sí declara USER_DATA. No se modificó ObservationBatchSchema para no mezclar ambos contratos ni desviar esta tarea de la persistencia duradera del dictado.

**Resultados no verificados y pendientes:** no hay conexión MCP autenticada demostrada en este ciclo, ni consulta de eventos reales de producción, ni reproducción con micrófono real, ni test ejecutado por runner, ni prueba de una inserción real a Postgres. El bug funcional del dictado continúa NO CONFIRMADO y NO CORREGIDO; REARME_INSTANCIA_ANTERIOR es una señal diagnóstica instrumentada y la prueba E2E simula ese evento. No se declara despliegue ni disponibilidad en producción.

**Read-back de la base de código desde main en el commit bb406c61e4456ea8e7d40fbeaab343ab1f39c8a2:**

- khora-web/app/components/ingreso/IngresoWorkspace.tsx: blob 9eb3d878504322f07db8607b5cfe7f8f548b8cc6; 68862 caracteres, 1449 líneas.
- khora-web/lib/contracts/observation.ts: blob 7f6b0d606af00acc80f3845eaf73fa1b773382cb; 3781 caracteres, 103 líneas.
- khora-web/lib/server/eventos.ts: blob 48f81945bebf4728fbdcfcdddebbccc93293029c; 20217 caracteres, 660 líneas.
- khora-web/tests/unit/dictado_observability.test.ts: blob 5501f55e07c8a9fa550fa31e0016458084539d12; 7914 caracteres, 188 líneas.
- khora-web/tests/unit/eventos_durables.test.ts: blob fd73a1d0194f53ff51a73ee3f7e83d38bbb48342; 13781 caracteres, 403 líneas.
- khora-web/e2e/contracts/dictado-observability-checkpoints.spec.ts: blob a84b6e5c977bf595765a0bfa38a070966d7f4abc; 4949 caracteres, 134 líneas.

**Estado del ciclo:** implementación y pruebas escritas publicadas; revisión estática y read-back completados; CI, persistencia real y producción pendientes de verificación. El próximo paso técnico es recuperar la ejecución de GitHub Actions para que CI/UI Quality asignen runners, ejecuten las suites y expongan logs. Después se debe comprobar la ingestión durable en un entorno autorizado y consultar esos eventos a través del MCP real antes de abordar la corrección funcional del dictado.



## Addendum de verificación final de C004 · 2026-10-10

La lectura de vuelta tras el commit C004 confirma que la corrección de tipo de timer también quedó publicada. En este punto el HEAD de main fue 3b1b27cf0ac4e6c308475f500cee75b6028bffe8 (docs(observability): record readback and CI execution limits); el único código respecto del HEAD previo cambia el tipo de retorno de los timers del colector a ReturnType<typeof window.setTimeout>. La auditoría de métricas continuó sin claves utilizadas fuera de ALLOWED_METRICS: 68 puntos literales, 61 nombres de evento distintos y cero nombres de evento que coincidan con los patrones de fuga probados.

**Read-back exacto de main al HEAD 3b1b27cf0ac4e6c308475f500cee75b6028bffe8:**
- khora-web/lib/client/dictado-observability.ts — blob 96ad3e77cd03ffd8ecfb490358d4ab1b6289939d; 10,694 caracteres / 263 líneas.
- khora-web/tests/unit/dictado_observability.test.ts — blob 5501f55e07c8a9fa550fa31e0016458084539d12; 7,914 caracteres / 188 líneas.
- khora-web/app/components/ingreso/IngresoWorkspace.tsx — blob 9eb3d878504322f07db8607b5cfe7f8f548b8cc6; 68,862 caracteres / 1,449 líneas.
- khora-web/lib/contracts/observation.ts — blob 7f6b0d606af00acc80f3845eaf73fa1b773382cb; 3,781 caracteres / 103 líneas.
- khora-web/lib/server/eventos.ts — blob 48f81945bebf4728fbdcfcdddebbccc93293029c; 20,217 caracteres / 660 líneas.
- khora-web/tests/unit/eventos_durables.test.ts — blob fd73a1d0194f53ff51a73ee3f7e83d38bbb48342; 13,781 caracteres / 403 líneas.
- khora-web/e2e/contracts/dictado-observability-checkpoints.spec.ts — blob a84b6e5c977bf595765a0bfa38a070966d7f4abc; 4,949 caracteres / 134 líneas.
- docs/SPRINT-MCP-OBSERVABILIDAD-DICTADO.md (antes de este addendum) — blob 132acbed4cc956a6a81ed92cc38a5b9682ea54c6; 58,109 caracteres / 526 líneas.
- Versión de paquete observada en khora-web/package.json: 0.3.8; no se incrementó el release del producto porque el build, las pruebas y el despliegue no pudieron verificarse.

**Nueva evidencia de workflows para el HEAD 3b1b27cf0ac4e6c308475f500cee75b6028bffe8:**
- CI: run 38076870773, intento 2, failure. Los jobs 114285689046 (khora-web-gate), 114285689218 (calidad) y 114285689298 (api-tests) terminaron entre 18:43:09Z y 18:43:11Z, cada uno con runner_id=0 y cero pasos.
- UI Quality: run 38076870781, intento 2, failure. Los jobs 114285699743 (UI E2E) y 114285699909 (UI Contract) terminaron entre 18:43:12Z y 18:43:14Z, también con runner_id=0 y cero pasos.
- Se volvió a solicitar el reintento de ambos workflows; ambos quedaron en el mismo resultado. La descarga de logs del job 114285689046 volvió a devolver HTTP 404 BlobNotFound, por lo que no hay mensaje remoto que identifique la causa del rechazo al asignar runner.
- Deploy to Production (Vercel), run 38076870776, falló igualmente sin runner/pasos. No se afirma despliegue en producción.

El fallo de infraestructura de ejecución sigue siendo un impedimento objetivo para cerrar verificación automatizada. No se cambia código de workflows ni permisos del repositorio como parte de esta tarea de observabilidad. La implementación está publicada y leída de vuelta; las pruebas están definidas pero no ejecutadas por CI, y el acceso MCP/persistencia real permanecen pendientes.



### Addendum de cierre de cobertura E2E — base 63c08bff331456bc8834994f62e8ac899f073061

Se amplió la prueba E2E para cubrir también la parada normal después del ciclo edición/reanudación. Ahora la prueba espera DICTADO_DETENCION_SOLICITADA y DICTADO_DETENIDO con el selector estable ingreso.btn-detener, además de verificar inicio, pausa por edición, confirmación, reanudación, callback de la instancia antigua y ausencia del texto en la telemetría. El test sigue aislado mediante interceptación de POST /api/eventos y /api/dictado/checkpoint; no representa una prueba de persistencia contra la base real y aún no ha sido ejecutado por un runner.

Blob de la E2E ampliada: 143af621028ce1e775ecd5b35d8c17654e603ecf.



### Addendum CI — integración explícita de la E2E de dictado — base 4103f31be53a47233cb60c0b7f4024a3691974b8

La inspección de .github/workflows/ui-quality.yml mostró que el job UI E2E invocaba Playwright con una lista explícita de solo dos specs, de modo que la nueva prueba e2e/contracts/dictado-observability-checkpoints.spec.ts no se ejecutaría en CI aun estando dentro de testDir/testMatch. Se actualizó el comando de ese job para incluir el spec de observabilidad del dictado. El runner unitario scripts/run_unit_tests.mjs sí descubre automáticamente todos los archivos tests/unit/*.test.ts, por lo que las cuatro pruebas nuevas del colector entran en el conjunto unitario.

La revisión de workflows después del cambio continúa bloqueada por el problema preexistente de asignación: runs concluyen como failure en dos segundos, runner_id=0 y cero pasos. La E2E ya está conectada al workflow, pero no se afirma que haya sido ejecutada.



### Ajuste final de selector E2E — base e5ef3ba910642a0e5851f53fc99b1bd2ba5c6d93

Se reemplazó la aserción inicial genérica sobre h1 por la disponibilidad del control estable ingreso.btn-iniciar, evitando dependencia del número de encabezados de la página. La E2E sigue incluyendo la parada normal después de validar la secuencia de pausa/reanudación.

Blob actualizado de la E2E: 745441c25acc95c0c9c88ca68c4af0b80ab62c50.



### Punto de control final de publicación — base 9788a0dd9211917a40ff617ed3caad0b92d7ddeb

La publicación final de código revisada desde main es 9788a0dd9211917a40ff617ed3caad0b92d7ddeb, mensaje “test(observability): stabilize dictation E2E entry selector”. La E2E de checkpoints es el blob 745441c25acc95c0c9c88ca68c4af0b80ab62c50; el workflow UI Quality que ahora la invoca es el blob 8a8d1cb0746d311894369d2a9c17778b8b1d3ffd. La suite unitaria se descubrió por inspección de run_unit_tests.mjs: recoge todos los archivos .test.ts del directorio tests/unit.

Los nuevos workflows lanzados para ese commit no llegaron a ejecutar pasos:
- CI run 38077145933: failure; 114286388455 (khora-web-gate), 114286388634 (calidad) y 114286388647 (api-tests), todos runner_id=0 y cero pasos.
- UI Quality run 38077145921: failure; 114286388702 (UI E2E) y 114286388900 (UI Contract), runner_id=0 y cero pasos.
- Deploy to Production run 38077145918: failure; 114286388671 (deploy-and-notify), runner_id=0 y cero pasos.

Este resultado confirma un bloqueo de ejecución de GitHub Actions, no la salida de una compilación, pruebas o despliegue. No hay evidencia suficiente para afirmar que la aplicación se haya desplegado o que la persistencia se haya probado contra Postgres en ejecución.

Estado del producto leído en package.json: khora-web 0.3.8. El nombre de la actualización de código documentada para este ciclo es Observabilidad end-to-end del dictado / C004. El objeto del sprint conserva su versión propia v0.1.0 — Contexto Portátil de Observabilidad MCP y Dictado.


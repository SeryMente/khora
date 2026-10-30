# Acceso de observabilidad MCP de KHORA desde ChatGPT Free mediante RDC

**Identificador del entregable:** MCP-OBS-DICTADO-FREE-BRIDGE  
**Frente propietario:** Dictado de voz / MCP-OBS-DICTADO  
**Fecha de especificación:** 2026-10-29  
**Estado:** especificación de construcción para el modelo constructor; implementación y aceptación pendientes.  
**Prioridad:** desbloqueante para el diagnóstico del dictado.  
**Ámbito:** observabilidad de KHORA. No pertenece al frente Custodia.

---

## 1. Decisión ejecutiva

El requisito operativo es conservar **ChatGPT Free** como plataforma de trabajo y permitir que el modelo de esta conversación consulte, con autenticación real, los registros de observabilidad del servidor MCP de KHORA.

ChatGPT Free no admite una conexión directa del usuario a un servidor MCP personalizado desde la configuración de ChatGPT. No se debe basar esta solución en el modo desarrollador, una conexión MCP nativa, la API de OpenAI ni una actualización de plan.

La alternativa aprobada para construcción es un **cliente/puente local de lectura**, ejecutado en PC-8 y accionado desde la conversación mediante el canal ya disponible de Remote Desktop Commander (RDC):

**ChatGPT Free → herramienta RDC de esta conversación → PC-8 → cliente local KHORA MCP → HTTPS → KHORA MCP productivo.**

El puente no es un conector MCP nativo instalado dentro de ChatGPT Free. Es un cliente MCP independiente que el asistente acciona mediante RDC. La distinción debe permanecer visible en la documentación, registros y recibos.

El cliente local se conectará al endpoint productivo existente por HTTPS. No se debe abrir un puerto entrante en PC-8, publicar el puente en Internet, crear un túnel público ni crear un segundo servidor MCP. El puente debe iniciar conexiones salientes hacia KHORA y responder a comandos acotados ejecutados mediante RDC.

El objetivo funcional inmediato no es leer el corpus de dictados ni descargar audios. Es obtener eventos de runtime y del flujo de dictado con suficiente granularidad para reconstruir una secuencia causal y diagnosticar el incidente. Se aplicará el principio de mínimo privilegio: acceso inicial a observabilidad, sin conceder lectura de volcados, transcripciones ni audio.

## 2. Alcance y límites

### Incluido

1. Ejecutar desde la conversación Free operaciones de lectura MCP de KHORA mediante comandos seguros de RDC.
2. Autenticar el cliente local con una credencial de KHORA que esté vinculada al propietario, al recurso canónico, a permisos explícitos, a vencimiento y a revocación.
3. Descubrir las herramientas y esquemas MCP reales desde el endpoint, sin mantener una copia manual que pueda quedar desactualizada.
4. Consultar el estado semántico del runtime, eventos recientes y eventos posteriores a un cursor.
5. Filtrar por sesión, componente, fase, severidad, resultado y demás campos efectivamente admitidos por el esquema.
6. Recuperar páginas completas, conservar cursor y límites de consulta, y detectar fallos, resultados parciales y obsolescencia.
7. Completar el ciclo normativo exigido por el servidor, sin inventar verificaciones ni eludir el ledger.
8. Entregar a ChatGPT resultados estructurados, saneados y suficientemente ricos para realizar el diagnóstico del dictado.
9. Disponer de una instalación reproducible, pruebas automatizadas, recuperación tras reinicio, revocación y documentación para futuras sesiones.

### Excluido del primer corte

- Lectura de volcados, transcripciones, texto autobiográfico, HTML de contenido o versiones históricas.
- Lectura de audio original, MP3, bloques Base64, direcciones de Blob o cualquier archivo privado.
- Escritura, edición, archivo, eliminación o aprobación de datos de negocio.
- Cambios a proveedores de voz/transcripción, a la captura de audio o al bug de dictado antes de observar evidencia real.
- Acceso anónimo, token compartido entre personas, credenciales incluidas en argumentos de shell, secretos en repositorios, ficheros de configuración, logs o respuestas de ChatGPT.
- Alterar la identidad de otros clientes MCP, relajar OAuth, eliminar PKCE, ampliar redirecciones de forma genérica o modificar protecciones para forzar compatibilidad.
- Cambiar Custodia, modificar su código o utilizar su alcance como sustituto de esta tarea.

La lectura de datos de negocio debe ser de solo lectura. Se reconoce que la autenticación actual actualiza el campo de último uso del token y que las operaciones normativas escriben registros de ciclo/ledger/recibo. Esos efectos de control son distintos de modificar dictados, volcados o audios y deben quedar explícitos.

## 3. Hallazgos técnicos verificados

### 3.1 Plataforma ChatGPT

La ayuda oficial de OpenAI sobre servidores MCP personalizados identifica la conexión MCP personalizada y el modo MCP completo para planes Business y Enterprise/Edu; Pro tiene una modalidad de lectura/obtención más limitada. Free no figura entre los planes habilitados para conectar servidores MCP personalizados. La documentación de OpenAI también describe el uso de MCP en otros hosts y productos de desarrollador, pero eso no convierte la conversación web de ChatGPT Free en un cliente MCP local.

Fuentes oficiales a consultar de nuevo antes de cerrar la implementación:

- https://help.openai.com/es-419/articles/12584461-conectar-servidores-mcp-personalizados
- https://help.openai.com/en/articles/12584461-connectors-and-custom-mcp-servers
- https://platform.openai.com/docs/guides/tools-remote-mcp

La arquitectura debe, por tanto, reutilizar la conexión RDC ya disponible en la conversación actual. No exigir API de OpenAI, facturación por tokens de API, ChatGPT Pro o un plan empresarial.

### 3.2 Endpoint y transporte KHORA

- Endpoint productivo documentado: https://khora-web.vercel.app/api/mcp
- Transporte: HTTP transmisible MCP mediante el SDK de servidor actualmente documentado (Streamable HTTP).
- Descubrimiento: herramientas mediante tools/list; metadatos de recurso protegido y servidor OAuth en los well-known publicados por KHORA.
- Autenticación: Bearer en Authorization.
- No asumir stdio en el servidor remoto, SSE dedicado ni una sesión de transporte persistente.
- La configuración productiva de la base de datos de solo lectura es obligatoria para esta ruta. No leer ni exportar secretos de Vercel.

Contrato canónico: khora-web/docs/normative-check.md  
Contrato de fronteras de servicios: khora-web/docs/observability-services.md  
Objeto canónico del frente: docs/frentes/dictado-voz/OBJETO-CANONICO.md

### 3.3 Catálogo MCP

El contrato de código contiene diecisiete herramientas. Sus familias son:

| Familia | Herramientas | Permiso de negocio |
|---|---|---|
| Observabilidad | khora_observacion_instantanea, khora_estado_vivo, khora_eventos_recientes, khora_eventos_desde | runtime:read |
| Volcados/revisión | khora_resumen, khora_listar_volcados, khora_leer_volcado, khora_buscar_volcados, khora_versiones_volcado, khora_ui_review | volcados:read |
| Audio | khora_listar_audios, khora_leer_audio | volcados:read |
| Ciclo normativo | khora_norm_open_turn, khora_norm_apply_principle, khora_norm_verify_turn, khora_norm_release_turn | norm:turn |
| Diagnóstico | khora_mcp_health | actualmente declara los tres scopes |

Cada herramienta sustantiva de negocio exige además el control del ciclo normativo: _norm_turn_token, _thinking_mode y _output_format_version. La versión del formato debe obtenerse del contrato descubierto en el despliegue y no copiarse de memoria o fijarse permanentemente en el puente.

### 3.4 Scopes y token manual existente

El código actual admite tokens manuales de KHORA con los scopes runtime:read, volcados:read y norm:turn. La creación admite vencimientos de 30, 90 o 365 días (90 por defecto). El token queda vinculado al usuario, al recurso canónico y a la generación de revocación. KHORA almacena el hash/prefijo, no el valor original; el token completo se devuelve al crearlo y solo entonces puede copiarse. El uso actualiza ultimo_uso_en.

El token manual está soportado por el servidor y no requiere una redirección OAuth. Es la primera ruta que debe probar el constructor porque evita crear un registro dinámico de cliente y modificar redirects. Para el corte de observabilidad se solicitará únicamente:

- runtime:read
- norm:turn

No conceder volcados:read para resolver una consulta de eventos. No reutilizar KHORA_API_KEY: la documentación lo define como compatibilidad servidor-a-servidor, no como credencial de usuario/modelo.

Si el token manual no permite una integración legítima o el ciclo normativo rechaza el cliente, detener la prueba y documentar el código real. No ocultar el rechazo con un token amplio ni con una identidad falsa. El constructor podrá proponer una ruta OAuth pública dedicada al puente, pero deberá limitarla a un cliente específico, PKCE S256, callback loopback exacto, almacenamiento seguro y scopes mínimos. Los redirects localhost/127.0.0.1 no están actualmente en la allowlist dinámica descrita por KHORA; no asumir que funcionarán sin un cambio de servidor revisado.

### 3.5 Invariantes del ciclo normativo

El servidor exige el ciclo normativo para las herramientas sustantivas. El flujo canónico es:

1. Abrir el ciclo con khora_norm_open_turn.
2. Recibir y conservar el token/contexto del turno y sus referencias de snapshot.
3. Ejecutar únicamente las herramientas permitidas por los scopes y el turno activo.
4. Aplicar cada principio pertinente en el orden exigido por KHORA mediante khora_norm_apply_principle.
5. Construir el comprobante completo a partir de la salida/evidencia real y llamar khora_norm_verify_turn.
6. Continuar solo si el resultado es VERIFIED.
7. Llamar khora_norm_release_turn únicamente después de la verificación y conservar el resultado VERIFIED_RELEASE.

Un intento INVALID o INCOMPLETE no se transforma en éxito, no se salta el ledger y no se reutiliza un token de intento cerrado. El puente no debe fabricar anchors, hashes, principios aplicados, salida canónica ni recibos. Si no puede ejecutar fielmente el ciclo completo, debe informar la limitación y bloquear la operación sustantiva.

Para el contexto de razonamiento se utiliza UNKNOWN cuando la interfaz no proporciona una señal fiable. No inferir el modo interno del modelo. La versión de salida se obtiene del contrato vigente.

### 3.6 Hallazgos que requieren tratamiento explícito

**A. Identidad de plataforma.** El módulo normativo fija actualmente REQUIRED_PLATFORM = ChatGPT. Esto puede representar correctamente la plataforma que origina la tarea, pero el cliente de transporte que habla MCP es el puente local. No se debe decir que ChatGPT Free está conectado nativamente a KHORA. El registro del puente debe identificar de forma separada el transporte RDC y el cliente local, sin suplantar a otro cliente. En el ciclo normativo se conservará el valor de plataforma que el contrato y la evidencia del host permitan afirmar; si la implementación no puede representar ambos planos sin ambigüedad, el constructor debe resolver el contrato explícitamente antes de operar.

**B. Scope del health check.** El contrato de herramientas asigna a khora_mcp_health los scopes volcados:read, runtime:read y norm:turn, pero el handler compara esos tres scopes para informar OK/DEGRADED y no exige lectura de volcados para consultar eventos. Un cliente con mínimo privilegio para observabilidad puede quedar impedido de invocar health por el esquema anunciado, aunque el diagnóstico precisamente debería informar que falta volcados:read. Revisar y alinear securitySchemes, validación efectiva y pruebas: como mínimo, una credencial con runtime:read debe poder consultar salud de observabilidad y recibir DEGRADED/missing_scopes sin que se le conceda volcados:read. norm:turn solo se añade donde lo requiere el ciclo. No se debe cambiar la semántica de full_access: seguirá representando acceso completo, no observabilidad parcial.

**C. Filtro de sesión en snapshot.** En khora_observacion_instantanea el runtime, último evento, agregados y fallos aceptan session_id; sin embargo, la consulta que devuelve sesiones activas observadas no aplica ese filtro. No presentar esa lista como aislada por sesión. El constructor debe retirar/sanear ese bloque en el puente inicial o corregir el filtro en el servidor y añadir una prueba que demuestre que un session_id no devuelve identificadores de otras sesiones. El arreglo del servidor debe ser focalizado y no cambiar otras vistas globales sin motivo.

## 4. Arquitectura de implementación

### 4.1 Componentes

**A. ChatGPT Free.** Interpreta la petición de diagnóstico y decide qué operación ejecutar. No mantiene una conexión MCP personalizada.

**B. Remote Desktop Commander.** Herramienta de ejecución remota disponible en la conversación. Envía a PC-8 un comando fijo y acotado y devuelve stdout estructurado. RDC es el canal de invocación, no el motor de datos.

**C. KHORA MCP Read Bridge (PC-8).** Aplicación local independiente, preferentemente en una carpeta fuera del clon KHORA para evitar ramas dirty o trabajo concurrente. Ruta propuesta: Documents\KHORA-MCP-Read-Bridge. Se recomienda un cliente TypeScript/Node que use el SDK cliente MCP compatible con el transporte Streamable HTTP, más un wrapper PowerShell con una lista cerrada de acciones.

**D. KHORA MCP productivo.** Servidor remoto existente. El puente solo llama al endpoint documentado con Bearer y el protocolo MCP real.

**E. Almacén de credenciales local.** Windows Credential Manager como primera opción; DPAPI CurrentUser como alternativa si el SDK no permite Credential Manager directamente. La clave permanente es distinta del token efímero normativo de cada turno.

### 4.2 Forma del cliente local

No construir otro servidor HTTP para que ChatGPT se conecte. El producto que debe quedar en PC-8 es un ejecutable/CLI o script de operaciones cerradas que RDC pueda iniciar, por ejemplo:

- discover: listar herramientas y versiones publicadas.
- health: comprobar conectividad/estado, con la semántica de scopes corregida.
- snapshot: consultar observación instantánea; aceptar session_id opcional.
- events-recent: consultar una ventana temporal, filtros y límite.
- events-since: paginar desde cursor, continuar hasta hay_mas=false y devolver cursor final.
- status: comprobar versión del cliente, autenticación presente, vigencia de configuración y disponibilidad del endpoint sin revelar secretos.
- revoke/check: verificar si el cliente dejó de tener acceso tras revocar el token, sin mostrar el bearer.

El wrapper debe rechazar URLs arbitrarias, herramientas no incluidas en allowlist, parámetros desconocidos, comandos de shell libres y acciones de escritura. Solo endpoint canónico HTTPS de KHORA. Los errores deben salir como JSON estructurado y redactado. Los datos voluminosos deben paginarse, no truncarse silenciosamente.

### 4.3 Transporte y conectividad

- Solo conexiones salientes HTTPS desde PC-8 hacia el endpoint canónico de KHORA.
- No listener local, port forwarding, túnel público, ngrok, reverse proxy ni endpoint nuevo.
- No exponer puertos de escritorio, el token, la consola MCP o la bóveda.
- Respetar negociación MCP, JSON-RPC, errores, timeouts y paginación del SDK.
- No implementar un protocolo JSON-RPC artesanal cuando exista el SDK cliente compatible.
- No asumir que MCP tools/list equivale a autorización: verificar la llamada real y el scope en el servidor.
- No desactivar TLS, validación de certificado, PKCE u otras guardas.

## 5. Credenciales, privacidad y mínimo privilegio

### 5.1 Alta de credencial

Primera opción: propietario genera en KHORA una credencial manual de solo observabilidad en la superficie de control MCP existente, con etiqueta identificable como “MCP-OBS-DICTADO · PC-8 · RDC”. Scopes iniciales: runtime:read y norm:turn. Vencimiento: 30 o 90 días, a decisión del propietario. El alta debe realizarla el propietario autenticado en la interfaz prevista; el constructor no debe leer secretos de Vercel ni la base de datos para generar tokens.

El valor se introduce una sola vez en un flujo seguro de PC-8 y se almacena protegido por usuario. No se debe pasar como argumento de proceso, variable de entorno persistente, texto del comando, parámetro de PowerShell visible, archivo JSON plano, clipboard, stdout, telemetría o commit. Se debe evitar que una excepción imprima headers HTTP.

Si el usuario necesita revocar el acceso, se revoca el token desde KHORA. Borrar la copia local no sustituye la revocación en el servidor.

### 5.2 Separación de secretos

Nunca copiar al puente ni recuperar:

- MCP_OAUTH_CLIENT_SECRET
- MCP_JWT_SECRET
- AUTH_SECRET
- OIDC_CLIENT_SECRET
- KHORA_READONLY_DATABASE_URL
- KHORA_API_KEY u otras credenciales de servidor
- GitHub token normativo
- cualquier secret de Vercel

El cliente necesita solo la credencial de acceso que se le emita para su identidad/propósito. No necesita credenciales SQL, GitHub ni Blob.

### 5.3 Redacción de resultados

El servidor devuelve detalle/metrics de eventos. El puente debe mantener una allowlist de campos útiles para el diagnóstico, no devolver indiscriminadamente cualquier objeto del almacén. Deben preservarse, cuando existan y sean útiles: id/event_uuid/event_id, fase, estado, outcome, component, sequence, session_id objetivo, release_sha, duración, reason_code, correlation_id, causation_id, attempt_id, client/server timestamp, métricas escalares permitidas y event_hash.

Excluir texto dictado, transcripciones, comentarios de usuario, prompts, contenido de volcados, HTML, audio, Base64, URLs privadas, headers, tokens, secretos, trazas de excepciones y datos de sesiones no relacionadas. No convertir un evento excluido en un evento inexistente: indicar que un campo fue omitido por política de privacidad.

No persistir payloads de eventos en logs locales. El log local del puente solo debe contener fecha, operación, ID de correlación, resultado, cantidad, cursor, duración, estado HTTP y código de diagnóstico saneado.

## 6. Modelo de datos útil para el frente de dictado

El contrato de observabilidad usa el almacén existente y distingue eventos de dominio de eventos de frontera de servicio. El frente debe poder reconstruir:

interacción de Ingreso → transición de dictado/edición → reconocedor/grabadora → parte de audio/checkpoint → solicitud de transcripción → respuesta/error del proveedor → reanudación/parada → persistencia/archivo.

La instrumentación cliente de dictado construye eventos USER_DATA de metadatos, con fase dictado y componente ingreso_workspace. Las métricas están limitadas a claves y valores escalares permitidos; el diseño explícitamente evita enviar palabras dictadas y contenido de audio. No asumir que un evento de dominio confirma que el proveedor procesó el audio ni que un ACK acredita la corrección del texto.

Campos especialmente útiles para correlación:
- session_id y sequence: agrupar cronología de una sesión.
- correlation_id y causation_id: seguir encadenamiento causal.
- attempt_id: distinguir reintentos.
- event_id/event_uuid: identificar cada observación.
- fase, component, reason_code, outcome y severity: caracterizar el fallo.
- client_time y server_time: evaluar retrasos, teniendo en cuenta ambos relojes.
- release_sha: identificar el corte de software asociado.
- metrics: interpretar estado del reconocedor, grabadora, permiso, partes, bytes, reconexiones, checkpoint y códigos HTTP, solo cuando las claves estén presentes y aprobadas.
- event_hash: conservar referencia de integridad; no afirmar que la cadena completa está verificada por el simple hecho de leerlo.

### 6.1 Herramientas de consulta

**khora_observacion_instantanea**  
Devuelve runtime, actividad agregada de los últimos cinco minutos, último evento, fallos de la última hora, cursor y sesiones observadas. El estado runtime se considera stale cuando supera 15 000 ms. Stale no equivale a sesión cerrada. El parámetro session_id no aísla actualmente todas las partes de la respuesta: tener presente el hallazgo §3.6-C.

**khora_eventos_recientes**  
Permite filtrar por ventana en segundos (1–86 400; default 300), límite (1–200; default 50), session_id, component, severity, outcome, fase, scope y category. Es una vista retrospectiva acotada; no debe utilizarse como prueba de que no existen eventos anteriores.

**khora_eventos_desde**  
Recibe cursor monotónico, límite (1–200) y session_id opcional. Devuelve eventos en orden ascendente, cursor de entrada, cursor siguiente y hay_mas. Continuar exactamente desde cursor_siguiente hasta hay_mas=false. No saltar páginas ni actualizar el cursor si la respuesta fue parcial o fallida.

**khora_estado_vivo**  
Reutiliza la observación instantánea sin filtro. No tratarlo como una fuente de datos distinta.

### 6.2 Método de diagnóstico

1. Obtener el release/version real y la sesión/ventana de tiempo que el operador autorice.
2. Consultar snapshot; registrar freshness/stale, runtime y cursor inicial. No utilizar la lista global de sesiones para afirmar aislamiento.
3. Consultar eventos recientes con filtros pertinentes, en una ventana pequeña y explícita.
4. Seguir la cronología con eventos_desde desde un cursor consistente, paginando hasta hay_mas=false.
5. Agrupar por session_id, sequence, correlation_id y causation_id; no unir eventos solo por proximidad temporal.
6. Identificar el primer evento fallido, la última confirmación positiva anterior y los eventos posteriores; separar hechos observados de hipótesis.
7. Si faltan eventos, distinguir EMPTY, PARTIAL, STALE, REJECTED, INCOMPLETE y error de transporte. No inferir ausencia de operación a partir de una consulta fallida.
8. No cambiar el código del dictado hasta contar con un conjunto de eventos reproducible y una hipótesis causal corroborada.

## 7. Plan de construcción por fases

| Fase | Trabajo del constructor | Salida verificable |
|---|---|---|
| B0 · Preflight | Releer objeto canónico, contrato MCP, observabilidad y estado de PR; confirmar PC-8 y no interferencia con ramas dirty | inventario de dependencias y estado |
| B1 · Contrato vivo | Conectar como cliente de prueba, ejecutar tools/list y cotejar nombres/esquemas/permisos reales; inspeccionar well-known y transporte | snapshot redactado del contrato |
| B2 · Credencial | Probar token manual con scopes mínimos. Si existe incompatibilidad, registrar respuesta exacta y diseñar OAuth dedicado/PKCE sin desplegar | autenticación real demostrada o bloqueo preciso |
| B3 · Cliente local | Construir CLI/PowerShell wrapper en carpeta separada de KHORA, con allowlist de operaciones y almacenamiento seguro | cliente instalable y reproducible |
| B4 · Gate normativo | Implementar OPEN, herramientas, ledger en orden, VERIFY y RELEASE. No hardcodear principios ni recibos | prueba de turno VERIFIED y liberación correcta |
| B5 · Mínimo privilegio | Resolver discrepancia del scope health; comprobar denegación de scopes innecesarios; corregir aislamiento de snapshot | pruebas de autorización y privacidad |
| B6 · Lectura real | Snapshot, recientes y paginación por cursor con sesión/correlación autorizadas | evidencia saneada de eventos reales |
| B7 · ChatGPT Free + RDC | Ejecutar el cliente desde una conversación Free mediante RDC y recibir resultados utilizables por el modelo | recorrido end-to-end demostrado |
| B8 · Endurecimiento | Timeouts, retry con backoff, revocación, reinicio, salida JSON, logs saneados y pruebas negativas | criterios de aceptación completos |
| B9 · Continuidad | README, instalación, desinstalación, rotación/revocación, versión, evidencias y actualización del OCP | operación reproducible por otro modelo |

No se requiere construir un cliente MCP local genérico para cualquier aplicación en el primer corte. La interfaz inicial es un conjunto acotado de operaciones invocables con RDC. La portabilidad debe mantenerse en la biblioteca MCP y no exigir que ChatGPT Free actúe como cliente MCP nativo.

## 8. Pruebas exigidas

### 8.1 Unitarias y de contrato
- Esquemas Zod y tools/list coinciden con los argumentos/outputs que registra la ruta.
- El wrapper rechaza herramientas ajenas a allowlist, URL no canónica y argumentos desconocidos.
- Los filtros de sesión no filtran campos globales en una vista declarada como aislada.
- Salud con runtime:read puede identificar permiso faltante para volcados sin solicitar volcados:read.
- Errores 401/403/404/429/5xx, timeout, JSON inválido, desconexión y token vencido tienen diagnósticos saneados.
- Cursor 0, cursor de frontera, página llena, página final vacía, hay_mas y reintento no duplican ni omiten eventos.

### 8.2 Seguridad
- Token persistido protegido y no imprimible.
- Búsqueda estática de secretos en repositorio, build output, logs y argumentos.
- No hay puerto local escuchando ni reglas de firewall nuevas.
- El proceso no puede llamar a herramientas de escritura ni a herramientas de contenido con el token mínimo.
- Rechazo de scope insuficiente no produce efecto de negocio.
- La revocación desde KHORA hace fallar la siguiente llamada.
- La credencial no sobrevive a otro perfil de Windows ni puede utilizarse sin el usuario autorizado.
- Los artefactos y logs locales no guardan payloads sensibles.

### 8.3 Integración
- Ejecutar tools/list contra el endpoint productivo con credencial real.
- Llamar health con su scope mínimo alineado.
- Abrir ciclo normativo real.
- Ejecutar al menos una herramienta de observabilidad con datos reales de una sesión expresamente autorizada.
- Recuperar eventos_desde paginando hasta final.
- Aplicar/verificar/liberar el ciclo con resultados reales y recibo correcto.
- Repetir tras reiniciar el proceso y el equipo, sin reintroducir ni revelar el secreto.
- Revocar la credencial y comprobar rechazo.

### 8.4 Prueba de uso en ChatGPT Free
La prueba terminal se considera aprobada únicamente cuando, dentro de una conversación real de ChatGPT Free:
1. el asistente invoca RDC;
2. RDC ejecuta el cliente local en PC-8;
3. el cliente se autentica en KHORA;
4. una consulta de observabilidad devuelve datos productivos reales y saneados;
5. el asistente puede interpretar IDs, filtros y cursor;
6. el ciclo normativo termina en VERIFIED_RELEASE;
7. no se utilizó una conexión MCP personalizada nativa, plan de pago, API de OpenAI ni acceso anónimo.

Un test unitario, una llamada HTTP pública, un health falso, un tools/list sin autenticación o una ejecución MCP desde otro host no satisfacen este criterio.

## 9. Aceptación de entrega

- [ ] Funciona en ChatGPT Free actual, usando RDC como canal.
- [ ] PC-8 confirmado y cliente instalado fuera del árbol de KHORA.
- [ ] Conexión saliente HTTPS únicamente; no hay servicio público ni puerto entrante.
- [ ] Credential Manager/DPAPI protege credencial; nada secreto sale por stdout, argv, logs o repo.
- [ ] Permisos mínimos runtime:read + norm:turn; volcados:read no se concede en el primer corte.
- [ ] tools/list coincide con el contrato productivo vigente.
- [ ] Salud de observabilidad puede mostrar DEGRADED sin exigir acceso a volcados.
- [ ] OPEN → consulta → ledger → VERIFY → RELEASE acreditado, con resultado VERIFIED_RELEASE.
- [ ] Snapshot, eventos recientes y eventos desde cursor recuperan datos reales, sin truncamiento ni omisión silenciosa.
- [ ] Se aplican filtros/allowlists y se evita exponer sesiones ajenas al filtro.
- [ ] Revocación, vencimiento, reconexión y reinicio están probados.
- [ ] Pruebas de contrato, unitarias, seguridad y E2E tienen recibos.
- [ ] README de instalación/desinstalación y operación entregado.
- [ ] OCP actualizado y sincronizado solo cuando el estado y los hashes estén comprobados.

Hasta que se cumplan todos los puntos, el acceso se reporta como parcial o en validación. No declarar desbloqueado S1 ni afirmar que el bug quedó diagnosticado.

## 10. Diagnóstico y recuperación

| Señal | Acción |
|---|---|
| HTTP 503 | Verificar configuración del servidor con el administrador; no leer secretos. |
| HTTP 401 | Confirmar recurso, vencimiento y revocación de la credencial; autenticar de nuevo por flujo autorizado. |
| insufficient_scope | Identificar herramienta y scope requerido; no conceder todos por comodidad. |
| NORMATIVE_TURN_REQUIRED | Consultar estado/attempt del turno y completar o abandonar el intento según respuesta real; no abrir a ciegas. |
| health DEGRADED | Conservar missing_scopes. Para observabilidad no pedir volcados si no son requeridos por la tarea. |
| runtime stale | Informar estado obsoleto; no asumir sesión cerrada. |
| cursor parcial | Reintentar desde el cursor de entrada; no adelantar el checkpoint local hasta confirmar página completa. |
| evento vacío | Declarar resultado de esa consulta y filtros; no extrapolar a ausencia total de actividad. |
| logs no recuperables | Conservar correlación/códigos y no incluir contenido del proveedor o excepciones. |

## 11. Restricciones de repositorio y coordinación

- Este entregable pertenece a docs/frentes/dictado-voz, frente MCP-OBS-DICTADO.
- No modificar documentación, código ni permisos del frente Custodia.
- No tocar ni limpiar cambios locales concurrentes.
- No usar ni modificar PR #335 como vehículo de esta implementación. El PR #335 está abierto y es un candidato amplio de Ingreso; su estado y contenido deben revisarse por separado.
- Crear una rama exclusiva para el puente y, si se requiere cambio del servidor, un PR separado y focalizado para KHORA MCP. No mezclar con el cambio de puente.
- No modificar main, no fusionar ni desplegar a producción por el simple hecho de superar pruebas locales. La publicación del servidor necesita sus compuertas normales y verificación del proyecto productivo correcto.
- Los cambios normativos de identidad/admisión/scopes deben ser explícitos, mínimos, cubiertos por pruebas y documentados en este mismo frente.

## 12. Prompt operativo para el modelo constructor

Eres el modelo constructor asignado al frente KHORA MCP-OBS-DICTADO. Tu misión es implementar el acceso a observabilidad de KHORA desde ChatGPT Free, manteniendo ChatGPT Free como condición obligatoria. Tu especificación completa es este documento: MCP-OBS-DICTADO-FREE-BRIDGE.

Primero relee desde main el objeto canónico docs/frentes/dictado-voz/OBJETO-CANONICO.md, khora-web/docs/normative-check.md y khora-web/docs/observability-services.md. Comprueba la frescura y el estado real antes de codificar. No confundas este frente con Custodia.

Construye un cliente MCP local en PC-8, fuera del clon KHORA y de cualquier worktree dirty, accionable por comandos fijos de RDC. La ruta propuesta es Documents\KHORA-MCP-Read-Bridge. ChatGPT Free no debe ser presentado como cliente MCP nativo. El canal de uso será RDC → cliente local → KHORA MCP HTTPS.

Empieza por el token manual de KHORA con runtime:read + norm:turn. No solicites volcados:read, no accedas a contenido ni audio. El token se introduce por el propietario y se guarda en Windows Credential Manager o DPAPI CurrentUser. Nunca lo incluyas en argv, variables persistentes, ficheros planos, consola, logs, Git o respuesta al asistente. Si el token manual no es compatible, documenta el diagnóstico y formula el cambio mínimo de admisión/identidad OAuth con PKCE; no fuerces un fallback, no uses KHORA_API_KEY ni secretos de servidor.

Coteja tools/list y schemas del despliegue real. Implementa el ciclo normativo completo OPEN, consulta, principios en orden, VERIFY y RELEASE. Usa UNKNOWN si el modo de razonamiento no es observable. Obtén la versión de salida del contrato vivo. No fabriques recibos. No permitas herramienta sustantiva si no existe un turno normativo válido.

Resuelve dos discrepancias del contrato: khora_mcp_health anuncia volcados:read además de runtime:read aunque la observabilidad no necesita leer volcados; y khora_observacion_instantanea aplica session_id a varias consultas, pero no a la lista de sesiones observadas. Alinea esquema, autorización y pruebas para que health pueda informar DEGRADED con mínimo privilegio y para que la vista aislada no revele sesiones ajenas. No alteres la semántica de full_access.

No expongas audio, transcripción, texto de volcados, datos de otras sesiones, prompts ni secretos. Devuelve únicamente campos observacionales permitidos y aplica saneamiento antes de que RDC los entregue a ChatGPT. Paginación completa, cursor estable y errores explícitos son obligatorios.

No modifiques Custodia. No toques PR #335. Trabaja en una rama nueva y aislada. No hagas merge ni deploy de producción sin las compuertas normales y autorización específica de publicación. Deja pruebas unitarias, de contrato, seguridad y una prueba E2E real desde ChatGPT Free + RDC con el servidor productivo, más documentación de instalación, operación, rotación/revocación y desinstalación.

No declares S1 desbloqueado hasta obtener una consulta de observabilidad productiva real desde esta conversación Free mediante RDC y un ciclo VERIFIED_RELEASE. Registra la evidencia saneada en el OCP y distingue implementado, probado, publicado y aceptado.

**Resultado esperado:** el operador puede permanecer en ChatGPT Free; el asistente invoca RDC, PC-8 ejecuta el cliente MCP local y KHORA devuelve eventos reales de observabilidad de dictado bajo permisos mínimos, sin conexión MCP nativa de pago ni exposición adicional del servidor.

# Matriz de trazabilidad · instrucción de arquitectura multialmacén · 2026-11-09

**OCP:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md) · referencia histórica CUSTODIA-v0.29; la versión viva actual es CUSTODIA-v0.32.
**Fuente literal:** [INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md](../originales/INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md). A UUIDv7 local 01a1c138-ead3-7678-a44e-a49bb72f11de (instrucción principal); A2 UUIDv7 local 01a1c134-2125-7263-b011-14bc36a10d03 (corrección de cierre).
**Estado:** matriz documental verificada contra la entrada fuente y los cinco objetos de tarea. No convierte propuestas en autorización de producto.

| Elemento literal del operador | Interpretación trazable | Materialización / estado |
|---|---|---|
| «¿por qué dices que no conviene reproducir Right? y por qué tu sugerencia es mejor que Right?» | Se conserva «Right» literalmente; se interpreta como «RAID» porque el dictado de arquitectura previo nombra RAID de forma explícita. Se compara RAID de discos con resiliencia de almacenamiento a nivel de aplicación. | Respuesta ejecutiva de este ciclo + CUSTODIA-RES-001. Interpretación declarada, no corrección silenciosa. |
| «un método de recursividad que se utiliza en las arquitecturas de almacenamiento tipo RAID» | No se implementa recursión literal entre proveedores; se propone un coordinador de almacenamiento con selección por salud/capacidad, cola durable, réplica e idempotencia para evitar ciclos y cascadas descontroladas. | CUSTODIA-RES-001, propuesta pendiente. |
| «Vercel Blob ya está lleno» / «no tiene que ser un fallo nada más por límites de uso, puede ser por un fallo en el servidor de Vercel» | El selector futuro debe considerar cuota y salud/disponibilidad del proveedor, no solo cuota. No se atribuye la falla a una causa que aún no se ha probado. | CUSTODIA-B2-005 y CUSTODIA-RES-001, propuestas. |
| «ante cualquier fallo se utilice Backblaze» | Backblaze es el destino de respaldo inmediato cuando el proveedor primario no puede escribir; el comportamiento final debe seleccionar proveedor sano y verificar cada confirmación, sin ocultar fallos ni perder la cola local. | CUSTODIA-B2-006 (uso operativo inmediato) y CUSTODIA-RES-001/002 (failover final, propuesto). |
| «como uno de los pilares de Cora va a ser la recuperabilidad de los datos del usuario» / «siempre se pierde el progreso y tenemos que volver a empezar» | La recuperación debe preservar checkpoints/progreso incremental y permitir restaurar la continuidad sin reconstruir desde cero. La promesa no se convierte en garantía absoluta contra pérdida simultánea de todas las copias, claves y dispositivos. | CUSTODIA-RES-001/002; criterios de checkpoint, retención, restauración y RPO/RTO. |
| «así haya errores míos, por ejemplo como desarrollador» | Diseñar protección frente a regresiones y escrituras incorrectas: versionado, aislamiento de despliegues, restauración de versión sana, integridad por hash y pruebas de recuperación; la réplica sola no basta si replica una corrupción lógica. | CUSTODIA-RES-001/002; matriz de fallos y restauración. |
| «O tu mamá también» | Se conserva literalmente en el original fuente, pero su significado dentro del dictado es ambiguo y parece una posible transcripción de voz; no se transforma en requisito funcional adicional sin aclaración del operador. | INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md; ambigüedad no normalizada. |
| «Vercel Blob» / «Backblaze B2» | Distinguir la cuota histórica de Blob del rechazo reciente de autorización B2. B2 es el destino inmediato para intentar recuperar archivado, pero no se fija como proveedor final exclusivo. | CUSTODIA-B2-005 (diagnóstico) y CUSTODIA-B2-006 (restablecimiento); causa exacta de credenciales pendiente. |
| «ambos medios de persistencia gratuitos» | Comparar capacidad, cuota, condiciones del plan y costo real antes de elegir proveedores; la condición gratuita de hoy no es garantía futura. Dejar espacio para incorporar otro proveedor si se autoriza y aporta independencia de fallos. | CUSTODIA-RES-001, propuesta. |
| «la persistencia no falle por cuota ni por un fallo del servidor» | El diagnóstico separa los fallos de proveedor de los de código/preflight: no tratar toda caída como un único error de cuota. | CUSTODIA-B2-005 y sus cuatro despliegues referenciados. |
| «ante cualquier fallo» / «si un proveedor falla tenga el otro» | La arquitectura deberá tratar cuota, errores HTTP, indisponibilidad, conectividad y autorización; probar cada ruta de degradación y recuperación. No afirmar que se cubre todo fallo sin ejecutar la matriz. | CUSTODIA-RES-001/002, propuestas pendientes. |
| «el sistema Cora» / «el sistema protésico cognitivo» / «los datos de usuario del sistema Cora» | Mantener el alcance ligado a los datos de usuario y objetos que el producto necesite, conservando procedencia y sensibilidad; no convertir la arquitectura en un almacén general sin límites. | Propósito del OCP Custodia y CUSTODIA-RES-001/002. |
| «las personas con TDAH» / «siempre se pierde el progreso y tenemos que volver a empezar» | Preservar progreso incremental y recuperación comprensible para que una interrupción no obligue a reconstruir desde cero; comunicar estados de persistencia sin culpabilizar al usuario. | CUSTODIA-RES-001/002; checkpoints, cola durable, restauración y estados visibles. |
| «que los datos de un usuario [...] se guarden» / «que yo dicte algo y que no se quede guardado» | El guardado no puede depender de un botón final: checkpoint automático por unidad, primero en una cola local durable, luego a proveedor remoto y réplica. El estado se comunica sin fingir persistencia remota. | CUSTODIA-RES-001/002; CUSTODIA-B2-006 cubre la recuperación inmediata del archivado. |
| «que se vaya el internet y no se guarde el dictado» | Interrupción de red: mantener captura/checkpoint local, reintentar idempotentemente y sincronizar al volver la conexión; si el almacenamiento local falla o alcanza cuota, comunicar el bloqueo. | CUSTODIA-RES-001/002. |
| «habilitar el archivo de registro en Cora» | Hito operativo inmediato, con B2 como destino de desbloqueo; primero habilitación urgente y después diagnóstico residual/aceptación E2E con bytes físicos y lectura de vuelta. La prioridad inicial B2-005 → B2-006 quedó supersedida por la instrucción posterior de archivado primero. | CUSTODIA-B2-006 → CUSTODIA-B2-005, ambos P0; secuencia aprobada por el operador. |
| «Creo que lo más probable y lo más obvio es que sea el hecho de que ya no hay espacio disponible para almacenar registros y por eso no se están archivando» | No asumir que la cuota explica todo: el diagnóstico contrasta la suspensión histórica de Blob con el rechazo de autenticación B2 y recorre las etapas del archivado. | CUSTODIA-B2-005; la causa única todavía no queda demostrada. |
| «de todas formas quiero que lo confirmes de manera positiva» / «Busca la evidencia de que eso es lo que está fallando y que no existe otro fallo además de ese» | Exigir evidencia actual de Blob, B2 y toda la cadena captura→subida→read-back→vínculo→manifiesto→archivo. La conclusión «no hay otro fallo» queda limitada a rutas/versiones/escenarios/ventana que sí se prueben. | CUSTODIA-B2-005. Blob: suspensión por cuota documentada históricamente, estado actual no leído directamente. Además: dpl_36De preflight encrypted_roundtrip/provider_request_failed; dpl_4ohub ERR_MODULE_NOT_FOUND para lib/server/cripto; dpl_DwfJ preflight B2 storage_b2_authorization_failed. Runtime OIDC/Neon observado sin correlación probada. No se puede sostener que solo falla la cuota. |
| «una vez que hayamos resuelto el defecto [...] quitar la deuda técnica [...] slim y solamente tenga lo necesario» | Refactorizar únicamente después de que el archivado y recuperación funcionen; retirar complejidad accidental, no defensas de integridad. | CUSTODIA-B2-007, P1, depende de B2-006 aceptada. |
| «vamos a ver si vamos a utilizar una implementación write u otro tipo» | El diseño debe comparar write-through síncrono, réplica asíncrona/write-behind, quórum, cola local y conmutación, midiendo latencia, disponibilidad y riesgo de pérdida. | CUSTODIA-RES-001, P1, posterior al pulido. |
| «a menudo lo utilizo como ejemplo en otros frentes de trabajo» / «reproducir el formato de las tareas provisionales en esos frentes» / «ese formato lo puedes mejorar» | Se crea una plantilla genérica reutilizable en la carpeta de tareas provisionales y se enlaza desde el índice. | PLANTILLA-TAREA-PROVISIONAL.md; índice de tareas. |
| «hitos sean cortos, alcanzables en el corto plazo» / «evitar divergir en aspectos innecesarios» | Cinco hitos secuenciales con salida verificable; no abrir migración histórica masiva ni refactorización durante el desbloqueo. | Índice de tareas y LISTA-TAREAS-PROVISIONAL.md v0.24. |
| «me las muestras de manera ejecutiva, en términos sencillos, amigables, en cristiano» | La presentación al operador debe resumir resultado, orden, dependencias y compuertas sin exigir lectura de los READMEs técnicos. | Resumen ejecutivo de este ciclo. |
| «Si da satisfacción a lo que te dicté, entonces tu diseño está aprobado. Si no, no está aprobado» / «Un diseño viable es un diseño que satisface los criterios de lo dictado» | La aprobación del diseño queda condicionada al cumplimiento de criterios explícitos. La secuencia ejecutiva se presentó al operador; una aprobación posterior se limitó al orden de trabajo y al primer hito, no a la arquitectura final multialmacén. | CUSTODIA-RES-001 define criterios falsables; el diseño definitivo aún no está aprobado. |
| «Tienes autorización previa para cualquier trivialidad, cualquier bloqueo y para operar con libertad con tal de que lo construyas lo más pronto posible» / «No tienes autorizado detenerte por nada del mundo» | La instrucción pide continuidad y resolución rápida, pero no suplanta candados de identidad, presencia, seguridad o alcance. Este ciclo avanzó en documentación y diagnóstico seguro; detiene solo la lectura de secretos y cambios de seguridad/Production porque el endpoint y el perfil operativo no están verificados. | Responsabilidad gen. 11; CONTROL-RESPONSABILIDAD.json, DUG P012/P013/P036 y autorización B2 delimitada. |
| «me las muestras [...] para darle el visto bueno y luego ya te pones a ejecutar» | Este estado fue el de la presentación inicial. La aprobación posterior autorizó el orden de tareas y comenzar B2-006 en rama/pruebas aisladas; no aprobó por sí sola el diseño final multialmacén ni eliminó gates de producción. | OCP v0.32, LISTA v0.24, índice y README B2-006/005. |
| «la conexión RDS es a PSK14» | Se conserva el literal PSK14; no se equipara a PC-14 por inferencia. La instancia PC-14 visible en línea fue previamente identificada con perfil PC 13, por lo que no se utiliza; PSK14 continúa sin identidad/perfil confirmado. | Inventario actual de dispositivos; ningún acceso operativo remoto efectuado. PC10 queda descartado expresamente. |
| «utilizar la de la ubicación persistente para integración continua [...] o ambas conexiones RDS [...] solo siempre y cuando [...] acelere» | Evaluar ambas conexiones y usarlas solo si la identidad y el perfil de trabajo son los autorizados. La segunda estación tiene fila4 cargado, pero RDC ejecuta como MantenimientoRCI; Metacanon/P036 prohíbe usar ese perfil como raíz de trabajo. No se usó ninguna conexión para escribir o lanzar CI. GitHub se utilizó directamente para las tareas documentales. | Verificación de identidad remota registrada en OCP §8; decisión read-only: ninguna conexión se usó para implementación. |

**Fragmento incompleto conservado:** el dictado de conexiones termina con «o tareas que...». No se reconstruye qué tipo de tareas iba a mencionar el operador. La matriz registra solo el uso explícito para integración continua y el criterio de usar la conexión adicional únicamente cuando acelere el sprint.

| «antes de dar tu respuesta, asegúrate de que la última entrada fue tomada en cuenta en su totalidad y que no dejaste ningún elemento verbatim sin trazar a tu resultado» | Se hizo un cotejo frase-por-frase; cada decisión está enlazada con tarea, estado o límite. Se preservó literalmente esta corrección y se registra la identidad A UUIDv7 local 01a1c134-2125-7263-b011-14bc36a10d03. | Original, matriz y OCP; salida final B UUIDv7 local 01a1c134-2125-75e8-9c39-16a74610d034; ciclo local UUIDv7 01a1c134-2125-70ac-847f-18058ba4b884. |

| Entrada principal A UUIDv7 local 01a1c138-ead3-7678-a44e-a49bb72f11de | El encargo principal quedó preservado en la sección «Dictado de diagnóstico, secuencia y formato» y cada requisito se relaciona con su tarea, diagnóstico o límite. | Original A, esta matriz, OCP v0.27 y salida B UUIDv7 01a1c134-2125-75e8-9c39-16a74610d034. |

## Dictamen de cobertura

- Se preservó el original fuente completo visible en la conversación; no se presenta como exportación nativa de mensajes previos ausentes.
- Los cinco hitos están creados y leídos de vuelta; siguen pendientes de visto bueno.
- El B2-only anterior se conserva como antecedente y queda supersedido como arquitectura final.
- No se inició implementación de código ni mutación de producción.
- La promesa literal de «hasta el final de los tiempos» se traduce a reducir ventanas de pérdida, conservar versiones, proteger borrados y demostrar restauraciones. No se ofrece garantía absoluta ante pérdida simultánea de dispositivos, proveedores, claves y credenciales.


## Addendum de trazabilidad · instrucción de prioridad operativa · 2026-11-09

**Fuente literal:** [INSTRUCCION-RESTABLECER-ARCHIVADO-PRIMERO-20261109.md](../originales/INSTRUCCION-RESTABLECER-ARCHIVADO-PRIMERO-20261109.md), A UUIDv7 local `01a1c170-3d40-7edb-b707-9a14020a76b8`.

| Entrada literal del operador | Decisión/resultante | Destino trazable |
|---|---|---|
| «volver a hacer que Cora vuelva a poder archivar registros y que funcione con normalidad» / «ese es el primer objetivo» | El restablecimiento pasa al hito operativo 1. Se inicia la corrección B2 en rama/no producción, sin esperar al diseño multialmacén. | CUSTODIA-B2-006 EN CURSO; README B2-006 y LISTA-TAREAS-PROVISIONAL.md v0.22. |
| «Las demás tareas organízalas después en la secuencia» | El orden aprobado es B2-006 restablecer → B2-005 verificación/diagnóstico residual → B2-007 estabilizar → RES-001 diseñar → RES-002 implementar/certificar. | Índice de tareas, LISTA-TAREAS-PROVISIONAL.md v0.22 y OCP CUSTODIA-v0.29. |
| «Correcto» | Visto bueno explícito a la secuencia amigable que se presentó inmediatamente antes. | La secuencia anterior queda aprobada; ya no se etiqueta como pendiente de aprobación. |
| «Actualzia tareas conforme, lo que me estas diciendo, y resuelve punto 1, en tiempo record» | Actualizar los documentos ejecutivos y comenzar la tarea de restablecimiento. La aprobación habilita trabajo en rama y pruebas aisladas, pero no elimina las compuertas previas de producción, secretos, credenciales ni objetos originales. | B2-006 EN CURSO; OCP §8 y §13; LISTA v0.22; README B2-006. |
| «Continua» | Continuar el mismo alcance operativo sin ampliar las autorizaciones. | Original de instrucción, OCP v0.29 y este addendum. |

**Estado honesto al cierre de este addendum:** la documentación se reordenó y la primera tarea está en curso. La recuperación del archivado todavía NO está demostrada: el preflight B2 falla en `b2_authorize_account`; el status HTTP/código real no está registrado. No se ha leído ningún secreto ni se ha modificado producción.


### Trabajo técnico derivado · PR #362

La orden de «resolver punto 1» dio lugar a una corrección en rama/no producción: PR [#362](https://github.com/SeryMente/khora/pull/362), rama `fix/custodia-b2-auth-diagnostics-20261109`, punta `3b684a870a21ccf2f200ee684687beea42e3b235`. La implementación conserva HTTP status y el código de error saneado de B2, sin cuerpos ni mensajes libres; la prueba unitaria sintética quedó añadida, pero no ejecutada. GitHub Actions no devolvió workflows y los checks Vercel fallaron por limitación del plan/repo privado. PR en borrador; no fusionada ni desplegada. La tarea de restauración sigue bloqueada por autenticación B2 no caracterizada y compuertas productivas explícitas.


### Evidencia posterior sobre el deployment productivo activo

El dominio `khora-web.vercel.app` resuelve a `dpl_Dczf3WWnPG4cnCaJhf6PS8MzmxLe`, commit `b52003ee1809ad506db74e8ee97f0905f7aae91a`. Su build no ejecutó el preflight B2 (comando de build: migración runtime + Next build); el código de esa punta usa AWS SDK `S3Client`. El preflight separado de roundtrip para la misma punta falló con `storage_provider_request_failed`. El deployment posterior con transporte nativo `7be5712a` falló en `b2_authorize_account`; por tanto, el alias activo no es prueba de archivado físico verificado. La evidencia queda ligada a CUSTODIA-B2-006.


### Preview de corrección aislada · PR #362

Deployment `dpl_9gWxfH72UD2b2S115QpEUwa2M9Bt`, rama `fix/custodia-b2-auth-diagnostics-20261109`, commit `3b684a870a21ccf2f200ee684687beea42e3b235`, creado como preview (target no productivo). Estado final READY: compilación, TypeScript y generación de 78/78 páginas completados. No se ejecutaron unitarias ni preflight nativo. B2 envs están en Production; el preview no puede probar auth/PUT/GET. No se afirma restauración del archivado.


## Addendum de trazabilidad · retoma del frente y estado B2 · 2026-11-09

**Nueva entrada A:** [INSTRUCCION-RETOMA-CUSTODIA-20261109.md](../originales/INSTRUCCION-RETOMA-CUSTODIA-20261109.md), UUIDv7 local `01a1c193-eccc-78ad-bcb1-a7f102ff4733`. La cita nueva se preserva literalmente, incluidos los literales transcritos «Perisste», «cotnexto» y «CUIDADOSAMETNE». El A enlaza las fuentes históricas ya persistidas y declara que no es una exportación exhaustiva byte-a-byte del bloque histórico pegado.

**Salida B:** [SALIDA-MODELO-RETOMA-CUSTODIA-20261109.md](../originales/SALIDA-MODELO-RETOMA-CUSTODIA-20261109.md), UUIDv7 local `01a1c193-eccc-7302-a7bd-99135476b8e4`, blob `135003ff63af7224fc1626f1178df9d21b6f7e30`. A y B son identidades locales, no folios globales; FOL1 continúa inactivo.

| Elemento literal / señal vigente | Resultado de la retoma | Materialización / estado |
|---|---|---|
| «Perisste esto en persistencia documental, formatealo bien, leelo, adquiere cotnexto, Y CONTINUA TRABAJANDO EL FRENTE DE TRABAJO CUSTODIA CUIDADOSAMETNE.» | Preservada verbatim como nueva instrucción A, sin corregir silenciosamente sus literales. La salida B recoge el trabajo de este ciclo. | INSTRUCCION-RETOMA-CUSTODIA-20261109.md · B SALIDA-MODELO-RETOMA-CUSTODIA-20261109.md; ambos leídos de vuelta. |
| «En este momento se está trabajando en una ampliación del medio de persistencia...» | El objetivo final sigue siendo redundancia y recuperación multialmacén; B2 es el medio operativo de desbloqueo, no el único destino final obligatorio. | INSTRUCCION-ARQUITECTURA-MULTIALMACEN-20261109.md, RES-001/002. |
| «La prioridad ... volver a hacer que Cora vuelva a poder archivar registros» | Primer hito P0 sigue siendo CUSTODIA-B2-006; no se posterga por diseño multialmacén ni por diagnóstico residual. | LISTA v0.24, índice provisional, README B2-006. |
| «las notas efímeras contienen los valores de keyid y master application key» | Registrado como declaración actual del operador. Ningún valor fue leído, copiado, importado ni promovido durante esta retoma. | A de retoma y evidencia B2; acceso EP Vault pendiente. |
| «la conexión RDS es a PSK14» | Se usa literalmente como identificador reportado, sin equipararlo a otro host. La estación online PC-14 fue previamente identificada como perfil PC 13 y permanece excluida. | Inventario de dispositivos; sin acceso local/remote operativo. |
| «Olvídate de esa sesión de hace días que fue efímera» (referencia a PC10) | La nota antigua se marca SUPERSEDIDA como pista actual. PC10 no se vuelve a usar ni investigar para recuperar las notas actuales. | OCP v0.32 y README B2-006/005. |
| «continua trabajando el frente [...] cuidadosamente» | Se actualizan los documentos vinculados, se relee el DUG y se contrasta la evidencia Vercel/GitHub; no se declaran hechos no verificados. | OCP v0.32, LISTA v0.24, dos P0 e informe de evidencia. |

### Estado técnico al cierre de la retoma

- PR #355 está MERGED; su corrección cliente de drenaje/reintento no demuestra autenticación ni persistencia B2.
- PR #362 sigue OPEN · DRAFT · NOT MERGED; su prueba unitaria añadida sigue sin ejecución. Preview READY solo acredita build/TypeScript/78 páginas, no preflight/PUT/GET/E2E.
- El intento nativo B2 Production falló en `b2_authorize_account` con `storage_b2_authorization_failed`.
- Variables de Production: se vieron nombres heredados y no se vieron entradas canónicas Master Key; no se descifraron valores.
- El intento S3-compatible ejecutó migraciones runtime 023–029 antes de fallar en roundtrip. El script enumera 032 pero el log no confirma su aplicación por separado. El intento nativo posterior falló antes del hook de migración.
- No se leyó EP Vault, no se promovieron claves, no se ejecutó preflight desde la sesión actual, no hubo PUT/GET B2, E2E, cambio de variables, SQL adicional, merge ni deploy.
- Conclusión: archivado NO RESTABLECIDO / NO DEMOSTRADO; bloqueo concreto inmediato: acceso verificable a la sesión EP Vault en endpoint/perfil operativo permitido, seguido de autenticación B2. No se atribuye la causa solo a cuota de Blob.


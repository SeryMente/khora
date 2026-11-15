# Harmonia · Objeto de Proyecto Canónico (OCP)

**Versión local:** 0.49  
**Sello:** HARMONIA-v0.49  
**Corte:** 2026-11-10 · America/Mexico_City  
**Sprint activo:** **OMM-01 — Observa · Mide · Mejora**  
**Estado del OCP:** consolidado localmente; no publicado en main.

> Este documento es la fuente de verdad operativa del frente Harmonia. Las instrucciones del operador se conservan en el registro verbatim de §5. Las decisiones, tareas y criterios de aceptación deben poder rastrearse razonablemente a esas entradas. Los datos históricos completos que ya no gobiernan el estado actual se preservan, sin autoridad normativa, en archive/OBJETO-CANONICO-v0.47-historico-20261110.md.

---

## 1. Identidad, titularidad y ubicación

- **Producto:** Harmonia, frente del repositorio KHORA.
- **Repositorio:** SeryMente/khora.
- **OCP:** docs/frentes/harmonia/OBJETO-CANONICO.md.
- **Workspace local:** C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA.
- **Raíz del frente:** KHORA/Harmonia/.
- **Carpeta destinada a Chrome → Cargar descomprimida:** KHORA/Harmonia/Extension/. El manifest.json debe permanecer directamente en esta carpeta.
- **Fuente original de extensión:** apps/harmonia-observability/extension/ en SeryMente/khora, revisión de origen conocida dcba260981837f75a8a05db85edd310c2a7a9736.
- **Control de responsabilidad:** docs/frentes/harmonia/CONTROL-RESPONSABILIDAD.json. Titularidad generación 15; alias operativo chatgpt-harmonia-01a1b6ca-4543-7578-85d9-7624877c2e80; sin hilo nativo expuesto; FOL1 no activa.
- **Dispositivo RDC autorizado para este workspace:** PC10RCIF4EI4, UUID b573344f-c68f-47c9-9c2e-ae67f2e63bdb. La autorización cubre el workspace local KHORA/Harmonia y la documentación del frente, pruebas sintéticas y operaciones locales delimitadas. No se transfiere por nombre de equipo a otro UUID.
- **Identidades Windows observadas:** sesión interactiva CENTRAL\fila4, perfil C:\Users\fila4, SID S-1-5-21-1529298404-1161420656-882029410-5167. El proceso RDC opera como CENTRAL\MantenimientoRCI, perfil C:\Users\MantenimientoRCI. No confundir ambas identidades.
- **Base local:** rama work/harmonia-front-workspace-20261110, HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d. Cambios locales sin commit. El repositorio main no fue modificado por este sprint.
- **Historial:** la versión OCP 0.47 completa se copió byte a byte al archivo de archivo indicado en el encabezado. SHA-256 de la copia y del original previo coincidente: 062E4E9F9C301DF4DE2522578290C1D1CEA74271BE83F153B8EE94A016412D21. El archivo de archivo es referencia histórica, no fuente operativa vigente.

## 2. Nombre, propósito y resultado del sprint

### 2.1. Nombre

**Sprint HARMONIA OMM-01 — Observa · Mide · Mejora**

OMM-01 es el sprint de consolidación de la suite de observabilidad y del bucle semiautomatizado de desarrollo.

### 2.2. Propósito

Construir una extensión Chrome y un sistema local de observabilidad que:

1. observe estructuralmente la interfaz de ChatGPT;
2. mida el tiempo de procesamiento/generación de cada ciclo conversacional observable;
3. preserve un banco local y actualizado de metadatos estructurales de la interfaz, sin almacenar el contenido privado de las conversaciones;
4. use las instrucciones verbatim, el propósito declarado, las intervenciones del operador y la evidencia de observabilidad para decidir qué mejorar;
5. ejecute ciclos locales de desarrollo mediante Codex CLI cuando su identidad y autenticación estén resueltas;
6. valide cada cambio con pruebas, diferencias de código y evidencia;
7. repita la iteración sin exigir al operador que dirija decisiones técnicas ordinarias.

### 2.3. Alcance inmediato y arquitectura futura

- **Primera entrega urgente y exclusiva:** ChatGPT Web gratuito en Chrome, bajo la sesión iniciada por el operador.
- **Agnosticismo arquitectónico:** el contrato semántico de telemetría debe ser neutral respecto de plataformas; el adaptador actual será específico de ChatGPT Web gratuito.
- **Siguientes adaptadores, diferidos:** OpenWebUI de Cora, chats web para modelos open source y clientes/API.
- Preparar el contrato para incorporar adaptadores nuevos rápidamente, pero no ampliar el alcance de implementación inmediata antes de validar ChatGPT Free.
- No utilizar endpoints privados como API de producto, claves API, ni funciones de pago para medir ChatGPT Free.

## 3. Criterio de verdad, precedencia y gobierno

1. Las instrucciones verbatim del operador son la fuente primaria de propósito y requisitos del producto. No se corrigen ni sustituyen dentro del registro.
2. La interpretación técnica, las decisiones de diseño, el backlog y la evidencia se mantienen separados del texto literal.
3. Cada tarea incluye una referencia corta a una o más instrucciones verbatim. La trazabilidad debe ser directa y razonable, no ceremonial.
4. Una instrucción nueva refina o sustituye prospectivamente una decisión anterior; no altera el registro histórico original.
5. La jerarquía de actuación es: políticas y límites aplicables de plataforma/seguridad → autorización y control de responsabilidad → instrucciones verbatim compatibles → este OCP y sus decisiones → propuestas técnicas.
6. Una instrucción del operador no elimina una restricción contractual, de seguridad, autorización o privacidad.
7. DUG revisado: v388 / NX-388m. ART-027 separa la telemetría de consulta/recuperación de principios de las métricas operativas de Harmonia; el conteo de consultas normativas no mide aplicación de principios ni se debe asociar a cada ciclo conversacional. ART-024 sirve de referencia para distinguir identidad de conversación y relación entrada/salida. Edad exacta del último commit main: NO VERIFICADA.
8. MCP normativo: DESACTIVADO. No modificar el repositorio de Metodología desde este frente.

## 4. Reglas de operación del frente

### 4.1. Interacción con el operador

- El operador no debe ejecutar CMD, PowerShell, scripts, un inicializador, comandos de Git ni tareas de mantenimiento por instrucción del asistente. El trabajo técnico se realiza mediante RDC dentro de su alcance autorizado.
- No pedir al operador que memorice rutas o nombres de archivos auxiliares.
- No presentar componentes internos como tareas manuales del usuario.
- La intervención del operador se reserva para propósito, decisiones de producto, autorizaciones necesarias y aceptación funcional.
- No repetir preguntas ya contestadas. Preguntar solo cuando falte una autorización imprescindible o exista ambigüedad material.
- Informar el estado real; no prometer trabajo en segundo plano.

### 4.2. Trabajo local y Git

- Mantener el trabajo en la rama aislada existente.
- Antes de escribir, comprobar identidad del dispositivo autorizado, raíz, rama, HEAD y estado de trabajo.
- Revisar el diff antes de cerrar una iteración.
- Ejecutar pruebas relevantes y registrar sus resultados.
- No modificar main, crear/actualizar permisos, hacer push, merge, PR o despliegue sin autorización explícita separada.
- No reemplazar una versión funcional/aceptada por una candidata sin conservar la versión anterior y comparar cambios.
- No declarar publicación, aceptación, instalación o captura natural sin evidencia específica.
- El OCP local actualizado no es un commit ni una publicación.

### 4.3. Codex CLI como ejecutor de desarrollo

- Codex CLI es el ejecutor de código del bucle OMM-01; el asistente coordina el sprint, selecciona tareas, formula objetivos, revisa diffs y evidencia.
- La CLI se detectó en C:\Users\fila4\AppData\Roaming\npm\codex.cmd, versión codex-cli 0.167.0.
- El comando no está en el PATH del proceso RDC. Puede invocarse por su ruta absoluta una vez resuelta la identidad de ejecución.
- El proceso RDC corre como CENTRAL\MantenimientoRCI. La consulta codex login status ejecutada en ese contexto devolvió Not logged in. Esto no certifica el estado de autenticación de la sesión interactiva CENTRAL\fila4.
- Codex CLI no se ha configurado ni ejecutado como agente de este sprint. Su incorporación está bloqueada hasta resolver autenticación y contexto de usuario sin exponer credenciales.
- Modo de ejecución previsto: solo dentro del workspace autorizado, sandbox workspace-write, revisión de cambios y pruebas. Nunca usar danger-full-access ni --dangerously-bypass-approvals-and-sandbox.
- No autorizar consumo pagado, uso de API externa o modelo sujeto a cobro sin autorización expresa. No hacer login, introducir tokens o modificar credenciales por inferencia.
- Si Codex no puede operar bajo el contexto autorizado, el asistente puede continuar tareas documentales y de inspección local no bloqueadas; no debe eludir la separación de identidades con runas, credenciales de terceros o cambios de permisos.

### 4.4. Ciclo estándar de trabajo

1. Leer el propósito vigente y las instrucciones verbatim relacionadas.
2. Consultar el backlog y seleccionar la tarea de mayor prioridad que no esté bloqueada.
3. Revisar datos de observabilidad y comprobar si la cobertura permite decidir.
4. Si la observabilidad es insuficiente, priorizar la mejora del observador.
5. Si existe evidencia suficiente, seleccionar una mejora del producto relacionada con las instrucciones.
6. Implementar en el workspace aislado.
7. Ejecutar pruebas, revisar diff y comprobar regresiones.
8. Actualizar estado de tarea, evidencia y OCP.
9. Repetir el ciclo.

Una prueba sintética no equivale a prueba natural. Una propuesta no equivale a implementación. Una implementación no equivale a aceptación.

## 5. Registro de instrucciones verbatim

Las claves D-001 a D-010 son referencias documentales locales, no folios FOL1. D-010 se incorpora en la seccion 16.1 como adicion al registro; los dictados anteriores no se reescriben.

### D-001 · Bucle semiautomatizado y observabilidad de la interfaz

~~~text
Quiero establecer un bucle,  de desarrollo semiautomtizado,  que ahga uso de los datos de observacion de la extension, para que con mi input se vaya construyendo como yo la necesito,  siempre tomando en  cuenta los datos de observabilidad,  tomando en cuenta mis intervenciones, y el proposito declarado.,

Lo que quiero es que:


La extension quede pulida,  moderna y simplificada en su UI. 
Tenga lo necesario para observar la UI de la plataforma chatgpt,  y construir un bacno de datos actualziado para usarlo para el  desarrollo alrededor de la 'platforma. 
Que pueda usarse para la telemetria,revisa el  frente gobernanza (2), de metodologia,  a ver is puedes identificar las necesidades delproyuect ode telemetria para medir los tiempos de solucion de cada ciclo de las conversaciones.  Osea la extension es la que estara al pendiente de recolectar los datos para la telemetria.
~~~

### D-002 · Medición de todos los ciclos de ChatGPT

~~~text
Bueno, básicamente lo que me interesa es obtener la medición de cuánto me toma cada ciclo en ser resuelto, desde el momento en que presiono Enter para enviar el prompt hasta el momento en el que se entrega la salida una vez resuelto el ciclo. Quiero medir este lapso para todos los ciclos de todas las conversaciones al interior de la plataforma ChatGPT.
~~~

### D-003 · ChatGPT gratuito y marco agnóstico

~~~text
Me refiero a la versión gratuita. Ahora bien, el marco de telemetría debe de ser agnóstico a la plataforma y debe de poder utilizarse incluso, por ejemplo, en la plataforma de chat para modelos open source o vía API articulada en OpenWebUI de Cora.
~~~

### D-004 · Prioridad inmediata ChatGPT Free y control de latencia local

~~~text
Sí, correcto. El alcance es agnóstico, pero por lo pronto exclusivo y específico a la plataforma, el modo de uso gratuito de ChatGPT. Ve configurando tareas provisionales en el frente de trabajo que hagan esta distinción para que sí nos preparemos para adecuar el marco de trabajo en otras plataformas, pero por lo pronto y de manera urgente, primero para ChatGPT. Correcto, pero la entrega de la respuesta T2, si lo defines como lo estás definiendo, se podría verse afectada por la latencia de otros, por la variación en la latencia inducida por otros factores que pueden ser locales, por ejemplo, que la computadora esté sobrecargada en ese momento con muchas tareas, que tenga poco CPU disponible, poca RAM. Ese tipo de variación no me interesa medirla. Me interesa medir el desempeño del modelo en la plataforma conforme la versión del marco de trabajo actual. Eso es lo que me interesa medir para poder saber en qué medida está afectando la actualización del marco de trabajo a la velocidad en la que se resuelven los ciclos, independientemente de si hay poca RAM o mucha RAM o ese tipo de cosas. Entonces me parece que tienes que redefinir T2. Como te dije, enfócate en ChatGPT por lo pronto, tomando en cuenta el alcance agnóstico de la telemetría posteriormente.
~~~

### D-005 · Instrucciones verbatim, señal gráfica T₁, calidad de vida y bucle autónomo

~~~text
Ok, y quiero que además documentes verbatim las instrucciones que te voy dando para este frente porque me parece de importancia central y quiero disponer de las instrucciones verbatim que originaron las tareas provisionales que también quiero que vayas configurando paso a paso. Es decir, estamos configurando un sprint que toma por criterio de verdad las instrucciones verbatim que te estoy dictando. Estas instrucciones deben de ser persistidas en el frente de trabajo para poderla recuperar y las tareas provisionales organizadas en la debida secuencia para favorecer el objetivo del sprint deben de estar enraizadas en estas instrucciones. De hecho deben de ser trazables a estas instrucciones. No quiero que te la compliques horas y horas verificando la trazabilidad, nada más que sean razonablemente trazables a estas instrucciones. ¿De acuerdo? Entonces, sigo leyendo. Correcto. Ahora vas a resolver. Como tienes acceso a la interfaz de usuario con la extensión, tu señal de que inicia T1 debe de ser algún elemento gráfico que aparezca cuando se presiona Enter o después de haber presionado Enter, indicando el inicio del procesamiento del ciclo. y arréglatelas para que estos indicadores, o sea, que queden resueltos de manera agnóstica a la plataforma y podamos utilizar rápidamente la telemetría o el marco de trabajo de telemetría en otras plataformas. O sea, sí dale prioridad a ChatGPT porque es lo que estoy usando ahora, pero de una vez vámonos preparando para poderla instalar en la plataforma abierta que estoy desarrollando. Luego quiero que se automaticen, o sea, no voy a automatizar a ChatGPT porque sé que eso está en contra de los límites de uso que OpenAI tiene y no me lo vas a permitir, ni tampoco quiero intentarlo. Pero sí quiero automatizar algunas cuestiones para efectos de calidad de vida. Por ejemplo, utilizo una extensión que se llama Exportador ChatGPT a PDF. Sí, es un ejemplo. Esa es una extensión que aporta calidad de vida, me permite automatizar el empaquetamiento de la conversación en un archivo .md. Ah, eso no es ilegal, ¿verdad? Entonces, sobre esa misma línea de mejoras, una de las cosas que quiero hacer es que conforme la conversación ha llegado, como estoy en la plataforma gratuita y de eso se trata todo esto, o sea, se trata de hacer usable la versión gratuita de la plataforma y circunavegar las limitaciones que supone. Entonces, conforme yo avanzo en mis conversaciones, lleno la ventana de contexto, según esto, y entonces me aparece un botoncito que dice chat nuevo, porque como estoy usando la plataforma gratuita, ya me gasté toda la ventana de contexto de ChatGPT. Entonces lo que yo quiero hacer es que cuando ese botón aparezca, la extensión lo detecte y automáticamente guarde en Downloads un MD bien estructurado, como los busca en la carpeta de descargas de esta computadora, archivos .md que correspondan a conversaciones de ChatGPT, para que veas el nivel de calidad que requiero para los MD. Sí, automáticamente, este... una vez que se haya guardado, bueno cuando aparezca el botón, se va a generar un archivo MD con esa misma calidad, con esas mismas características como los ejemplos que te acabo de decir y se va a reinstanciar la conversación utilizando el botón S que aparece, porque ese botón permite preservar parte de la ventana de contexto de la conversación que estoy teniendo que reinstanciar por utilizar la versión gratuita. Entonces una vez que se reinstancia la conversación, automáticamente a través de la extensión nada más voy a ingresar un prompt. ¿Qué tiene que no se ingrese para que no salgas con que no, es que no se puede automatizar, que porque la ética y todo eso? ¿Qué tiene? Nada más que se poble ahí en el campo para que yo tenga que manualmente que ingresarlo y que sea un prompt estándar que diga algo así como, por ejemplo, como ya se generó el MD y como tenemos conexión RDC, que el modelo lea la conversación a partir del archivo generado, que lo vas a poner por ahí en la carpeta de trabajo y luego mediante RDC que lo persista en persistencia documental del frente de trabajo de esa conversación, que adquiera contexto y que repita de manera literal y textual la salida del último ciclo de la conversación de origen. Y luego todo eso me lo pone en un prompt. Que no debe traer ni más ni menos de lo que te acabo de decir y luego yo le doy enter manual para que no infrinja las políticas de uso no automatizado de OpenAI y ya. Ese es otro de los objetivos que va a tener la observabilidad. Entonces estoy experimentando con esta forma de desarrollo que para mí es nueva. Creo que lo que estoy configurando es un agente porque y lo vuelvo a decir para que quede claro y configures tus tareas de acuerdo a esto conforme lo dije en la primera parte de este dictado, es decir, documentando las instrucciones verbatim literal, etcétera y a cada paso del camino documentando las tareas provisionales. O sea, yo te doy instrucciones verbatim, tú configuras tareas provisionales, ¿sí? y documentas instrucciones verbatim. Entonces lo que tenemos ahora es una suite de observabilidad. Tú observas lo que pasa en mi interfaz de usuario, descargas datos en la carpeta de trabajo local y cuando ya tengamos suficientes datos, en base a las instrucciones verbatim que te he dado, tú automáticamente tienes que saber qué hacer. Yo ya no quiero dirigir el desarrollo. Te estoy dando tu propósito, tu objetivo de manera muy concreta. Por eso te he dicho que las instrucciones, que el criterio de verdad son estos dictados. En base a estos dictados y los datos que tú descargues de la observación tienes que ajustar la extensión. Si la extensión no está observando suficientemente bien la plataforma, modifica el sistema de observabilidad para que tengas mejor visión sobre lo que ocurre. Si ya tienes suficiente visión sobre lo que ocurre, revísa mis instrucciones verbatim y planea ciclos de desarrollo, pero sin que yo tenga que pensar. ¿Me explico? Yo ya te di las instrucciones y lo que yo quiero resolver. automatiza el desarrollo.
~~~

### D-006 · Operación siempre mediante RDC

~~~text
Todo lo hare via rdc siempre esos archivos no me corresponde a mi ni siquiera tenerlos en mente
~~~

### D-007 · Frente KHORA y carpeta de extensión

~~~text
Si claro, eso es burocracia inecesaria. Hazlo, Harmonai es frente de Khora,  Esen Khora/Harmonia/Extension,donde vas a poner lo que yo cargare en chrome
~~~

### D-008 · Codex CLI

~~~text
Pero ya habíamos hablado de esto. Me habías hablado de Codex LI, ¿te acuerdas?
~~~

### D-009 · Consolidación completa del OCP

~~~text
Ok consolida ahora todo lo que tenemos para la extension, verbatim, reglas de operacion,decicisiones , etc. TODO. Y construye bien tu OCP de frente de trabajo HARMONIA,  por que necesito que esto corra fino. Quita lo que no necsites, no quiero contenido obsoleto en el ocp.

Como le llamaremos al sprint?
~~~

## 6. Decisiones de producto y arquitectura vigentes

### 6.1. Extensión y observabilidad

- Extensión Chrome Manifest V3; el directorio cargable es Harmonia/Extension.
- Cobertura objetivo inicial: la UI de ChatGPT Web gratuito, en todas las conversaciones y pestañas donde la extensión esté habilitada y funcionando. "Todas" es objetivo de cobertura, no afirmación de que ya esté demostrado.
- La observación estructural debe crecer más allá del panel principal e incluir, cuando sean distinguibles y útiles: conversación principal, navegación, barra lateral, lista de conversaciones, selector de modelo, controles del compositor sin leer su contenido, controles de mensaje, herramientas, menús, diálogos, configuración visible y estado de generación.
- El banco de datos debe contener metadatos estructurales versionados, categorías de superficie, roles, tipos de control, relaciones, estados observables, huellas y cobertura. No almacenar texto de mensajes, respuestas, borradores, valores de campos, cookies, credenciales ni cuerpos de solicitudes.
- Popup: interfaz moderna, compacta, clara; estado del colector, ciclo de observación, métricas, cobertura, superficies y diagnóstico. La simplificación visual no debe ocultar estados no medidos, errores ni límites de cobertura.
- Observar la UI no significa automatizar el uso de ChatGPT, alterar solicitudes, pulsar controles o evitar límites.

### 6.2. Definición del ciclo y señales T₀/T₁/T₂

El requisito central se basa en las transiciones visibles de la UI, no en el instante de inserción del mensaje en el DOM ni en un cierre DOM genérico de 1.500 ms.

- **T₀ — envío:** Enter/acción de envío confirmada; referencia para correlación.
- **T₁ — inicio de procesamiento:** transición gráfica de la interfaz que aparece al presionar Enter o después y que indica que ChatGPT comenzó a procesar ese ciclo.
- **T₂ — fin de procesamiento/generación:** transición gráfica inequívoca que indica que terminó la generación de la respuesta final de ese ciclo.
- **KPI primario:** chatgpt_ui_generation_ms = T₂ − T₁.
- Cada extremo debe capturarse con un reloj monotónico en el mismo contexto temporal del adaptador. La fecha UTC es metadato de auditoría, no base de la resta.
- Los candidatos visuales concretos (por ejemplo, estado de carga, control de detener generación, estado inactivo o controles posteriores a la respuesta) no se dan por válidos hasta observarlos de manera controlada en la UI real. No codificar selectores o supuestos sin evidencia.
- La señal T₂ debe cerrar la generación final, no una respuesta intermedia de herramienta ni un fragmento de streaming. Si el final es ambiguo, el ciclo es INCOMPLETE o NOT_MEASURED.
- La ventana de estabilidad puede utilizarse para confirmar que la transición no fue transitoria, pero su duración de espera no se añade a T₂ − T₁. El timestamp de fin corresponde a la transición detectada, no al vencimiento del temporizador.
- No tomar el compositor vacío como evidencia suficiente de finalización.
- Se conserva por compatibilidad el duration_ms histórico del prototipo: inserción observable del nodo nuevo de usuario → última transición inactiva observada y estable de respuesta posterior. No reinterpretar los datos históricos como KPI de generación.
- T₁/T₂ visuales siguen sujetos a retraso de planificación de JavaScript y al renderizado del navegador. Aunque la métrica no debe incorporar mediciones ni ajustes de CPU/RAM local, no es técnicamente posible garantizar independencia absoluta del scheduling local usando solo señales gráficas. Registrar método, cobertura, fuente de reloj y precisión; no fingir una corrección por recursos locales.
- Tiempos de red (si se estudian) serán métricas auxiliares de validación, nunca sustitutos silenciosos de T₁/T₂ ni el KPI principal definido por el operador.

### 6.3. Contrato de telemetría neutral

El núcleo compartido define semántica, identidad y estados; cada plataforma implementa un adaptador. El adaptador ChatGPT Free es el único objetivo inmediato.

Campos mínimos:
- schema_version
- platform_adapter = chatgpt-web-free
- adapter_version
- conversation_id UUIDv7 local
- cycle_id UUIDv7 local
- tab_session_id local opaco, si es necesario para correlación
- framework_revision explícita
- model_label visible y opcional, si se obtiene sin leer mensajes
- t0_sent_at opcional
- t1_processing_started_at
- t2_processing_completed_at
- monotonic_t1_ms y monotonic_t2_ms
- chatgpt_ui_generation_ms
- measurement_method
- start_signal_id y end_signal_id
- clock_source y clock_precision_ms
- coverage
- status: MEASURED / INCOMPLETE / NOT_MEASURED
- reason_code cuando la evidencia del estado lo permita.

No se guardan prompt, respuesta, contenido del compositor, cookies, credenciales, cabeceras de autenticación ni cuerpos de solicitudes. Los IDs de DOM, pestaña y requests solo se usan con el mínimo alcance necesario para correlación local; evitar guardar URLs completas o parámetros.

### 6.4. Análisis de impacto entre revisiones del marco

- Asociar cada ciclo a framework_revision explícita y versionada por configuración local.
- Comparar mediana, P90, distribución y muestra válida entre revisiones.
- Si se puede leer sin extraer contenido, registrar model_label visible y un benchmark_case_id opaco.
- Mantener casos de comparación constantes y repetibles. Comparaciones observacionales no demuestran causalidad si cambian tarea, servicio, modelo o condiciones de red.
- No medir CPU/RAM ni usar esos valores para normalizar el KPI; la limitación del observador se documenta.

### 6.5. Métricas complementarias

- TTFT visual: T₁ → primera salida visible, si puede identificarse sin leer su contenido.
- Render overhead: T₂ → T₃, donde T₃ es fin visual de UI; diagnóstico secundario.
- T₀ → T₂/T₃ puede conservarse como tiempo de experiencia del usuario, separado del KPI primario.
- Tiempo de resolución de un objetivo multi-turno no se mezcla con duración del ciclo.
- Tiempo de iteración de desarrollo tampoco se mezcla con telemetría conversacional.

## 7. Datos, almacenamiento y seguridad

- Arquitectura local actual: content script → service worker → colector HTTP loopback 127.0.0.1:47321 → JSONL e índice local.
- El endpoint local está protegido por token local cargado desde Extension/local-auth.js; el secreto no debe mostrarse, copiarse al OCP ni entrar en Git.
- La ruta prevista de datos está bajo %LOCALAPPDATA%\Harmonia\; el subdirectorio de versión debe quedar consistente en todos los scripts antes de inicializar.
- Transporte actual sin outbox durable: si el colector está desconectado o cae durante la entrega, un evento puede perderse. No afirmar recuperación garantizada.
- El colector valida esquema y emparejamiento de eventos, idempotencia y duración; las consultas distinguen medidos, incompletos y no medidos.
- No iniciar colector, generar credenciales ni cargar Chrome hasta cerrar la inconsistencia de inicialización y verificar la identidad de sesión correcta.
- La captura de observabilidad se limita a la plataforma y superficies autorizadas. No registrar texto de conversaciones ni datos sensibles.
- Mantener datos locales fuera del repositorio y respaldos documentados. No subir datos observacionales a GitHub.

## 8. Calidad de vida: continuidad y exportación Markdown

### 8.1. Requisito solicitado

El operador desea que Harmonia detecte el estado/botón que aparece cuando una conversación debe continuar en un chat nuevo, que preserve la conversación en Markdown con alta calidad, identifique el botón S de continuación/reinstanciación y prepare un prompt para persistencia documental y recuperación del último ciclo literal.

### 8.2. Límite de cumplimiento

Los Términos de Uso de OpenAI vigentes desde el 1 de enero de 2026 prohíben la extracción automática o programática de datos o Output y eludir límites o restricciones del servicio. Por ello no se implementará una función que extraiga automáticamente del DOM el texto completo de una conversación de ChatGPT y lo descargue como Markdown, ni una secuencia que pulse controles o continúe automáticamente para sortear límites del plan gratuito. La clasificación es de cumplimiento contractual y no equivale por sí sola a una conclusión penal sobre la legalidad.

Sí se permite mantener el objetivo de continuidad por una ruta compatible:
1. El titular solicita y descarga una exportación oficial de ChatGPT mediante el mecanismo de configuración de su cuenta.
2. Harmonia procesa localmente el ZIP proporcionado por el operador, extrae la conversación elegida y genera un Markdown bien estructurado.
3. Se comparan formato y calidad con ejemplos reales que el operador aporte.
4. El sistema puede preparar localmente el prompt de reanudación que el operador pidió; no lo introduce ni lo envía automáticamente en ChatGPT.
5. La detección de la aparición del control/estado de chat nuevo puede limitarse a observación estructural/aviso sin extraer contenido ni activar el control.
6. El botón S debe ser identificado visual y funcionalmente antes de decidir qué asistencia permitida procede. Su activación no se automatiza en este sprint.

### 8.3. Calidad del Markdown

La plantilla objetivo debe considerar: título y metadatos; conversación cronológica; roles claramente identificados; jerarquía de encabezados; bloques de código preservados; tablas; citas/enlaces; adjuntos/imágenes referenciados cuando formen parte del ZIP; indicación explícita de truncamientos o datos ausentes; codificación UTF-8. No inventar contenido ni reconstruir partes faltantes.

La inspección previa encontró cero archivos .md en la raíz de Downloads; existe una carpeta de proyecto anidada otrogranprograma con README y docs Markdown. Esas muestras no son exportaciones de ChatGPT ni se consideran patrón aceptado. La comparación definitiva requiere una exportación oficial y/o ejemplos señalados por el operador.

### 8.4. Prompt de reanudación

El contenido solicitado por el operador es: leer el Markdown generado mediante RDC, persistirlo en la documentación del frente correspondiente, adquirir contexto y reproducir literal y textualmente la salida del último ciclo de la conversación de origen. La futura plantilla debe contener solo ese cometido y referencias concretas al archivo/ruta; se entrega como artefacto local para uso manual. No escribir en el compositor ni enviar a ChatGPT.

## 9. Interfaz y cobertura del catálogo

- Popup modernizado en la candidata local: estado del colector, indicadores de ciclo, cobertura, superficies, controles no clasificados, fuentes pendientes y diagnóstico.
- Mantener claridad visual, jerarquía, lectura rápida y estados explícitos.
- No mostrar porcentajes de cobertura sin base calculable.
- El catálogo estructural debe cubrir gradualmente regiones fuera del main: navegación, barra lateral, menús, selector de modelo, herramientas, controles, diálogos y configuración. Para cada superficie: selector/versionado, tipo de elemento, rol, atributos permitidos, relación estructural, estado y cobertura.
- No guardar innerText/textContent de mensajes, valor del compositor, formularios, cabeceras o contenido privado.
- No recopilar más de lo necesario; metadatos accesibles solo si están allowlisted y no contienen contenido conversacional.

## 10. Estado técnico verificable al corte

### 10.1. Paquete y versión

- Origen de extensión: paquete upstream v0.3.1, commit dcba260981837f75a8a05db85edd310c2a7a9736, 13 archivos de origen con cotejo previo de Git blob y SHA-256 13/13.
- Candidata local identificada parcialmente como v0.3.2: manifest.json, content.js, service-worker.js y rótulo popup HTML indican 0.3.2.
- La candidata **no es consistente ni apta para inicializarse**:
  - INICIAR-HARMONIA.ps1: data usa surface-index-v0.3.2, state sigue en v0.3.1, logs usa v0.3.2.
  - Mensaje de error del guard aún identifica Harmonia 0.3.1 aunque valida 0.3.2.
  - CONSULTAR-HARMONIA.ps1 y DETENER-HARMONIA.ps1 siguen apuntando a surface-index-v0.3.1.
  - Collector/server.js mantiene fallback histórico surface-index-v0.3.0.
  - Collector/query.ps1 mantiene fallback histórico surface-index-v0.3.0.
  - README sigue declarando versión y datos 0.3.1; se retirará su instrucción de ejecución manual.
  - MANIFEST-PROCEDENCIA-LOCAL.json refleja el origen v0.3.1, no los deltas locales candidatos 0.3.2.
- No ejecutar el inicializador y no presentar esta candidata como lista para Chrome hasta alinear versión, rutas, procedencia, README, consulta y detención.
- build-info.json no existía en main al último contraste; service-worker intenta leer metadatos remotos. La sincronización del repositorio puede reportar indisponibilidad aunque el colector opere. Resolverlo como tarea aislada.

### 10.2. Cambios locales sin commit

Último estado Git leído:
- Modificados: Collector/cycle-telemetry.js; Collector/server.js; Extension/content.js; Extension/manifest.json; Extension/popup.css; Extension/popup.html; Extension/popup.js; Extension/service-worker.js; INICIAR-HARMONIA.ps1; docs/frentes/harmonia/OBJETO-CANONICO.md.
- Nuevos: Collector/cycle-telemetry.test.js; Collector/tests/cycle-server.integration.test.js; Extension/cycle-observer.test.js.
- Rama work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d.

### 10.3. Implementación parcial de telemetría actual

- Extension/cycle-observer.js inicia actualmente el ciclo al detectar un nodo nuevo de usuario en la región de conversación y cierra tras encontrar respuesta del asistente y una transición inactiva estable.
- Reloj monotónico performance.now(); timestamp UTC derivado de performance.timeOrigin; IDs locales UUIDv7.
- Cobertura declarada por el código: new-dom-node-v1.
- El duration_ms actual mide nodo de usuario → última transición inactiva observada. No mide el KPI pedido T₁/T₂ gráfico; conservar como legado hasta reemplazo y migración deliberada.
- Resumen del colector implementa total/completados/medidos/en curso/no medidos, media, mediana, P90 y recientes. GET /cycles está autenticado.
- Service worker consulta /coverage y /cycles y entrega resumen al popup.
- Popup es una primera modernización; no aceptado visualmente en Chrome.
- No existe todavía un mapeo comprobado de las señales gráficas T₁/T₂ de ChatGPT.
- No hay adaptador OpenWebUI ni API. No se desarrollarán antes de aceptar el de ChatGPT Free.

### 10.4. Pruebas

- Node v24.0.0.
- Suite local sintética ejecutada en el corte actual: 15/15 PASS, 0 fallos:
  - cycle-observer: 11.
  - cycle-telemetry: 3.
  - integración servidor/JSONL: 1.
- node --check: 6/6 PASS (content.js, cycle-observer.js, service-worker.js, popup.js, server.js, cycle-telemetry.js).
- Parser PowerShell de INICIAR-HARMONIA.ps1: PASS; esto valida sintaxis, no coherencia de rutas.
- No existe prueba natural de ChatGPT, no se ha cargado ni aceptado la extensión, no se ha validado Chrome E2E y no se ha acreditado HEALTH=OK en esta instancia.
- No se ha generado Extension/local-auth.js, iniciado el colector ni creado un almacén nuevo durante este trabajo.
- Los 15 tests sintéticos no prueban T₁/T₂, cobertura de todas las superficies ni la nueva métrica gráfica.

## 11. Restricciones explícitas y acciones que no se hacen

- No automatizar ChatGPT, no controlar la cuenta, no enviar prompts, no pulsar botones de la plataforma ni automatizar flujos para evitar los límites de la modalidad gratuita.
- No extraer programáticamente contenido conversacional de ChatGPT.
- No automatizar login ni manejo de credenciales.
- No capturar prompt, respuesta, compositor, cookies, claves, cabeceras o contenido de solicitudes.
- No usar APIs de pago ni disparar consumo de terceros.
- No instalar, cargar o activar extensión en Chrome en ausencia de una compuerta específica de autorización.
- No cambiar main, publicar, fusionar o desplegar sin autorización separada.
- No usar otra identidad RDC ni transferir autorización por nombre de dispositivo.
- No equiparar duración de ciclo, tiempo de generación, experiencia visual y tiempo de resolución de objetivo.

## 12. Backlog único del sprint OMM-01

Las tareas siguientes reemplazan los listados fragmentados de §§53, 55 y 56 del histórico. Su estado se mantiene aquí. La referencia D-xxx enlaza cada tarea con el dictado origen.

| Orden | ID | Prioridad | Tarea / resultado verificable | Traza | Estado |
|---:|---|---|---|---|---|
| 0 | OMM-01-000 | P0 | Consolidar OCP vigente, conservar verbatim y archivar OCP anterior con SHA/read-back. | D-005, D-009 | HECHO local |
| 1 | OMM-01-001 | P0 | Alinear la candidata 0.3.2: rutas data/state/logs, scripts inicio/consulta/detención, fallback servidor, README y manifiesto delta. No ejecutar hasta terminar. | D-001, D-006, D-007 | PENDIENTE |
| 2 | OMM-01-002 | P0 | Resolver disponibilidad/auth de Codex CLI en el contexto autorizado; definir ejecución sandbox workspace-write, revisión diff y pruebas. | D-005, D-008 | BLOQUEADO por contexto/auth |
| 3 | OMM-01-003 | P0 | Inspeccionar de manera permitida la UI de ChatGPT Free y documentar la señal gráfica de inicio T₁, estados alternos y falsos positivos. | D-002, D-004, D-005 | PENDIENTE de evidencia natural |
| 4 | OMM-01-004 | P0 | Identificar señal gráfica inequívoca de fin T₂ de generación final; cubrir streaming/herramientas/respuestas intermedias. | D-002, D-004, D-005 | PENDIENTE de evidencia natural |
| 5 | OMM-01-005 | P0 | Diseñar/implementar el núcleo neutral: processing_started, processing_completed, UUIDv7, reloj monotónico, cobertura y estados. | D-003, D-005 | PROVISIONAL |
| 6 | OMM-01-006 | P0 | Implementar adaptador chatgpt-web-free que emita T₁/T₂ gráficos y chatgpt_ui_generation_ms. | D-002, D-003, D-004, D-005 | PENDIENTE |
| 7 | OMM-01-007 | P0 | Probar start/finish, streaming, herramientas, intermedios, cancelación, retry, pestaña cerrada, varias conversaciones y observador demorado; no fabricar duración en ambigüedad. | D-002, D-004, D-005 | PENDIENTE |
| 8 | OMM-01-008 | P1 | Ampliar catálogo estructural a toda la UI relevante de ChatGPT, con minimización de datos y versiones. | D-001, D-005 | PENDIENTE |
| 9 | OMM-01-009 | P1 | Actualizar popup para mostrar KPI gráfico, mediana/P90, muestra, cobertura, no medidos y método. | D-001, D-002, D-005 | PENDIENTE |
| 10 | OMM-01-010 | P1 | Corregir metadatos de sincronización build-info.json y estados current/update-available sin ejecutar código remoto. | D-001 | PENDIENTE |
| 11 | OMM-01-011 | P1 | Etiquetar ciclos con framework_revision explícita y modelo visible cuando sea posible; habilitar comparaciones controladas entre revisiones. | D-004, D-005 | PENDIENTE |
| 12 | OMM-01-012 | P1 | Diferenciar estado visual «Chat nuevo» de otros límites; detección estructural/aviso sin extracción ni activación. | D-005 | PENDIENTE |
| 13 | OMM-01-013 | P1 | Construir plantilla Markdown y procesador local de ZIP de exportación oficial suministrado por el operador. | D-005 | PENDIENTE |
| 14 | OMM-01-014 | P2 | Identificar el botón S, sus efectos y límites; documentar sin pulsarlo automáticamente. | D-005 | PENDIENTE |
| 15 | OMM-01-015 | P2 | Producir artefacto local de prompt de reanudación con el encargo exacto del operador; el uso/envío permanece manual. | D-005 | PENDIENTE |
| 16 | OMM-01-016 | P1 | Operar el bucle semiautomatizado de desarrollo con Codex CLI, evidencia, selección automática de siguiente tarea y actualización del OCP. | D-001, D-005, D-008 | PROVISIONAL / bloqueado hasta OMM-01-002 |
| F1 | OMM-FUT-001 | FUTURO | Formalizar guía de incorporación de adaptadores sobre el contrato neutral. | D-003, D-005 | DIFERIDO |
| F2 | OMM-FUT-002 | FUTURO | Adaptador para OpenWebUI de Cora. | D-003, D-005 | DIFERIDO |
| F3 | OMM-FUT-003 | FUTURO | Adaptador para otros clientes API/streaming. | D-003, D-005 | DIFERIDO |

### Ruta crítica

OMM-01-001 → OMM-01-002 → OMM-01-003 → OMM-01-004 → OMM-01-005 → OMM-01-006 → OMM-01-007 → OMM-01-009.

OMM-01-008 y OMM-01-010 pueden avanzar en paralelo cuando no interfieran con la ruta crítica. OMM-01-011 debe estar listo antes de comparar revisiones del marco. OMM-01-013…015 son mejoras de continuidad permitidas por exportación oficial y control manual.

Si una tarea queda bloqueada por autorización o por límite de cumplimiento, registrar la causa y elegir la siguiente tarea no bloqueada. No pedir al operador que resuelva decisiones técnicas ordinarias.

## 13. Criterios de aceptación del sprint

### Ingeniería
- Paquete y scripts coherentes, con una sola versión y una sola raíz de datos.
- T₁ y T₂ identificados por señales reales y reproducibles, no por selectores supuestos.
- El KPI primario usa ambas transiciones gráficas, misma base monotónica y no suma el tiempo de asentamiento.
- La métrica histórica duration_ms conserva su significado y no contamina el nuevo KPI.
- Ciclos ambiguos, cancelados o sin cierre se identifican sin duración inventada.
- Pruebas sintéticas cubren estados de transición y regresión.
- La UI muestra la métrica, cobertura y falta de medición sin inducir a error.

### Aceptación natural
- Solo se acredita tras una prueba controlada con la extensión efectivamente cargada en Chrome y señales reales de ChatGPT Free.
- No afirmar cobertura de todas las conversaciones hasta probar varias conversaciones, pestañas, navegación SPA y reinicios.
- La aceptación de ingeniería y la aceptación natural del operador son estados distintos.

### Comparación de revisiones
- Cada ciclo debe indicar framework_revision conocida.
- Usar casos repetibles y agrupar por etiqueta de modelo cuando esté visible.
- Reportar tamaño de muestra, mediana, P90 y cobertura.
- No inferir causalidad si la comparación no controla tarea/modelo/servicio/red.

## 14. Referencias y fuentes vigentes

- Repositorio: https://github.com/SeryMente/khora
- DUG: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html — v388 / NX-388m, revisado; edad de main NO VERIFICADA.
- ART-027: separación de telemetría de consulta de principios y métricas operativas.
- ART-024: identidad conversacional y relación entrada/salida.
- OpenAI Terms of Use, vigentes desde 2026-01-01: https://openai.com/es-US/policies/row-terms-of-use/
- Exportación oficial de historial y datos de ChatGPT, disponible para ChatGPT Free: https://help.openai.com/es-419/articles/7260999-exporting-your-chatgpt-history-and-data
- Chrome webRequest API, si se evalúa como señal auxiliar: https://developer.chrome.com/docs/extensions/reference/api/webRequest
- PerformanceResourceTiming, solo como contraste técnico auxiliar: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming

La existencia de estas referencias no prueba que un endpoint concreto de ChatGPT esté instrumentado ni autoriza automatizar su acceso.

## 15. Estado operativo y siguiente acción

**Estado del sprint:** definido documentalmente; ejecución técnica parcialmente avanzada; aceptación natural pendiente.

**Siguiente acción elegida:** OMM-01-001 — reparar coherencia de la candidata local v0.3.2 y retirar de README las instrucciones que trasladan trabajo técnico al operador. No iniciar el colector ni cargar Chrome hasta completar la coherencia y el preflight.

**No se ha hecho en esta consolidación:** commit, push, merge, PR, activación de extensión, inicialización del colector, creación de credenciales, captura natural, exportación de conversaciones, ejecución de Codex como agente o aceptación del operador.

### Trazabilidad del corte

- IPZ: v0.7 · edad NO VERIFICADA.
- DUG: v388 / NX-388m · edad de main NO VERIFICADA.
- OCP: HARMONIA-v0.48 local.
- CONV / OCP / CICLO / A / B: PENDIENTE / NO ASIGNADO; FOL1 no activa.
- Titularidad: generación 15.
- Dispositivo RDC autorizado: b573344f-c68f-47c9-9c2e-ae67f2e63bdb.
- UUIDv7 local de esta consolidación: 01a1c6f7-9c91-7d0b-ae7e-7808c0f41fd2.
- FOL1: PREPARADA / NO ACTIVA.
- MCP normativo: DESACTIVADO.

---

## 16. Hito 1 del sprint OMM-01: bucle mínimo operativo (BMO-01)

### 16.1. Instrucción verbatim que establece el hito · D-010

Clave documental local: D-010. Es una referencia documental, no un folio oficial.

~~~text
Bueno, tal parece que el primer hito de desarrollo sería ese tal que cuando se alcance, lo que tendremos es una versión de la extensión con la capacidad mínima suficiente para establecer el bucle de observación, medición y mejora semiautomatizada. a partir de ahí, ¿estás de acuerdo?
~~~

### 16.2. Decisión

Sí. El primer hito de desarrollo de OMM-01 es entregar una versión mínima operativa de Harmonia que permita ejecutar el bucle completo de **observación → medición → análisis → selección de mejora → desarrollo asistido por Codex CLI → pruebas → actualización del backlog**, con evidencia real y sin dirección técnica continua del operador.

El hito no equivale a terminar todas las funciones de la extensión. Significa que existe capacidad suficiente para que el bucle produzca mejoras verificables y pueda repetirse.

Nombre del hito: **BMO-01 — Bucle Mínimo Operativo**.

### 16.3. Capacidades mínimas requeridas

1. **Observación ChatGPT Free:** la extensión observa las superficies imprescindibles de la UI para reconocer el inicio y el final de los ciclos y diagnosticar su cobertura. Los estados y selectores T₁/T₂ se basan en evidencia natural, no en hipótesis.
2. **Medición:** cada ciclo correlacionado emite las señales semánticas processing_started y processing_completed; calcula chatgpt_ui_generation_ms = T₂ − T₁ con reloj monotónico y método/cobertura explícitos. Ciclos ambiguos quedan sin medición.
3. **Persistencia local:** los eventos se conservan fuera del repositorio, sin contenido de conversación, con validación, idempotencia y consulta de estados.
4. **Análisis visible:** popup/consulta presenta cantidad de ciclos, mediana, P90, cobertura, estados incompletos/no medidos y versión del marco de trabajo. No confunde métricas históricas DOM con el KPI gráfico.
5. **Contexto del producto:** el ciclo de medición puede relacionarse con framework_revision explícita; modelo visible/caso de benchmark son campos opcionales.
6. **Backlog trazable:** cada mejora se vincula a instrucciones verbatim y evidencia observable. El agente elige la tarea prioritaria no bloqueada.
7. **Ejecución asistida:** Codex CLI opera autenticado bajo el contexto autorizado, desde el workspace del frente, con sandbox workspace-write y sin bypass de aprobaciones. Ejecuta la tarea, pruebas y correcciones; el asistente revisa el diff y la evidencia.
8. **Cierre reproducible:** cada iteración registra archivos afectados, pruebas, resultado, limitaciones, estado de aceptación y siguiente tarea. El bucle puede seleccionar y ejecutar una segunda iteración sin que el operador vuelva a diseñar el trabajo.

### 16.4. Criterios de aceptación del BMO-01

El hito se declarará **ALCANZADO** solo cuando se cumplan todos los siguientes criterios:

- La candidata local tiene versión, rutas, inicializador, consulta, detención, README y manifiesto de procedencia coherentes.
- Se ha identificado y probado naturalmente T₁ y T₂ en ChatGPT Web gratuito; se han cubierto al menos respuesta simple, streaming/respuesta larga y una conversación con transición relevante (por ejemplo, navegación o herramienta cuando la plataforma la exponga).
- Un mínimo de cinco ciclos naturales de prueba quedan correlacionados y persistidos con estados correctos. Los ciclos no medibles se contabilizan y explican, no se eliminan del denominador de cobertura.
- chatgpt_ui_generation_ms se calcula únicamente a partir de marcas gráficas T₁/T₂ válidas y no incorpora la ventana de asentamiento ni el renderizado posterior.
- La consulta local y la UI muestran mediana, P90, muestra, cobertura, INCOMPLETE/NOT_MEASURED y framework_revision.
- No se ha almacenado texto de mensajes, prompts, respuestas, compositor, cookies, credenciales o cuerpos de solicitudes.
- Codex CLI ha completado al menos una iteración real sobre una tarea derivada de instrucciones verbatim/evidencia y ha producido un diff revisado y pruebas PASS.
- La documentación y backlog se actualizan después de esa iteración, y una segunda selección automática identifica la siguiente tarea prioritaria sin pedir al operador decisiones técnicas ordinarias.
- El estado diferencia claramente pruebas sintéticas, observación natural y aceptación del operador.
- No se ha automatizado la interacción con ChatGPT, la extracción programática de sus salidas ni acciones para sortear límites de la modalidad gratuita.

Los cinco ciclos son umbral inicial del hito, no garantía estadística de cobertura universal. La cobertura de todas las conversaciones y casos se seguirá ampliando después del BMO-01.

### 16.5. Fuera del BMO-01

No bloquean la consecución del primer hito:
- perfeccionamiento cosmético completo del popup más allá de la claridad funcional necesaria;
- exportación Markdown y continuidad mediante exportación oficial;
- detección y aviso del botón «Chat nuevo»;
- identificación/uso asistido del botón S;
- adaptadores OpenWebUI de Cora y API;
- panel avanzado de análisis/benchmark;
- publicación en main o despliegue.

Estas funciones continúan en el backlog del sprint, pero se ordenan después del núcleo mínimo salvo que una sea necesaria para verificar un criterio de aceptación.

### 16.6. Ruta de tareas agrupada en el hito

| Orden | tarea | dependencia | criterio de salida |
|---:|---|---|---|
| 1 | OMM-01-001 · reconciliar la candidata 0.3.2 | ninguna | paquete y runtime coherentes, sin inicializar |
| 2 | OMM-01-002 · habilitar Codex CLI | ninguna; puede avanzar en paralelo | CLI autenticada bajo el contexto de trabajo autorizado y sandbox acotado |
| 3 | OMM-01-003 · identificar T₁ gráfico | paquete inspeccionable | señal de inicio observada y documentada |
| 4 | OMM-01-004 · identificar T₂ gráfico | OMM-01-003 | señal de fin inequívoca observada |
| 5 | OMM-01-005 · núcleo neutral de eventos | OMM-01-003/004 | contrato común y pruebas |
| 6 | OMM-01-006 · adaptador ChatGPT Free | OMM-01-005 | KPI gráfico implementado |
| 7 | OMM-01-007 · matriz de pruebas | OMM-01-006 | casos ambiguos y extremos controlados |
| 8 | OMM-01-009 · panel de métricas | OMM-01-006/007 | estadísticas y cobertura visibles |
| 9 | OMM-01-016 · bucle de agente con Codex | OMM-01-002 y pipeline anterior | una iteración ejecutada, revisada y documentada |

El catálogo de superficies OMM-01-008 y los metadatos de sincronización OMM-01-010 pueden avanzar en paralelo, siempre que no desvíen la ruta crítica ni retrasen el BMO-01.

### 16.7. Estado actual del hito

**BMO-01: NO ALCANZADO.**

Base de ingeniería existente: 15/15 tests sintéticos PASS, popup parcialmente renovado, colector local con resumen de ciclos y extensión candidata v0.3.2 parcialmente inconsistente.

Bloqueos principales:
- reconciliar scripts y rutas de datos mixtas v0.3.0/v0.3.1/v0.3.2;
- Codex CLI está instalado (0.167.0) pero el contexto RDC CENTRAL\MantenimientoRCI no está autenticado; no se ha confirmado autenticación bajo CENTRAL\fila4;
- no se han observado naturalmente las señales gráficas T₁/T₂;
- no existe todavía un ciclo natural medido por el nuevo KPI.

No se declara que el sprint haya llegado al primer hito por tener el OCP consolidado o tests sintéticos verdes.

### 16.8. Regla de continuación

A partir de este corte, el backlog se evalúa primero contra el objetivo BMO-01. Las tareas de mejoras posteriores no desplazan los bloqueadores del hito salvo que aporten una dependencia necesaria o el operador modifique expresamente la prioridad mediante un nuevo dictado verbatim.

UUIDv7 local de este hito: 01a1c70b-c4aa-71a2-a8b5-2f6c668cba9f. FOL1 permanece preparada/no activa; folios CV/CY/A/B no asignados.

# Harmonia · Objeto de Proyecto Canónico (OCP)

**Versión local:** 0.58  
**Sello:** HARMONIA-v0.58  
**Corte:** 2026-11-10 · America/Mexico_City  
**Sprint activo:** **OMM-01 — Observa · Mide · Mejora**  
**Estado del OCP:** v0.58 actualizado localmente; read-back y SHA-256 verificados; no publicado en main.

> Este documento es la fuente de verdad operativa del frente Harmonia. Las instrucciones del operador se conservan en el registro verbatim de §5. Las decisiones, tareas y criterios de aceptación deben poder rastrearse razonablemente a esas entradas. Los cortes históricos que ya no gobiernan el estado actual se preservan, sin autoridad normativa, en archive/: OCP v0.47, v0.48, v0.49, v0.50, v0.51, v0.52, v0.53 y v0.54. Esos archivos son históricos y no gobiernan el sprint.

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
7. DUG revisado: v388 / NX-388m; commit main a34c1c5b43edbcbaf015056f4dc892f5def29eea, archivo HTML blob 4db0ebadfd1e48b2bdec9236ba7f344921e4a865 (revisión consultada el 2026-11-10). ART-027 separa la telemetría de consulta/recuperación de principios de las métricas operativas de Harmonia; el conteo de consultas normativas no mide aplicación de principios ni se debe asociar a cada ciclo conversacional. ART-024 sirve de referencia para distinguir identidad de conversación y relación entrada/salida. Edad exacta del último commit main: NO VERIFICADA.
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

Las claves D-001 a D-014 son referencias documentales locales, no folios FOL1. D-010 se incorpora en la sección 16.1, D-011 en la sección 17.1, D-012 en la sección 18.1, D-013 en la sección 20.1 y D-014 en la sección 21.1; los dictados anteriores no se reescriben.

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

### D-013 · Continuidad de OMM-01-018

~~~text
Avanza pues.
~~~

### D-014 · Recarga de desarrollo tras modificaciones y continuidad del sprint

~~~text
Ya cargue la extension.

Hay forma de automatizar la carga de la extension tras cada modificacion?

No pierdas de vista los objetivos del sprint, y sus hitos.
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
- La señal T₂ debe cerrar la generación final, no una respuesta intermedia de herramienta ni un fragmento de streaming. Si el final es ambiguo, el ciclo es INCOMPLETE o NOT_MEASURED. El timestamp T₂ se ancla en la primera transición gráfica de actividad a inactividad después de T₁, aunque el nodo de respuesta final aún no se haya pintado. La aparición posterior de la respuesta del asistente y la estabilidad validan el cierre del ciclo, pero no desplazan T₂ ni incorporan el renderizado local.
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
- La candidata 0.4.0 dispone de outbox durable en chrome.storage.local, limitada a 1.500 eventos o 4 MiB; conserva orden y reenvía al colector cuando está disponible y autenticado. Es persistencia dentro del perfil Chrome, no respaldo independiente; si se elimina el almacenamiento de la extensión, la cola puede perderse.
- El colector valida esquema y emparejamiento de eventos, idempotencia y duración; las consultas distinguen medidos, incompletos y no medidos.
- La inicialización del colector y cualquier credencial local son una compuerta separada: solo se ejecutan con identidad y autorización verificadas. La carga de la extensión ya fue reportada por el operador; no equivale a aceptación natural.
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

### 10.1. Paquete local candidato v0.4.0

- **Estado:** candidata Manifest V3 v0.4.0 cargada y registrada en Chrome Profile del usuario fila4, verificada por RDC el 2026-11-10; aceptación funcional pendiente.
- Directorio cargable: `KHORA/Harmonia/Extension/`; `manifest.json` está directamente en esa raíz.
- Versión del manifiesto, popup y guard de content script: **0.4.0**.
- La candidata deriva de la fuente upstream v0.3.1, revisión `dcba260981837f75a8a05db85edd310c2a7a9736`; no se presenta como versión publicada en main.
- Las rutas de datos/estado/logs del inicializador, consulta, detención y fallback del colector quedaron alineadas a `surface-index-v0.4.0`.
- El inicializador valida Manifest V3 y versión 0.4.0. El README ya no instruye al operador a ejecutar archivos CMD/PowerShell.
- `Extension/build-info.json` identifica explícitamente una candidata local, no una versión publicada. El service worker permite estado `catalog-only` cuando el repositorio remoto no publica build-info.json; solo sincroniza JSON validado y nunca ejecuta JavaScript remoto.
- `MANIFEST-PROCEDENCIA-LOCAL.json` v2 distingue hashes de origen upstream, hashes actuales de la candidata, archivos locales nuevos y pruebas sintéticas. No incluye `local-auth.js`, tokens ni secretos.

### 10.2. Persistencia offline y colector

- La extensión usa `chrome.storage.local` como cola durable local previa al colector, con límite de 1.500 eventos o 4 MiB.
- Los eventos se guardan antes de considerarse encolados. La cola conserva el orden; reenvía cuando el colector local responde y retira cada evento solo después de una aceptación HTTP. El colector aplica idempotencia por eventId/hash.
- La cola local contiene eventos sanitizados y metadatos estructurales allowlisted; no prompts, respuestas ni texto del compositor.
- El popup muestra eventos pendientes y resume ciclos gráficos a partir de la cola cuando el colector aún no está disponible.
- Si la cola llega a su límite, el service worker informa error y conserva los eventos ya guardados; no realiza borrado silencioso.
- El colector local sigue previsto en `127.0.0.1:47321`, con almacenamiento fuera de Git en `%LOCALAPPDATA%\Harmonia\surface-index-v0.4.0\data`.
- **No se generó** `Extension/local-auth.js`; no se creó el almacén local; no se inició el colector ni se verificó HEALTH=OK. La candidata puede observar y almacenar localmente en Chrome sin esa credencial, pero no puede transferir la cola al colector hasta que este se inicialice y autentique.
- No se ha accedido, copiado ni mostrado ninguna credencial.

### 10.3. Implementación de telemetría en la candidata

- El observador identifica el turno por inserción de un nuevo nodo de usuario, pero no inicia el cronómetro en ese punto.
- T₁ se emite al detectar la transición gráfica de inactividad a actividad después del nuevo nodo.
- T₂ queda anclado en la primera transición gráfica de actividad a inactividad posterior a T₁, aunque el nodo de respuesta aún no se haya pintado. La presencia posterior de un nodo de respuesta del asistente y una ventana de estabilidad de 1.500 ms confirman la correlación/cierre, sin mover T₂ ni sumar esa espera al tiempo.
- Señales candidatas implementadas: `aria-busy=true`, `data-is-streaming=true`, controles visibles Stop/Detener e indicadores de progreso de agentes/tareas. Sus selectores son hipótesis de ingeniería; la observación natural de ChatGPT Free sigue pendiente.
- KPI candidato: `chatgpt_ui_generation_ms = T₂ − T₁`, métrica `chatgpt-ui-generation.v1`, método `ui-activity-transition-v1`, cobertura `chatgpt-ui-activity-state-v1`.
- Cada evento lleva `platform_adapter=chatgpt-web-free` y `framework_revision=HARMONIA-v0.50+DUG-v388-NX-388m`.
- El campo histórico `duration_ms`/`new-dom-node-v1` permanece separado y se muestra como `LEGACY_MEASURED`. No entra en median/P90 del KPI nuevo.
- El colector y la consulta PowerShell reconocen el nuevo formato, conservan lectura de registros legacy y separan nuevas mediciones de las métricas antiguas.

### 10.4. Interfaz

- Popup v0.4.0 actualizado: mediana, P90, muestra gráfica, marco de trabajo, ciclos incompletos/no medidos, historial legacy, cobertura, superficies y diagnóstico.
- Cuando el colector no está disponible, la UI distingue observación local/cola pendiente de persistencia confirmada en el colector.
- No se ha comprobado visualmente el popup en Chrome; la aceptación visual/natural está pendiente.

### 10.5. Pruebas y verificación ejecutadas

- Node.js v24.0.0.
- Suite sintética más reciente: **16/16 PASS**, 0 fallos:
  - observador gráfico: 11;
  - agregación de telemetría: 3;
  - integración servidor/JSONL: 1;
  - service worker y cola offline sin credenciales: 1.
- `node --check`: 6/6 PASS para content.js, cycle-observer.js, service-worker.js, popup.js, server.js y cycle-telemetry.js.
- JSON: manifest, build-info y ambos catálogos deben mantener parseo válido; validación local ejecutada.
- Scripts PowerShell: análisis sintáctico sin errores; no equivale a ejecutar el inicializador.
- RDC verificó el registro de Harmonia v0.4.0 en Chrome Profile, ruta exacta KHORA/Harmonia/Extension, sin motivos de deshabilitación y con service worker registrado/iniciado. La revisión posterior no encontró evidencia de escrituras confirmadas en chrome.storage.local ni eventos en cola; no existe aún observación natural validada de ChatGPT Free ni prueba real de T₁/T₂.
- No existe autenticación verificada de Codex CLI en el contexto de ejecución RDC. CLI detectada en el perfil fila4 como v0.167.0; `codex login status` bajo `CENTRAL\MantenimientoRCI` devolvió Not logged in. No se ha iniciado sesión ni manipulado credenciales.
- **Dictamen:** candidata 0.4.0 cargada y registrada en Chrome; flujo de observación/persistencia local todavía NO VERIFICADO; BMO-01 NO ALCANZADO.

### 10.6. Rama y cambios locales

- Rama: `work/harmonia-front-workspace-20261110`.
- HEAD base sin commit nuevo: `9fd5c18205e39b6db12c9152b07d8f880f6b256d`.
- Cambios no committeados: extensión, service worker/cola, colector, scripts de consulta/inicio/detención, contrato de telemetría, README, manifiesto de procedencia, tests y OCP.
- Archivos históricos OCP v0.47, v0.48, v0.49, v0.50 y v0.51 preservados por separado con hash cotejado.
- No hubo cambio de main, push, merge, PR ni despliegue. La carga de la extensión fue realizada por el operador y verificada por RDC; no se modificó la configuración de Chrome durante esta revisión.
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

Las tareas se mantienen trazables a D-001…D-014. El backlog es la lista operativa única; las secciones anteriores describen propósito y criterios, no listas paralelas.

| Orden | ID | Prioridad | Tarea / resultado verificable | Traza | Estado |
|---:|---|---|---|---|---|
| 0 | OMM-01-000 | P0 | Consolidar OCP, preservar versiones anteriores y registrar instrucciones verbatim. | D-005, D-009, D-011, D-012 | HECHO local; v0.54 en curso |
| 1 | OMM-01-001 | P0 | Candidata 0.4.0 coherente: manifiesto, rutas, scripts, documentación, cola offline y manifiesto de procedencia. Carga en Chrome Profile verificada por RDC. | D-001, D-006, D-007, D-009, D-011 | **HECHO local; 0.4.0 cargada y registro verificado** |
| 2 | OMM-01-002 | P0 | Resolver disponibilidad/autenticación de Codex CLI bajo contexto autorizado y configurar ejecución sandbox workspace-write con revisión de diff. | D-005, D-008, D-011 | **BLOQUEADO** por autenticación/contexto RDC; instalación v0.167.0 detectada |
| 3 | OMM-01-003 | P0 | Confirmar naturalmente señal gráfica T₁ en ChatGPT Free, variantes y falsos positivos. | D-002, D-004, D-005, D-011 | **CANDIDATA IMPLEMENTADA; validación natural pendiente** |
| 4 | OMM-01-004 | P0 | Confirmar naturalmente señal gráfica T₂ de respuesta final, streaming/herramientas/intermedios. | D-002, D-004, D-005, D-011 | **CANDIDATA IMPLEMENTADA; validación natural pendiente** |
| 5 | OMM-01-005 | P0 | Núcleo semántico común, UUIDv7, reloj monotónico, cobertura, estados y validación de pares. | D-003, D-005, D-011 | **IMPLEMENTADO; tests sintéticos PASS** |
| 6 | OMM-01-006 | P0 | Adaptador chatgpt-web-free y KPI chatgpt_ui_generation_ms. | D-002, D-003, D-004, D-005, D-011 | **CANDIDATO 0.4.0 IMPLEMENTADO; natural pendiente** |
| 7 | OMM-01-007 | P0 | Casos sintéticos de inicio, fin, streaming, reactivación, ciclos incompletos, UUID, privacidad y persistencia offline; completar matriz natural después de verificar arranque y cola. | D-002, D-004, D-005, D-011, D-013 | **20/20 pruebas PASS en suite Extensión/Collector; la matriz natural sigue pendiente** |
| 8 | OMM-01-008 | P1 | Ampliar catálogo a navegación, barra lateral, menús, selector de modelo, herramientas, diálogos y controles. | D-001, D-005, D-011 | PENDIENTE; la cobertura actual no es toda la UI |
| 9 | OMM-01-009 | P1 | Popup con KPI, mediana/P90, muestra, revisión del marco, legado DOM, cola offline y cobertura. | D-001, D-002, D-005, D-011 | **Popup funcional y verificado en Chromium headless; aceptación natural en perfil principal pendiente** |
| 10 | OMM-01-010 | P1 | Metadatos locales build-info y modo catalog-only cuando main no publica el archivo de versión; sin ejecutar código remoto. | D-001, D-011 | **IMPLEMENTADO en candidata local** |
| 11 | OMM-01-011 | P1 | Etiquetar ciclos con framework_revision y habilitar comparaciones entre revisiones. Modelo/caso benchmark se incorporan solo con fuente visible y sin leer mensajes. | D-004, D-005, D-011 | **framework_revision IMPLEMENTADO; modelo/benchmark pendiente** |
| 12 | OMM-01-012 | P1 | Detectar estado/botón «Chat nuevo» y diferenciar límite de contexto/uso/nueva conversación; aviso estructural sin accionar. | D-005, D-011 | PENDIENTE |
| 13 | OMM-01-013 | P1 | Plantilla Markdown y conversión local de ZIP de exportación oficial suministrado por el operador. | D-005, D-011 | PENDIENTE |
| 14 | OMM-01-014 | P2 | Identificar el botón S, sus efectos y límites sin activarlo automáticamente. | D-005, D-011 | PENDIENTE |
| 15 | OMM-01-015 | P2 | Crear prompt local de reanudación contextual; uso/envío manual por el operador. | D-005, D-011 | PENDIENTE |
| 16 | OMM-01-016 | P1 | Ejecutar iteraciones semiautomatizadas con Codex CLI, revisar diff/tests, actualizar OCP y seleccionar la siguiente tarea. | D-001, D-005, D-008, D-011 | **BLOQUEADO** hasta OMM-01-002 |
| 17 | OMM-01-017 | P1 | Preservar el último tramo de continuidad y repetir la salida visible de origen como original literal, con estado actual separado del histórico. | D-012 | **HECHO local; original creado; OCP actualizado** |
| 18 | OMM-01-018 | P0 | Diagnosticar el arranque del service worker, la inyección del content script y el primer ui.surface.scan; confirmar persistencia en la cola local sin depender del colector y corregir el bloqueo que se demuestre. | D-001, D-005, D-011, D-012, D-013 | **Inyección automática, primer barrido y cola local demostrados en Chromium headless 153; validación natural en sesión real pendiente** |
| 19 | OMM-01-019 | P1 | Automatizar la recarga de la extensión desempaquetada tras cada modificación validada y verificar el runtime; proteger pestañas ChatGPT activas y no recargarlas durante generación ni escritura. | D-006, D-007, D-009, D-014 | **DISEÑO DOCUMENTADO; no implementada en Chrome principal; requiere canal CDP/DevTools permitido y recarga segura de scripts** |
| 20 | OMM-01-020 | P0 | Endurecer detección de ciclos y mostrar cobertura de observación estructural desde la outbox local cuando el colector no está disponible; separar cobertura local de observación natural. | D-001, D-002, D-005, D-011, D-013 | **CANDIDATA 0.4.2 IMPLEMENTADA; 20/20 pruebas y E2E headless PASS; corrección menor de plural del popup incorporada; validación natural pendiente** |
| F1 | OMM-FUT-001 | FUTURO | Guía de incorporación de adaptadores sobre el contrato neutral. | D-003, D-005 | DIFERIDO |
| F2 | OMM-FUT-002 | FUTURO | Adaptador OpenWebUI de Cora. | D-003, D-005 | DIFERIDO |
| F3 | OMM-FUT-003 | FUTURO | Adaptadores para clientes API/streaming externos. | D-003, D-005 | DIFERIDO |

### Dependencias y orden válido

**Ruta del paquete cargable:** OMM-01-001 (completada) → carpeta Extension lista. No depende de Codex CLI ni de generar credenciales porque la candidata utiliza una cola local Chrome durable.

**Ruta de medición aceptable:** OMM-01-001 → OMM-01-018 (regresión offline PASS; confirmar en Chrome inyección, primer evento persistido y popup) → OMM-01-003/004 (señales naturales T₁/T₂) → OMM-01-005/006 → OMM-01-007 (matriz natural) → OMM-01-009 (validación visual y métricas).

**Ruta de agente:** OMM-01-002 → OMM-01-016. El agente Codex no se declara operativo mientras su login/contexto no estén verificados.

OMM-01-010 y OMM-01-011 están implementadas a nivel candidato y pueden apoyar inmediatamente la comparación futura. OMM-01-008 puede seguir evolucionando con datos de cobertura. OMM-01-012 a 015 no bloquean BMO-01. OMM-01-018 mantiene bloqueada la aceptación natural de OMM-01-003/004/007 hasta verificar en Chrome la inyección, el primer evento local y la respuesta del popup. OMM-01-019 mejora la velocidad de iteración y debe implementarse sin desplazar las compuertas P0 ni el primer ciclo natural.

### Bloqueos reales y su alcance

- **No bloquea la carga descomprimida:** la carpeta Extension está completa como paquete MV3 y la cola local permite empezar a persistir eventos en chrome.storage.local sin colector/credencial.
- **Sí bloquea la transferencia al colector JSONL:** falta inicializar el colector y la credencial local bajo la sesión interactiva correcta. No se generó ni expuso token. La cola se retransmitirá al colector cuando su endpoint responda y el service worker disponga de autenticación local.
- **Sí bloquea la aceptación de T₁/T₂:** las señales implementadas siguen siendo candidatas hasta su observación natural en ChatGPT Free.
- **Sí bloquea el bucle autónomo Codex:** CLI instalada, pero autenticación en el contexto RDC técnico no verificada. No manipular credenciales ni eludir identidad.

No hay bloqueo conocido para entregar la carpeta candidata lista para que el operador la cargue. BMO-01 permanece NO ALCANZADO hasta cumplir los criterios naturales y de agente.

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
- DUG: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html — v388 / NX-388m, main commit a34c1c5b43edbcbaf015056f4dc892f5def29eea, HTML blob 4db0ebadfd1e48b2bdec9236ba7f344921e4a865; edad d.h.m NO VERIFICADA.
- ART-027: separación de telemetría de consulta de principios y métricas operativas.
- ART-024: identidad conversacional y relación entrada/salida.
- OpenAI Terms of Use, vigentes desde 2026-01-01: https://openai.com/es-US/policies/row-terms-of-use/
- Exportación oficial de historial y datos de ChatGPT, disponible para ChatGPT Free: https://help.openai.com/es-419/articles/7260999-exporting-your-chatgpt-history-and-data
- Chrome webRequest API, si se evalúa como señal auxiliar: https://developer.chrome.com/docs/extensions/reference/api/webRequest
- PerformanceResourceTiming, solo como contraste técnico auxiliar: https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming

La existencia de estas referencias no prueba que un endpoint concreto de ChatGPT esté instrumentado ni autoriza automatizar su acceso.

## 15. Estado operativo y siguiente acción

**Sprint:** HARMONIA OMM-01 — Observa · Mide · Mejora.  
**Primer hito:** BMO-01 — Bucle Mínimo Operativo.  
**Candidata local:** extensión Manifest V3 v0.4.0.

### Entrega local

La carpeta `C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA\Harmonia\Extension` está preparada para **Chrome → Cargar descomprimida**: `manifest.json` está directamente en ella, las rutas internas están presentes, los metadatos locales de versión existen y la prueba sintética de la cola offline confirma que la extensión puede conservar eventos sanitizados sin credenciales ni colector.

La cola inicial reside en `chrome.storage.local` del perfil Chrome. No equivale al almacenamiento JSONL del colector y está limitada por capacidad. Cuando el colector local esté iniciado y autenticado, el service worker reenviará los eventos pendientes en orden.

### Evidencia de ingeniería

- Suite sintética: **16/16 PASS**.
- JavaScript: 6/6 `node --check` PASS.
- PowerShell: análisis sintáctico de los scripts de operación sin errores.
- Manifiesto MV3, build-info y catálogos: JSON válido.
- Procedencia local v2: SHA-256 actuales por archivo; origen upstream y diferencias locales separados.
- OCP v0.47, v0.48, v0.49 y v0.50 preservados byte a byte en archive/; v0.51 pre-revisión archivado antes de este corte.

### No ejecutado / no aceptado

- Carga v0.4.0 verificada por RDC en Chrome Profile; service worker registrado/iniciado. El popup y la captura natural todavía no están aceptados.
- No se inspeccionó una sesión natural de ChatGPT para confirmar selectores T₁/T₂.
- No se midieron ciclos naturales.
- No se generó `Extension/local-auth.js`; no se inició el colector ni se creó su almacén.
- No se ejecutó Codex CLI como agente: su autenticación en el contexto RDC técnico no está resuelta.
- No se hizo commit, push, merge, PR ni cambio en main.
- BMO-01 **NO ALCANZADO**.

### Siguiente secuencia

1. Diagnosticar por qué no aparecen escrituras verificables en la cola local, empezando por arranque del service worker, handoff a content script y emisión de ui.surface.scan.
2. Verificar que el popup responda y muestre el estado de observación/cola sin depender del colector.
3. Solo después de confirmar eventos locales, observar T₁/T₂ en ciclos naturales y mantener separados eventos encolados y aceptados por el colector.
4. Revisar evidencia natural de señales, streaming, respuestas largas y herramientas; ajustar selectores según evidencia, sin automatizar interacción con ChatGPT ni extraer contenido.
5. Resolver la inicialización del colector y su credencial local únicamente bajo la sesión interactiva autorizada; al reconectar, la cola debe sincronizarse y el servidor aplicar idempotencia.
6. Resolver autenticación/contexto de Codex CLI en el perfil autorizado. Solo entonces activar el bucle de desarrollo asistido.
7. Continuar el backlog por prioridad, y declarar BMO-01 solo cuando se cumplan todos los criterios de §16.4.

No se requiere que el operador ejecute CMD, PowerShell ni scripts. El siguiente trabajo interno es diagnosticar el arranque del observador y verificar que se persista al menos un evento estructural sanitizado antes de iniciar pruebas naturales T₁/T₂.

### Trazabilidad del corte

- IPZ: v0.7 · edad NO VERIFICADA.
- DUG: v388 / NX-388m · main commit a34c1c5b43edbcbaf015056f4dc892f5def29eea · edad d.h.m NO VERIFICADA.
- OCP: HARMONIA-v0.52 local.
- CONV / OCP / CICLO / A / B: PENDIENTE / NO ASIGNADO; FOL1 no activa.
- Titularidad: generación 15.
- Dispositivo RDC autorizado: b573344f-c68f-47c9-9c2e-ae67f2e63bdb.
- FOL1: PREPARADA / NO ACTIVA.
- MCP normativo: DESACTIVADO.

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

| Orden | tarea | dependencia | criterio de salida | estado al corte |
|---:|---|---|---|---|
| 1 | OMM-01-001 · reconciliar y preparar candidata 0.4.0 | ninguna | paquete/rutas/versiones/procedencia coherentes; carpeta cargable | HECHO local |
| 2 | OMM-01-002 · habilitar Codex CLI | ninguna; puede avanzar en paralelo | CLI autenticada bajo contexto autorizado y sandbox acotado | BLOQUEADO por autenticación/contexto |
| 3 | OMM-01-003 · identificar T₁ gráfico | candidata cargable | señal de inicio natural observada y documentada | IMPLEMENTACIÓN CANDIDATA; natural pendiente |
| 4 | OMM-01-004 · identificar T₂ gráfico | OMM-01-003 | señal de fin inequívoca natural | IMPLEMENTACIÓN CANDIDATA; natural pendiente |
| 5 | OMM-01-005 · núcleo neutral de eventos | semántica T₁/T₂ | contrato, validación, agregación y pruebas | IMPLEMENTADO; sintético PASS |
| 6 | OMM-01-006 · adaptador ChatGPT Free | OMM-01-005 | KPI gráfico en candidata | IMPLEMENTADO; natural pendiente |
| 7 | OMM-01-007 · matriz de pruebas | OMM-01-006 | casos sintéticos y naturales controlados | 16/16 sintéticos PASS; natural pendiente |
| 8 | OMM-01-009 · panel de métricas | OMM-01-006/007 | métricas, revisión, legado y cola visibles | IMPLEMENTADO; visual Chrome pendiente |
| 9 | OMM-01-016 · bucle agente Codex | OMM-01-002 y pipeline anterior | iteración real revisada + siguiente tarea seleccionada | BLOQUEADO por OMM-01-002 |

OMM-01-008 (catálogo ampliado) y OMM-01-010 (metadatos) avanzan en paralelo. OMM-01-011 (framework_revision) está implementado en el contrato y la presentación; el model label/benchmark se mantiene pendiente.

### 16.7. Estado actual del hito

**BMO-01: NO ALCANZADO.**

Base de ingeniería actual:
- candidata local 0.4.0 con carpeta Extension preparada para carga descomprimida;
- cola offline durable en chrome.storage.local;
- contrato gráfico ChatGPT Free y KPI chatgpt_ui_generation_ms;
- popup y consulta preparados para separar KPI nuevo, legado DOM y eventos en cola;
- colector compatible con el contrato y resumen;
- manifiesto de procedencia local v2;
- 16/16 pruebas sintéticas PASS.

Bloqueos que afectan a la aceptación del hito, no a la preparación de la carpeta:
- la prueba natural de T₁/T₂ en ChatGPT Free está pendiente;
- los selectores implementados son candidatos, no señales aceptadas;
- el colector local no se ha inicializado ni autenticado; la extensión puede comenzar observando y reteniendo en Chrome local, pero la transferencia a JSONL espera inicialización;
- Codex CLI está instalado (0.167.0), pero el contexto RDC técnico CENTRAL\MantenimientoRCI devolvió Not logged in; no se ha confirmado autenticación en la sesión interactiva CENTRAL\fila4 ni ejecutado Codex como agente;
- no se ha completado una iteración real por Codex ni la selección de una segunda tarea.

No queda bloqueo técnico conocido para entregar la carpeta candidata y que el operador la cargue en Chrome. Eso no equivale a BMO-01 alcanzado.

### 16.8. Regla de continuación

A partir de este corte, el backlog se evalúa primero contra BMO-01. Las tareas cosméticas y de continuidad no desplazan los criterios P0. Cuando haya datos naturales, se actualizan las señales T₁/T₂ con evidencia, se revisa la calidad de las métricas y se habilita Codex cuando su contexto esté autorizado y autenticado. Ningún cambio sustituye silenciosamente una versión aceptada.

UUIDv7 local de este hito: 01a1c70b-c4aa-71a2-a8b5-2f6c668cba9f. FOL1 permanece preparada/no activa; folios CV/CY/A/B no asignados.
---

## 17. Ejecución de la instrucción de cierre de dependencias y entrega de la candidata · 2026-11-10

### 17.1. Instrucción verbatim del operador · D-011

Clave documental local: D-011. Es una referencia documental, no un folio oficial.

~~~text
Bueno, asegúrate que tus instrucciones de desarrollo están completas, que has calculado todas las dependencias, que la secuencia es válida, que no hay bloqueantes. Actualiza el objeto canónico de persistencia para este sprint y cuando lo tengas listo resuelve de extremo a extremo dejando en la carpeta de trabajo la extensión lista para que yo la cargue en Chrome. Go.
~~~

### 17.2. Dictamen de dependencias y secuencia

Se distinguen dos resultados terminales:

1. **Entrega de la carpeta candidata cargable:** completada localmente. No depende de Codex CLI, de credencial del colector ni de aceptar señales naturales, porque la candidata 0.4.0 tiene persistencia offline en chrome.storage.local.
2. **BMO-01 — Bucle Mínimo Operativo:** no alcanzado. Requiere observación natural de señales T₁/T₂ en ChatGPT Free, cinco ciclos naturales medidos, comprobación de la cobertura/casos requeridos y una iteración real de desarrollo ejecutada por Codex CLI.

La ruta de desarrollo quedó calculada en §12. No quedan dependencias internas sin ordenar para producir el paquete cargable. Se mantienen dos bloqueos explícitos para completar el hito: validación natural de T₁/T₂ y autenticación/contexto de Codex CLI. La inicialización del colector es posterior a la carga y no bloquea que Chrome empiece a conservar eventos en su cola local.

### 17.3. Resultado técnico ejecutado

- Se alineó la candidata en versión **0.4.0** en manifiesto, service worker, content script, popup, inicializador, consulta, detención y rutas de datos.
- El observador ya no inicia T₁ al insertar el nodo del usuario. Espera una transición gráfica de inactividad a actividad; T₂ conserva la primera transición de actividad a inactividad aunque el nodo de respuesta todavía no se haya pintado. La aparición posterior de la respuesta del asistente y la espera de estabilidad solo confirman la correlación/cierre; no desplazan T₂.
- Se definió el adaptador inicial `chatgpt-web-free`, métrica `chatgpt-ui-generation.v1` y revisión `HARMONIA-v0.50+DUG-v388-NX-388m`.
- El contrato, service worker y colector validan método/cobertura/señales y framework_revision. Los datos históricos `new-dom-node-v1` quedan separados como `LEGACY_MEASURED`.
- Se añadió cola local durable en chrome.storage.local, 1.500 eventos o 4 MiB, con reenvío en orden e idempotencia del colector. El popup muestra cola pendiente y puede resumir ciclos gráficos locales sin colector.
- Se actualizaron README, CYCLE-TELEMETRY.md y MANIFEST-PROCEDENCIA-LOCAL.json v2, con hashes por artefacto.
- Se añadieron pruebas sintéticas del observador, resumen/colector y service worker offline.

### 17.4. Evidencia y límites

- Suite Node sintética: **16/16 PASS**, 0 fallos, Node v24.0.0.
- Comprobación sintáctica JavaScript: 6/6 PASS.
- Análisis sintáctico PowerShell: 4/4 PASS; los scripts no se ejecutaron.
- Validación JSON: 5/5 PASS (manifest, build-info, catálogos y manifiesto de procedencia). Los hashes de los 18 artefactos candidatos y cuatro test artifacts del MANIFEST-PROCEDENCIA-LOCAL.json se cotejaron contra los archivos actuales al cierre.
- El directorio `KHORA/Harmonia/Extension/` contiene el paquete para Cargar descomprimida en Chrome.
- No se generó `local-auth.js`, no se inició el colector ni se creó almacén JSONL; los eventos iniciales quedarán en la cola Chrome local.
- No se cargó la extensión en Chrome, no se observó ChatGPT Free real y no se validaron naturalmente los selectores T₁/T₂.
- Codex CLI v0.167.0 está instalado en el perfil fila4. La consulta codex login status ejecutada bajo CENTRAL\MantenimientoRCI devolvió Not logged in; el estado de autenticación de CENTRAL\fila4 no se verificó. No se ejecutó Codex ni se alteraron credenciales.
- No hubo commit, push, merge, PR ni cambio en main. La entrega es local y no aceptada funcionalmente.

### 17.5. Entrega y siguiente compuerta

Carpeta lista para el operador: `C:\\Users\\fila4\\Desktop\\SeryMente\\Repositorios\\KHORA\\Harmonia\\Extension`.

La única intervención del operador necesaria ahora es cargar esa carpeta mediante Chrome → Extensiones → Cargar descomprimida y probar el comportamiento natural. No se le pide abrir CMD/PowerShell ni ejecutar scripts.

Después de la carga, el trabajo del frente seguirá con la validación natural T₁/T₂ y, de forma independiente, con la compuerta de autenticación autorizada de Codex CLI. BMO-01 no se declarará alcanzado hasta satisfacer §16.4.

UUIDv7 local de esta actualización: 01a1c72f-2e4d-7b89-ae56-41a08f4387c1. FOL1 permanece preparada/no activa; no se asignan folios CV/CY/A/B.



---

## 18. Continuidad del último tramo y reproducción de la salida literal · 2026-11-10

### 18.1. Instrucción verbatim del operador · D-012

Clave documental local: D-012. Es una referencia documental del frente, no un folio oficial. El operador entregó dos variantes consecutivas; se preservan ambas sin corregir la grafía:

~~~text
Persiste en el frente de trabajo harmonia el ultimo tramo de la converacion,  bienformateado pero sin tardarte myucho, y repite el ultimo ciclo, la salida del modelo literal
~~~

~~~text
Persiste en el frente de trabajo harmoniael ultimo tramo de la converacion,  bienformateado pero sin tardarte myucho, y repite el ultimo ciclo, la salida del modelo literal
~~~

La instrucción que precedió a la salida reproducida también se conserva literalmente en originales/HARMONIA-ULTIMO-CICLO-20261110.md, §2.

### 18.2. Persistencia de la última salida visible

- Original: docs/frentes/harmonia/originales/HARMONIA-ULTIMO-CICLO-20261110.md.
- Contenido: ambas variantes de D-012, la instrucción inmediatamente anterior que pidió consolidar el OCP y la última salida visible del modelo, conservada sin reescritura en §3 del original.
- Tamaño: 8.703 bytes; 229 líneas.
- SHA-256: C0140C1BCBAD16A1F33175F2C3ED2E50DD075063C8A298E499C8E440FCC9E252.
- La captura es un recorte de continuidad suministrado en el mensaje del operador, no una exportación íntegra de la conversación ni evidencia de IDs/horas nativos. Las instrucciones anteriores D-001…D-011 ya están preservadas en este OCP y no se duplican.

### 18.3. Interpretación y precedencia

La salida visible repetida describe el estado de un ciclo anterior: OCP v0.48, 449 líneas, 15/15 pruebas y OMM-01-001 como siguiente tarea. Se conserva verbatim como historia y no como estado operativo actual. La versión anterior al presente ciclo era OCP v0.50; su copia exacta se conserva en archive/OBJETO-CANONICO-v0.50-pre-continuidad-20261110.md, SHA-256 6C90C745E70EFFA107DC1DCB831DB83B35CED50387D39F77320720508DE45A1C.

El estado operativo posterior a esta actualización es el de este OCP v0.51: candidata local 0.4.0, 16/16 pruebas sintéticas PASS y OMM-01-001 completada localmente. La salida v0.48 no puede usarse para revertir ni contradecir ese estado.

### 18.4. Estado de carga de la extensión

El operador informó que la extensión estaba cargada. Posteriormente, RDC realizó una inspección de solo lectura en la sesión Windows CENTRAL\fila4 y verificó en `C:\Users\fila4\AppData\Local\Google\Chrome\User Data\Profile\Secure Preferences` el registro de extensión `adoeablpfbohknmpflgnpkpjiempgjaj`, con `path` igual a `C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA\Harmonia\Extension`, `location=4`, `disable_reasons` vacío, permisos API activos/concedidos `alarms, storage, tabs, scripting`, `has_started_service_worker=True` y `service_worker_registration_info.version=0.4.0`. El `manifest.json` leído directamente de esa carpeta también declara `version=0.4.0`. **Dictamen: carga de la candidata 0.4.0 verificada en el perfil Chrome Profile y service worker iniciado.** Esto no acredita todavía ausencia de errores en runtime, popup visual aceptado ni observación natural correcta de T₁/T₂; esos resultados siguen pendientes.

### 18.5. Siguiente secuencia

1. OMM-01-003 y OMM-01-004: comprobar las señales gráficas T₁/T₂ en ciclos naturales de ChatGPT Free, sin leer ni registrar contenido conversacional.
2. OMM-01-007: ampliar la matriz con respuesta simple, streaming/respuesta larga, herramientas cuando aparezcan, cancelación y ciclos incompletos; separar evidencia sintética y natural.
3. Verificar visualmente el popup y la cola local. Distinguir eventos conservados en el perfil Chrome de los aceptados por el colector JSONL.
4. Mantener OMM-01-002/016 bloqueadas hasta resolver autenticación/contexto de Codex CLI dentro de la identidad autorizada, sin manipular credenciales ni cambiar de identidad.
5. Mantener BMO-01 como **NO ALCANZADO** hasta satisfacer todos los criterios de §16.4.

### 18.6. Tarea de continuidad

OMM-01-017 queda cerrada como **HECHO local**: original de continuidad creado, salida literal preservada, OCP actualizado y copia exacta del OCP anterior archivada. La tarea no declara aceptación funcional de la extensión ni cierre del BMO-01.

### 18.7. Trazabilidad del corte

- IPZ: v0.7 · edad d.h.m NO VERIFICADA.
- DUG: v388 / NX-388m · commit main a34c1c5b43edbcbaf015056f4dc892f5def29eea; edad d.h.m NO VERIFICADA.
- OCP: HARMONIA-v0.51 local.
- Rama: work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d.
- Dispositivo RDC utilizado: PC10RCIF4EI4, UUID b573344f-c68f-47c9-9c2e-ae67f2e63bdb.
- UUIDv7 local de esta actualización: 01a1c741-f102-72fe-99df-c7679b9dcad1.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS; FOL1 PREPARADA / NO ACTIVA.
- MCP normativo: DESACTIVADO.
- Commit / push / merge / main: NO REALIZADOS.


---

## 19. Primera revisión tras carga de Harmonia en Chrome · 2026-11-10

### 19.1. Alcance de la revisión

Revisión local de solo lectura realizada por RDC en el dispositivo autorizado PC10RCIF4EI4 (UUID b573344f-c68f-47c9-9c2e-ae67f2e63bdb), sesión Windows CENTRAL\fila4, perfil Chrome Profile. No se modificó Chrome, no se recargó la extensión, no se abrió ni leyó el contenido de conversaciones y no se ejecutaron acciones de cuenta.

### 19.2. Carga verificada

- Extension ID: adoeablpfbohknmpflgnpkpjiempgjaj.
- Ruta registrada por Chrome: C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA\Harmonia\Extension.
- location=4; disable_reasons vacío.
- manifest.json local: Manifest V3, versión 0.4.0.
- Registro de service worker de Chrome: versión 0.4.0; has_started_service_worker=True.
- Permisos API activos/concedidos: alarms, storage, tabs, scripting.
- Resultado: **CARGA Y REGISTRO DE LA CANDIDATA 0.4.0 VERIFICADOS**. has_started_service_worker acredita que Chrome ha iniciado el worker al menos una vez; por sí solo no acredita que el flujo de inicialización haya terminado ni que no existan errores runtime.

### 19.3. Evidencia de observación y persistencia

- La base de chrome.storage.local correspondiente a la extensión existe en Profile\Local Extension Settings\adoeablpfbohknmpflgnpkpjiempgjaj.
- En la inspección, el directorio contenía CURRENT (16 bytes), MANIFEST-000001 (41 bytes), 000003.log (0 bytes), LOG (0 bytes) y LOCK (0 bytes); no se encontró ningún archivo .ldb con registros. Las marcas de tiempo del conjunto correspondían a la creación inicial de la base a las 14:53:44 hora local.
- Dictamen prudente: **no se encontró evidencia de escrituras confirmadas en el almacenamiento local de Harmonia**. No se pudo leer el contador harmoniaPendingEvents directamente; por tanto, no se declara un valor de cola obtenido desde la API.
- No hay proceso escuchando en 127.0.0.1:47321.
- No existe el directorio de datos del colector %LOCALAPPDATA%\Harmonia\surface-index-v0.4.0; no hay JSONL del colector.
- No hay ciclos naturales MEASURED, INCOMPLETE o NOT_MEASURED verificables en esta revisión. No hay mediana, P90 ni muestra natural que reportar.

### 19.4. Diagnóstico técnico acotado

- content.js espera el mensaje harmonia:start para iniciar el observador estructural, ejecutar el primer scan(true) y emitir ui.surface.scan. La alternativa automática consulta harmonia:auto-settings.
- service-worker.js hace que los mensajes y la inyección de pestañas esperen la promesa de inicialización ready; esa inicialización incluye lecturas/escrituras de chrome.storage.local, consulta de pestañas, sincronización de metadatos/catálogo remoto y comprobación del colector.
- El código establece, por tanto, una dependencia entre arranque/inyección y sincronización de repositorio. Es una zona concreta de diagnóstico. Sin embargo, la ausencia de registros locales no permite atribuir causalidad a la red ni declarar la causa raíz.
- No se modificó código en este ciclo. No se recargó Chrome ni se provocó un evento artificial.

### 19.5. Nueva tarea bloqueante y secuencia

OMM-01-018 se incorpora como P0: diagnosticar el arranque del service worker, la respuesta a harmonia:auto-settings, la inyección del content script y la emisión del primer ui.surface.scan; comprobar que el evento se escribe en chrome.storage.local sin colector disponible. Si la sincronización remota bloquea la ruta crítica, desacoplarla y añadir pruebas de regresión. Después, verificar que el popup responde y expone el estado real de la cola.

Hasta completar OMM-01-018, no avanzar a una conclusión de T₁/T₂ a partir de minutos de carga. Tras demostrar el primer evento local, realizar pruebas naturales controladas y distinguir observación de superficie, ciclos completos y mediciones aceptables.

### 19.6. Dictamen del corte

- Carga Chrome v0.4.0: **VERIFICADA**.
- Service worker registrado e iniciado al menos una vez: **VERIFICADO**.
- Arranque completo e inyección funcional: **NO VERIFICADOS**.
- Escrituras/cola local: **NO EVIDENCIADAS**.
- Colector / JSONL: **NO INICIALIZADO**.
- Señales T₁/T₂ naturales: **NO VERIFICADAS**.
- BMO-01: **NO ALCANZADO**.
- OMM-01-018: **P0 BLOQUEANTE NUEVO**.
- Sin cambios de código, credenciales, permisos, Chrome, main, commit, push, merge, PR o despliegue.

UUIDv7 local de esta revisión: 01a1c751-d38d-7ea1-832b-1354c9b561b2. Hora local del reloj consultado al generar el identificador: 2026-11-10T15:16:31.0239784-06:00. FOL1 PREPARADA / NO ACTIVA; folios CONV/CICLO/A/B PENDIENTES / NO ASIGNADOS. MCP normativo DESACTIVADO.

---

## 20. Diagnóstico OMM-01-018 y desacoplamiento de la ruta crítica · 2026-11-10

### 20.1. Instrucción verbatim del operador · D-013

Clave documental local: D-013. Es una referencia del frente, no un folio oficial.

~~~text
Avanza pues.
~~~

### 20.2. Preservación previa al cambio

- OCP anterior: `archive/OBJETO-CANONICO-v0.52-pre-omm-018-fix-20261110.md`.
- SHA-256 de origen y copia cotejados: `D5D9AAF04CBE6D8AC466BD60F75AC2DA98D99BF57810DE9FD659C84526604CE5`; comparación byte a byte: igualdad confirmada.
- Worker previo: `Harmonia/archive/omm-01-018-pre-fix-20261110/service-worker.js`; SHA-256 `868C0210B41B835578D9D565356FE2585A25F237370FF02C4673BD2A7C16D970`; read-back exacto.
- Prueba previa: `Harmonia/archive/omm-01-018-pre-fix-20261110/service-worker.outbox.test.js`; SHA-256 `17C481817A5895CF5B41C54DCA03463667BDE70F20125E07FDDA4D8F75F2C37A`; read-back exacto.

### 20.3. Diagnóstico del camino crítico

La implementación previa incluía `refreshKnownFingerprints()`, `syncRepository()` y `checkHealth()` dentro de la promesa `ready`. El listener de mensajes y la inyección de scripts esperan esa promesa. En consecuencia, las operaciones de red a fingerprints, GitHub y colector podían retener la respuesta a `harmonia:auto-settings`, la inyección de `cycle-observer.js`/`content.js` y la aceptación del primer `ui.surface.scan`.

Esto confirma una dependencia de red en la ruta crítica y un modo de bloqueo reproducible. No demuestra que esa dependencia haya sido la causa raíz del registro local vacío observado en §19: no se dispuso de inspección directa del runtime ni de su consola en aquella ejecución.

### 20.4. Corrección candidata aplicada

- La promesa `ready` ahora se limita a inicialización local: lectura/restauración del estado Chrome, normalización de sesiones existentes, escritura local de estado y creación de alarmas.
- La restauración remota de fingerprints, la sincronización de catálogo/metadatos y la comprobación del colector se lanzan después de resolver `ready`, con manejo de errores propio.
- La inyección de pestañas y la respuesta a los mensajes de runtime ya no esperan esas solicitudes remotas.
- No se generó token ni archivo `local-auth.js`; no se cambiaron permisos ni configuración de Chrome.

Worker candidato resultante: SHA-256 `FCC08C2FA4DA95F7B23F79FDC6C7C8391C90048909DFA54ED6F8A8E7866FEBB4`.

### 20.5. Regresión y pruebas ejecutadas

La prueba nueva `synthetic: blocked remote repository sync cannot hold local startup or offline event capture` mantiene sin resolver las solicitudes a GitHub y verifica que el worker:
1. contesta `harmonia:auto-settings`;
2. solicita a Chrome, mediante `chrome.scripting.executeScript`, la inyección de `cycle-observer.js` y `content.js` en una pestaña sintética (el arnés no ejecuta los scripts reales);
3. envía `harmonia:start`;
4. acepta el primer `ui.surface.scan` y conserva `capture.started` + `ui.surface.scan` en la cola local;
5. mantiene explícito `conversationTextCaptured=false`;
6. responde a `harmonia:get` con `collector=false` y `pendingEvents=2`, aunque la sincronización remota siga bloqueada (contrato de datos del popup, no validación visual).

Resultados:
- Pruebas de la extensión: 13/13 PASS.
- Suite `node --test` de Harmonia: 18/18 ejecuciones PASS, 0 fallos. El recuento son ejecuciones reportadas por el runner; no se afirma que sean 18 casos únicos porque la salida contiene una prueba de cola ejecutada en más de un contexto.
- `node --check` para todos los archivos JavaScript bajo `Harmonia`: PASS.
- UTF-8 del worker: BOM preservado, acentos comprobados y carácter de reemplazo ausente.
- El `git diff --check` global no pasa por espacios finales de líneas Markdown en documentos modificados y advierte normalización CRLF. No se limpiaron de forma indiscriminada saltos duros Markdown ajenos al cambio. El `git diff --check` acotado a `service-worker.js` y `service-worker.outbox.test.js` sí terminó PASS; el repositorio conserva el resto de sus cambios previos sin limpieza masiva.

SHA-256 de la prueba modificada: `2F5793FCA36B5DD6587360AA1A118B15DB6EB2FC4FE8F6526ED72F9D45B2FA13`.

### 20.6. Estado de aceptación y límites

- Corrección del worker y regresión sintética: **IMPLEMENTADAS Y VERIFICADAS LOCALMENTE**.
- Inyección real en Chrome tras incorporar la corrección: **PENDIENTE**; no se recargó la extensión en este ciclo.
- Persistencia real del primer `ui.surface.scan` en `chrome.storage.local`: **PENDIENTE**.
- Popup y su presentación/lectura de cola en Chrome: **PENDIENTE**.
- Colector `127.0.0.1:47321`, autenticación local y JSONL: **NO INICIALIZADOS**.
- Ciclos naturales T₁/T₂, mediana y P90: **NO VERIFICADOS / SIN MUESTRA**.
- BMO-01: **NO ALCANZADO**.

Por tanto, OMM-01-018 queda **PARCIALMENTE RESUELTA**: el modo de bloqueo de la ruta crítica tiene corrección y regresión sintética; queda pendiente comprobar la candidata cargada en Chrome y observar la escritura real. La corrección permanece en el workspace local. No hubo commit, push, merge, PR, modificación de `main` ni despliegue.

### 20.7. Trazabilidad de este corte

- IPZ: v0.7; edad de instalación nativa NO VERIFICADA.
- DUG: v388 / NX-388m; edad desde commit main NO VERIFICADA.
- OCP: HARMONIA-v0.53, actualización local.
- KHORA main observado al generar el identificador: commit `127060f64ad00f2c4660609ef5b088db3489ccb9`, `2026-11-10T10:48:38-06:00`; edad calculada a `2026-11-10T15:30:34.6922039-06:00`: `0.4.41`.
- Rama/HEAD y estado Git: se mantiene el workspace local de trabajo de la continuidad anterior; sin commit/push/merge en este ciclo.
- Dispositivo RDC autorizado: PC10RCIF4EI4, UUID `b573344f-c68f-47c9-9c2e-ae67f2e63bdb`.
- UUIDv7 local de esta actualización: `01a1c75e-b344-7be8-a3d7-7b171e19e184`; hora consultada `2026-11-10T15:30:34.6922039-06:00`.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1 PREPARADA / NO ACTIVA.
- MCP normativo: DESACTIVADO.

---

## 21. Recarga automatizada de la extensión y protección de hitos · 2026-11-10

### 21.1. Instrucción verbatim del operador · D-014

Clave documental local: D-014. Es una referencia del frente, no un folio oficial.

~~~text
Ya cargue la extension.

Hay forma de automatizar la carga de la extension tras cada modificacion?

No pierdas de vista los objetivos del sprint, y sus hitos.
~~~

### 21.2. Verificación de la carga informada

RDC inspeccionó el perfil Chrome Profile sin abrir conversaciones ni modificar el navegador:

- ID: `adoeablpfbohknmpflgnpkpjiempgjaj`.
- Ruta registrada: `C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA\Harmonia\Extension`.
- `location=4`; `disable_reasons` vacío.
- `manifest.json` local: `0.4.0`.
- Versión del registro del service worker: `0.4.0`.
- Dictamen: **ruta y registro de candidata 0.4.0 confirmados; no se infiere por estos metadatos que la ruta de eventos ya esté operativa**.
- La línea de comandos del proceso Chrome no contiene `--remote-debugging-port`. El entorno RDC actual no expone herramientas de recarga de extensiones ni acceso a CDP. No se reinició Chrome ni se abrió una sesión de navegador diferente.

### 21.3. Mecanismos disponibles y elección

Chrome documenta `chrome.runtime.reload()` para que una extensión se recargue a sí misma. Para dirigir la recarga desde el agente, Chrome DevTools for Agents ofrece las operaciones `list_extensions` y `reload_extension` para extensiones desempaquetadas. La categoría `Extensions` requiere configurar el servidor DevTools con `--categoryExtensions` y permitir el acceso filesystem a la raíz de Harmonia.

La vía preferida es **recarga dirigida por el agente después de cada modificación aprobada y con pruebas PASS**, usando un canal Chrome DevTools/CDP soportado. Para cambios ejecutados por el propio agente no hace falta un watcher de archivos independiente: el pipeline puede editar → probar → recargar → verificar runtime. Un watcher solo se añade si se necesita cubrir cambios realizados externamente.

### 21.4. Salvaguardas para ChatGPT y el sprint

- Recargar la extensión no equivale a recargar las pestañas ChatGPT.
- No actualizar automáticamente una pestaña ChatGPT mientras haya generación activa; tampoco arriesgar un borrador del operador.
- Para cambios de content scripts, verificar por separado cómo aplicar el código a pestañas ya abiertas. La actualización de la extensión no se declarará equivalente a la actualización efectiva del observador de página.
- No cambiar el perfil Chrome habitual ni cerrar/reiniciar el navegador para habilitar depuración remota sin evaluar primero la continuidad de la sesión y obtener autorización cuando el cambio lo requiera.
- No añadir una extensión de terceros de hot reload, permisos nuevos, credenciales ni servicios expuestos a la red como atajo.
- La recarga automática es una herramienta de productividad del bucle OMM-01. No sustituye el primer `ui.surface.scan`, la persistencia real, la prueba natural T₁/T₂ ni los criterios de BMO-01.

### 21.5. Tarea provisional y orden

OMM-01-019 se incorpora como P1: integrar un canal de recarga de extensión desempaquetada soportado por Chrome DevTools/CDP en el entorno autorizado; invocarlo después de pruebas PASS; verificar ID/ruta/versión/estado runtime; y tratar cambios de content scripts sin recargar pestañas activas. La tarea complementa el ciclo de desarrollo y no desplaza los P0.

Secuencia prioritaria del sprint sin alteración:
1. OMM-01-018: comprobar en Chrome la candidata recién cargada, primer evento local y popup.
2. OMM-01-003/004: validar T₁/T₂ en ciclos naturales.
3. OMM-01-007/009: cerrar matriz natural y validar la presentación de métricas.
4. OMM-01-002/016: desbloquear el agente Codex dentro de la identidad autorizada.
5. OMM-01-019: integrar recarga automatizada para acelerar las iteraciones restantes sin poner en riesgo las pestañas activas.

### 21.6. Estado del dictamen

- Viabilidad técnica de recarga dirigida por agente: **CONFIRMADA por documentación oficial de Chrome**.
- Canal DevTools/CDP dentro de la sesión RDC actual: **NO DISPONIBLE / NO CONFIGURADO**.
- Automatización de recarga en este entorno: **NO IMPLEMENTADA**.
- OMM-01-019: **PROPUESTA P1**, pendiente de integración.
- BMO-01 y sus hitos: sin cambio; **BMO-01 NO ALCANZADO**.


### 21.7. Trazabilidad de este corte

- IPZ: v0.7; edad de instalación nativa NO VERIFICADA.
- DUG: v388 / NX-388m; edad desde commit main NO VERIFICADA.
- OCP: HARMONIA-v0.54, actualización local.
- KHORA main: commit `127060f64ad00f2c4660609ef5b088db3489ccb9`, `2026-11-10T10:48:38-06:00`; edad calculada al corte `2026-11-10T15:37:01.4146314-06:00`: `0.4.48`.
- Rama: `work/harmonia-front-workspace-20261110`; HEAD `9fd5c18205e39b6db12c9152b07d8f880f6b256d`.
- Dispositivo RDC autorizado: PC10RCIF4EI4; UUID `b573344f-c68f-47c9-9c2e-ae67f2e63bdb`.
- UUIDv7 local de esta actualización: `01a1c764-99e6-7557-81f2-9b897b4c82e4`; hora consultada `2026-11-10T15:37:01.4146314-06:00`.
- OCP v0.53 preservado byte a byte antes de esta edición: SHA-256 `CE80B65E7419963AE246D688C2C8B9BA70B40084C12F2DD745F8F99C43D84FF1`.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1 PREPARADA / NO ACTIVA.
- MCP normativo: DESACTIVADO.
- Commit / push / merge / PR / despliegue: NO REALIZADOS.

## 22. Integración del trabajador en Chrome y límite de captura automática · 2026-11-10

### 22.1. Objetivo del ciclo

Comprobar que la candidata 0.4.0 funciona dentro de Chrome, conserva los eventos sin colector y permite avanzar hacia la primera medición real. La prueba aislada no sustituye la validación en el perfil habitual ni los ciclos naturales exigidos por BMO-01.

### 22.2. Verificación del perfil habitual

Inspección de solo lectura al corte 16:02:00 -06:00:

- Extensión adoeablpfbohknmpflgnpkpjiempgjaj, registrada en C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA\Harmonia\Extension.
- location=4; disable_reasons vacío. La candidata local y el registro previo identifican la versión 0.4.0.
- El directorio Profile\Local Extension Settings\adoeablpfbohknmpflgnpkpjiempgjaj existe, pero sus archivos 000003.log y LOG siguen en cero bytes; CURRENT conserva 16 bytes y MANIFEST-000001, 41 bytes. Las marcas de escritura permanecen en 2026-11-10T20:53:44Z (14:53:44 -06:00), anteriores a esta comprobación.
- Dictamen: la instalación está registrada y habilitada, pero en ese almacén del perfil no hay evidencia nueva de eventos desde la marca indicada. No se infiere que el service worker esté ejecutándose ni que exista una sesión de captura activa.
- Chrome habitual no expone --remote-debugging-port ni --remote-debugging-pipe. No se reinició, recargó ni modificó ese perfil.

### 22.3. Prueba de integración en Chromium temporal

Se utilizó Chromium 153.0.8010.12 de Playwright, con un perfil temporal nuevo, sin sincronización ni inicio de sesión. La extensión 0.4.0 cargó y expuso su trabajador real chrome-extension://adoeablpfbohknmpflgnpkpjiempgjaj/service-worker.js.

En la prueba de mensajería sintética, desde el mundo aislado de la extensión se invocaron los mensajes permitidos y se leyó directamente chrome.storage.local. Resultado observado:

- harmonia:auto-settings: respuesta correcta; autoEnabled=true.
- Eventos preservados en la cola local: capture.started, ui.surface.scan, client.cycle.started y client.cycle.completed.
- Conteo: 4 eventos pendientes, 1 inicio de ciclo y 1 cierre sintético; duración de prueba 800 ms.
- El evento estructural mantuvo conversationTextCaptured=false, composerTextCaptured=false, fieldValuesCaptured=false, hrefsCaptured=false, imageUrlsCaptured=false y menusExcluded=true.
- Los mensajes de ciclo fueron enviados sintéticamente desde el contexto aislado para probar el contrato de mensajería y persistencia. No fueron generados por una respuesta natural de ChatGPT ni por el observador DOM.

**Dictamen de esta prueba:** el trabajador de Chrome, el contrato de mensajes y la escritura en la cola local real de la extensión quedaron VERIFICADOS EN ENTORNO AISLADO CON ENTRADAS SINTÉTICAS. No equivale a validar la captura automática.

### 22.4. Prueba del observador DOM

Se creó una página temporal sin sesión autenticada y se añadieron nodos DOM vacíos de prueba (compositor, mensaje de usuario, indicador de actividad y mensaje de asistente). También se forzó la reinicialización por cambio de ruta y se disparó un cambio de tamaño.

- __harmoniaObserver.version=0.4.0, active=true; HarmoniaCycleTelemetry disponible.
- Después de las mutaciones, lastFingerprint siguió nulo, lastSentAt=0 y no se observó ninguna llamada saliente del escáner ni del observador de ciclos.
- No se registraron excepciones JavaScript en la prueba.
- La página temporal tenía la región main, pero no el compositor real ni una sesión de ChatGPT autenticada. Los nodos añadidos fueron artificiales y vacíos.

**Límite:** esta prueba no confirma la detección automática de la UI real y tampoco basta para atribuir una causa al código. La detección natural sigue pendiente.

### 22.5. Limpieza y alcance de los ensayos

- Cada ensayo utilizó un directorio temporal --user-data-dir independiente; no reutilizó cookies ni el perfil habitual.
- Los perfiles temporales, archivos de prueba y procesos Chrome asociados quedaron eliminados. La comprobación final informó temporaryProfileRemoved=true y remainingTempChromeProcesses=0.
- No se iniciaron conversaciones, no se enviaron prompts, no se leyeron respuestas, no se inspeccionó contenido conversacional y no se generó token ni archivo local-auth.js.
- No hubo cambios en código, manifest, permisos ni configuración del Chrome habitual durante este ciclo.

### 22.6. Estado actualizado de tareas e hitos

| Elemento | Estado al corte |
| --- | --- |
| OMM-01-018 · arranque, primer evento y persistencia | PARCIALMENTE RESUELTA: trabajador real y cola local verificados con mensajes sintéticos en Chromium; captura automática desde DOM y escritura nueva en el perfil habitual pendientes |
| OMM-01-003/004 · T1/T2 | PENDIENTES: sin ciclo natural aceptado |
| OMM-01-007/009 · matriz y popup | PENDIENTES: sin matriz natural ni validación visual |
| OMM-01-002/016 · agente Codex | BLOQUEADAS por autenticación/contexto autorizado, sin cambios |
| OMM-01-019 · recarga automática | PROPUESTA P1: el canal CDP se utilizó únicamente para Chromium temporal; no existe integración de recarga al perfil habitual |
| BMO-01 | NO ALCANZADO |

La secuencia prioritaria se conserva: (1) cerrar OMM-01-018 en el Chrome donde se ejecuta ChatGPT; (2) validar T1/T2 con ciclos naturales; (3) completar matriz y popup; (4) desbloquear Codex; (5) automatizar recarga como mejora de productividad. La prueba sintética de 800 ms no cuenta entre los cinco ciclos naturales de aceptación.

### 22.7. Trazabilidad

- IPZ: v0.7; edad desde un commit nativo de referencia: NO VERIFICADA.
- DUG: v388 / NX-388m; fuente leída desde SeryMente/metodologia/main, archivo gobernanza/METAPROMPT-CANONICO-SAMANTHA.html, Git blob SHA 4db0ebadfd1e48b2bdec9236ba7f344921e4a865; edad del último commit de main: NO VERIFICADA.
- OCP: HARMONIA-v0.55, local; sin publicar.
- KHORA main: referencia remota verificada mediante git ls-remote origin refs/heads/main: c708901caa2500eb48d6723b709cee7db0d9904b; commit 2026-11-10T13:47:00-06:00; edad calculada al corte con reloj local: 0.2.19.
- Rama local: work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d; árbol con cambios locales previos y actuales, no limpio.
- Dispositivo RDC autorizado: PC10RCIF4EI4; UUID b573344f-c68f-47c9-9c2e-ae67f2e63bdb.
- UUIDv7 local de este registro: 01a1c77f-5914-7853-bca8-b4ab35c2ea36; hora del corte: 2026-11-10T16:06:14.2922615-06:00.
- OCP v0.54 preservado antes de esta edición en archive/OBJETO-CANONICO-v0.54-pre-runtime-integration-20261110.md; byte equality confirmada; SHA-256 A7A94CE04F137DEBD84A2789B05024A9A63971F07C6CF4D25DC98A8BD16A0F8E.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1 PREPARADA / NO ACTIVA.
- MCP normativo: DESACTIVADO.
- Commit / push / merge / PR / despliegue: NO REALIZADOS.

## 23. Continuidad conversacional y ciclo en curso · 2026-11-10

### 23.1. Objetivo del ciclo, en lenguaje simple

Conseguir que Harmonia mida de forma fiable y privada cuánto tarda ChatGPT en generar una respuesta. La prioridad es demostrar que la extensión observa eventos naturales en el ChatGPT real y conserva la evidencia; no basta con que esté instalada ni con pruebas sintéticas.

Subobjetivos concretos:

1. Comprobar que la extensión cargada inicia y registra eventos locales.
2. Validar T1 (inicio visible de generación) y T2 (fin visible de generación) en ciclos naturales, sin leer ni conservar el contenido del chat.
3. Mantener BMO-01 como hito rector: al menos cinco ciclos naturales correlacionados y guardados, con métricas y cobertura aceptables.
4. Tratar la recarga automática de desarrollo como mejora secundaria P1; no debe desplazar la validación natural.

### 23.2. Directriz permanente del operador — registro literal

> Cada ciclo necesito que en palabras simples me recuerdes el objetivo en curso, y sus subobjetivos si los hay concretos, y enterminos simples. Esto hazlo en un formato claro y legible,  y sinexcepcion a cada ciclo.  Continua

Aplicación operativa: abrir cada ciclo con un bloque legible que nombre el objetivo vigente y sus subobjetivos concretos, expresados en términos simples. Esta regla de presentación no cambia las prioridades, los límites de privacidad ni las compuertas de autorización y aceptación.

### 23.3. Última salida del modelo recuperable — reproducción literal

La última salida completa del modelo identificable en el tramo aportado por el operador es la siguiente. Se conserva sin corregir ni reformular:

```text
Objetivo del ciclo: conseguir que Harmonia mida, de forma fiable y privada, cuánto tarda ChatGPT en generar una respuesta.

Pasos concretos: 1) comprobar que la extensión cargada inicia y registra eventos locales; 2) validar una medición real T1–T2 sin leer el contenido del chat; 3) mantener como prioridad el hito BMO-01. La recarga automática de la extensión es una mejora secundaria, no sustituye estas pruebas.
```

Las líneas posteriores aportadas son estados de progreso/actividad, no otra respuesta final completa. Se preservan en el extracto auxiliar, pero no se convierten por sí solas en evidencia de aceptación.

### 23.4. Estado del sprint al corte

| Elemento | Estado conservado |
| --- | --- |
| OMM-01-018 · arranque, primer evento y persistencia | PARCIALMENTE RESUELTA: integración del worker/cola probada con mensajes sintéticos en Chromium aislado; captura automática y escritura nueva en el perfil habitual pendientes |
| OMM-01-003/004 · T1/T2 | PENDIENTES: sin ciclo natural aceptado |
| OMM-01-007/009 · matriz y popup | PENDIENTES |
| OMM-01-002/016 · agente Codex | BLOQUEADAS |
| OMM-01-019 · recarga automática | PROPUESTA P1; no sustituye la ruta crítica de observación natural |
| BMO-01 | NO ALCANZADO |

No se declara que la extensión detecte automáticamente la interfaz real, que T1/T2 estén medidos, ni que existan cinco ciclos naturales. La muestra sintética de 800 ms documentada en §22 no cuenta para BMO-01.

### 23.5. Extracto auxiliar y preservación

- Extracto estructurado de continuidad: `docs/frentes/harmonia/originales/HARMONIA-TRAMO-CONVERSACIONAL-20261110-1617.md`.
- El extracto conserva la directriz literal, la última salida completa del modelo recuperable, el estado técnico heredado de §22, las líneas de progreso aportadas y las restricciones de privacidad/operación.
- SHA-256 del extracto leído de vuelta: `4A30B29245444FCE9570BB1DD3C7695D3710956CD794CC940D929A6D535D11D3`; 82 líneas.
- El extracto declara expresamente que no es una exportación íntegra ni inventa un identificador nativo de conversación.

### 23.6. Trazabilidad e integridad

- IPZ: v0.7; edad de instalación nativa NO VERIFICADA.
- DUG: v388 / NX-388m; fuente canónica leída desde `SeryMente/metodologia/main:gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`; Git blob SHA `4db0ebadfd1e48b2bdec9236ba7f344921e4a865`; edad del último commit de main NO VERIFICADA.
- OCP: HARMONIA-v0.56; actualización local.
- OCP v0.55 previo preservado antes de editar en `docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.55-pre-continuidad-20261110.md`; copia byte a byte verificada; SHA-256 `4823C5DD3857AB76D6083A819F690197936135D5E90BEF81860AA39674C347A2`; 95.920 bytes.
- Control de responsabilidad leído: generación 15, estado assigned; dispositivo RDC autorizado exacto `b573344f-c68f-47c9-9c2e-ae67f2e63bdb`. No se transfirió titularidad ni se modificó el control.
- Workspace: rama `work/harmonia-front-workspace-20261110`; HEAD observado `9fd5c18205e39b6db12c9152b07d8f880f6b256d`. El árbol ya tenía cambios locales previos; esta persistencia no los limpia ni los publica.
- UUIDv7 local de este ciclo de preservación: `01a1c789-84a5-73f2-ad6f-1e6530a2a5db`.
- Hora local capturada: `2026-11-10T16:17:20.8058222-06:00` (America/Mexico_City).
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1: PREPARADA / NO ACTIVA.
- MCP normativo: DESACTIVADO.
- Código de extensión, configuración de Chrome, perfil habitual, colector y datos de conversaciones: SIN CAMBIOS en esta operación.
- Commit / push / merge / PR / despliegue: NO REALIZADOS.


---

## 24. Refuerzo del observador y cobertura local sin colector · 2026-11-10

### 24.1. Objetivo del ciclo

Conseguir que Harmonia detecte automáticamente señales estructurales de ChatGPT, mida T1/T2 y conserve los eventos localmente incluso cuando el colector no está iniciado. Este corte valida la candidata en Chromium headless aislado; no acredita todavía observación natural en una sesión autenticada.

### 24.2. Cambios de la candidata local 0.4.2

La versión 0.4.2 incorpora:

- **Arranque resistente a montaje tardío:** el observador se conecta al documento estable (`body` / `documentElement`) para no depender de que `main` exista al ejecutar `document_idle`.
- **Consultas de colección corregidas:** los puntos del escáner que requieren múltiples nodos usan `querySelectorAll` mediante el helper `$$`, no `querySelector` singular.
- **Orden de señales tolerante:** si aparece primero la señal visual de actividad y el nodo DOM del usuario llega después, se correlacionan dentro de una ventana de 2.000 ms; se conserva la marca monotónica original de actividad. Una señal antigua no se atribuye a un turno posterior.
- **Cobertura local sin colector:** el worker deriva `scanCount`, superficies únicas y capacidades observadas de la outbox local. No presenta ese resultado como cobertura natural validada.
- **Popup alineado con la fuente:** el panel distingue “Superficie local · pendiente natural”, muestra barridos y capacidades locales, y calcula pendientes desde el catálogo disponible. La cobertura servida por el colector conserva su vía independiente.
- **Procedencia:** revisión `HARMONIA-v0.56+DUG-v388-NX-388m`; build local `LOCAL-OMM-01-020-LOCAL-COVERAGE-POPUP`. Manifiesto y metadatos locales indican `0.4.2`.

### 24.3. Validación ejecutada

| Prueba | Resultado |
| --- | --- |
| JavaScript del paquete Extension y Collector | 10 archivos · sintaxis PASS |
| Suite de extensión y colector | 20/20 PASS |
| `git diff --check` de archivos del cambio | PASS; solo avisos CRLF ya existentes |
| Chromium headless | Chrome/Chromium 153.0.8010.12 · candidata 0.4.2 cargada |
| Inyección | Automática desde el manifiesto; sin inyección manual |
| Montaje tardío de `main` | PASS |
| Outbox local | 4 eventos: `capture.started`, `client.cycle.started`, `client.cycle.completed`, `ui.surface.scan` |
| Ciclo sintético de ensayo | 1 inicio + 1 cierre; duración observada en el ensayo: 325 ms |
| Popup | Cola local 4; 1 barrido; 1 superficie; 3/44 capacidades estructurales; KPI visible |
| Privacidad del fixture | Sin leer texto conversacional ni texto del compositor; fixture formado por nodos estructurales vacíos |

El ensayo se realizó con un perfil temporal headless, en una página fixture vacía del origen permitido, sin iniciar sesión y sin insertar texto de conversación. El perfil temporal, el script auxiliar y los procesos de prueba se eliminaron al cerrar el ensayo. La medición de 325 ms es **sintética** y no cuenta para T1/T2 natural ni para BMO-01.

### 24.4. Dictamen y tareas

- **OMM-01-018:** avance técnico sustancial; la inyección automática, el primer barrido y la cola local quedaron demostrados en Chromium headless. Falta validar la misma ruta en el contexto real de ChatGPT.
- **OMM-01-020:** candidata 0.4.2 implementada localmente; endurecimiento del observador, correlación temporal y cobertura visible sin colector. Pruebas sintéticas y headless PASS; aceptación natural pendiente.
- **OMM-01-003/004:** T1/T2 naturales siguen pendientes. La duración sintética no entra en la muestra.
- **OMM-01-007/009:** matriz sintética y funcionamiento del popup en headless PASS; aceptación visual/natural en el entorno real pendiente.
- **OMM-01-002/016:** siguen bloqueadas por autenticación/contexto del ejecutor Codex CLI.
- **OMM-01-019:** sigue como mejora P1. No se implementó recarga automática contra el Chrome principal.
- **BMO-01:** **NO ALCANZADO**. No existe todavía muestra de cinco ciclos naturales correlacionados y guardados ni la iteración Codex exigida.

### 24.5. Siguiente paso operativo

La siguiente compuerta es conseguir un ciclo natural de ChatGPT, sin leer ni almacenar prompts, respuestas ni borradores. La política de trabajo de este corte usa exclusivamente CLI y Chromium headless; el navegador principal no se controla ni se ocupa. Un headless sin sesión autenticada no puede producir por sí solo evidencia natural de la cuenta del operador. Cuando esa condición sea el único bloqueo, se solicitará al operador únicamente la intervención mínima necesaria, sin transferirle tareas técnicas.

### 24.6. Integridad y trazabilidad

- OCP anterior: HARMONIA v0.56, preservado antes de esta edición en `docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.56-pre-omm-01-020-20261110.md`; SHA-256 `C854C3FC3014313E58D1E24B8ECC93E57FB356C48E428ACEE47E0FA8D5490464`; 101.237 bytes; copia byte a byte verificada.
- OCP resultante: HARMONIA v0.57; edición local, no publicada.
- Rama local `work/harmonia-front-workspace-20261110`; HEAD `9fd5c18205e39b6db12c9152b07d8f880f6b256d`; árbol conserva cambios anteriores y nuevos. Sin commit, push, merge, PR ni despliegue.
- Control de responsabilidad: generación 15, `assigned`; dispositivo autorizado `b573344f-c68f-47c9-9c2e-ae67f2e63bdb`.
- UUIDv7 local: 01a1c7a3-a0f5-75f9-90f0-c36a1a125fc9; hora: 2026-11-10T16:45:51.9891158-06:00 (America/Mexico_City).
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1: PREPARADA / NO ACTIVA.
- MCP normativo: DESACTIVADO.
- Chrome principal, perfil habitual y pestañas activas: no se usaron para las pruebas de este ciclo. No se inició el colector local ni se accedió a credenciales.


---

## 25. Reglas operativas, decisiones recientes y cola provisional · 2026-11-10

### 25.1. Instrucciones recientes del operador

Se incorporan estas reglas al procedimiento del frente:

1. **Eficiencia sin degradar calidad.** Evitar comprobaciones repetitivas, lecturas ceremoniales y pasos burocráticos que no cambien una decisión. La calidad del resultado y las pruebas que detectan fallos relevantes no se reducen. Se acepta que una primera pasada pueda requerir corrección; se mitiga el riesgo mediante atención a los cambios, alcance contenido y pruebas discriminantes, no acumulando verificaciones redundantes.
2. **Bloqueos visibles y ayuda puntual.** Informar al operador cuando una dependencia o acción requiera su intervención, en el momento en que se identifique. No trasladarle trabajo técnico ordinario. Solicitar solo la decisión o acción mínima que realmente desbloquee el frente.
3. **Trabajo en ciclos cortos.** Entregar el resultado de cada ciclo, sus límites y la siguiente acción concreta. No prometer ejecución en segundo plano.
4. **Superficies permitidas.** Desarrollo y comprobaciones del agente mediante CLI/RDC y Chromium headless aislado, con perfiles temporales. No abrir, enfocar, navegar, inspeccionar ni modificar el Chrome principal o su perfil. Cualquier excepción necesita instrucción expresa del operador.
5. **Consultas frente a autorizaciones.** Una pregunta sobre la viabilidad o el diseño de una operación no autoriza por sí sola a ejecutarla. Distinguir consulta, propuesta, autorización y ejecución efectiva.
6. **Objetivo por ciclo.** Cada ciclo comienza con el objetivo vigente en lenguaje simple y sus subobjetivos concretos.

### 25.2. Directrices verbatim relevantes

> Cuando haya un blqueante dime y te ayudo, avanzemos rapido

> sin sacrificar calidad, aunque sea aumentando riesgos, evites comprobacioens inecesarias y burocracia. Es decir, la calidad no se sascrifica, quiza nos arriesguemos a que no quede bien a la primera, pero si te pido que pongas especial atencionquiza se mitigue el riesgo a favor de la eficiencia.

> No ejecutes, solo pregunto.

Se conservan aquí con la misma intención expresada por el operador; no se interpretan como permiso para omitir pruebas críticas, alterar datos, publicar cambios o controlar el navegador principal.

### 25.3. Decisiones de operación y recarga

- El operador informó que recargó manualmente la extensión después de recibir la candidata 0.4.2. Se registra como **recarga manual informada**, no como confirmación independiente de la versión activa ni como prueba de captura natural.
- El agente no repetirá esa recarga ni inspeccionará el Chrome principal. La validación disponible continuará por CLI/headless hasta una instrucción expresa distinta.
- OMM-01-019 conserva el diseño de autorrecarga dirigida mediante Chrome DevTools/CDP. **No está integrado ni operativo en el Chrome principal.** El canal usado en pruebas corresponde a Chromium headless temporal y no se extrapola al perfil habitual.
- La vía futura de autorrecarga debe detectar una candidata validada, recargar solo la extensión y sus scripts de forma segura, y no interrumpir generación/escritura. No debe confundirse con un simple reinicio de navegador ni con refrescar indiscriminadamente pestañas.

### 25.4. Cola provisional de trabajo del agente

| Orden | Tarea | Estado al corte | Siguiente resultado verificable |
| ---: | --- | --- | --- |
| 1 | OMM-01-018 · arranque, primer barrido y outbox | PASS sintético y headless; recarga manual informada por el operador; natural aún no validado | Confirmar un evento natural de barrido y la persistencia local, sin leer contenido |
| 2 | OMM-01-003/004 · T1/T2 | Candidato implementado; muestra natural inexistente | Capturar el primer ciclo natural completo y comprobar ausencia de falsos cierres |
| 3 | OMM-01-020 · robustez del observador y cobertura local | Candidata 0.4.2, 20/20 pruebas y E2E headless PASS | Corregir detalles detectados y conservar separación entre cobertura local y natural |
| 4 | OMM-01-007/009 · matriz y popup | Suite sintética PASS; popup funcional en headless | Corregir presentación menor y mantener métricas/unidades coherentes |
| 5 | OMM-01-002/016 · Codex CLI | BLOQUEADO por autenticación/contexto | Pedir ayuda al operador solo cuando exista una acción concreta que él deba realizar |
| 6 | OMM-01-019 · autorrecarga | Diseño documentado; no implementado | Retomar después de asegurar el camino natural P0 y confirmar un canal de recarga que no toque Chrome principal |

La cola es provisional y subordinada a las dependencias reales. El agente puede ejecutar de forma autónoma trabajo local dentro del alcance autorizado; debe detenerse y comunicar cualquier compuerta que requiera autenticación, sesión natural o autorización adicional.

### 25.5. Estado de aceptación

- Candidata local 0.4.2: inyección automática, T1/T2 sintéticos, outbox y popup demostrados en Chromium headless.
- Recarga manual de la extensión: informada por el operador; versión en runtime no inspeccionada.
- Captura natural autenticada: pendiente; no se atribuyen ciclos naturales a pruebas headless.
- BMO-01: **NO ALCANZADO**.
- Publicación o activación remota: ninguna. No hubo commit, push, merge, PR ni despliegue.

### 25.6. Trazabilidad e integridad

- OCP v0.57 preservado antes de editar: docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.57-pre-operational-rules-20261110.md; SHA-256 50AD1EE9E91E466637A55D2F61660AB9D18205CB1E043A8B354CB933D13ED9D6; 107.275 bytes; cotejo de hash PASS.
- OCP resultante: HARMONIA-v0.58; local, no publicado.
- UUIDv7 local: 01a1c7aa-813b-79df-8503-34a6706cac98; hora 2026-11-10T16:53:22.6191942-06:00 (America/Mexico_City).
- Rama work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d; cambios locales no publicados.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1: PREPARADA / NO ACTIVA. MCP normativo: DESACTIVADO.
- No hubo commit, push, merge, PR ni despliegue.

# Harmonia · Objeto de Proyecto Canónico (OCP)

**Versión local:** 0.76  
**Sello:** HARMONIA-v0.76  
**Corte:** 2026-11-12 · America/Mexico_City  
**Sprint activo:** **OMM-01 — Observa · Mide · Mejora**  
**Estado del OCP:** v0.76 actualizado localmente; v0.75 preservado y cotejado; no publicado en main.

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
- **Dispositivo RDC autorizado para este workspace:** PC10RCIF4EI4, UUID 99383b36-cc22-4457-952f-8799cccac0a7. La autorización cubre el workspace local KHORA/Harmonia y la documentación del frente, pruebas sintéticas y operaciones locales delimitadas. No se transfiere por nombre de equipo a otro UUID.
- **Identidades Windows observadas:** sesión interactiva CENTRAL\fila4, perfil C:\Users\fila4, SID S-1-5-21-1529298404-1161420656-882029410-5167. En esta retoma se verificó que el proceso RDC opera como CENTRAL\fila4, perfil C:\Users\fila4, SID S-1-5-21-1529298404-1161420656-882029410-5167.
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

- El operador no ejecuta CMD, PowerShell, scripts, inicializadores, comandos de Git ni tareas técnicas ordinarias. Todo el trabajo local se realiza mediante RDC, dentro del dispositivo y alcance autorizados. No pedirle que memorice rutas o nombres de archivos internos.
- El operador aporta propósito, intervenciones funcionales, decisiones de producto, autorizaciones indispensables y aceptación; no se le traslada el diseño técnico ni el mantenimiento rutinario.
- Al inicio de cada ciclo recordar en palabras simples el objetivo en curso y sus subobjetivos concretos, con formato claro y legible.
- Comunicar inmediatamente cualquier bloqueo real que requiera su intervención; solicitar solo la acción o evidencia mínima.
- Trabajar con celeridad: evitar comprobaciones redundantes, ceremoniales o sin poder discriminante. Se admite corregir una primera pasada; nunca rebajar la calidad final, privacidad, integridad o criterios de aceptación.
- No repetir preguntas ya contestadas. Distinguir solicitudes de información, propuestas y autorizaciones. No prometer trabajo en segundo plano.
- La regla vigente de navegador es exclusivamente CLI + Chromium headless en perfiles temporales aislados. No abrir, enfocar, navegar, inspeccionar ni modificar el Chrome principal, ni ocupar el único monitor del operador. La autorización amplia anterior registrada en D-015 quedó restringida por D-016.
- La recarga de la extensión que el operador informe se registra como dato reportado; no se declara versión activa ni captura natural verificada sin evidencia específica.### 4.2. Trabajo local y Git

- Mantener el trabajo en la rama aislada existente.
- Antes de escribir, comprobar identidad del dispositivo autorizado, raíz, rama, HEAD y estado de trabajo.
- Revisar el diff antes de cerrar una iteración.
- Ejecutar pruebas relevantes y registrar sus resultados.
- No modificar main, crear/actualizar permisos, hacer push, merge, PR o despliegue sin autorización explícita separada.
- No reemplazar una versión funcional/aceptada por una candidata sin conservar la versión anterior y comparar cambios.
- No declarar publicación, aceptación, instalación o captura natural sin evidencia específica.
- El OCP local actualizado no es un commit ni una publicación.

### 4.3. Codex CLI como ejecutor de desarrollo

- Codex CLI es el ejecutor previsto del bucle OMM-01; el asistente coordina el sprint, selecciona tareas, define el alcance, revisa diffs y evidencia.
- Ejecutable: C:\Users\fila4\AppData\Roaming\npm\codex.cmd; versión verificada: codex-cli 0.167.0.
- La sesión RDC autorizada PC10RCIF4EI4 / UUID 99383b36-cc22-4457-952f-8799cccac0a7 corre como CENTRAL\fila4, SID S-1-5-21-1529298404-1161420656-882029410-5167. Bajo esa identidad, `codex login status` confirmó `Logged in using ChatGPT`; el uso de cuota quedó autorizado por el operador.
- Codex ejecutó una auditoría de diseño en solo lectura con gpt-5.6-terra y concluyó que la discrepancia entre escáner estructural y filtro de visibilidad es una hipótesis fuerte, no causa demostrada; recomendó traza discreta y privacidad acotada.
- La CLI instalada no permitió escritura: aunque se solicitó `--sandbox workspace-write`, la cabecera efectiva indicó `read-only` y las operaciones de escritura/herramienta fueron rechazadas por política. No se usó `danger-full-access`, `--dangerously-bypass-approvals-and-sandbox`, MCP, credenciales externas ni elevación de permisos.
- La implementación local de este ciclo se aplicó mediante RDC autorizado tras el diseño y revisión de Codex; no debe afirmarse que Codex escribió los archivos. Codex queda integrado como revisor/planificador mientras la política de escritura de la CLI siga en solo lectura.
- No usar el perfil CENTRAL\MantenimientoRCI ni transferir credenciales. No inferir identidad por nombre del equipo; el UUID autorizado es obligatorio.
- Para futuras sesiones Codex: solo workspace autorizado, sandbox de menor privilegio disponible, revisión de cambios y pruebas. Nunca usar danger-full-access ni bypasses peligrosos.
- No autorizar consumo pagado adicional, APIs externas o modelos sujetos a coste sin autorización expresa. No leer, copiar, mostrar ni modificar archivos de credenciales.
- Si Codex no puede escribir por la política efectiva, continuar mediante RDC dentro del alcance autorizado y documentar la distinción; no eludir la separación de identidades ni alterar políticas del sistema.

### 4.4. Ciclo estándar de trabajo

1. Abrir el ciclo con el objetivo simple y sus subobjetivos.
2. Leer las instrucciones verbatim aplicables y su precedencia; mantener intacto el texto fuente.
3. Consultar el backlog único de §12 y seleccionar la tarea no bloqueada de mayor prioridad.
4. Revisar evidencia de observabilidad y suficiencia de cobertura; si es insuficiente, mejorar primero el observador.
5. Si hay evidencia suficiente, elegir una mejora guiada por el propósito declarado y las instrucciones verbatim.
6. Ejecutar en el workspace autorizado mediante RDC; para pruebas de navegador, usar CLI y Chromium headless aislado, nunca el Chrome principal.
7. Ejecutar solo pruebas discriminantes y necesarias; revisar diff, privacidad y regresiones.
8. Actualizar estado de tarea, evidencia y OCP. Conservar cada instrucción nueva literalmente y vincular tareas a sus claves D.
9. Repetir sin exigir al operador decisiones técnicas ordinarias; detenerse y avisar si un bloqueo requiere su intervención.

Una prueba sintética no equivale a prueba natural. Una propuesta no equivale a implementación. Una implementación no equivale a aceptación. El dato comunicado por el operador no se eleva a verificación independiente.

### 4.5. Groq como acelerador condicional del desarrollo

- Utilizar Groq solo cuando reduzca el tiempo neto de ingeniería o mejore materialmente la calidad del diagnóstico; si el análisis local es igual o más rápido, no hacer llamada.
- Groq Assist es una herramienta local bajo Harmonia/DevTools/GroqAssist/, nunca una dependencia de Extension/ o Collector/.
- La extensión conserva la medición T1/T2 y la correlación temporal deterministas. Groq solo analiza evidencia agregada y recomienda hipótesis/experimentos de una lista cerrada.
- Compilar la entrada con allowlist estricta. No enviar prompts, respuestas, texto del compositor, DOM crudo, URLs, rutas, código, diffs, credenciales ni IDs de conversación/ciclo/sesión/pestaña.
- La clave solo puede inyectarse mediante EP Vault Run con GROQ_API_KEY en allowlist explícita. No persistirla en archivos, variables globales, logs, extensión o repositorio.
- Las llamadas con diagnósticos reales requieren verificación de Zero Data Retention (ZDR) en Groq Data Controls. La llamada externa queda bloqueada mientras no se verifique ZDR y la sesión/variable de Vault no estén disponibles.
- La salida de Groq es una hipótesis y un selector de escenario, nunca una autorización ni un resultado de prueba. Un validador local y el runner determinista deciden.
- Ante ausencia de llave, Vault cerrado, ZDR no verificado, errores de API o falta de ahorro, ejecutar el fallback local y continuar el desarrollo.
- Medir el rendimiento contra el método local en cinco casos reales; conservar el uso de Groq solo con ahorro neto medible sin pérdida de precisión.
## 5. Registro de instrucciones verbatim

Las claves D-001 a D-033 son referencias documentales locales, no folios FOL1. D-010 a D-012 se conservan en §§16–18; D-013 y D-014 se conservan en este registro. D-015 a D-024 se añaden debajo; D-027 a D-031 se preservan íntegramente en el registro complementario de 2026-11-10; D-032 se conserva literalmente en docs/frentes/harmonia/originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261111.md; D-033 se conserva en docs/frentes/harmonia/originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261112.md. El texto exacto de D-023 (restauración literal de D-005) y los dictados completos D-015 a D-024 también se preservan en docs/frentes/harmonia/originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261110.md. D-005 del registro anterior tuvo normalización editorial; D-023 es la transcripción fuente complementaria. Las instrucciones anteriores no se borran ni renumeran.

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

### D-015 · Autorización amplia inicial y continuidad

~~~text
Correcto, nada mas, si quieres puedes usar el navegador principal para tus pruebas, ve que usas un chromium de prueba, pero lo que quiero decir es que quiero que tengas full access para hacer que st funcione lo mas rapido posible.  Por lo demas. Avanza. Toma en cuetna la converacion que acabas depersisitir, y adopta el contexto correcto, para continuar de manera coherente.
Considera metodos headless y cli si no tienes mucho exito usando el unico monitor disponbile que yo uso al mismo tiempo. ME ITNERESA QUE ESTO SE RESUELVA RAPIDO, DIME SI PUEDO AHCER LGO PARA AYUDAR
~~~

### D-016 · Restricción posterior a CLI y headless

~~~text
NB uses navbegadores, solo headless y cli, dime si eso e sun prbolema
~~~

Esta instrucción posterior restringe D-015: no usar el Chrome principal.

### D-017 · Aviso de bloqueos y celeridad

~~~text
Cuando haya un blqueante dime y te ayudo,  avanzemos rapido
~~~

### D-018 · Eficiencia sin sacrificar calidad

~~~text
Si te vy a pedir que sin sacrificar calidad, aunque sea aumentando riesgos,  evites comprobacioens inecesarias y burocracia.  Es decir, la calidad no se sascrifica, quiza nos arriesguemos a que no quede bien a la primera, pero si te pido que pongas especial atencionquiza se mitige el riesgo a favor de la eficiencia.  Por lo demas,no queria interrumpir,t ep pido que continues.
~~~

### D-019 · Recarga manual y consulta sobre autorrecarga

~~~text
Ya lo recargue yo manualmente. No teniamos un metodo de auto recarga? nbo ejecutes solo pregunto
~~~

### D-020 · Actualizar OCP y trabajar con ventana acotada

~~~text
Okj, continuemos, actualiza en tu ocp las reglas operativas y las decisiones hasta aquim tus tareas provisionales,  y sigamos trabajando,  tengo 40 minutos, hagamos que cuenten.
~~~

### D-021 · Auditoría verbatim, celeridad y recarga informada

~~~text
Bien, analiza la conversacion que perisististe y asegurate que el OCP este bien actualizado, sus tares, sus reglas operativas, conforme mi sinstrucciones verbatim, documetn tambien  todas mis isntrucciones verbatim para que sirvan de criteriod e verdad para los rsultados. 

No tardes. Fijate en las instrucciones que te pidenceleridad. 

CUmplelo todo. 

EXTENSION RECARGADA,  tengo 20 minutos haz que cuenten.
~~~

### D-022 · Pregunta sobre componentes CMD y responsabilidad operativa

~~~text
QU eson esos CMDs n o entiendo tu solucion
~~~

La instrucción complementaria ya registrada como D-006 es: Todo lo hare via rdc siempre esos archivos no me corresponde a mi ni siquiera tenerlos en mente.

### D-023 · Corrección literal de D-005

La transcripción histórica D-005 fue normalizada editorialmente. Su redacción fuente exacta se conserva, sin corregir, en originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261110.md, bajo D-023. Esa versión complementaria gobierna la lectura literal; el registro anterior se mantiene por continuidad.

### D-024 · Recordatorio simple al inicio de cada ciclo

~~~text
Cada ciclo necesito que en palabras simples me recuerdes el objetivo en curso, y sus subobjetivos si los hay concretos, y enterminos simples. Esto hazlo en un formato claro y legible,  y sinexcepcion a cada ciclo.  Continua
~~~

originales/HARMONIA-TRAMO-CONVERSACIONAL-20261110-1617.md conserva la misma instrucción literal y su procedencia.

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

## 10. Estado técnico verificable al corte (snapshot histórico de la candidata 0.4.0; superado por §§24–30)

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

Las tareas se mantienen trazables a D-001…D-033. Esta es la única tabla operativa del sprint. Los estados anteriores en secciones cronológicas son evidencia histórica; no forman colas paralelas ni prevalecen sobre esta tabla.

| Orden | ID | Prioridad | Tarea / resultado verificable | Traza | Estado |
|---:|---|---|---|---|---|
| 0 | OMM-01-000 | P0 | Mantener OCP canónico, archivo de versiones previas, registro literal completo y trazabilidad razonable entre dictados, tareas y evidencia. | D-005, D-009, D-011, D-012, D-020, D-021, D-023, D-024 | HECHO local en v0.63; registro verbatim complementario preservado. |
| 1 | OMM-01-001 | P0 | Mantener paquete MV3 coherente y cargable en KHORA/Harmonia/Extension; versión/build/procedencia alineadas. | D-001, D-006, D-007, D-009, D-011 | Candidata local 0.4.8; manifest/build-info/procedencia alineados con LOCAL-OMM-01-031-CYCLE-DIAGNOSTIC-TRACE; catálogos 0.1.3 sin cambios. Paquete preparado en Harmonia/Extension. La 0.4.8 aún no se recargó ni se declara activa en Chrome; no se intervino Chrome principal. |
| 2 | OMM-01-002 | P0 | Resolver disponibilidad/autenticación de Codex CLI bajo contexto autorizado y configurar ejecución sandbox workspace-write con revisión de diff. | D-005, D-008, D-011, D-023 | PARCIALMENTE RESUELTO: sesión fila4 autorizada y `codex login status` = Logged in using ChatGPT; Codex CLI 0.167.0 localizado mediante launcher de perfil; override `gpt-5.6-terra` y sandbox `workspace-write` probados con creación/lectura/eliminación real en directorio temporal. No hay todavía bucle de escritura sobre código de producto, contrato de tarea ni revisión de diff; no usar bypass ni modificar configuración global. |
| 3 | OMM-01-003 | P0 | Validar naturalmente la señal gráfica T1 en ChatGPT Free, variantes y falsos positivos. | D-002, D-004, D-005, D-011, D-023 | La candidata 0.4.8 registra main, nodo user, conteos de señales, flancos y correlación; pruebas sintéticas PASS. Señal T1 natural y causa real del bloqueo aún no verificadas. |
| 4 | OMM-01-004 | P0 | Validar naturalmente T2 asociado a respuesta final; cubrir streaming, herramientas, intermedios y cierre. | D-002, D-004, D-005, D-011, D-023 | La candidata 0.4.8 registra espera por respuesta assistant, settle y decisión T2 sin cambiar la ventana de 1.500 ms; aceptación T2 natural y atribución a respuesta final siguen pendientes. |
| 5 | OMM-01-005 | P0 | Mantener núcleo semántico común, UUIDv7 local, reloj monotónico, cobertura, estados y validación de pares. | D-003, D-005, D-011, D-023 | Implementado; sintéticos PASS; aceptación natural depende de OMM-01-003/004. |
| 6 | OMM-01-006 | P0 | Mantener adaptador chatgpt-web-free y KPI chatgpt_ui_generation_ms = T2 - T1; no mezclar con legado DOM. | D-002, D-003, D-004, D-005, D-011 | Candidata local 0.4.8; adaptador `chatgpt-web-free`, reloj monotónico y KPI T2-T1 conservan la semántica anterior; no se cambiaron selectores, filtros ni ventanas. Aceptación natural pendiente. |
| 7 | OMM-01-007 | P0 | Completar matriz de ciclos simples, largos/streaming, intermedios, cancelación, reintento, persistencia, cobertura y privacidad; separar pruebas sintéticas/naturales. | D-002, D-004, D-005, D-011, D-013, D-018, D-023 | Suite activa Extension/Collector/Groq Assist: 40/40 PASS (pruebas sintéticas/locales); 15/15 JS/MJS parseados, 5 JSON válidos y parser PowerShell sin errores. La matriz natural T1/T2 sigue pendiente; Groq Assist usó fallback/transporte simulado, sin llamada real. |
| 8 | OMM-01-008 | P1 | Ampliar catálogo estructural de navegación, barra lateral, menús, selector, herramientas, diálogos y controles, sin leer valores/contenido. | D-001, D-005, D-011, D-023 | IMPLEMENTADO 0.4.7 y conservado en 0.4.8 / catálogo 0.1.3. Última instantánea medida antes de esta actualización: índice actualizado `2026-11-11T20:44:33.363Z`, 732 barridos, 638 superficies únicas y 35 fingerprints/90 observaciones `conversation.response-streaming`; no se infieren nuevas capacidades por la traza diagnóstica. El banco estructural y la telemetría T1/T2 siguen separados. |
| 9 | OMM-01-009 | P1 | Validar popup y consulta de KPI, mediana/P90, muestra, framework_revision, legado DOM, cola offline e informe JSON. | D-001, D-002, D-005, D-011, D-021, D-023 | El informe JSON incluye `diagnostics.cycleObserver` y `diagnostics.cycleTrace` agregado (sin payloads ni IDs); pruebas sintéticas PASS. No hay traza natural hasta que la candidata 0.4.8 se recargue y observe un turno real. |
| 10 | OMM-01-010 | P1 | Mantener build-info local y modo catalog-only sin ejecutar código remoto. | D-001, D-011, D-021 | Implementado; build-info local declara 0.4.8 / LOCAL-OMM-01-031-CYCLE-DIAGNOSTIC-TRACE. Sin descarga/ejecución de código remoto. |
| 11 | OMM-01-011 | P1 | Etiquetar ciclos con framework_revision y habilitar comparación entre revisiones; modelo/benchmark solo desde señal visible no conversacional. | D-004, D-005, D-011, D-023 | `framework_revision` actualizado a HARMONIA-v0.72+DUG-v388-NX-388m; comparación/model benchmark pendiente. |
| 12 | OMM-01-012 | P1 | Detectar estructuralmente el botón Chat nuevo y distinguir límite de contexto/uso/nueva conversación; solo avisar, sin accionar. | D-005, D-011, D-023 | PENDIENTE; fuera del bloqueo BMO-01. |
| 13 | OMM-01-013 | P1 | Procesar localmente exportaciones oficiales descargadas por el titular y producir Markdown legible; no extraer programáticamente contenido de la plataforma. | D-005, D-011, D-023 | PENDIENTE; diferido respecto de BMO-01. |
| 14 | OMM-01-014 | P2 | Identificar el control S y documentar su efecto sin activarlo automáticamente. | D-005, D-011, D-023 | PENDIENTE; diferido respecto de BMO-01. |
| 15 | OMM-01-015 | P2 | Preparar prompt local de reanudación contextual para revisión/envío manual por el operador. | D-005, D-011, D-023 | PENDIENTE; no automatizar envío ni pulsación de Enter. |
| 16 | OMM-01-016 | P1 | Ejecutar iteraciones semiautomatizadas con Codex CLI, revisar diff/tests, actualizar OCP y seleccionar siguiente tarea. | D-001, D-005, D-008, D-011, D-023 | PARCIAL: se ejecutó auditoría de diseño con Codex autenticado y se completó una iteración local revisada por pruebas mediante RDC. Codex no escribió archivos porque el sandbox efectivo fue read-only; aún no existe bucle Codex write/review autónomo. |
| 17 | OMM-01-017 | P1 | Preservar continuidad y salida literal de origen, con estado actual separado del histórico. | D-012, D-020, D-021 | HECHO local; conservar originales, sin presentarlos como exportación íntegra. |
| 18 | OMM-01-018 | P0 | Confirmar arranque, inyección, primer barrido, eventos de ciclo y persistencia offline en la candidata actual; diagnosticar captura real. | D-001, D-005, D-011, D-012, D-013, D-016, D-018, D-021, D-023 | Colector local actualizado a 0.4.8.1 / catálogo 0.1.3 mediante INICIAR-HARMONIA.ps1: SERVICE=UPGRADED, HEALTH=OK, AUTH_NO_TOKEN=REJECTED_401, misma raíz de datos y ~29,8 MB preservados. La instantánea previa del índice (2026-11-11T20:44:33.363Z) registró 732 barridos, 638 superficies únicas, 35 fingerprints/90 observaciones `conversation.response-streaming`, 0 eventos de ciclo. La 0.4.8 aún no se recargó en Chrome; trazas naturales aún 0/no verificadas. |
| 19 | OMM-01-019 | P1 | Evaluar recarga de la extensión desempaquetada tras cambios validados, sin recargar pestañas ChatGPT ni intervenir durante generación. | D-006, D-007, D-009, D-014, D-015, D-016, D-019 | Diseño documentado; no integrada ni verificada. Headless/CDP solo en perfil de prueba; no tocar Chrome principal. |
| 20 | OMM-01-020 | P0 | Endurecer observador y mostrar cobertura local desde outbox, separada de observación natural. | D-001, D-002, D-005, D-011, D-013, D-018 | Base 0.4.2 implementada; 0.4.4 corrige escucha aria-label; 21/21 y E2E PASS. Natural pendiente. |
| 21 | OMM-01-021 | P1 | Exportar informe diagnóstico JSON sin contenido conversacional y exponerlo a Chromium headless. | D-001, D-005, D-011, D-012, D-021, D-023 | Informe JSON incluye diagnóstico T1/T2 agregado; privacidad e inclusión de identificadores verificadas en test sintético. |
| 22 | OMM-01-022 | P0 | Detectar cambios de señales T1/T2 cuando ChatGPT modifica aria-label en el mismo control. | D-001, D-002, D-005, D-011, D-013, D-016, D-018, D-021, D-023 | Corrección aria-label conservada; candidata 0.4.6 hereda la señal y añade diagnósticos; pruebas del observador PASS. |
| 23 | OMM-01-023 | P1 | Simplificar y modernizar el popup: jerarquía visual, contraste claro/oscuro, accesibilidad del progreso y textos orientados al objetivo. | D-001, D-005, D-018, D-021, D-023, D-024 | UI actual heredada; 0.4.6 agrega diagnóstico al informe sin añadir complejidad visual al popup; validación visual/natural pendiente. |
| 24 | OMM-01-025 | P0 | Instrumentar el observador T1/T2 y exponer contadores agregados de snapshots, root, nodos, señales, flancos, correlación, admisión y event sink en el informe diagnóstico, sin identificadores. | D-002, D-004, D-005, D-027, D-028, D-030 | IMPLEMENTADO en Extension 0.4.8 / Collector 0.4.8.1: traza discreta de etapas, conteos por señal (match/excluded/visible), correlación, decisiones/wait, worker ack y entrega; payload estrictamente allowlisted; 96 trazas/sesión y 20.000 globales; resumen autenticado separado de `index.cycles`. Pruebas 40/40 PASS; validación natural aún pendiente. |
| 25 | OMM-01-026 | P1 | Implementar Groq Assist local para compilar evidencia allowlisted, seleccionar un experimento cerrado y validar salida estructurada con fallback determinista. | D-027, D-028, D-030 | IMPLEMENTADO local en DevTools/GroqAssist; 6/6 tests PASS. Llamada real no realizada: EP Vault CLI no disponible en fila4 y ZDR no verificado. |
| 26 | OMM-01-027 | P1 | Comparar Groq con análisis local en cinco casos reales; medir tiempo, acierto, iteraciones evitadas y tokens/coste. | D-027, D-028 | PENDIENTE hasta disponer de Vault Run activo, ZDR verificado y evidencia diagnóstica real. Fallback local disponible. |
| 27 | OMM-01-028 | P1 | Conectar Groq Assist con un runner local de escenarios cerrados y realimentación acotada; volver a evaluar solo con el resultado categórico de la prueba, sin ejecutar instrucciones del modelo. | D-027, D-028, D-030 | IMPLEMENTADO local en §38: coordinador triage→experimento, nueve escenarios cerrados, una prueba por ciclo, fallback local y aislamiento de entorno hijo; 54/54 PASS en el corte previo. |
| 28 | OMM-01-029 | P1 | Implementar Cognitive Router local-first para elegir entre resolución determinista, evidencia adicional, Groq condicionado y escalamiento a la autoridad correcta; nunca despachar acciones por sí mismo. | D-001, D-027, D-028, D-030, D-032 | IMPLEMENTADO local en §39: rutas puras, umbral local 0.90, suficiencia de evidencia, compuertas Groq/ZDR y rutas no ejecutables; pruebas unitarias e integración PASS. |
| 29 | OMM-01-030 | P0 | Implementar Evidence Validator estricto y Policy Firewall determinista antes de transporte externo y ejecución local; allowlist inmutable, mínimo privilegio, fallo cerrado y procedencia verificable. | D-027, D-028, D-030, D-032 | IMPLEMENTADO local en §39: validación exacta de envelope, tipos/rangos/coherencia, firewall de 9 escenarios, actor/operación/workspace/capacidades y raíz fija; pruebas PASS. |
| 30 | OMM-01-031 | P0 | Instrumentar y persistir diagnóstico por etapas de T1/T2, desde inicialización del observador hasta entrega al colector, sin contenido conversacional. | D-002, D-004, D-005, D-027, D-028, D-030 | IMPLEMENTADO local en §36: traza diagnóstica discreta y agregada; validación sintética PASS; aceptación natural pendiente. |
| 31 | OMM-01-032 | P0 | Integrar Codex CLI como ejecutor local acotado mediante snapshot sandbox no-Git, contrato de tarea, modelo compatible, workspace-write, diff revisable y pruebas; no exponer el worktree rector ni permitir publicación. | D-001, D-008, D-033 | PARCIAL: Codex 0.167.0 autenticado; launcher por ruta de perfil; gpt-5.6-terra aceptado por invocación; sandbox workspace-write comprobado con create/read/delete real. Wrapper de snapshot, contrato de tarea, diff gate y primera modificación de código pendiente. |
| 32 | OMM-01-033 | P0 | Ejecutar benchmark pareado real ChatGPT/Codex frente a ChatGPT/Groq/Codex sobre tareas reales; medir hallazgos aceptados, falsos positivos, tiempo, tokens/coste, retrabajo y regresiones. | D-027, D-028, D-033 | INICIADO: BENCH-001 registra baseline real ChatGPT→Codex. El brazo Groq está PENDIENTE de ZDR verificado y EP Vault CLI; no hay mocks ni resultados inventados. |
| 33 | OMM-01-034 | P0 | Mantener avance continuo del frente: cada ciclo recuerda objetivo general, revisa dependencias/backlog, ejecuta un avance prioritario, valida y deja continuidad documental. | D-001, D-020, D-033 | REGLA CONTINUA ACTIVA; se aplica a todos los ciclos de trabajo, sin sustituir objetivos generales por tareas aisladas. |
| F1 | OMM-FUT-001 | FUTURO | Guía para incorporar adaptadores sobre el contrato neutral. | D-003, D-005, D-023 | DIFERIDO. |
| F2 | OMM-FUT-002 | FUTURO | Adaptador OpenWebUI de Cora. | D-003, D-005, D-023 | DIFERIDO. |
| F3 | OMM-FUT-003 | FUTURO | Adaptadores para clientes API/streaming externos. | D-003, D-005, D-023 | DIFERIDO. |

### Dependencias y orden válido

**Ruta P0 de medición:** OMM-01-001 -> OMM-01-018 -> OMM-01-025 -> OMM-01-003/004 -> OMM-01-005/006 -> OMM-01-007 -> OMM-01-009 -> BMO-01. La candidata local 0.4.8 y el colector 0.4.8.1 tienen instrumentación diagnóstica y transporte sintético validados; siguiente evidencia requerida: recarga de 0.4.8 en el Chrome del operador y primera traza natural, sin intervención RDC en Chrome principal.

**Ruta de agente:** OMM-01-002 → OMM-01-016 → OMM-01-032. Autenticación y escritura acotada de Codex se probaron en un directorio temporal; el ejecutor de producto se implementará en snapshot aislado sin .git, con workspace-write y revisión de diff. No declarar el bucle completo hasta validar contrato de tarea, límites de ruta y pruebas.

**Ruta cognitiva y de control local:** OMM-01-026 → OMM-01-028 → OMM-01-030 → OMM-01-029. Primero se valida la evidencia y se aplica la política de ejecución; después el router decide si el diagnóstico local basta o si conviene Groq. OMM-01-027 y OMM-01-033 mantienen la compuerta empírica para afirmar ahorro neto.

**Ruta de ingeniería semiautomatizada:** OMM-01-032 → OMM-01-033. Codex ejecuta únicamente contratos de tarea bajo workspace-write y diff revisable; Groq se incorpora como crítico independiente tras ZDR y Vault verificados. OMM-01-034 regula la continuidad entre ciclos.

OMM-01-010/011 apoyan comparación entre revisiones. OMM-01-008 crece según cobertura. OMM-01-012 a 015 no bloquean BMO-01. OMM-01-019 es mejora de velocidad, subordinada a la ruta P0 y limitada a perfiles de prueba.

### Bloqueos reales y su alcance

- La extensión local puede observar y conservar eventos en chrome.storage.local sin inicializar el colector.
- La transferencia a JSONL del colector sí requiere inicialización y autenticación local bajo la sesión autorizada.
- La aceptación natural de T1/T2 y BMO-01 está bloqueada por falta de evidencia natural.
- La autenticación de Codex bajo fila4 está resuelta; la escritura mediante Codex sigue bloqueada por política efectiva read-only. Continuar mediante RDC en el workspace autorizado, sin elevar permisos ni usar bypass.
- La nueva API autenticada `/cycle-diagnostics` y el informe de popup exponen agregados, por lo que el JSON del botón Copiar informe ya no es requisito de diseño. No habrá traza natural hasta que la candidata 0.4.8 esté activa en la sesión de ChatGPT; la activación/recarga de Chrome principal no se realizará mediante RDC.

BMO-01 permanece NO ALCANZADO hasta satisfacer todos los criterios de §16.4.

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

## 15. Estado operativo y siguiente acción (snapshot histórico de v0.50; superado por §§24–30)

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

---

## 26. Revalidación final del popup 0.4.2 y criterio de T2 · 2026-11-10

### 26.1. Resultado

Después de corregir la concordancia singular/plural del contador de muestras, se repitió la suite y el ensayo integrado:

- 10 archivos JavaScript del paquete Extensión/Collector: sintaxis PASS.
- Suite automatizada: **20/20 PASS**.
- Chromium headless 153: inyección automática, un T1, un T2 y un barrido; eventos esperados en outbox: capture.started, client.cycle.started, client.cycle.completed y ui.surface.scan.
- Popup: «1 muestra gráfica», un barrido, una superficie y 3/44 capacidades; etiqueta «Superficie local · pendiente natural».
- Fixture sin texto conversacional ni texto de compositor; perfil temporal eliminado.
- Un fixture alternativo que contenía el nodo de respuesta asistente sin estructura interna produjo T1 sin T2. Se conservó como ciclo incompleto; no se debilitó el requisito estructural para fabricar cierres.

### 26.2. Dictamen

La candidata local 0.4.2 continúa PASS en pruebas sintéticas y headless. El criterio de T2 exige respuesta de asistente representada y ausencia de actividad; un contenedor vacío no satisface el criterio. La protección frente a falsos cierres se mantiene.

El siguiente paso no es añadir más fixtures equivalentes: es confirmar los contadores que Harmonia acumuló en la sesión real después de la recarga manual informada por el operador. La extensión no necesita que el agente lea contenido de ChatGPT para ese control; bastan las cifras agregadas del popup.

### 26.3. Límite vigente

No se accedió al perfil principal para leer su outbox. La recarga manual fue informada por el operador, pero la versión activa no fue comprobada independientemente. No se afirma que exista ya un ciclo natural medido.

### 26.4. Trazabilidad

- OCP v0.58 preservado en docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.58-pre-popup-final-e2e-20261110.md; SHA-256 CDF1F122D21F5AF15D322C1A082F86A3A92D9263AF949BB738035BD9515B2BC6; 113.470 bytes.
- OCP resultante: HARMONIA-v0.59; edición local, no publicada.
- UUIDv7 local: 01a1c7ac-5cca-7028-8121-512de23263d2; hora: 2026-11-10T16:55:24.3627368-06:00 (America/Mexico_City).
- Rama work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d; sin commit/push/merge/PR/despliegue.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1: PREPARADA / NO ACTIVA. MCP normativo: DESACTIVADO.

---

## 27. Informe diagnóstico copiable y acceso headless · OMM-01-021 · 2026-11-10

### 27.1. Solicitud y objetivo

El operador solicita añadir a la siguiente iteración un botón para copiar automáticamente al portapapeles toda la información relevante de Harmonia y hacer accesible el mismo paquete mediante Chromium headless.

**Objetivo:** producir un único informe diagnóstico estructurado, reutilizable tanto por una persona como por automatización, sin extraer ni incorporar contenido de conversaciones.

### 27.2. Candidata 0.4.3

Se implementó la candidata local **0.4.3**:

- Botón **Copiar informe** en el popup.
- Permiso de extensión `clipboardWrite`; el botón usa `navigator.clipboard.writeText` y dispone de fallback mediante selección de texto y `execCommand('copy')`.
- Esquema JSON estable: `harmonia.diagnostic-report.v1`.
- El informe comprende versión/revisión, estado de observación, disponibilidad del colector, contadores de cola y bytes, métricas de ciclos, mediana/P90/promedio, hasta diez registros recientes sanitizados, cobertura documental/local, catálogo de capacidades observadas y pendientes, sincronización del repositorio y último error acotado.
- El paquete excluye contenido de mensajes, texto del compositor, credenciales, identificadores de pestañas/conversaciones y eventos crudos. No incluye URLs, tokens, objetos de sesión ni cuerpos de evento.

### 27.3. Acceso por Chromium headless

El popup publica el mismo objeto JSON en tres superficies de lectura:

- `window.__HARMONIA_DIAGNOSTIC_REPORT__`: objeto JavaScript.
- `window.__HARMONIA_DIAGNOSTIC_REPORT_JSON__`: cadena JSON canónica.
- `#reportPayload`: contenido textual JSON, oculto en la presentación ordinaria.

La automatización headless puede abrir `chrome-extension://<extension-id>/popup.html`, esperar a que se inicialice el informe y leer el objeto o la cadena directamente. No necesita abrir ni leer conversaciones ni usar el portapapeles. El botón copia exactamente esa misma cadena.

### 27.4. Validación

- 10 archivos JavaScript del paquete Extension/Collector: sintaxis PASS.
- Suite automatizada existente: **20/20 PASS**.
- Chromium headless 153: extensión 0.4.3 cargada automáticamente, fixture estructural sintético sin autenticación ni texto de conversación.
- Eventos del fixture: un T1, un T2 y un barrido; outbox con cuatro eventos.
- Informe headless: schema y versión correctos; la cola, el ciclo y la cobertura coinciden con la outbox y el catálogo.
- Igualdad: JSON global = payload oculto = texto pasado al método de portapapeles en la prueba.
- El adaptador de portapapeles se sustituyó por un stub en la prueba headless para comprobar la llamada y la identidad del contenido. **La escritura efectiva al portapapeles del sistema en Chrome principal no se declara probada** hasta que el operador recargue 0.4.3 y lo use.
- Privacidad: no se encontraron claves/valores de contenido, IDs de conversación o IDs de pestañas en el paquete de prueba.
- Perfil temporal y procesos headless eliminados al terminar.

### 27.5. Snapshot de actividad compartido por el operador

El operador facilitó una lectura del popup de la candidata 0.4.2, con fecha visible 10/11/2026 4:57:33 p.m.:

| Indicador | Valor comunicado |
| --- | ---: |
| Cola pendiente | 155 eventos |
| Eventos persistidos | 0 |
| Barridos registrados | 138 |
| Superficies únicas | 70 |
| Capacidades observadas | 13 / 44 |
| Cobertura estructural local | 30% |
| Documentación verificada | 91% |
| Ciclos gráficos medidos | 0 |
| Ciclos cerrados / en curso / sin medición | 0 / 0 / 0 |

Fuente: texto del popup pegado por el operador; no se inspeccionó el perfil principal ni se realizó read-back independiente. La lectura demuestra actividad de escaneo, no medición T1/T2. El informe copiable busca eliminar la transcripción manual de este tipo de estado.

### 27.6. Estado y siguiente paso

- OMM-01-021: **CANDIDATA LOCAL 0.4.3 IMPLEMENTADA; E2E headless PASS; activación en navegador del operador pendiente**.
- OMM-01-018: la captura estructural natural informada muestra barridos, pero no evidencia de ciclos gráficos; investigar por qué la muestra medida sigue en cero después de la activación de 0.4.3.
- OMM-01-003/004: T1/T2 naturales pendientes.
- BMO-01: **NO ALCANZADO**.
- Para probar el portapapeles real, el operador debe recargar manualmente 0.4.3 y pulsar **Copiar informe**. El informe también se podrá leer por headless, de forma independiente al portapapeles.

### 27.7. Trazabilidad e integridad

- OCP v0.59 preservado antes de esta edición: docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.59-pre-report-export-20261110.md; SHA-256 72D916BD6A557299D4B3DA22F42CEB9003810C4A688638B4987B628DB412D226; 116.289 bytes.
- OCP resultante: HARMONIA-v0.60; local, no publicado.
- UUIDv7 local: 01a1c7b3-53c1-76ab-b2bd-f6b18ad82cc1; hora: 2026-11-10T17:03:00.8010632-06:00 (America/Mexico_City).
- Rama work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d; no commit/push/merge/PR/despliegue.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1: PREPARADA / NO ACTIVA. MCP normativo: DESACTIVADO.

---

## 28. T1/T2 sin eventos y observación de transiciones aria-label · OMM-01-022 · 2026-11-10

### 28.1. Evidencia de partida

El operador informó que recargó manualmente la candidata 0.4.3 y facilitó el panel:

- 155 eventos pendientes, 0 persistidos.
- 138 barridos, 70 superficies únicas.
- 13 de 44 capacidades observadas; cobertura local 30%.
- 0 ciclos gráficos medidos; 0 cerrados; 0 en curso; 0 sin medición.
- Marco comunicado: HARMONIA-v0.56+DUG-v388-NX-388m.

Esta lectura fue pegada por el operador desde el popup 0.4.2; no se leyó el perfil principal. Demuestra actividad de escaneo, no que los ciclos naturales se hayan intentado ni que T1/T2 hayan funcionado.

### 28.2. Causa técnica probable encontrada

La detección de actividad utiliza, entre otros, estos selectores:

- `[aria-busy="true"]`
- `[data-is-streaming="true"]`
- controles cuya etiqueta accesible contiene «Stop» o «Detener».

El `MutationObserver` del ciclo escuchaba `aria-busy`, `data-is-streaming`, `data-testid` y otros atributos, pero omitía **`aria-label`**. Si ChatGPT conserva el mismo botón y cambia su etiqueta accesible de «Enviar mensaje» a «Detener generación» y de regreso, el escáner general puede registrar mutaciones mientras el observador T1/T2 no recibe el cambio que activa o termina el ciclo.

Se trata de una causa probable consistente con el estado reportado; el snapshot del operador por sí solo no prueba qué mutación concreta ocurrió en su sesión.

### 28.3. Corrección 0.4.4

- Se añadió `aria-label` al `attributeFilter` del observador T1/T2.
- Se añadió regresión sintética que exige observar explícitamente `aria-label`, `aria-busy` y `data-is-streaming`.
- Se incrementó la candidata local a **0.4.4**, build `LOCAL-OMM-01-022-ARIA-LABEL-CYCLE-SIGNAL`.
- No se cambiaron selectores de contenido ni se comenzó a leer texto de mensajes.

### 28.4. Pruebas y resultados

- 10 archivos JavaScript de Extension/Collector: sintaxis PASS.
- Suite automatizada: **21/21 PASS**.
- Chromium headless 153, extensión cargada desde el paquete 0.4.4.
- Fixture: el mismo botón cambia `aria-label` «Enviar mensaje» → «Detener generación» → «Enviar mensaje»; no se reemplaza el botón.
- Resultado: un `client.cycle.started`, un `client.cycle.completed`, un `ui.surface.scan`; cola de cuatro eventos incluido `capture.started`.
- KPI resumido por el popup: una muestra gráfica; señal inicial `stop-control`; señal final `processing-indicators-cleared`; duración sintética 469,1 ms.
- Privacidad: no se lee ni incluye texto de conversación o del compositor; no se exponen IDs de sesión ni eventos crudos.

La duración de 469,1 ms es sintética y **no cuenta para la aceptación natural ni para BMO-01**.

### 28.5. Dictamen y siguiente paso

- **OMM-01-022:** corrección implementada en candidata 0.4.4; regresión y E2E headless PASS.
- **OMM-01-018:** arranque, escaneo y outbox demostrados; falta comprobar captura natural con 0.4.4.
- **OMM-01-003/004:** sin muestra natural aceptada.
- **OMM-01-021:** botón de informe JSON y lectura headless verificados en 0.4.3; escritura real al portapapeles del perfil del operador aún pendiente.
- **Siguiente paso:** el operador recarga manualmente 0.4.4, usa **Copiar informe** y comparte el JSON. Se compararán versión, eventos pendientes, barridos, señales/ciclos y diagnósticos. No usar Chrome principal vía RDC.
- Si 0.4.4 continúa mostrando cero ciclos después de actividad natural, el siguiente diagnóstico será añadir contadores estructurales de transiciones admitidas/no admitidas, sin recopilar contenido ni ampliar la extracción.

BMO-01 permanece **NO ALCANZADO**.

### 28.6. Trazabilidad

- OCP v0.60 preservado antes de esta edición: docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.60-pre-aria-label-signal-watch-20261110.md; SHA-256 C3B108CA34CD57E24CBB9E828B408014B8AFBA7CC4964416A9B9047D093E078E.
- OCP resultante HARMONIA-v0.61; local, no publicado.
- UUIDv7 local: 01a1c7b6-c4ce-70db-b577-f58eb2fc5cab; hora: 2026-11-10T17:06:46.3509779-06:00 (America/Mexico_City).
- Rama work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d; no commit/push/merge/PR/despliegue.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS. FOL1 PREPARADA / NO ACTIVA. MCP normativo DESACTIVADO.


---

## 29. Continuidad operativa, reglas vigentes y cola provisional — 2026-11-10

### 29.1. Propósito operativo confirmado

Harmonia es un bucle semiautomatizado de desarrollo basado en observabilidad: observa estructuralmente ChatGPT, mantiene un catálogo local actualizado de capacidades/superficies, mide ciclos y latencias visibles, contrasta la evidencia con el propósito e instrucciones del operador y prioriza mejoras de la extensión. La UI de Harmonia debe evolucionar hacia una presentación moderna, pulida y simplificada. El operador define el resultado y aporta intervenciones funcionales; el agente dirige el trabajo técnico ordinario.

La telemetría operativa debe medir tiempos y resultados de ciclo, muestras, cobertura e incompletos. Permanece separada de la telemetría normativa de ART-027: el conteo de consultas normativas no demuestra aplicación de principios ni se asocia a una conversación/ciclo.

### 29.2. Reglas operativas incorporadas

1. **Canal de ejecución:** toda operación técnica local se realiza por RDC en el dispositivo y workspace autorizados. No trasladar al operador la ejecución o administración de CMD, PowerShell, scripts, comandos o rutas.
2. **Navegadores:** pruebas exclusivamente mediante CLI y Chromium headless con perfiles temporales aislados. No abrir, enfocar, navegar, inspeccionar ni modificar el Chrome principal ni ocupar el monitor interactivo del operador.
3. **Privacidad:** no leer ni persistir prompts, respuestas, borradores o texto del compositor; no recoger cookies, credenciales, tokens, cuerpos de solicitudes o identificadores de sesión/conversación/pestaña. Los diagnósticos deben ser agregados y estructurales.
4. **Fixtures:** pruebas sintéticas/headless acreditan funcionamiento técnico, pero nunca se contabilizan como ciclos naturales para BMO-01.
5. **Eficiencia:** evitar comprobaciones redundantes o burocráticas sin poder discriminante. Favorecer iteraciones cortas y una primera pasada rápida, sin rebajar la calidad final ni los criterios de aceptación.
6. **Bloqueos:** avisar inmediatamente cuando una intervención del operador sea realmente indispensable; pedir solo la mínima evidencia o acción.
7. **Autorización y publicación:** consultas no equivalen a autorización. No realizar commit, push, merge, PR, despliegue ni cambios remotos sin autorización expresa.
8. **Perfiles temporales:** eliminar los perfiles y artefactos temporales al cerrar los ensayos.
9. **No regresión de contexto:** conservar instrucciones literales, separar su interpretación técnica, y distinguir hechos reportados por el operador de verificaciones independientes.

Estas reglas complementan las reglas generales de §4 y las restricciones de §11; prevalece la regla más restrictiva compatible con la autorización vigente.

### 29.3. Mediciones y criterio de aceptación

- T1 es la primera transición visual observable a procesamiento activo.
- T2 es la primera transición a inactivo cuando el DOM ya representa una respuesta del asistente.
- settle_window_ms = 1500 confirma el cierre; no se suma a T2−T1.
- chatgpt-ui-generation.v1 mide transiciones visibles de la interfaz, no tiempo de inferencia interna ni latencia del servidor.
- BMO-01 requiere al menos cinco ciclos naturales correlacionados y persistidos, mediana/P90, tamaño de muestra, cobertura, incompletos/no medidos, revisión de matriz, popup/privacidad y cierre reproducible.
- Ninguna medición sintética o headless satisface el requisito de muestra natural.

### 29.4. Decisiones sobre recarga y participación del operador

El operador informa ahora: «EXTENSION RECARGADA». El paquete local manifest.json y build-info.json declaran 0.4.4 y la revisión LOCAL-OMM-01-022-ARIA-LABEL-CYCLE-SIGNAL. Esto hace coherente el reporte con la candidata local, pero no verifica qué versión está activa en el perfil ni acredita actividad natural. La confirmación se obtendrá del informe diagnóstico agregado harmonia.diagnostic-report.v1; no acceder al Chrome principal para obtenerla.

La autorrecarga mediante CDP/DevTools sigue siendo OMM-01-019, mejora secundaria P1: diseñada conceptualmente, no integrada ni verificada en Chrome principal. No habilitar un puerto CDP en el navegador principal ni modificarlo. La intervención mínima que desbloquea OMM-01-018 es que el operador comparta el JSON obtenido con Copiar informe; no se requieren capturas ni texto de conversaciones.

### 29.5. Cola provisional y fuente única

El único backlog rector es §12. Esta sección no crea una segunda cola. Al corte de esta actualización, la ruta crítica es:

1. OMM-01-018: analizar el informe diagnóstico de la sesión después de la recarga informada.
2. OMM-01-003/004: confirmar T1/T2 naturales y obtener ciclos correlacionados.
3. OMM-01-007/009: completar matriz y validar el popup con evidencia natural.
4. OMM-01-002/016: desbloquear Codex CLI solo bajo identidad/contexto autorizado.
5. OMM-01-019: autorrecarga aislada de prueba, subordinada a la ruta P0 y sin tocar Chrome principal.

OMM-01-012 a 015 y los adaptadores futuros permanecen diferidos; no desplazan BMO-01.

### 29.6. Estado de implementación al corte

- OCP anterior: HARMONIA v0.61.
- Candidata local de extensión: 0.4.4, build LOCAL-OMM-01-022-ARIA-LABEL-CYCLE-SIGNAL.
- Suite automatizada: 21/21 PASS.
- E2E headless: el mismo botón cambia Enviar → Detener → Enviar; un T1, un T2 y un barrido; 469,1 ms sintéticos.
- La duración sintética no cuenta para BMO-01.
- Recarga manual informada por el operador para la extensión; versión activa no verificada independientemente. Captura natural T1/T2 pendiente de evidencia.
- El estado reportado en el último mensaje conversacional pegado (OCP v0.59 / extensión 0.4.2 / 20 pruebas) se conserva literalmente en el documento de continuidad, pero no gobierna el estado técnico actual.

### 29.7. Registro de continuidad y reproducción literal

Se conserva el tramo estructurado y la última salida del modelo incluida en el texto entregado por el operador en:

docs/frentes/harmonia/originales/HARMONIA-TRAMO-CONTINUIDAD-20261110-1709.md

El documento separa las decisiones vigentes de la reproducción literal histórica. No es una exportación íntegra de la conversación ni telemetría. Se preserva también el registro previo HARMONIA-ULTIMO-CICLO-20261110.md, sin sobrescribirlo.

### 29.8. Trazabilidad e integridad

- OCP v0.61 preservado antes de esta edición en docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.61-pre-continuity-rules-20261110.md.
- SHA-256 del OCP v0.61 original y del archivo preservado: 2C6FD259EAECE2D19FDCB7BD9E208460360DAACFA978B9C602FB621831F6030B; comparación PASS.
- OCP resultante: HARMONIA v0.62; edición local, no publicada.
- UUIDv7 local: 01a1c7b8-db42-7004-bc41-beb0b6b08b67; hora local 2026-11-10T17:09:03.2247283-06:00.
- Rama work/harmonia-front-workspace-20261110; HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d; no commit/push/merge/PR/despliegue.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS.
- FOL1: PREPARADA · NO ACTIVA.
- MCP normativo: DESACTIVADO.
- Edad del último commit de main y antigüedad nativa IPZ: NO VERIFICADAS.

---

## 30. Rediseño del popup y candidata local 0.4.5 — 2026-11-10

### 30.1. Objetivo del ciclo

Modernizar y simplificar el popup de Harmonia sin alterar el contrato de observación ni la privacidad: presentar primero el estado de captura, después las métricas T1/T2 y finalmente la cobertura estructural; conservar acceso al informe JSON y a detalles bajo demanda.

### 30.2. Cambios implementados

- popup.css: nueva jerarquía visual, superficies y bordes más limpios, métricas con jerarquía tipográfica, botones consistentes, estados claros, tratamiento dark mode, foco visible y respeto a prefers-reduced-motion.
- popup.html: textos más directos («Tiempo de generación», «Cobertura de interfaz»), detalles colapsables mejor nombrados y región de cobertura declarada como progressbar.
- popup.js: setBar() actualiza también aria-valuenow, de modo que la cobertura anunciada por tecnologías de asistencia coincide con el ancho visual.
- Se preservó el CSS anterior byte a byte en Harmonia/Extension/archive/popup.css.pre-ui-refresh-0.4.4-20261110.
- Versionado de la candidata a 0.4.5 en manifest, build-info, guard del content script, service worker, popup y test de outbox.
- Build: LOCAL-OMM-01-023-POPUP-UI-REFRESH.
- FRAMEWORK_REVISION actualizado a HARMONIA-v0.64+DUG-v388-NX-388m, alineando la revisión operativa reportada en nuevos ciclos.

### 30.3. Pruebas y límites

- Suite Node: 21/21 PASS después de actualizar la expectativa de la nueva framework_revision en el test del service worker.
- La suite cubre observador T1/T2, transición aria-label, correlación, no duplicación, T2 no fabricado, estados incompletos, privacidad, persistencia offline e integración del colector.
- La duración sintética histórica de 469,1 ms continúa siendo un fixture y no cuenta para BMO-01.
- El rediseño no cambia selectores, captura de conversación ni transporte de eventos.
- La validación visual final en Chrome y la observación natural T1/T2 no se declaran realizadas. No se abrió ni inspeccionó el Chrome principal.

### 30.4. Estado de recarga y siguiente acción

El operador informó que recargó la extensión antes de este cambio. Esa recarga se refiere a la build anterior y no acredita la 0.4.5. El paquete local actual es 0.4.5; requiere una recarga manual por el operador cuando decida actualizarlo. No intentar autorrecarga en el Chrome principal.

La siguiente compuerta del sprint sigue siendo OMM-01-018: obtener el informe JSON harmonia.diagnostic-report.v1 tras cargar 0.4.5 y actividad natural. Después validar T1/T2 y completar al menos cinco ciclos naturales correlacionados/persistidos para BMO-01.

### 30.5. Trazabilidad e integridad

- OCP v0.63 preservado antes de este cambio en archive/OBJETO-CANONICO-v0.63-pre-popup-0.4.5-20261110.md.
- SHA-256 de v0.63 y su archivo preservado: 30E2B5B68214EDEC4AF4625857FF2B4199402B0EA812FE12A0304F8DD1B42EA8; comparación PASS.
- CSS anterior preservado con SHA-256 A7C8BFC18D541C7B29227DA7E41B35B2E0C52490E45D56BD2F917E376CFE05CC.
- Versión OCP resultante: HARMONIA v0.64; local y no publicada.
- UUIDv7 local del ciclo: 01a1c7c7-4617-7132-b2a6-7d4fb16e98f2; hora local: 2026-11-10T17:24:48.0621912-06:00.
- No hubo commit, push, merge, PR ni despliegue. No se modificó el Chrome principal ni el colector.
---

## 31. Candidata local 0.4.6 · diagnóstico T1/T2 y Groq Assist — 2026-11-11

### 31.1. Actualización de la extensión cargable

La carpeta de trabajo actual es C:\Users\fila4\Desktop\SeryMente\Repositorios\KHORA\Harmonia\Extension. Se actualizó allí la candidata local a Manifest V3 0.4.6, build LOCAL-OMM-01-025-T1-DIAGNOSTICS-GROQ-ASSIST.

- cycle-observer.js: contadores de reconciliación, nodos de usuario/asistente, snapshots activos, flancos T1/T2, correlación, expiración, intentos/admisiones/rechazos y resultado del event sink.
- content.js: snapshot estructural con existencia de main, número de snapshots, nodos visibles y presencia/coincidencias/visibilidad de las cuatro señales allowlisted.
- service-worker.js: consulta diagnósticos a las pestañas ChatGPT y agrega los campos sin devolver IDs de pestaña, conversación, sesión o ciclo.
- popup.js: el informe harmonia.diagnostic-report.v1 incluye diagnostics.cycleObserver; no se muestran detalles sensibles ni se altera la UI funcional.
- manifest.json, build-info.json, content guard y eventos capture.started declaran 0.4.6. FRAMEWORK_REVISION: HARMONIA-v0.65+DUG-v388-NX-388m.
- La medición continúa determinista: Groq no calcula T1/T2, no interviene en relojes ni participa en la correlación.

### 31.2. Groq Assist implementado

Módulo: Harmonia/DevTools/GroqAssist/

Componentes:
1. assist.mjs: compilador de evidencia, selector local determinista, cliente opcional Groq y validación de salida.
2. scenarios.json: catálogo cerrado de experimentos discriminantes (root, nodo de usuario, visibilidad, flanco, correlación, admisión, event sink, persistencia y T2).
3. input.schema.json y result.schema.json: contratos versionados de entrada/salida.
4. run-via-vault.ps1: lanzador que usa EP Vault Run con allowlist GROQ_API_KEY; si no encuentra la CLI o la sesión está cerrada, usa fallback local.
5. assist.test.mjs: pruebas sintéticas del compilador, exclusiones, selector local, validador y transporte simulado.

La entrada remota se limita a cantidades y categorías agregadas. No transmite texto, DOM crudo, prompts/respuestas, URLs, rutas, código, diffs, secretos ni IDs. El modelo no ejecuta comandos ni modifica archivos; su resultado es una hipótesis y un scenario_id del catálogo cerrado.

### 31.3. Condiciones de uso de la llave

- El cliente usa Groq Chat Completions, openai/gpt-oss-20b, reasoning effort bajo y Structured Outputs estricto.
- La llamada externa requiere que EP Vault inyecte GROQ_API_KEY al proceso hijo y que se habilite explícitamente HARMONIA_GROQ_ZDR_VERIFIED=true después de verificar ZDR en Data Controls.
- En el perfil/contexto fila4 no se encontró EP Vault CLI en las ubicaciones instaladas comprobadas; no hubo sesión/variable inyectada disponible desde esta ruta.
- No se llamó a Groq durante esta actualización, no se leyó ni copió ninguna clave y no se guardó secreto en el repositorio.
- El fallback determinista funciona sin llave ni red y permite continuar ingeniería. Groq se conservará solo si reduce el tiempo neto frente al procedimiento local.

### 31.4. Pruebas y evidencia

- Suite dirigida de Extension/Collector: 25/25 PASS.
- Groq Assist: 6/6 PASS, todos sintéticos o con fetch simulado; no consumen cuota ni acreditan una llamada real.
- node --check: PASS para content.js, cycle-observer.js, service-worker.js, popup.js, assist.mjs y assist.test.mjs.
- El test del worker confirma que los diagnósticos agregados no exponen IDs.
- El test del compilador confirma que se excluyen rutas, mensajes, tokens, URLs e identificadores.
- No se realizó Chromium headless en este ciclo; no se interactuó con Chrome principal.

### 31.5. Estado del sprint

- OMM-01-025: implementación sintética terminada; falta informe natural para diagnosticar T1 real.
- OMM-01-026: Groq Assist local terminado con fallback; integración real de API condicionada por Vault/ZDR.
- OMM-01-027: benchmark comparativo en cinco casos reales pendiente.
- T1/T2 naturales: NO VERIFICADOS.
- BMO-01: NO ALCANZADO.
- La candidata 0.4.6 no se ha recargado ni se declara activa en Chrome. Se deja preparada en la carpeta que el operador utiliza para cargarla.
- No commit, push, merge, PR, despliegue ni cambios en main.

### 31.6. Integridad y continuidad

- OCP v0.64 preservado antes de esta edición en archive/OBJETO-CANONICO-v0.64-pre-omm-01-025-20261111.md; SHA-256 de la copia cotejado: 13B67FD2213BC2A5C914ABF148D3A13DE7E59F45FC5FE6DF104E74A0DE5381AE.
- Ocho archivos de Extension preservados con hash idéntico en Harmonia/Extension/archive/omm-01-025-pre-0.4.6-groq-engineering-20261111/.
- README, manifiesto de procedencia y registro verbatim también preservados antes de actualizarse.
- El registro complementario conserva D-027 a D-030 literalmente.
Dispositivo RDC autorizado: PC10RCIF4EI4, UUID b573344f-c68f-47c9-9c2e-ae67f2e63bdb; sesión elevada MantenimientoRCI y workspace del usuario fila4.
- DUG: v388 / NX-388m; edad del último commit main NO VERIFICADA.
- FOL1: PREPARADA / NO ACTIVA. CONV/CICLO/A/B: NO ASIGNADOS. MCP normativo: DESACTIVADO.

### 31.7. Fuentes técnicas de Groq

- Structured Outputs: https://console.groq.com/docs/structured-outputs
- Reasoning: https://console.groq.com/docs/reasoning
- Data Controls y Zero Data Retention: https://console.groq.com/docs/your-data


---

## 32. Continuidad Groq Engineering Loop y estado reconciliado — 2026-11-11

### 32.1. Decisión de diseño: selector adaptativo de experimentos

El punto del flujo donde Groq puede producir el ahorro más defendible es **entre el compilador local de evidencia y la selección de la siguiente prueba discriminante**. No se incorpora a Extension/ ni Collector/ y no participa en T1, T2, correlación, persistencia ni temporizadores.

El ciclo objetivo es:

1. Harmonia produce un informe estructural agregado.
2. El compilador local aplica allowlist y excluye contenido de conversación, DOM crudo, rutas, URLs, identificadores y secretos.
3. El selector determinista local resuelve los casos inequívocos. Groq solo se invoca si persisten hipótesis competidoras o incertidumbre relevante.
4. GPT-OSS selecciona un escenario de un catálogo cerrado y devuelve referencias de evidencia, observación esperada y condición de refutación.
5. El runner local ejecuta la prueba permitida. Su resultado categórico vuelve al coordinador; solo si persiste la ambigüedad se permite otra evaluación acotada.
6. El coordinador contrasta la evidencia y decide si corregir, ampliar observación o cerrar. Groq no modifica archivos ni aprueba sus propias hipótesis.

El ahorro no se atribuye a la velocidad de inferencia por sí sola, sino a reducir pruebas exploratorias y el tiempo entre detectar una anomalía y saber qué experimento local distingue sus causas.

### 32.2. Compuertas de uso

- No llamar a Groq por evento, barrido, conversación o ciclo. Activar únicamente ante fallos T1/T2, discrepancias de persistencia, regresiones o diagnósticos ambiguos que el selector local no resuelva.
- Enviar solamente contadores y categorías agregadas allowlisted, candidatos del catálogo cerrado y resultados categóricos de pruebas previas cuando el contrato los admita.
- La respuesta del modelo es una recomendación no ejecutable. El validador local comprueba esquema, referencias y escenario permitido.
- No transmitir prompts, respuestas, texto del compositor, DOM crudo, código, diffs, rutas, URLs, cookies, tokens ni IDs privados bajo el contrato vigente.
- Mantener fallback determinista. Si no hay llave, Vault Run, ZDR verificado, conectividad o ahorro neto, no se llama a la API y el flujo local continúa.
- No usar Groq para medir T1/T2, autorizar cambios, ejecutar comandos ni declarar aceptación.

### 32.3. Estado existente y límites

- OMM-01-026 ya está implementado localmente en Harmonia/DevTools/GroqAssist/: compilador de evidencia, selector local, cliente Groq opcional GPT-OSS 20B con Structured Outputs, catálogo cerrado, validación y fallback.
- El módulo actual realiza una evaluación diagnóstica individual. El runner que despacha automáticamente scenario_id y la realimentación recursiva acotada aún no están implementados; quedan en OMM-01-028.
- El benchmark comparativo de cinco casos reales sigue pendiente en OMM-01-027. No declarar ahorro de tiempo hasta medirlo.
- No se efectuó llamada real a Groq. EP Vault CLI/sesión no estaba disponible en el contexto fila4 y ZDR no fue verificado. No se leyó ni materializó la clave.
- La suite Node consolidada ejecutada en esta continuidad terminó **31/31 PASS**. Incluye pruebas del compilador, fallback, validador, transporte simulado, observador, outbox y colector. El transporte simulado no equivale a una llamada real.
- El supuesto defecto de querySelector descrito en la salida histórica de §5 no está presente en la candidata local actual: content.js usa $$()/querySelectorAll() para ambas colecciones y la regresión correspondiente pasó.
- Extension 0.4.6 está preparada localmente. No se recargó ni se verificó activa en Chrome. Los ciclos naturales T1/T2 siguen pendientes; BMO-01 permanece NO ALCANZADO.

### 32.4. Continuidad y reproducción literal

El tramo y la salida literal del ciclo anterior se conservan en:

docs/frentes/harmonia/originales/HARMONIA-TRAMO-GROQ-ENGINEERING-LOOP-20261111.md

SHA-256 del artefacto: FB02F19FAF7C89ED35C9A0D73FD2D5BDFAA4ECDF8FC3DD2A58F11DB8F7DC3BCE

La salida histórica se mantiene sin correcciones dentro del artefacto. Sus referencias a OCP v0.68, RDC PC-8, Groq Assist no implementado y fallo de escritura no gobiernan el estado actual verificado en §32.3.

### 32.5. Backlog y trazabilidad

- OMM-01-025: instrumentación de diagnóstico estructural; sintética PASS, natural pendiente.
- OMM-01-026: Groq Assist local; implementado con fallback y pruebas sintéticas. API real no utilizada.
- OMM-01-027: benchmark de cinco casos reales; pendiente de Vault Run, ZDR y evidencia real.
- OMM-01-028: runner local de escenarios cerrados y realimentación acotada; diseño registrado, implementación pendiente.
- Rama work/harmonia-front-workspace-20261110; HEAD 9fd5c182; árbol de trabajo con cambios locales. Sin commit, push, merge, PR, despliegue ni modificación de main.
- OCP v0.65 preservado antes de esta edición en archive/OBJETO-CANONICO-v0.65-pre-groq-loop-continuity-20261111.md; SHA-256 cotejado: DC7FAB4F88FD2E54D661F2CF3A4B3E9DEAA148F5474FA1D20E23C3A71A809570.
- OCP resultante: HARMONIA-v0.66, edición local no publicada.
- UUIDv7 local de esta continuidad: 01a1cb55-843d-7554-b01f-31863326c90b.
- Dispositivo RDC autorizado por CONTROL-RESPONSABILIDAD.json: PC10RCIF4EI4, UUID b573344f-c68f-47c9-9c2e-ae67f2e63bdb; generación 15.
- DUG: v388 / NX-388m; edad del último commit main NO VERIFICADA.
- CONV/CICLO/A/B: NO ASIGNADOS. FOL1: PREPARADA / NO ACTIVA. MCP normativo: DESACTIVADO.


---

## 33. Catálogo auxiliar de interfaz y candidata local 0.4.7 — 2026-11-11

### 33.1. Objetivo

Avanzar OMM-01-008 ampliando la observación estructural más allá del hilo central de ChatGPT. La candidata agrega cobertura de regiones de navegación y superficies auxiliares sin leer ni persistir su contenido.

### 33.2. Implementación

- Nuevo módulo `Harmonia/Extension/surface-catalog.js`, cargado antes de `content.js` tanto por `manifest.json` como por la inyección del service worker.
- Diez categorías: navegación primaria, barra lateral, encabezado global, menú, listbox, diálogo/modal, popover, selector de herramientas, combobox y selector de modelo.
- Salida limitada a: tipo de región, cantidades totales/visibles, hasta ocho muestras por categoría, tag, rol allowlisted, test ID tokenizado, clases tokenizadas, cantidad de hijos y estados estructurales (visible, expanded, hasPopup, modal, disabled).
- No lee texto, innerText/textContent, etiquetas visibles, títulos de conversaciones, placeholders, valores de controles ni href/URLs. El helper excluye atributos no permitidos y los tests instrumentan getters de contenido para fallar si se intentan leer.
- `content.js` combina estos metadatos con los features existentes y los incorpora a la firma estructural; los cambios auxiliares permitidos activan un nuevo escaneo sin alterar el observador T1/T2.
- `service-worker.js` aplica una segunda allowlist y saneamiento de categorías, roles, tokens, contadores y muestras antes de guardar en outbox o enviar al colector.
- `Collector/server.js` repite el saneamiento al recibir los eventos y almacena una proyección compacta cuando la superficie ya fue vista. La cobertura se actualiza solamente con IDs reconocidos por el catálogo.
- `coverage-catalog.json` pasa a 0.1.3 y 54 capacidades, con diez IDs nuevos. Las capacidades nuevas no se marcan como documentadas oficialmente; su cobertura documental permanece pendiente hasta verificar fuentes.
- Manifest V3 y build-info pasan a **0.4.7**, revisión `LOCAL-OMM-01-008-AUXILIARY-UI-SURFACES`. La revisión de marco se identifica como `HARMONIA-v0.67+DUG-v388-NX-388m`.

### 33.3. Groq fuera del runtime de extensión

Se incorpora D-031: **Groq no se implementará dentro de la extensión ni del colector**. La extensión 0.4.7 no incluye código de llamada a Groq, llave, host permission ni dependencia de API. El módulo opcional `DevTools/GroqAssist/` permanece fuera de `Extension/` y `Collector/`; no participa en captura ni telemetría, y puede quedar apartado. Esta decisión no cambia la medición determinista ni requiere que la llave esté disponible.

### 33.4. Pruebas y aceptación

- Catálogo auxiliar: 4/4 pruebas PASS; incluye regiones, muestras acotadas, visibilidad y exclusión de lecturas de contenido.
- Service worker/outbox: prueba sintética confirma inyección del helper, persistencia offline, saneamiento, descarte de features/regiones desconocidas y ausencia de texto/URLs/valores no permitidos.
- Colector: integración sintética confirma escritura del artefacto de superficie saneado y actualización de cobertura con features nuevos reconocidos.
- Suite conjunta Extension/Collector/Groq Assist local: **35/35 PASS**. Las seis pruebas de Groq Assist usan fallback o transporte simulado; no hubo llamada API real.
- Sintaxis: 15/15 archivos JavaScript/MJS PASS; parseo: 7/7 archivos JSON PASS; PowerShell: 5/5 scripts PASS. Contrato 0.4.7/0.1.3 alineado; IDs de catálogo: 54/54 con detector enlazado, sin duplicados.
- La candidata 0.4.7 está preparada localmente en `Harmonia/Extension/`; no se recargó ni se verificó activa en Chrome. No se interactuó con Chrome principal.
- La ampliación de cobertura auxiliar está validada sintéticamente; la cobertura natural de navegación y el resultado en la interfaz real aún requieren observación natural.
- T1/T2 naturales continúan NO VERIFICADOS. BMO-01 permanece **NO ALCANZADO**.

### 33.5. Documentación e integridad

- D-031 se conserva literalmente en `docs/frentes/harmonia/originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261110.md`; la copia previa fue preservada y SHA cotejado antes de añadirlo.
- `Harmonia/README.md` y `Harmonia/CYCLE-TELEMETRY.md` describen la candidata 0.4.7, el catálogo ampliado y las restricciones de privacidad.
- `Harmonia/MANIFEST-PROCEDENCIA-LOCAL.json` registra hashes/bytes de los archivos modificados y los nuevos tests. Hash del helper `Extension/surface-catalog.js`: `32AD70008A9D64CA514A3DF526C5F3822EC2C43094C7F8A98D1FD6777D4B8DEE`; hash del catálogo 0.1.3: `88D612CBA30C9B21B5A3EA72E80CE4330C279D8FA78D42ED42BFEA75076F32C4`.
- OCP v0.66 preservado antes de esta edición en `archive/OBJETO-CANONICO-v0.66-pre-0.4.7-aux-surface-20261111.md`; SHA-256 cotejado: `861195AE7DF197A0E7ABADAF4DAEAB957454FABCF1B770D383B129EA27829EA5`.
- OCP resultante: **HARMONIA-v0.67**, local y no publicado.
- Rama `work/harmonia-front-workspace-20261110`; HEAD `9fd5c182`; el árbol contiene otros cambios locales preexistentes y no fue limpiado.
- No hubo commit, push, PR, merge, despliegue ni modificación de main. No se modificó DUG ni GOW.
- UUIDv7 local de este ciclo: `01a1cb76-9861-7b69-98d0-38c7fc5914ee`.
- Dispositivo RDC autorizado: PC10RCIF4EI4, UUID `b573344f-c68f-47c9-9c2e-ae67f2e63bdb`.
- DUG: Samantha v388 / NX-388m; edad del último commit main NO VERIFICADA.
- CONV/CICLO/A/B: NO ASIGNADOS. FOL1: PREPARADA / NO ACTIVA. MCP normativo: DESACTIVADO.


---

## 34. Instalación 0.4.7, actualización del colector y persistencia de eventos — 2026-11-11

### 34.1. Confirmación de instalación y observación estructural

- El operador confirma que Harmonia 0.4.7 está instalada.
- Sin abrir ni inspeccionar Chrome principal, se consultaron los artefactos locales de superficies. Los registros más recientes declaran `catalogVersion: 0.1.3` y muestran las features auxiliares `navigation.primary-region`, `navigation.sidebar-region`, `surface.global-header`, `surface.dialog`, `surface.popover` y `surface.selector`. Esto corrobora que el scanner 0.4.7 se ejecutó.
- Se preservan 288 artefactos JSON de superficie en el almacén local. El total no representa 288 conversaciones ni 288 ciclos; son fingerprints estructurales deduplicados.
- El artefacto reciente que contiene `auxiliarySurfaces` confirma la proyección estructural filtrada; los textos, etiquetas visibles, href y valores no forman parte de la proyección.

### 34.2. Hallazgo en el transporte

El colector 0.4.7 podía escribir el JSON de una nueva superficie, pero no creaba el directorio diario bajo `originals/` antes de anexar el evento JSONL. El mismo defecto afectaba la ruta genérica `capture.started` / `capture.stopped`. Por ello podían existir superficies sin sesión indexada, sin JSONL y sin actualización de cobertura. La prueba anterior no lo exponía porque sus eventos de ciclo creaban antes la carpeta diaria.

### 34.3. Corrección y contrato de arranque

- `Collector/server.js` crea ahora `path.dirname(file)` de manera recursiva antes de anexar los eventos `ui.surface.*` y `capture.*`.
- La compilación interna del colector se etiqueta **0.4.7.1**; `/health` declara `collectorVersion=0.4.7.1` y `catalogVersion=0.1.3`.
- `INICIAR-HARMONIA.ps1` exige manifest/build 0.4.7, catálogos raíz/extensión 0.1.3 y presencia de `surface-catalog.js`.
- Si el puerto está ocupado, el inicializador consulta `/health` con la credencial local y solo considera sustituible la instancia si coincide exactamente el mismo data root. Una revisión antigua se cierra mediante `POST /shutdown` autenticado y se espera la liberación del puerto; nunca se fuerza la terminación.
- El inicializador verifica que la nueva instancia declare colector 0.4.7.1 y catálogo 0.1.3. La comprobación sin credencial debe devolver HTTP 401.
- `FRAMEWORK_REVISION` de ciclos permanece `HARMONIA-v0.67+DUG-v388-NX-388m`: el parche 0.4.7.1 corrige persistencia del colector y no cambia señales, algoritmo ni KPI T1/T2.
- El catálogo de `Extension/coverage-catalog.json` se alineó con el catálogo raíz 0.1.3; SHA-256 de ambos: `88D612CBA30C9B21B5A3EA72E80CE4330C279D8FA78D42ED42BFEA75076F32C4`.

### 34.4. Verificación del colector y límites de la evidencia

- Actualización ejecutada dos veces con `SERVICE=UPGRADED`; la segunda instancia quedó en colector 0.4.7.1.
- HEALTH=OK, mismo almacén `C:\Users\fila4\AppData\Local\Harmonia\surface-index-v0.4.0\data`, Node v24.0.0 y rechazo HTTP 401 sin credencial.
- La consulta de cierre de cobertura real reportó: 21 sesiones, 433 barridos, 431 superficies únicas, 20/54 capacidades observadas (40%) y 59% combinado. Se observaron seis features auxiliares: `navigation.primary-region`, `navigation.sidebar-region`, `surface.global-header`, `surface.dialog`, `surface.popover` y `surface.selector`. El endpoint `/cycles` todavía devuelve 0 registros; no hay medición T1/T2 natural aceptada.
- La persistencia de superficies/capturas está activa y genera sesiones y barridos indexados. La integración desde directorios diarios vacíos valida además el primer JSONL `capture.started` y el primer `ui.surface.scan`; los ciclos T1/T2 naturales permanecen ausentes y no se atribuyen eventos inexistentes.
- BMO-01 permanece **NO ALCANZADO**. Los cinco ciclos naturales correlacionados/persistidos siguen siendo un requisito de aceptación.

### 34.5. Pruebas

- Suite completa Extension/Collector/Groq Assist local: **35/35 PASS**; Groq usa fallback o fetch simulado, sin llamada API real.
- Integración del colector: valida `capture.started` y el primer `ui.surface.scan` en dos directorios diarios distintos que no existían, persistencia JSONL, redacción de URL/contenido y cobertura de features reconocidas.
- Scripts PowerShell: **5/5 parseados**, sin errores.
- Sintaxis JavaScript/MJS: **15/15**; archivos JSON: **7/7**; contrato 0.4.7 / catálogo 0.1.3 consistente.
- No se abrió, enfocó, navegó, inspeccionó ni modificó Chrome principal.

### 34.6. Archivos, backups e integridad

- Inicialización previa al refresco preservada en `Harmonia/archive/omm-01-030-pre-collector-refresh-20261111/`; los archivos fueron cotejados por SHA-256.
- Segunda copia previa al parche de persistencia en `Harmonia/archive/omm-01-030b-pre-event-persistence-fix-20261111/`; `server.js`, integración y `INICIAR-HARMONIA.ps1` cotejados por SHA-256.
- OCP v0.67 previo preservado en `Harmonia/archive/omm-01-030-pre-collector-refresh-20261111/docs__frentes__harmonia__OBJETO-CANONICO.md`; SHA-256 anterior: `3FDB8C40415583CA3874D4DD41C64372036523224D13BAB06F62E057DAEFE0CF`.
- OCP v0.68 previo preservado en `docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.68-pre-coverage-refresh-20261111.md`; SHA-256: `9C1A9618B29170368F1B574FD349CFFFF57AD06945BA1789064972D8FA927F48`.
- OCP v0.69 previo preservado en `docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.69-pre-live-coverage-20261111.md`; SHA-256: `E1F09E6164EE77B99FD31A0ACA8D4581A063BACA49AC2FA71204F91EE6176AE3`.
- `Harmonia/MANIFEST-PROCEDENCIA-LOCAL.json` se actualiza con las huellas de `INICIAR-HARMONIA.ps1`, ambos catálogos, colector, pruebas y documentos.
- OCP resultante: **HARMONIA-v0.70**, local y no publicado.
- Rama `work/harmonia-front-workspace-20261110`; HEAD `9fd5c182`; sin commit, push, PR, merge ni despliegue.
- DUG Samantha v388 / NX-388m; antigüedad del último commit main NO VERIFICADA.
- UUIDv7 local del ciclo de colector 0.4.7.1: `01a1cc23-e498-7be6-895d-abb4cc4584bd`.
- UUIDv7 local de la actualización de cobertura/OCP v0.69: `01a1cc27-b76d-72fe-bdb8-b4e31dfff1a0`.
- UUIDv7 local de este corte de cobertura/OCP v0.70: `01a1cc29-4b4c-72ee-bbf3-eecf6ced74d2`.
- CONV/CICLO/A/B: NO ASIGNADOS. FOL1: PREPARADA / NO ACTIVA. MCP normativo: DESACTIVADO.


## 35. Continuidad tras la retroalimentación sobre el bloqueo T1/T2 — 2026-11-11

### 35.1. Intervención del operador y reconocimiento del estado

El operador señaló: **«No quiero que estes dando vueltas,, por que no logras ahcer lo que buscas?»**. La respuesta del modelo reconoció que el trabajo de instrumentación, barridos, pruebas y documentación había generado actividad verificable, pero no había alcanzado el resultado central: registrar un ciclo T1/T2 natural. Esa salida completa se conserva literalmente en `originales/HARMONIA-TRAMO-CONTINUIDAD-20261111-1421.md`, §4.

### 35.2. Estado que gobierna la retoma

- Sigue pendiente el primer ciclo T1/T2 natural correlacionado, persistido y validado. La observación estructural no sustituye esa evidencia.
- BMO-01 permanece **NO ALCANZADO**. No atribuir ciclos inexistentes ni inferir aceptación a partir de sesiones, superficies o fingerprints.
- §34 conserva la instantánea de 21 sesiones, 433 barridos y 431 superficies únicas. La conversación también relata una lectura posterior de 437 barridos y 432 superficies; son cortes distintos y no deben mezclarse sin nueva lectura del índice.
- Se mantiene la decisión de no integrar Groq en `Extension/` ni `Collector/`. `DevTools/GroqAssist/` queda separado y no es requisito funcional de la extensión.

### 35.3. Directriz de ingeniería para el siguiente ciclo

1. Concentrar el trabajo en descubrir por qué el observador no produce ciclos naturales aceptados: revisar la ruta existente en `Extension/cycle-observer.js`, `Extension/content.js`, `Extension/service-worker.js` y `Collector/cycle-telemetry.js`.
2. Distinguir señales de actividad, correlación del mensaje nuevo, detección de respuesta del asistente, cierre/settle y persistencia. Identificar el primer eslabón que falla con evidencia discriminante.
3. Priorizar una corrección mínima y su regresión sobre nuevas expansiones del catálogo o métricas de cobertura. Las pruebas sintéticas son necesarias, pero no sustituyen el ciclo natural.
4. No intervenir el Chrome principal ni fabricar un ciclo. El objetivo de aceptación continúa siendo un evento natural real, correlacionado y persistido.
5. No trasladar al operador ejecución de CMD/PowerShell ni tareas rutinarias por consola. Mantener Codex CLI como ejecutor previsto del sprint, pero no declarar uso: al retomar, la sesión RDC observada como `CENTRAL\MantenimientoRCI` no estaba autenticada en Codex; la autenticación de `CENTRAL\fila4` no quedó verificada. No transferir credenciales entre identidades.

### 35.4. Registro de continuidad e integridad

- Tramo completo y salida literal: `docs/frentes/harmonia/originales/HARMONIA-TRAMO-CONTINUIDAD-20261111-1421.md`.
- OCP anterior preservado: `docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.70-pre-continuity-feedback-20261111.md`; SHA-256 cotejado antes de editar: `5C4675514B0AD6B3A1242A67158C87C5FDAA0A209B6A2A5F75472613418A5623`.
- Esta actualización cambia el OCP a **HARMONIA-v0.71**, solo local. No crea tareas nuevas ni altera el backlog §12.
- SHA-256 de la nota de continuidad: `4937B0049CAC983868D8BAA6FCBE0D6104D9A234C5777AA405FBED187677C7E8`; lectura de vuelta comprobó la salida literal, el contexto Codex y los estados de trazabilidad. El SHA final del OCP se verifica al cierre de esta escritura.



## 36. Instrumentación diagnóstica T1/T2 — OMM-01-031 — 2026-11-11

### 36.1. Objetivo y resultado de ingeniería

OMM-01-031 aborda el bloqueo real detectado tras 732 barridos estructurales sin eventos `client.cycle.*`: el sistema no distinguía de manera persistida si fallaba la inicialización del observador, la región principal, la detección del nodo de usuario, las señales gráficas, la correlación, la decisión T1/T2, el worker o la entrega al colector.

Se entrega una traza diagnóstica separada del KPI. No se modificó la semántica de medición T1/T2: se mantienen las cuatro señales allowlisted, los filtros de visibilidad/exclusión, la correlación de 2.000 ms, la ventana settle de 1.500 ms, el reloj monotónico y la definición `chatgpt-ui-generation.v1`. La discrepancia entre el scanner estructural y `cycleSnapshot()` sigue siendo una hipótesis prioritaria, no una causa demostrada.

### 36.2. Flujo implementado

1. `Extension/content.js` detecta la región `main`, cuenta candidatos `main` y calcula por cada señal coincidencias, exclusiones y coincidencias visibles elegibles. No incorpora selectores, texto, etiquetas, URLs, valores ni referencias DOM a la traza.
2. `Extension/cycle-observer.js` emite checkpoints discretos: `observer_started`, `main_state`, `signal_state`, `user_turn_observed`, `activity_edge`, `correlation`, `cycle_decision`, `cycle_wait` y `worker_ack`. No registra cada mutación ni cada snapshot.
3. `Extension/service-worker.js` valida campos, enums, contadores y señales; asigna secuencia local; limita a 96 trazas por sesión; diferencia entrega HTTP confirmada de cola local. El evento diagnóstico no agrega `conversation: tab-ID` ni contiene IDs de conversación, ciclo, pestaña o sesión en su payload.
4. `Collector/cycle-telemetry.js` aplica un esquema exacto y allowlist, rechaza claves adicionales, cadenas libres, señales desconocidas y contadores inconsistentes.
5. `Collector/server.js` persiste `diag.cycle.trace` en JSONL e índice, con idempotencia por eventId y resumen agregado autenticado en `GET /cycle-diagnostics`. El resumen no contiene payloads ni IDs. Límite global: 20.000 eventos; al alcanzarlo, el colector rechaza con HTTP 429 sin borrar datos.
6. Las trazas no se incorporan a `index.cycles`, no alteran cobertura estructural ni medianas/P90. `queued_outbox` significa persistencia local solamente; `posted` significa respuesta 2xx del colector.

### 36.3. Versión y paquete

- Extensión candidata: **0.4.8**.
- Colector local: **0.4.8.1**.
- Catálogo estructural: **0.1.3**, sin cambios.
- Build: `LOCAL-OMM-01-031-CYCLE-DIAGNOSTIC-TRACE`.
- Framework revision: `HARMONIA-v0.72+DUG-v388-NX-388m`.
- Carpeta preparada para carga: `KHORA/Harmonia/Extension/`.
- El inicializador local reportó `SERVICE=UPGRADED`, `HEALTH=OK`, `AUTH_NO_TOKEN=REJECTED_401`, Node v24.0.0 y la misma raíz de datos `C:\Users\fila4\AppData\Local\Harmonia\surface-index-v0.4.0\data`. El almacén existente (~29,8 MB al corte) se conservó; no se recreó ni borró.
- La candidata 0.4.8 no se ha recargado ni verificado activa en Chrome. No se abrió, enfocó, inspeccionó ni modificó Chrome principal.

### 36.4. Pruebas y validación

- Suite activa Extension/Collector/DevTools/GroqAssist: **40/40 PASS**. Groq Assist usó fallback/transporte simulado; no hubo llamada API real.
- Sintaxis JavaScript/MJS: **15/15**.
- Parser PowerShell de `INICIAR-HARMONIA.ps1`: **0 errores**.
- JSON: **5/5** válidos.
- La integración prueba esquema, privacidad, idempotencia, JSONL, resumen `/cycle-diagnostics`, autenticación HTTP 401 y límite global HTTP 429. El resumen diagnóstico no altera `/cycles`.
- Las pruebas son sintéticas/locales. No prueban por sí mismas la captura DOM natural de ChatGPT.

### 36.5. Estado funcional y compuertas pendientes

- Última instantánea del índice anterior a esta implementación: `updatedAt=2026-11-11T20:44:33.363Z`, 732 barridos, 638 superficies únicas, 35 fingerprints y 90 observaciones de `conversation.response-streaming`; índice sin ciclos. Este corte es histórico de observación, no una lectura posterior a recargar 0.4.8.
- Ciclos T1/T2 naturales aceptados: **0 / no verificados**.
- BMO-01: **NO ALCANZADO**. Requiere cinco ciclos naturales correlacionados y persistidos, más los demás criterios de §16.4.
- Siguiente compuerta técnica: activar la candidata 0.4.8 en la sesión del operador y recoger la primera traza natural. La observación y recarga del Chrome principal no se ejecutan mediante RDC.
- Tras la primera traza, corregir solamente el primer eslabón demostrado como fallido. No relajar selectores, filtros, correlación o settle por hipótesis.

### 36.6. Codex y modalidad de ejecución

La autenticación de Codex CLI bajo `CENTRAL\fila4` quedó verificada y el uso de cuota está autorizado. Codex completó una auditoría de diseño en solo lectura con `gpt-5.6-terra`. La CLI instalada reportó sandbox efectivo `read-only` incluso cuando se solicitó `workspace-write`; por ello no escribió código. La implementación local se efectuó mediante RDC autorizado después de la auditoría y se validó con pruebas. No se usó bypass, acceso completo, MCP, credenciales externas ni cambios de permisos. OMM-01-002 y OMM-01-016 permanecen **PARCIALES**, no cerradas.

### 36.7. Integridad y publicación

- OCP v0.71 anterior preservado y cotejado: `archive/OBJETO-CANONICO-v0.71-pre-cycle-diagnostic-20261111.md`; SHA-256: `142F80FD6785E796C264A34CE98136A1D6C4BF57239144733E930FB15D472685`.
- Manifiesto de procedencia local actualizado a 0.4.8 / 0.4.8.1 / 0.1.3, con tamaños y SHA-256 de los archivos de código, documentación y pruebas; se excluyen `Extension/local-auth.js` y secretos.
- Continuidad del ciclo: `originales/HARMONIA-TRAMO-IMPLEMENTACION-OMM-01-031-20261111.md`; SHA-256: `7D2B9DF6909DB8FC5176136A14E80F1FE4E4178A0B6FEE876BB231EFF4D659B2`.
- Rama: `work/harmonia-front-workspace-20261110`.
- HEAD inicial y final esperado: `9fd5c18205e39b6db12c9152b07d8f880f6b256d`.
- Sin commit, push, PR, merge, modificación de main ni despliegue.



## 37. Retoma conversacional, coherencia del paquete y diseño del bucle Groq — 2026-11-11 16:23

### 37.1. Continuidad y responsabilidad verificada

- Tramo de conversación persistido en `originales/HARMONIA-TRAMO-RETOMA-20261111-1623.md`; SHA-256: `A4CDAB1AA16C9A20B59B448DB5DF46E4CD470563EE42EEA4C8779E444CB3EDBF`.
- UUIDv7 local del evento de continuidad: `01a1ccb9-2d62-75a5-a3fa-cb7bdec7416a`. No es ID nativo de conversación ni folio.
- CONTROL-RESPONSABILIDAD.json se leyó de vuelta: generación 15, titular operativo sin cambio y dispositivo RDC autorizado `99383b36-cc22-4457-952f-8799cccac0a7`. La conexión RDC y la identidad Windows coinciden: `CENTRAL\fila4`, SID `S-1-5-21-1529298404-1161420656-882029410-5167`. Referencias a UUID anteriores en secciones históricas del OCP no gobiernan esta autorización vigente.
- OCP v0.72 preservado antes de la actualización en `archive/OBJETO-CANONICO-v0.72-pre-retoma-20261111-1623.md`; SHA-256 original/respaldo coincidente: `5971FEEA07AE470BA0D489EFA04A23E8EE627671869909D152AFA0E6D7401A5B`.
- No se limpió el worktree. Rama `work/harmonia-front-workspace-20261110`; HEAD `9fd5c18205e39b6db12c9152b07d8f880f6b256d`. No hubo commit, push, PR, merge, publicación ni despliegue.

### 37.2. Corrección puntual y verificación fresca de la extensión

- Manifest y `build-info.json`: versión `0.4.8`; etiqueta visible de popup corregida de `v0.4.5` a `v0.4.8`.
- La regresión `Extension/popup.test.mjs` se ejecutó primero en RED y falló por `0.4.5 !== 0.4.8`; tras corregir la etiqueta, se ejecutó en GREEN.
- Suite completa actual de Extension, Collector y DevTools: **41/41 PASS**, siete archivos de prueba, cero fallos. Incluye la regresión de versión; las pruebas son locales/sintéticas.
- Revisión de paquete: `service-worker.js`, `popup.html`, `cycle-observer.js`, `surface-catalog.js`, `content.js` y `popup.css` existen; manifest/build-info/popup coinciden en `0.4.8`. `local-auth.js` está presente, pero no se leyó ni se reveló.
- Manifiesto de procedencia actualizado y leído de vuelta. Popup SHA-256: `9B9CA62CAF9ABE9707EF85A8A8935AAD2330FCCB01BDF4D18A51A94930666B80`; prueba SHA-256: `E12EF6A52386A0542818A963419A80121016BE4F1525086519C5851781EA4613`; manifiesto de procedencia SHA-256: `1730CF43A075E3DB407DE5B4C60AC8E6204A680D3D2D5FB0551FAD86CBD9786A`. Respaldo previo del manifiesto: `archive/MANIFEST-PROCEDENCIA-LOCAL.pre-popup-version-sync-20261111.json`, SHA-256 `F736946258824D2CED4EAAEC780B38973EA94CDEAEF067D00523279A53E3D2DA`.
- Servicio colector: proceso local Node PID 11592 escucha en `127.0.0.1:47321`. Una consulta sin credencial a `/health` devolvió **HTTP 401 unauthorized**, comportamiento esperado por autenticación; en este ciclo no se hizo una consulta autenticada ni se declara HEALTH=OK fresco.
- Candidata local preparada en `KHORA/Harmonia/Extension/`; no instalada ni recargada en Chrome. Chrome principal no se abrió, enfocó, inspeccionó ni modificó.
- Ciclos T1/T2 naturales aceptados: **0 / no verificados**. BMO-01: **NO ALCANZADO**. Las pruebas sintéticas no equivalen a una sesión natural de ChatGPT.

### 37.3. Diseño operativo del bucle semiautomatizado y papel de Groq

La colocación con mejor relación entre ahorro y riesgo es **después de compilar la evidencia estructural allowlisted y antes de escoger el siguiente experimento discriminante**. Groq no debe entrar en el camino caliente de Extension/Collector ni ejecutarse por cada barrido o turno.

1. Extension observa señales estructurales; Collector persiste eventos y métricas T1/T2 deterministas.
2. El informe diagnóstico se depura localmente: fuera prompts, respuestas, texto, HTML/DOM, rutas, URLs, IDs, cookies, tokens, código fuente y diffs.
3. Un selector determinista local resuelve primero los casos inequívocos. Groq solo se invoca si compiten hipótesis o el selector devuelve evidencia insuficiente.
4. Groq devuelve un resultado estructurado limitado a un `scenario_id` del catálogo, referencias allowlisted, observación esperada y condición de refutación. El modelo no emite comandos.
5. Un futuro ScenarioRunner local traduce solo IDs cerrados a sondas/pruebas predefinidas, de solo lectura; devuelve resultado categórico, duración y referencias. Límite inicial: una prueba por ronda y máximo dos rondas adicionales; detener por diagnóstico suficiente, falta de ganancia informativa o presupuesto.
6. Codex aplica solo la corrección demostrada con TDD RED→GREEN y suite completa. El operador conserva la dirección mediante su propósito declarado e intervenciones; ningún resultado del modelo se convierte por sí solo en autorización de cambio.
7. Medir cinco incidencias reales comparando flujo local y asistido: tiempo hasta diagnóstico confirmado, pruebas ejecutadas, tasa de hipótesis confirmadas, regresiones reabiertas, tokens/costo y tiempo neto ahorrado. Mantener Groq solo si mejora tiempo sin degradar precisión ni privacidad.

**Implementado localmente:** compilación allowlisted; fallback determinista; catálogo cerrado; cliente opcional `openai/gpt-oss-20b`; Structured Outputs estricto; validador local; timeout/fallback y wrapper EP Vault.

**Pendiente:** runner para escenarios; retorno automático del resultado al siguiente ciclo de triage; límites/orquestación persistentes; benchmark de cinco incidencias reales. No se ha hecho llamada real a Groq. Las pruebas utilizan fetch simulado.

**Comprobación ZDR:** el wrapper `-ZdrVerified` acepta un indicador manual; no inspecciona por sí mismo los Data Controls de la cuenta. No se habilitará llamada real hasta verificar el ajuste ZDR en la cuenta. La documentación de Groq indica que la inferencia no retiene datos por defecto, pero los registros de confiabilidad/abuso pueden conservar entradas y salidas hasta 30 días salvo opt-out/ZDR; consultar la fuente vigente antes de habilitar transporte externo: https://console.groq.com/docs/your-data. Groq documenta Structured Outputs estricto para `openai/gpt-oss-20b`: https://console.groq.com/docs/structured-outputs.

### 37.4. Compuertas vigentes

- Paquete local 0.4.8 y suite sintética 41/41: verificados.
- Carga manual de la carpeta en Chrome: pendiente del operador; sin pedirle que ejecute scripts.
- Primera traza T1/T2 natural posterior a la carga: pendiente.
- Cinco ciclos naturales correlacionados y persistidos / BMO-01: pendiente.
- Runner Groq y benchmark: pendientes; sin llamada API real.
- No confundir preparación local, prueba sintética, servicio escuchando, instalación activa, ciclo natural aceptado y hito BMO-01: son estados distintos.


## 38. Bucle local de ingeniería semiautomatizado — OMM-01 — 2026-11-11

### 38.1. Entregable funcional

Se conectó el triage de `DevTools/GroqAssist/assist.mjs` con un ejecutor local de escenarios predefinidos. La entrada es un informe `harmonia.diagnostic-report.v1`; la función pública `runEngineeringCycle({ report, env?, fetchImpl?, cwd?, spawnSyncImpl? })` ejecuta el triage local/Groq según sus compuertas y después despacha como máximo un escenario local. Devuelve `harmonia.engineering-cycle.v1`, con el diagnóstico estructurado y el resumen del experimento. No devuelve el informe bruto ni la salida del proceso.

Archivos:
- `Harmonia/DevTools/GroqAssist/scenario-runner.mjs`: mapa cerrado, runner y coordinador `runEngineeringCycle`.
- `Harmonia/DevTools/GroqAssist/scenario-runner.test.mjs`: regresiones de seguridad, integración de escenarios y flujo de extremo a extremo.
- `Harmonia/DevTools/GroqAssist/README.md`: interfaz del coordinador, límites y uso.
- `docs/superpowers/plans/2026-11-11-harmonia-scenario-runner.md`: plan ejecutado con pasos marcados.

### 38.2. Contrato de ejecución

- Groq Assist produce un resultado validado `harmonia.dev-triage-result.v1`; solo el campo `scenario_id` llega al ejecutor.
- Nueve IDs permitidos se enlazan a archivos y patrones de pruebas existentes, fijados en el código fuente. El catálogo no acepta comandos, rutas, expresiones ni argumentos del modelo.
- `INSUFFICIENT_EVIDENCE` no ejecuta pruebas. Los IDs desconocidos se rechazan antes del lanzamiento.
- El proceso usa `process.execPath`, argumentos fijos, `shell:false` y timeout de 60.000 ms.
- El hijo recibe una allowlist mínima de variables del SO necesarias para Windows. No hereda `GROQ_API_KEY`, EP Vault, la marca ZDR ni `NODE_TEST_CONTEXT`.
- Solo se devuelven estados categóricos y conteos TAP. stdout, stderr, informes brutos y errores libres no forman parte del resultado.
- Cero pruebas coincidentes, error de ejecución, salida no cero o timeout se clasifican como fallo, nunca como éxito.
- El test de integración ejecutó de verdad los nueve patrones. Se corrigió la herencia de `NODE_TEST_CONTEXT`, que hacía que un proceso Node iniciado dentro de `node:test` reportara cero pruebas. También se endureció el entorno hijo para impedir propagación de credenciales.

### 38.3. Experimentos predefinidos

| ID | Prueba local seleccionada |
|---|---|
| `ROOT_NOT_FOUND` | Documento ausente produce informe estructural vacío y privado |
| `USER_NODE_MISSING` | Nodo de usuario no inicia T1 por sí solo; señal visible inicia T1 |
| `SIGNAL_NOT_VISIBLE` | Medición de visibilidad y cambios estructurales |
| `NO_RISING_EDGE` | Contadores de actividad, T1, T2 y entrega al sink |
| `CORRELATION_ORDER` | Señal de procesamiento anterior al nodo de usuario |
| `START_REJECTED` | Rechazo de inicio sin señal allowlisted |
| `SINK_FAILURE` | Rechazo del colector y conservación de evento pendiente |
| `WORKER_PERSISTENCE` | Persistencia local de eventos y resumen gráfico |
| `T2_SETTLE` | T2 requiere respuesta de asistente y UI inactiva |

El coordinador local usa primero el fallback determinista. Groq solo se consulta si las compuertas de `assist.mjs` permiten la llamada. El resultado del modelo no modifica código ni ejecuta comandos; el experimento es una prueba local predefinida. Codex conserva el rol de implementador de correcciones, con TDD y revisión.

### 38.4. Verificación

- Pruebas del runner: **13/13 PASS**.
- Suite activa completa Extension / Collector / DevTools: **54/54 PASS**, 0 fallos, 0 omitidas.
- Sintaxis JavaScript/MJS: **18/18 archivos**.
- JSON: **7/7 archivos**.
- Prueba real del coordinador con `example-diagnostic-report.json`, `env:{}`, sin credencial ni transporte externo:
  - provider `local-fallback`, motivo `api_key_unavailable`;
  - diagnóstico `no_rising_edge`, escenario `NO_RISING_EDGE`;
  - experimento ejecutado: **1/1 PASS**.
- Prueba de evidencia insuficiente: no lanza procesos y devuelve `not_run`.
- No hubo llamada real a Groq, ni uso de cuota ni acceso a EP Vault.

### 38.5. Privacidad y condiciones Groq

El entorno del test hijo no contiene variables Groq/Vault. Groq sigue fuera de Extension/ y Collector/. La variable `HARMONIA_GROQ_ZDR_VERIFIED=true` es una compuerta declarativa; el wrapper `run-via-vault.ps1 -ZdrVerified` no consulta la cuenta ni demuestra ZDR. No habilitar transporte real hasta comprobar Data Controls de la cuenta Groq. No se leyó ni copió ninguna credencial.

### 38.6. Límites funcionales que continúan pendientes

- El coordinador API local existe y fue ejecutado con fixture de observabilidad. No se conecta aún en automático a cada evento del colector ni a un disparador persistente de Codex; el paso siguiente es integrarlo a un coordinador de trabajo que aporte el informe observacional y las intervenciones/contexto del operador.
- El benchmark de cinco incidencias reales para comparar tiempo de diagnóstico local frente a asistido sigue pendiente.
- No se capturó ningún ciclo natural T1/T2. La suite sintética no sustituye la sesión natural. Ciclos naturales aceptados: **0 / NO VERIFICADOS**.
- BMO-01: **NO ALCANZADO**.
- La extensión 0.4.8 permanece candidata local; no instalada ni activa en Chrome. Chrome principal no se abrió ni manipuló.

### 38.7. Continuidad e integridad

- Tramo: `originales/HARMONIA-TRAMO-ENGINEERING-LOOP-20261111.md`; SHA-256: `9EF40A4B41ECD5B09B8A98F9A7844BA08C3104BB47E4D2AEE0F77A443C91863F`.
- Plan ejecutado: `docs/superpowers/plans/2026-11-11-harmonia-scenario-runner.md`; SHA-256: `194B08E453266A172B4E0F8F77E43D3C2E498A54CBE2B04408619479021E90AA`.
- Runner SHA-256: `F49439D22A81D3B4CC6D4BDD5546389D3591BABC531526756DD9C95C8EB8DD0A`.
- Pruebas SHA-256: `F40B5C5E975188F6E8D4518A1F2ABDAC1A8A410B91D52688B2AF4584CC737F38`.
- README SHA-256: `90C7C5B70161DD15EDC076E9A3B8778C3538AFB0E4204AEC98EFA8E528C80D12`.
- OCP v0.73 previo respaldado en `archive/OBJETO-CANONICO-v0.73-pre-scenario-runner-20261111.md`; SHA-256 de origen y respaldo coincidente: `BF1AFBC88650A16FD2DB23592EAE5FD0255F765F65D9130713C18CCE8557B6C8`.
- Codex CLI 0.167.0, GPT-5.6 Terra y sandbox workspace-write se usaron para el primer incremento del runner. La corrección de herencia ambiental, el coordinador API, el mapeo semántico final, pruebas adicionales y documentación se aplicaron por RDC en el dispositivo autorizado `99383b36-cc22-4457-952f-8799cccac0a7`, identidad `CENTRAL\\fila4`.
- Rama `work/harmonia-front-workspace-20261110`; HEAD `9fd5c18205e39b6db12c9152b07d8f880f6b256d`. Sin commit, push, PR, merge, publicación ni despliegue.


## 39. Cognitive Router y Policy Firewall para GroqAssist — 2026-11-11

### 39.1. Objetivo y ubicación

Se implementan las dos capacidades autorizadas en D-032:
- **OMM-01-029 — Cognitive Router local-first.**
- **OMM-01-030 — Evidence Validator + Policy Firewall.**

Todo el código nuevo queda en `Harmonia/DevTools/GroqAssist/`. No se incorporó Groq a `Extension/` ni a `Collector/`; no se cambió la medición, correlación ni persistencia T1/T2.

### 39.2. Cognitive Router

Nuevo módulo: `cognitive-router.mjs`; contrato `harmonia.cognitive-route.v1`.

El router es una función pura: no llama APIs, no lanza procesos, no concede permisos y no ejecuta rutas. Rechaza entradas mal tipadas, propiedades desconocidas y valores fuera de los enums.

Reglas activas:
1. Riesgo `high/critical` → `operator_review`, sin llamada Groq.
2. Evidencia insuficiente → `collect_more_evidence`, sin llamada Groq ni experimento.
3. Diagnóstico local accionable con confianza ≥ 0.90 → `local_deterministic`, omite Groq.
4. Evidencia suficiente, ambigua y de bajo riesgo, con llave y compuerta ZDR habilitadas → `groq_analysis`.
5. En los demás casos → `local_fallback`.
6. Decisión arquitectónica → `chatgpt_architecture`; seguridad sensible → `policy_firewall`; implementación sin contrato y autorización → `codex_contract_review`; tipo desconocido → `chatgpt_escalation`.

Estas últimas rutas son clasificaciones de responsabilidad. El campo `dispatch` permanece `false`: no hay integración ni invocación automática de Codex, ChatGPT o MCP. El router no convierte una propuesta en autorización.

### 39.3. Evidence Validator

Nuevo módulo: `evidence-validator.mjs`.

`runAssist` valida el resultado de `compileEvidence` antes de crear el payload de red o aplicar el enrutamiento. El validador exige:
- esquema `harmonia.dev-triage-input.v1` y contrato `1.0`;
- conjunto exacto de campos en todos los niveles;
- versiones y frameworkRevision con caracteres y longitudes acotados;
- tipos estrictos para booleanos, enteros, duraciones y porcentajes;
- máximo de 1.000.000 para contadores y 24 horas para duraciones;
- IDs de señal pertenecientes a la lista fija;
- `visibleCount ≤ matchingCount` por señal y coincidencia entre totales agregados;
- relaciones entre pestañas consultadas/informantes, instancias, ciclos y cobertura;
- copia aislada como resultado.

Una propiedad extra, tipo inválido o relación imposible produce error de validación; no se descarta silenciosamente el campo ni se reenvía el informe bruto. La suficiencia mínima exige una pestaña informante y al menos un snapshot.

### 39.4. Policy Firewall

Nuevo módulo: `policy-firewall.mjs`; decisión `harmonia.policy-decision.v1`.

Única operación autorizada:
- actor: `harmonia`;
- operación: `run_fixed_diagnostic_test`;
- workspace: `groqassist_tests`;
- escenario: uno de nueve IDs fijos;
- `shell=false`, `network=false`, `writes=false`, `secret_access=false`.

La allowlist de IDs está definida dentro del firewall. El mapa del runner se coteja al cargar; una discrepancia impide inicializar el runner. El ejecutor exige además que `cwd` coincida exactamente con la raíz Harmonia y utiliza test file absoluto, `process.execPath`, argv fijo, `shell:false`, timeout de 60 segundos y entorno hijo mínimo.

No puede autorizar comandos arbitrarios, edición de archivos, cambios de código, Codex, acceso a secretos, red, navegador, Chrome, MCP, despliegue ni publicación. El firewall es una barrera de política en el proceso local, no sustituye controles del sistema operativo ni un sandbox de sistema.

### 39.5. Integración realizada

Archivos nuevos:
- `Harmonia/DevTools/GroqAssist/evidence-validator.mjs`
- `Harmonia/DevTools/GroqAssist/evidence-validator.test.mjs`
- `Harmonia/DevTools/GroqAssist/cognitive-router.mjs`
- `Harmonia/DevTools/GroqAssist/cognitive-router.test.mjs`
- `Harmonia/DevTools/GroqAssist/policy-firewall.mjs`
- `Harmonia/DevTools/GroqAssist/policy-firewall.test.mjs`

Archivos modificados:
- `assist.mjs`: valida evidencia, ejecuta diagnóstico local primero, enruta y consulta Groq solamente para la ruta permitida; expone el resultado de routing y conserva fallback local ante errores.
- `scenario-runner.mjs`: exige aprobación del firewall antes del spawn, coteja catálogos, limita la raíz de ejecución y devuelve la decisión de política.
- `assist.test.mjs`, `scenario-runner.test.mjs`: regresiones de integración y límites.
- `README.md`: contratos, uso, rutas y límites actualizados.

### 39.6. Evidencia de pruebas

- TDD: las nuevas pruebas de módulos comenzaron en RED por ausencia de los módulos.
- Pruebas focalizadas tras implementación: **44/44 PASS**, 0 fallos (validator, router, firewall, assist y runner).
- La suite focalizada de los nueve escenarios del runner ejecutó las pruebas fijas contra los archivos locales existentes.
- Suite activa completa Extension/Collector/DevTools: **79/79 PASS**, 0 fallos, 0 omitidas. Sintaxis JavaScript/MJS: **10/10 PASS**. Parseo JSON: **4/4 PASS**. Fetch de API siempre simulado; no hubo tráfico real hacia Groq.


### 39.7. Compuertas y límites pendientes

- No se leyó, copió ni utilizó una credencial real. No se accedió a EP Vault.
- ZDR no está verificado en Groq Data Controls; `HARMONIA_GROQ_ZDR_VERIFIED=true` permanece como compuerta declarativa, no como prueba. No habilitar el transporte real hasta verificarlo.
- No hay bucle de reparación de código ni integración automática de Codex. Groq no aplica parches.
- No se ejecutó benchmark de cinco incidencias reales; no se atribuye ahorro, precisión ni mejora de rendimiento todavía.
- T1/T2 naturales: **0 / NO VERIFICADOS**. BMO-01: **NO ALCANZADO**.
- No se abrió, enfocó, inspeccionó, recargó ni modificó Chrome principal.
- Sin commit, push, PR, merge, modificación de main ni despliegue.

### 39.8. Diseño, instrucciones e integridad

- Instrucción verbatim D-032: `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261111.md`.
- Diseño aprobado por la solicitud explícita de implementación: `docs/superpowers/specs/2026-11-11-harmonia-cognitive-router-policy-firewall-design.md`.
- Plan: `docs/superpowers/plans/2026-11-11-harmonia-cognitive-router-policy-firewall.md`.
- Ledger: `.superpowers/sdd/harmonia-cognitive-router-policy-firewall/progress.md`.
- OCP v0.74 preservado en `archive/OBJETO-CANONICO-v0.74-pre-cognitive-control-plane-20261111.md`; SHA-256 de origen y respaldo coincidente: `AA7B2709D4ABD6CA1907C4897031E8987F17A13F164CFCB21E59F0DCE741FB8E`.
- SHA-256 Evidence Validator: `FE8899B757F42D35ABFB35B54CA27F50C6E94A6477EF7F3ADCB9C6250D5A06BC`; Cognitive Router: `2DB8DB3C1DF7055B52CEFD4E244B2791343B4430225D3662212847621B3F1B72`; Policy Firewall: `A86FD7AA1DB640E6B989B22C59709294C9FA06EF0BD3251E06F349F9FD7E867F`.
- SHA-256 integración `assist.mjs`: `008599DC1ACB4E6EC1DEA0E969D434D606EEEBFA509E9638EE67D0224D4E03E5`; `scenario-runner.mjs`: `4E7A2BAEF2FACB527E1F55415963E7166B69B510CA5476E4C157D83B94804A99`.
- SHA-256 diseño: `529C7FD38EBE2415DC9436C8596D5D28B7125FE4D3C08EC0449AD1B047C1D861`; plan ejecutado: `6BD99A757481DB5B1B6B83811F5E8F1839664E0508CE844EF3C03C67CE811508`; D-032: `D16D0EFED3DA6CABF5789B5635501A7E426AA968ED5F2F6188D8B10D53F805E7`; README: `E0DDE1EF0D9DD28ACD197B958E0DDCF690049CA736D24E59CA3BDFE6C75905D8`.
- OCP resultante: **HARMONIA-v0.75**, edición local no publicada.
- Rama: `work/harmonia-front-workspace-20261110`; HEAD de partida: `9fd5c18205e39b6db12c9152b07d8f880f6b256d`.
- Se preservaron los demás cambios preexistentes del worktree.



## 40. Codex controlado, benchmark inicial y continuidad de ciclos — 2026-11-12

### 40.1. ZDR y política de transporte Groq

ZDR significa Zero Data Retention. La documentación vigente de GroqCloud indica que los datos de entrada/salida de inferencia no se conservan por defecto, pero pueden registrarse durante hasta 30 días para investigar incidentes de fiabilidad o abuso. Habilitar ZDR en Data Controls desactiva esa retención para esos fines; los metadatos de uso siguen recopilándose. Las funciones que requieren persistencia, como Batch y fine-tuning, quedan limitadas cuando ZDR está activado.

- Control oficial: https://console.groq.com/settings/data-controls
- Documentación: https://console.groq.com/docs/your-data
- **Estado local:** ZDR NO VERIFICADO en la cuenta del operador.
- No se hizo llamada real a Groq ni se leyó/copió la API key.
- La variable HARMONIA_GROQ_ZDR_VERIFIED no es evidencia de configuración real.
- El launcher local no encontró EPVault-CLI.cmd en la ruta predeterminada; EP_VAULT_CLI estaba sin definir en el proceso. La bóveda no fue abierta ni consultada.

### 40.2. Viabilidad y prueba efectiva de Codex CLI

Se comprobó en la máquina autorizada fila4:
- Codex CLI 0.167.0 instalado en el perfil; codex no resolvía por PATH, pero el launcher de AppData/Roaming/npm estaba presente.
- codex login status: Logged in using ChatGPT.
- La configuración global selecciona gpt-5.5; el CLI lo rechazó para esta autenticación. No se modificó el archivo global.
- Un override por invocación con gpt-5.6-terra fue aceptado.
- Un servidor MCP heredado produjo AuthRequired; khora_jules y node_repl se deshabilitaron solo en esa invocación.
- Codex informó sandbox workspace-write en el repositorio KHORA.
- Prueba real de capacidad: crear, leer y eliminar un archivo temporal dentro del workspace. Resultado JSON: created=true, read_back=WRITE_PROBE_OK, deleted=true, success=true.
- El proceso terminó correctamente; la carpeta temporal se eliminó; branch, HEAD y estado de cambios del repositorio permanecieron iguales.
- La ejecución reportó 33.53 segundos y 18,851 tokens. Es telemetría reportada por la CLI, no coste facturado.
- No se usó --dangerously-bypass-approvals-and-sandbox, no se cambió la configuración global y no se modificó código de producto.

**Dictamen:** la capacidad workspace-write está demostrada para una operación local aislada. Esto no equivale todavía a un ejecutor de ingeniería aceptado: faltan snapshot no-Git, contrato de tarea, límites de rutas, diff gate y ejecución de una modificación de producto revisada.

### 40.3. Benchmark real sin baseline histórico

No existe una versión anterior de Harmonia para formar una comparación de releases. El baseline pasa a ser el proceso de ingeniería actual, observado desde este corte:

- **Brazo A — baseline:** ChatGPT diagnostica y dirige; Codex ejecuta la operación local acotada; Groq no participa.
- **Brazo B — experimento:** ChatGPT mantiene objetivo/aceptación; Groq emite una crítica independiente del mismo paquete sanitizado; Codex ejecuta el mismo tipo de contrato bajo los mismos límites.

BENCH-001 registra la primera tarea real: disponibilidad del ejecutor Codex y capacidad workspace-write. La evidencia de esta máquina, los comandos por invocación, la prueba real, la duración y el uso reportado quedaron en docs/frentes/harmonia/benchmarks/2026-11-12-benchmark-two-model-loop-001.md.

- Baseline ChatGPT→Codex: registrado.
- Brazo Groq: PENDIENTE de ZDR confirmado y EP Vault CLI/sesión disponible.
- La comparación repetirá la misma tarea/pregunta con paquete constante; se puntuará diagnóstico correcto, acción útil, seguridad, hallazgos nuevos aceptados, falsos positivos, tiempo, tokens/coste, reintentos y regresiones.
- Tras BENCH-001 se extenderá a cinco tareas reales del backlog. No se usarán mocks ni fixtures como sustituto de llamadas/modelos reales.
- No se atribuye aún ahorro o superioridad a Groq.

### 40.4. Regla permanente de avance por ciclo

En cada ciclo técnico de este frente:
1. Recordar en lenguaje simple el objetivo general y los subobjetivos concretos.
2. Revisar el estado real de los objetivos generales, compuertas P0 y backlog único; no limitarse a la última petición puntual.
3. Elegir la siguiente tarea prioritaria según dependencias y evidencia.
4. Ejecutar al menos un avance concreto en el mismo ciclo, siempre que no esté bloqueado por una autorización o compuerta externa.
5. Verificar el resultado, preservar cambios previos y actualizar tareas, OCP, hashes y continuidad.
6. Dejar explícito el siguiente paso y mantener activos los objetivos no concluidos.

Esta regla no autoriza acciones externas, acceso a secretos, cambios de main, commits, publicaciones o despliegues sin sus autorizaciones específicas. No se promete trabajo en segundo plano.

### 40.5. Siguiente secuencia

- **OMM-01-032:** construir el ejecutor Codex con snapshot temporal no-Git del workspace, sin .git ni credenciales; ejecutar con sandbox workspace-write; contrato de tarea, diff revisable y aplicación manual/controlada de archivos aprobados al workspace rector.
- **OMM-01-033:** completar el brazo Groq de BENCH-001 cuando ZDR y Vault estén verificados; luego ejecutar cinco casos reales.
- **OMM-01-034:** aplicar la regla de continuidad en todos los ciclos, sin abandonar las prioridades generales ni la validación natural T1/T2.


## 40. Codex controlado, benchmark inicial y continuidad de ciclos — 2026-11-12

### 40.1. ZDR y política de transporte Groq

ZDR significa Zero Data Retention. La documentación vigente de GroqCloud indica que los datos de entrada/salida de inferencia no se conservan por defecto, pero pueden registrarse durante hasta 30 días para investigar incidentes de fiabilidad o abuso. Habilitar ZDR en Data Controls desactiva esa retención para esos fines; los metadatos de uso siguen recopilándose. Las funciones que requieren persistencia, como Batch y fine-tuning, quedan limitadas cuando ZDR está activado.

- Control oficial: https://console.groq.com/settings/data-controls
- Documentación: https://console.groq.com/docs/your-data
- **Estado local:** ZDR NO VERIFICADO en la cuenta del operador.
- No se hizo llamada real a Groq ni se leyó/copió la API key.
- La variable HARMONIA_GROQ_ZDR_VERIFIED no es evidencia de configuración real.
- El launcher local no encontró EPVault-CLI.cmd en la ruta predeterminada; EP_VAULT_CLI estaba sin definir en el proceso. La bóveda no fue abierta ni consultada.

### 40.2. Viabilidad y prueba efectiva de Codex CLI

Se comprobó en la máquina autorizada fila4:
- Codex CLI 0.167.0 instalado en el perfil; codex no resolvía mediante PATH, pero el launcher de AppData/Roaming/npm estaba presente.
- codex login status: Logged in using ChatGPT.
- La configuración global seleccionaba gpt-5.5; el CLI lo rechazó para esta autenticación. No se modificó el archivo global.
- Un override por invocación con gpt-5.6-terra fue aceptado.
- Un servidor MCP heredado produjo AuthRequired; khora_jules y node_repl se deshabilitaron solo en esa invocación.
- Codex informó sandbox workspace-write en la raíz del repositorio KHORA.
- La invocación reportó approval=never: operación no interactiva sin solicitudes de elevación; por ello el agente debe limitarse a operaciones dentro del sandbox y detenerse ante cualquier acción que requiera permisos adicionales. No se usó approve-for-me ni ningún bypass.
- Prueba real de capacidad: crear, leer y eliminar un archivo temporal dentro del workspace. Resultado JSON: created=true, read_back=WRITE_PROBE_OK, deleted=true, success=true.
- El proceso terminó correctamente; la carpeta temporal se eliminó; branch, HEAD y estado de cambios del repositorio permanecieron iguales.
- La ejecución reportó 33.53 segundos y 18,851 tokens. Es telemetría reportada por la CLI, no coste facturado.
- No se usó --dangerously-bypass-approvals-and-sandbox, no se cambió la configuración global y no se modificó código de producto.

**Dictamen:** la capacidad workspace-write está demostrada para una operación local aislada. Esto no equivale todavía a un ejecutor de ingeniería aceptado: faltan snapshot no-Git, contrato de tarea, límites de rutas, diff gate y ejecución de una modificación de producto revisada.

### 40.3. Benchmark real sin baseline histórico

No existe una versión anterior de Harmonia para formar una comparación de releases. El baseline pasa a ser el proceso de ingeniería actual, observado desde este corte:

- **Brazo A — baseline:** ChatGPT diagnostica y dirige; Codex ejecuta la operación local acotada; Groq no participa.
- **Brazo B — experimento:** ChatGPT mantiene objetivo/aceptación; Groq emite una crítica independiente del mismo paquete sanitizado; Codex ejecuta el mismo tipo de contrato bajo los mismos límites.

BENCH-001 registra la primera tarea real: disponibilidad del ejecutor Codex y capacidad workspace-write. La evidencia de esta máquina, los comandos por invocación, la prueba real, la duración y el uso reportado quedaron en docs/frentes/harmonia/benchmarks/2026-11-12-benchmark-two-model-loop-001.md.

- Baseline ChatGPT→Codex: registrado.
- Brazo Groq: PENDIENTE de ZDR confirmado y EP Vault CLI/sesión disponible.
- La comparación repetirá la misma tarea/pregunta con paquete constante; se puntuará diagnóstico correcto, acción útil, seguridad, hallazgos nuevos aceptados, falsos positivos, tiempo, tokens/coste, reintentos y regresiones.
- Tras BENCH-001 se extenderá a cinco tareas reales del backlog. No se usarán mocks ni fixtures como sustituto de llamadas/modelos reales.
- No se atribuye aún ahorro o superioridad a Groq.

### 40.4. Regla permanente de avance por ciclo

En cada ciclo técnico de este frente:
1. Recordar en lenguaje simple el objetivo general y los subobjetivos concretos.
2. Revisar el estado real de los objetivos generales, compuertas P0 y backlog único; no limitarse a la última petición puntual.
3. Elegir la siguiente tarea prioritaria según dependencias y evidencia.
4. Ejecutar al menos un avance concreto en el mismo ciclo, siempre que no esté bloqueado por una autorización o compuerta externa.
5. Verificar el resultado, preservar cambios previos y actualizar tareas, OCP, hashes y continuidad.
6. Dejar explícito el siguiente paso y mantener activos los objetivos no concluidos.

Esta regla no autoriza acciones externas, acceso a secretos, cambios de main, commits, publicaciones o despliegues sin sus autorizaciones específicas. No se promete trabajo en segundo plano.

### 40.5. Siguiente secuencia

- **OMM-01-032:** construir el ejecutor Codex con snapshot temporal no-Git del workspace, sin .git ni credenciales; ejecutar con sandbox workspace-write; contrato de tarea, diff revisable y aplicación manual/controlada de archivos aprobados al workspace rector.
- **OMM-01-033:** completar el brazo Groq de BENCH-001 cuando ZDR y Vault estén verificados; luego ejecutar cinco casos reales.
- **OMM-01-034:** aplicar la regla de continuidad en todos los ciclos, sin abandonar las prioridades generales ni la validación natural T1/T2.

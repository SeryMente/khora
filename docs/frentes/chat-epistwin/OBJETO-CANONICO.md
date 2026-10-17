# Khora · Conversación Enraizada · Chat y fidelidad EpisTwin

## 1. Control e identidad

- Objeto vivo único: `docs/frentes/chat-epistwin/OBJETO-CANONICO.md`, SeryMente/khora. Nombre de trabajo propuesto en el hilo: Conversación Enraizada; no cambia alcance ni crea otro frente.
- Versión 0.3; sello `KHORA-CHAT-EPISTWIN-v0.3`; ancla E11, mensaje directo 2026-10-17 14:32:24 America/Mexico_City: implementación controlada, funciones esenciales probables por el operador, primero una bien hecha y después la siguiente.
- Estado: reorganización documental, sin implementación del chat ni certificación del núcleo. Rama `docs/chat-epistwin-20261017`, propuesta https://github.com/SeryMente/khora/pull/307 ; no se autoriza fusión/despliegue. Último estado observado del PR: abierto/no fusionado en E09; no comprobado nuevamente en E11.
- Revisión previa recuperada: commit `1e8ee9bda9c65647d5ee9075aa9f4388b6f86403`, blob `6fe4e1e6e5e681aa38f5bc9286fd3b3945d91031`. La edición nueva exige lectura de vuelta antes de afirmar persistencia verificada. No inventar hash autorreferente.
- Carpeta: este objeto y `MATRIZ-CANON-EPISTWIN.md`, materialización técnica sin otra cola. Originales pertinentes abajo; respuestas anteriores del asistente resumidas, no archivo verbatim íntegro. Historia completa de v0.1/v0.2 conservada en Git.

## 2. LEER PRIMERO

Adquirir objeto y metacanon central vigentes, comprobar revisiones/delta, rol y permiso antes de acción; subordinación a plataforma. Firma de lectura no prueba aplicación. Citas históricas no conceden permisos. Fuente inaccesible: frescura NO VERIFICADA; bloquear solo acción dependiente.

Regla vigente E11, que precisa E09: **entregar una función esencial pequeña, completa dentro de su límite y utilizable por el operador; probarla técnicamente; entregarla para su uso; corregir; obtener conformidad explícita; solo entonces implementar la siguiente capacidad.** No equiparar «demo significativa» con entrega aceptada. No avanzar a nuevas funciones por silencio o por PASS automatizado. Investigación interna estrictamente necesaria no es otra entrega, ni autoriza construir por adelantado.

E07 autoriza documentación/taxonomía/cola; E09 y E11 autorizan ajustar planificación. No conceden automáticamente diseño final, gasto, credenciales, fusión, despliegue ni tratamiento de datos por terceros. No pedir aprobación repetida de decisiones ya tomadas ni de tareas internas; sí respetar la nueva aceptación funcional por entrega. No iniciar otro agente por defecto.

EpisTwin=paper; Khora=producto; Open WebUI=plataforma reutilizada; metacanon=gobierno. Chat es producto, no requisito del paper. Normalización separada de originales: Cora/Khra→Khora; Grok con Q→Groq; Open WebUI no es wandb/OpenUI.

## 3. Referencia metodológica

**Metacanon adquirido: 1.5 · METACANON-OBJETOS-v1.5.** Fuente recuperada de nuevo en E11: https://github.com/SeryMente/metodologia/blob/49ac40e9f6122e2d2fb339362cfa0a78128c8e37/METACANON-OBJETOS-CANONICOS.md ; blob `32c7a65ff2e83b3b76752ba2160427bd6e851a8f`. Sin delta frente a adquisición previa. El texto declara entrega metodológica en rama docs/metacanon-objetos-20261011; no inferir integración main. Comprobar fuente viva cada ciclo.

| Norma central | Ubicación efectiva | Adopción/límite |
| --- | --- | --- |
| §1–5 fuente única, evidencia, frescura | §1–3/8–13 | Documental; readback obligatorio. |
| §14 originales/interpretación | §6/Anexo A | Literal conservado; normalización separada. |
| §20 carpeta única | §1/13 | Sin nuevo tablero/plan. |
| §21 roles | §5/12 | No se inventa segundo hilo instanciado. |
| §22–23 versión visible/herencia | §3/10 y prompts | Obligatoria cada salida, no prueba obediencia externa. |
| §24 remoto exclusivo/necesario | §5/7 y prompts | RDC no utilizado; no necesario. |
| §25 recepción/pronóstico | §5/9/10/12 | Prioridad a salida real; tiempo por pendientes. |
| §26–27 adquisición/molde | §2 y trece bloques | Aplicación subordinada; conflictos se elevan. |

Delta de proyecto 0.2→0.3: los once H técnicos dejan de ser once entregas al operador. Se conservan como trazabilidad interna y se agrupan/reordenan en cinco entregas funcionales secuenciales, con aceptación antes de ampliar. Se adelanta control de memoria antes de uso personal amplio. No crece alcance ni se modifica metacanon/Sistema de Instrucciones.

## 4. Propósito y alcance

Propósito original: comparar núcleo EpisTwin/Khora, identificar brechas y construir chat con identidad Khora aprovechando Open WebUI legalmente, modelos locales y API como Groq, con memoria/razonamiento personal en el núcleo. Nombre de trabajo no agrega capacidades.

Seis bloques conservados: memoria personal tipada; constructor incremental; Leiden/resúmenes; recuperación topológica/agente; suficiencia/refinamiento visual; soberanía/borrado. Ya existe código; pendiente no significa inexistente. Verificar y corregir lo mínimo, no reconstruir por creatividad.

Sprint completo: chat anclado en grafo, control de memoria, ambas rutas de inferencia, visión según canon, identidad/atribución, validación y entrega aceptada. Primera entrega NO pretende todo eso: resuelve de forma fiable consulta textual personal sobre conjunto acotado aprobado, en interfaz usable, con una ruta de modelo. Construir después capacidades adicionales solo tras aceptación del incremento anterior.

Fuera: SEA/IAR/RES, investigación longitudinal/emergencia, audio/video nuevo, pantallas ajenas al chat, telemetría/framework/motor de memoria nuevo, reescritura general, clon completo de Open WebUI, instalaciones o pagos no autorizados. «Todas las capacidades» upstream no autoriza habilitarlas indiscriminadamente: mantener reutilización compatible y registrar conflictos sin otro programa de desarrollo.

Terminal: cinco entregas aceptadas, pruebas reales y límites declarados, local+Groq verificadas, visión/borrado sin contaminación, corpus/perfil empírico explícito, licencia/atribución conforme, destino y revisión entregados verificados según permisos. Una versión temprana aceptada no certifica todo EpisTwin ni cierra sprint.

## 5. Roles y colaboración

Operador: prioridades, decisiones materiales y prueba/aceptación de cada entrega. Samantha es el nombre conservado de este hilo de asistencia/documentación; nombre no autoriza código. Constructor: responsabilidad de implementación, sin nuevo hilo/identidad asignados aquí. Un escritor de código; persistencia documental secuencial con relectura. No importar nombres, cuentas o permisos de ejemplos.

Asistencia mantiene continuidad, evidencia, alcance y aceptación; construcción realiza trabajo técnico autorizado y entrega capacidad completa dentro de límite. Ambos preservan base aceptada: no añadir funciones a su espalda ni reconstruir lo que el operador ya usa. Fallos del incremento actual se corrigen antes del siguiente; regresión en base aceptada bloquea ampliación. Aceptación funcional no es permiso tácito de gasto/publicación/despliegue.

Al recibir salida del constructor, atender primero en punto seguro, cotejar reporte/evidencia y estado, explicar novedad/viabilidad/tiempo y dar prompt completo de continuación. Si falta prueba del operador, prompt indica corregir o dejar entrega disponible y esperar aceptación, no implementar siguiente capacidad. No afirmar actividad en segundo plano.

RDC solo asistencia con necesidad imprescindible y autorización; constructor nunca lo usa, ni descubrimiento ni intermediarios. Autonomía no elimina restricciones superiores.

## 6. Autoridad

| Decisión | Origen/estado | Efecto |
| --- | --- | --- |
| Chat Khora reutilizando Open WebUI | E05/E07, dirección aprobada | Integración real y atribución; no autoría engañosa. |
| Local y API/Groq | E07, requisito | Ambas al final; primera ruta elegida por disponibilidad verificada. |
| Canon→UA→código→prueba→traza | E01/E07 | Distinguir formalismo, perfil empírico y extensiones. |
| Hitos frecuentes sin bloating | E09 | Menor entrega útil, no hitos inflados. |
| Control secuencial por uso real | E11, vigente | Entrega→prueba técnica→operador prueba→corrección→conformidad→siguiente. |
| Adaptador/extensión mínima | Propuesta por concretar | Reutilizar APIs/componentes, no arquitectura autorizada por nombrarla. |
| No auto-ingesta/PKG paralelo | Salvaguarda del contrato | Chat no escribe memoria silenciosamente; mutación solo por circuito aprobado. |

Licencia: https://github.com/open-webui/open-webui/blob/main/LICENSE ; https://raw.githubusercontent.com/open-webui/open-webui/main/LICENSE ; https://docs.openwebui.com/license/ . Uso/modificación/redistribución con avisos, condiciones/disclaimer; no aval de autores. Branding no se retira/oculta/reemplaza sin excepción aplicable: hasta 50 usuarios finales individuales directos en 30 días móviles, permiso escrito o licencia empresarial según texto leído. No concurrencia ni evasión del conteo. Fijar versión/licencias antes de primera integración; no llamar la licencia actual BSD/Apache pura u OSI sin matiz. Operador aceptó limitaciones pero no declaró audiencia/distribución: excepción no comprobada. Identidad Khora desde primer uso, mínima y conforme; conservar marca exigida y reconocimiento. Pulido final no condiciona consulta esencial ni implica rediseño general.

Software gratuito no cubre hardware/hosting/tokens. Keys solo por almacén/configuración segura autorizada, nunca chat/Git/logs/navegador distribuido/ejemplos reales. Ruta API exige declarar datos enviados/retención; local requiere prueba de ausencia de egress necesario para flujo personal. No prometer borrado en proveedor externo. No solicitar claves antes de necesitarlas.

## 7. Perfil de entorno

Este ciclo: GitHub y fuentes documentales, sin equipo del operador. Repo SeryMente/khora revalidado privado y con permiso push en E11. Sin secretos/datos personales crudos añadidos; privacidad no prueba igualdad de todos los colaboradores. Revalidar audiencia si se incorporan datos sensibles o cambia visibilidad.

Código focal previo leído en `362f8ff51a518506927e486b9d61feee4f6313da`; rama documental originada en `2518f3acd18518f030c1247f7cc053f50be6581c`. Main mostrado en E09 `2af9c102dc9937b720b4d78c3e9d367c20001568`; no se leyó código actual en E11. Recuperar SHA vigente antes de construir. AGENTS leído anteriormente; preservar entrada única/arquitectura EP y leer custodia de dictados si toca ese circuito.

Host físico/GPU/RAM/modelo/runtime local, credenciales Groq, sesión de operador y destino productivo: no verificados. No inferir entorno actual de rutas históricas Windows. RDC no utilizado; no necesario. Comando heredado, solo si asistencia demuestra necesidad y permiso, en equipo actual verificado, nunca sandbox:

```text
npx @wonderwhy-er/desktop-commander@latest remote --no-persist-session
```

Verificar runtime Node/npx, documentación oficial, cuenta, vínculo y conectividad; no comandos alternativos silenciosos ni exploración remota para identificar equipo. Contener comando no ordena ejecutarlo.

## 8. Estado vivo

### Situación

Objeto 0.2 y metacanon revalidados; 0.3 reorganiza entregas, no implementa funciones. Primera entrega todavía PENDIENTE. Avance previo: paper HTML completo recuperado, UA Notion v1.2/matriz 59 IDs, cuatro archivos de kernel inspeccionados, documentación en rama. Sin pruebas reales del núcleo/chat, sin código nuevo ni despliegue. PDF combinado no rehasheado; workspace revisado focalmente, no exhaustivo.

### Disciplina de implementación controlada

- Una entrega funcional activa. No abrir varias funciones en paralelo ni implementar las futuras mientras el operador evalúa la actual. Permitido solo soporte interno mínimo de esa entrega, diagnóstico/correcciones y decisiones imprescindibles, sin ampliar capacidades.
- Cada tarea enlaza requisito E01/E07/E09/E11 o riesgo material demostrado que bloquea su criterio. Si no, fuera. Sin otra plataforma, tablero o ceremonia; reutilizar mecanismos de prueba/recuperación existentes.
- Separar prerrequisito interno de entrega útil. Los análisis, endpoints, builds o commits no son funciones que el operador ya puede usar. No cobrarle burocracia como hito.
- No esperar auditoría total para primera función: cerrar seguridad/invariantes de su ruta. Tampoco dejar controles necesarios para «más adelante» si se ofrecen datos personales reales ahora.
- Entregar usable desde el primer incremento: acceso práctico autorizado, recorrido simple, fuentes comprensibles, límites visibles y funcionamiento comprobado. «Pequeño» reduce alcance, no calidad.
- Sin silencio=aprobación. La siguiente entrega comienza tras conformidad explícita del operador con la anterior. Detener cambios de esa ampliación si se reportan fallos esenciales; reparar sobre última base aceptada. No volver a pedir aceptación de lo mismo si no cambió materialmente.

### Secuencia única de entregas funcionales

Prerrequisitos internos antes de E1: cerrar brechas finitas de ruta textual con código fresco/canon, versión/licencia, adaptador mínimo y datos/egress acordados. Esto materializa H1/H2 anteriores; no son dos entregas al operador ni justificación de una fase documental interminable. Resolver solo lo indispensable para E1, agrupar decisiones materiales, no investigación ilimitada.

IDs ENT-01–05 son entregas; no confundir con eventos E01–E11. H1–H11 v0.2 conservan identidad histórica y se mapean aquí, no se eliminan de la historia ni cuentan dos veces. Esta tabla sustituye el orden rígido anterior y es la única cola activa.

| Entrega/fase | Función esencial que recibe el operador | Prueba de uso y salida exigida | Frontera y trazabilidad previa |
| --- | --- | --- | --- |
| ENT-01 · Consultar mi información con confianza | Un chat mínimo propio de Khora que consulta un conjunto textual pequeño, aprobado y no sensible, y responde desde el núcleo con fuentes; dice que no sabe cuando falta evidencia. Una ruta de modelo disponible/verificada, no ambas a la vez. | Operador abre chat y prueba: pregunta con respuesta en fuentes, pregunta que cruza datos del conjunto y pregunta sin evidencia. Puede comprobar las fuentes; no hay invención ni respuesta personal que eluda grafo. Seguimiento conversacional elemental probado sin mezclar consultas/usuarios. La ruta usa estado/observaciones y suficiencia respecto a q según canon. Acceso usable, branding/atribución conforme desde el comienzo. Tras prueba, corregir y solicitar conformidad antes de ENT-02. | Solo consulta; no ingesta automática ni escritura del modelo al PKG. Corpus de prueba aprobado/controlado, sin abrir todavía uso amplio con datos privados. No prometer borrado integral o visión ya certificados. H1/H2 internos + H3/H4; CE01/02/03/04/07/08/11 parcial. |
| ENT-02 · Controlar lo que sabe de mí | Incorporar/corregir/borrar información por el circuito existente aprobado y comprobar cómo cambia la respuesta. Habilita uso personal persistente solo dentro del alcance de control demostrado. | Operador incorpora un dato autorizado, lo consulta, lo corrige y vuelve a consultar, lo borra y verifica ausencia de influencia. Pruebas técnicas buscan residuos en grafo/comunidades/resúmenes/índices/cachés e historial pertinente. Se preserva la consulta ya aceptada; no ingesta silenciosa del chat. Operador prueba y da conformidad antes de ENT-03. | Reutilizar constructor y mecanismos de control existentes; no nuevo gestor universal ni rediseño de captura. No cargar corpus privado amplio antes de probar borrado/aislamiento pertinente. Límites de proveedor externo declarados. H8 adelantado; CE05 no habilitado aún, CE06 y construcción incremental CE02. |
| ENT-03 · Elegir local o Groq sin perder mi memoria | Añadir la segunda ruta de inferencia y elegir entre local y Groq/API, manteniendo grafo, fuentes y controles aceptados. | Operador repite consultas/control de memoria en ambas rutas; confirma configuración y cambio de proveedor comprensibles. Pruebas reales: ruta local sin egress requerido del flujo personal; ruta API con datos/keys tratados según contrato y errores honestos. No prometer mismo texto/latencia, sí invariantes. Conformidad antes de ENT-04. | ENT-01 ya usó una ruta: no repetirla como nueva función ni rehacer adaptador. Elegir primera por disponibilidad material; no bloquear ambas por paralelismo ficticio. H5/H6, CE09, regresión CE11. |
| ENT-04 · Consultar también evidencia visual | Añadir refinamiento visual solo cuando falta información visual para responder, con imágenes aprobadas. | Operador prueba consulta que exige volver a imagen original y otra textual insuficiente que no active visión arbitraria. Demostrar selección topológica, payload original, VQA y respuesta contextual; resultado efímero no al PKG ni otras consultas. Se conserva consulta textual y control de memoria. Corregir y obtener conformidad antes de ENT-05. | Extensión de la capacidad aceptada, no habilitar álbum completo/audio/video ni requerir visión en cada modelo/proveedor. H7; CE04/05 y regresión CE06/11. |
| ENT-05 · Consolidar lo que ya uso | Cierre del conjunto aceptado: ajustes de experiencia Khora estrictamente necesarios, evaluación empírica acordada y entrega estable/recuperable en destino autorizado. | Pruebas de regresión sobre ENT01–04 en dos rutas, salud persistente, corpus/manifiesto y jueces según perfil declarado; avisos/licencia, datos/keys y límites claros. Operador confirma recorrido completo y ajustes. Fusión/despliegue solo con permiso; verificar revisión exacta/destino y recuperación existente. Si falta aceptación o acceso, declarar pendiente; no certificado productivo. | H9/H10/H11; CE07/10/11/12. No esperar aquí para dar identidad básica, seguridad o fiabilidad a ENT-01. Pulido no agrega nuevas capacidades ni pantallas. |

Orden: ENT01→aceptación→ENT02→aceptación→ENT03→aceptación→ENT04→aceptación→ENT05→aceptación final. No salto automático a la siguiente ni preparación de nuevas funciones por detrás. Si una dependencia obliga a cambiar orden, explicar efecto y pedir decisión al operador antes de cambiarlo; una espera no autoriza creatividad extra.

### Contrato de cada entrega

Una ficha breve en este mismo §8, sin archivo/sistema nuevo: **qué ya puede hacer; cómo acceder y probarlo (pocos pasos, sin secretos); resultado esperado; límites/no habilitado; revisión/entorno/evidencia; devolución del operador y correcciones; estado de aceptación.** Versionar base aceptada usando repositorio/mecanismos existentes y no romperla al incorporar siguiente función. Toda entrega nueva pasa regresión de capacidades anteriores antes de presentarse.

Estados únicos: PENDIENTE→EN CURSO→PROBADA TÉCNICAMENTE→DISPONIBLE PARA TU PRUEBA→ACEPTADA. FALLOS/BLOQUEADA mantienen en entrega actual y especifican causa. El informe del constructor, un test o una demostración del asistente no sustituyen prueba/conformidad del operador. No hay aprobación inventada. Pruebas con datos controlados no certifican escala ni todo uso privado.

### Cadencia y siguiente paso

Prioridad: menor capacidad de alto valor completa y bajo control, no máximo número de demos. Presentar cada entrega en cuanto cumple su contrato; no esperar al final del sprint. Si toma varios bloques, checkpoints técnicos breves honestos, no nuevas entregas artificiales ni funcionalidades para llenar espera. Dividir solo cuando ambas partes sean usables con sentido y el operador acuerde el ajuste; no bajar calidad ni duplicar conteos.

Siguiente acción: cerrar prerrequisitos internos mínimos de ENT-01 (ruta/corpus/contrato y brechas del código actual), después construir con autorización técnica pertinente y entregar consulta textual usable. No solicitar keys o acceso que aún no se necesita. Este ciclo solo dejó el orden y las compuertas documentados; no hay función lista para probar todavía.

### Cobertura conservada sin crecimiento

CE01/02=canon/código focal y constructor existente; CE03/04=agente/suficiencia textual ENT01 y visual ENT04; CE05=visión ENT04; CE06=control/borrado ENT02 y regresiones; CE07/08=licencia/adaptador antes ENT01; CE09=dos rutas ENT03; CE10=identidad mínima ENT01 y ajustes finales ENT05; CE11=prueba por entrega y cierre; CE12=evaluación empírica ENT05. CE13/SEA/IAR/RES/longitudinal permanece LATENTE, fuera del sprint, estimación y aceptación. No crear otra investigación ni limpiar todo el workspace. PDF congelado se verifica si su integridad afecta decisión concreta, no bloquea sin causa la ruta sustentada por paper canónico.

## 9. Aceptación y viabilidad

Viabilidad inicial sustentada por README oficial https://github.com/open-webui/open-webui/blob/main/README.md : Ollama, APIs compatibles con OpenAI/GroqCloud y extensiones Pipes/Filters/Actions/Tools/Skills/MCP/MCPO/OpenAPI. No demuestra integración, compatibilidad universal ni capacidad de hardware actual. Elegir menor acoplamiento mantenible; fork profundo no aprobado.

| Requisito | Resultado/evidencia necesaria | Estado |
| --- | --- | --- |
| Entregas útiles secuenciales | Cinco contratos con prueba/conformidad del operador | Plan v0.3; ninguna función entregada. |
| Canon/UA | Notion v1.2/matriz 59 IDs, criterio aplicable por ruta | Documental, no certificado global. |
| Consulta personal esencial | ENT01 real desde chat y grafo | Pendiente; código focal no prueba ejecución. |
| Control de memoria | ENT02 y regresión posterior | Pendiente; requisito previo a uso privado amplio. |
| Local+Groq | ENT03 en ambas rutas reales | Condicionado a runtime/modelos/keys/egress autorizados. |
| Visión/validación/entrega | ENT04/05 con evidencias y aceptación | Pendiente, no cubierta por demo textual. |

Pronóstico: próximo hito funcional ENT01, no completar documentación infinita. Tiempo de ese hito y cierre NO ESTIMABLES con rigor hasta cotejo focal de ruta vigente/tests, corpus y disponibilidad de primer proveedor; sin muestra comparable. Cinco entregas no equivalen a cinco días/conversaciones. Esperas para prueba/conformidad del operador quedan separadas y sin fecha inventada; impiden ampliar pero no justificar otro alcance. Tras resolver prerrequisitos, dar rango del próximo incremento y ruta crítica total, supuestos/confianza, recalibrar por evidencia observada. Estimación anterior v0.2: no estimable; v0.3 mejora secuencia/control, no inventa aceleración. Estado implementado/demostrado/aceptado no se confunde; no porcentaje «casi terminado».

## 10. Formato de ciclo

Diez campos, breves: 1 proyecto/rol/sello y Metacanon adquirido versión/sello/revisión/frescura; 2 entrega actual y panorama; 3 delta metodológico/proyecto; 4 capacidad/evidencia y no tocado; 5 pendientes/bloqueos finitos; 6 viabilidad/criterios; 7 próximo hito y cierre, tiempo/ciclos fundamentados o NO ESTIMABLE; 8 siguiente acción/intervención mínima; 9 continuidad/prompt ante salida real del constructor; 10 persistencia/checkpoint. Al presentar función, usar contrato §8 y pedir prueba/conformidad; no abrumar con log de tareas internas. Fuente caída no significa sin cambios.

## 11. Crónica y fuentes

Eventos: E01–E05 solicitudes previas, orden conocido/fecha individual no disponible; E06 referencia explicativa, no mensaje adicional; E07 encargo original 13:12; E08 primera canonización/UA v1.2 y commit bf5d5b0; E09 instrucción 13:53, plan 0.2 siete fases/once hitos; E10 pregunta de nombre 14:15, propuesta del asistente Conversación Enraizada; E11 instrucción 14:32, precisa control por funciones esenciales y uso real. En E11 se revalidó objeto/metacanon y privacidad, y se reorganizó 0.3 sin código ni pruebas productivas. v0.2 queda histórica; su permiso de avance flexible queda sustituido por aceptación secuencial E11. Sin borrar alcance original ni atribuir aceptación funcional inexistente.

Fuentes de trabajo:

- Unidades Notion: https://www.notion.so/55d5d4a3b25083a1a14381ca70281acd , v1.1→v1.2; matriz 59 IDs sin renumerar. Correcciones previas: UA13/51 miembro→comunidad, UA36 cuatro jueces para réplica literal/dos perfil reducido, UA37 suite completa y discrepancia AC1, UA44 déficit visual y frontera O/P/razonamiento privado.
- Auditoría viva: https://www.notion.so/77b5d4a3b2508330951981bd7da09219 , consolidación 2026-10-16 sobre evidencia histórica, no corrida nueva; reporta 171 PASS/1 SKIP/3 XFAIL y conformidad estructural condicionada. Salud/corpus/evaluación real pendientes; no prueba propia de hoy.
- VCU: https://www.notion.so/5175d4a3b25083e1a2d501382a961376 , mezcla historia y atribuciones RAKG/RUVA; RAKG es trabajo relacionado, no componente adoptado por EpisTwin. No trasladar ramas/Windows/estado de septiembre a presente.
- Reporte julio: https://www.notion.so/9045d4a3b25082c3b95e017b98c44286 , mocks/degradación históricos; no negar cierres posteriores ni llamar real al benchmark sintético. Corregir uso actual sin reescritura histórica masiva.
- Artículo: https://arxiv.org/html/2603.06290v1 , secciones completas leídas en E08. PDF combinado citado: 100 páginas, EpisTwin pp1–10, SHA256 f29ec61cc661753f73a14b11c2f7fac8a9bd2b09031751d200e124dca5bbe1ea; huella heredada, no recomputada/equivalencia binaria no declarada.
- Open WebUI LICENSE/README en §6/9, fuentes mutables a fijar antes de integración; orientación documental, no dictamen jurídico exhaustivo.

Código focal leído antes en 362f8ff51a518506927e486b9d61feee4f6313da, no pruebas de producción:

1. `kernel/src/khora_kernel/engine/core.py`: componentes reales de política/retrieval/historial; política serializa estado/detalle pero no observaciones completas; REFINE guarda refined_query mientras RETRIEVE usa pregunta original. Riesgo de causalidad UA18/45/17; verificar y corregir ruta mínima. Vías legacy/modo mark deben delimitarse de producción.
2. `kernel/src/khora_kernel/engine/fval.py`: global separado de legacy claim-by-claim; no q explícita en prompt global; probar suficiencia de pregunta, no solo respaldo de respuesta incompleta.
3. `kernel/src/khora_kernel/engine/orchestrator.py`: ask_with_fallback y delta_fb/historial presentes, no evidencia de imagen cruda/efimeridad/productivo.
4. `kernel/src/khora_kernel/epistwin_audit.py`: dos jueces/AC1 perfil reducido, no réplica literal; resolution_effective=False no prueba barrido efectivo.

Son riesgos estáticos a verificar, no bugs productivos certificados. No auditar todo antes ENT01 ni extrapolar lecturas al SHA actual. La matriz técnica sigue siendo referencia, no nueva cola.

## 12. Reinstanciación

### Asistencia

```text
Retoma docs/frentes/chat-epistwin/OBJETO-CANONICO.md en SeryMente/khora, rama docs/chat-epistwin-20261017/PR307 hasta integración verificada. Rol asistencia/documentación, nombre Samantha; no permiso automático de código. Recupera objeto vivo y metacanon de SeryMente/metodologia, partida adquirida 1.5/METACANON-OBJETOS-v1.5, revisión 49ac40e9f6122e2d2fb339362cfa0a78128c8e37/blob 32c7a65ff2e83b3b76752ba2160427bd6e851a8f. Muestra Metacanon adquirido/revisión/frescura en cada salida, aplica delta/precedencia/permiso; fuente caída limita solo acción dependiente. Objeto 0.3/ancla E11: sustituye avance flexible v0.2 por entregas ENT01–05 secuenciales probadas por operador. Chat no implementado; siguiente función ENT01 consulta textual fiable desde chat sobre conjunto pequeño aprobado con una ruta de modelo. Prerrequisitos focales H1/H2 son internos, no hitos al usuario. Una capacidad esencial bien hecha→prueba técnica→operador prueba→corrección→conformidad explícita→siguiente. No avanzar por silencio ni construir otra función mientras se evalúa actual. ENT02 control de memoria antes de datos privados amplios; ENT03 segunda ruta local/Groq; ENT04 visión; ENT05 consolidación. No crecimiento ni reconstrucción general, CE13 fuera. Revalida código fresco, no extrapoles riesgos estáticos a producción. Atiende primero salida real del constructor, sintetiza delta/viabilidad/tiempo y entrega prompt completo; si falta aceptación indica esperar/corregir, no continuar ampliando. No pedir keys innecesarias, no secretos en chat/Git/logs. No fusión/despliegue/gasto por leer plan. RDC solo asistencia estrictamente necesaria y autorizada, no necesario aquí; si imprescindible verificar equipo/cuenta/runtime y usar npx @wonderwhy-er/desktop-commander@latest remote --no-persist-session en equipo actual, nunca sandbox. Revalida privacidad/concurrencia, persiste en mismo objeto y verifica readback/diff/prompts. Usa §10, estima próximo incremento/cierre desde dependencias o NO ESTIMABLE; sin fondo ni aceptación inventada.
```

### Construcción

```text
Adquiere OBJETO-CANONICO.md 0.3/ancla E11 y MATRIZ-CANON-EPISTWIN.md, docs/frentes/chat-epistwin en SeryMente/khora, rama docs/chat-epistwin-20261017 hasta integración verificada. Rol construcción sin identidades importadas. Revalida objeto y metacanon central, partida 1.5/METACANON-OBJETOS-v1.5, revisión 49ac40e9f6122e2d2fb339362cfa0a78128c8e37. Muestra versión/sello/revisión/frescura cada ciclo; aplica precedencia/delta/permiso; fuente caída limita acción dependiente. No permiso nuevo de seguridad/gasto/fusión/despliegue. Un escritor, una entrega funcional activa: ENT01 chat textual fiable con fuentes, ausencia de evidencia honesta, conjunto pequeño aprobado/no sensible, una ruta verificable, sin escritura silenciosa. Resolver solo prerrequisitos de su ruta; no kernel nuevo ni auditoría infinita. Debe ser usable por operador, no endpoint/mock/build. Probar técnicamente, dar acceso y guía breve con resultados esperados/límites, corregir y esperar conformidad explícita antes de implementar ENT02. Después ENT02 control ingestión/corrección/borrado por circuitos existentes, antes de uso privado amplio; ENT03 segunda ruta local/Groq; ENT04 visión cruda/efímera; ENT05 consolidación/evaluación/entrega autorizada. No implementar siguiente función durante evaluación ni interpretar silencio como aceptación. Mantener base aceptada, regresión por incremento, recuperación existente, sin nueva infraestructura. Cada tarea requisito/riesgo material, CE13 fuera. Diferenciar perfil dos jueces de réplica literal cuatro. No doble PKG, auto-ingesta o fuga a API; keys seguras, no chat/Git/logs. Respeta AGENTS y custodia si tocas ese circuito. Nunca RDC, ni descubrimiento ni intermediarios; comando heredado npx @wonderwhy-er/desktop-commander@latest remote --no-persist-session solo asistencia necesaria/autorizada. Entrega evidencia/SHA/entorno, contrato de función §8, pendiente de prueba/aceptación real y pronóstico fundamentado o NO ESTIMABLE. No actividad de fondo ni éxito inventado. Persistir autorizado, revalidar privacidad/concurrencia y comprobar lectura de vuelta.
```

## 13. Persistencia y revisión

Antes de escribir revalidar objeto/rama/privacidad, usar revisión condicionada y fusionar deltas ajenos. Versionar por evento, preservar originales/historia y sincronizar prompts. Una cola en §8; no nuevo plan/tablero. Artefactos importantes misma carpeta con procedencia/integridad o referencia autorizada por límites de licencia/tamaño/seguridad; secretos nunca Git.

Revisión 1 v0.3 contra E11: prueba/control del operador por función, capacidad esencial primero, conformidad antes de ampliar, datos privados condicionados a controles y sin innovación ajena. CE01–12/H1–11 preservados por mapeo, CE13 fuera. Originales y límites conservados; fuente y 13 bloques presentes. Historia 0.2 recuperable por commit, no instrucciones vigentes contradictorias. Revisión 2 tras guardar: lectura remota, cinco entregas, orden/compuertas, ENT01 no endpoint, seguridad antes de uso privado, no permiso de avance silencioso, coherencia de ambos prompts/original E11. No llamar a esto prueba empírica del producto.

Casos negativos: ni fuente caída=sin cambios ni mock=producción; ni prueba técnica=aceptación del operador ni silencio=permiso; ni ENT01 aceptada=sprint completo; ni branding sin excepción se elimina; ni insuficiencia textual fuerza visión; ni a_vis se ingiere; ni nueva función mientras se evalúa actual. Conservar última base aceptada y corregir regresiones antes de ampliarla.

## Anexo A. Especificaciones originales verbatim

E01–05 recuperados del contexto previo, fechas individuales no disponibles. E07/E09/E11 mensajes directos con timestamps. Se conserva grafía; se retira solo envoltorio del chat. Respuestas del asistente no archivadas íntegramente verbatim. E06 referencia explicativa, no mensaje adicional; E08/E10 eventos de trabajo/pregunta separados de instrucciones originales.

### E01

> Haz un análisis de EPISTWIN y del sistema actual y dime cuáles son los elementos generales de EPISTWIN, conforme los documentos que están en este espacio de trabajo y la unidad del documento de unidades de auditoría de EPISTWIN y dime cuáles son los elementos, o sea, los bloques grandes de construcción de EPISTWIN para ver si ya los tiene este sistema.

### E02

> Dime todo esto de manera más simple.

### E03

> ¿Cuáles son las piezas que faltan?

### E04

> Dime, ¿esto supone la integración de una interfaz de chat para Khra?

### E05

> ¿Puede OpenUI ayudarme a gestionar, no tomar OpenUI y pegárselo con tape a Cora, sino más bien, jajaja, sino más bien, ¿puede esta herramienta open source OpenUI ser integrada a Cora de manera legal y gratuita para poder utilizar todas las capacidades de OpenUI en Cora de un modo que tampoco se vea como que nos robamos su trabajo?

### E06 · referencia explicativa

Aceptación de licencia y precisión OpenWebUI/local/API contenidas en E07 íntegro; no otro mensaje ni aprobación inventada.

### E07 · 2026-10-17 13:12:33 America/Mexico_City

> Bueno, lo que vamos a necesitar es... Sí, la licencia sí me sirve. Entonces, mira, vamos a dotarle a Cora de la capacidad de tener una interfaz de chat que se vea como original de Cora, pero utilizaremos la tecnología de OpenWebUI para no tener que hacer tanto trabajo y para además tener la excelencia que esta herramienta ya desarrollada tiene bajo la licencia de Open Source sin pagarla, con estas limitaciones que me comentas y dándole la posibilidad al modelo de integrar tanto... a Cora de integrar tanto modelos para trabajar de manera local como mediante llaves API como la de Grok con Q. Nada más, esto nos va a permitir poder utilizar la tecnología subyacente, evidentemente, de Epistwin. Entonces, añade esto a la cola de trabajo de este hilo junto con los elementos que faltan. Revisa si la unidad de revisar los documentos que tengo en este espacio de trabajo para ver si coinciden con las unidades de auditoría de Epistwin. Asegúrate que las unidades de auditoría de Epistwin correspondan al canon y luego utiliza ese documento actualizado para poder ir construyendo todo lo que tiene que ver con este esfuerzo. Lo más importante, pero lo más importante, es que documentes en un objeto canónico en el repositorio de Cora todo lo que tiene que ver con este hilo utilizando la guía metacanónica para este tipo de objetos ubicada en el repositorio de metodología. Si tienes alguna duda, me preguntas.

### E09 · 2026-10-17 13:53:01 America/Mexico_City

> Endurece tu plan de trabajo sin bloating, sin hacerlo crecer con cosas que no tengan que ver con mis requerimientos. y asegúrate que tengas fases de desarrollo bien delimitadas para todo el sprint, de extremo a extremo, empezando y organizándola por hitos que sean fáciles de... no fáciles. Es decir, el desarrollo debe estar organizado por fases orientadas al alcance de hitos a lo largo de todo el sprint que tengan una frecuencia tal que tenga sentido y que además me permitan tener esos hitos tan frecuentemente como sea posible, siempre y cuando se siga teniendo sentido para favorecer la necesaria motivación.

### E10 · 2026-10-17 14:15:47 America/Mexico_City

> ¿Cómo le llamaremos a este sprint?

Respuesta del asistente, síntesis no verbatim: propuesta Conversación Enraizada · Chat Khora y cierre del núcleo EpisTwin; sin permiso funcional derivado del nombre.

### E11 · 2026-10-17 14:32:24 America/Mexico_City

> OK, este, organiza el desarrollo de manera tal que me vayas entregando, o sea, los hitos. Cuando dije que tenían que tener sentido, me refiero, bueno, que tengan sentido, pero que me permitan ir probando las funciones esenciales, las más, o sea, las esenciales, las más útiles para irlo construyendo de manera que yo tenga control primero de algo que esté bien hecho y que sea muy, muy esencial para el propósito de esta función. y cuando ya lo tenga, pues pasamos a lo siguiente y pasamos a lo siguiente y pasamos a lo siguiente, porque lo que estoy viendo es de que si nos pusimos muy creativos, pero no quiero, quiero que esto sea una implementación controlada, porque sí la voy a utilizar.

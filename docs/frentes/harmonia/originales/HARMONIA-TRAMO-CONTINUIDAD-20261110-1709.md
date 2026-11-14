# Harmonia · continuidad operativa y último ciclo reproducido

**Corte:** 2026-11-10 · America/Mexico_City  
**Frente:** KHORA / Harmonia  
**Sprint:** HARMONIA OMM-01 — Observa · Mide · Mejora  
**Fuente:** tramo conversacional suministrado por el operador en esta solicitud.  
**Naturaleza:** extracto de continuidad estructurado más reproducción literal del último mensaje del modelo incluido en el tramo. No es una exportación íntegra del hilo ni telemetría.

## 1. Propósito que gobierna el desarrollo

Harmonia debe ser un bucle semiautomatizado de desarrollo, no solamente un recolector:

1. Observar estructuralmente la interfaz web de ChatGPT.
2. Registrar metadatos y señales de interfaz, nunca el contenido privado de las conversaciones.
3. Mantener un banco local actualizado de capacidades, controles, atributos y superficies observables.
4. Medir los tiempos de los ciclos conversacionales observables.
5. Contrastar los datos de observabilidad con el propósito declarado y las intervenciones del operador.
6. Priorizar, implementar y validar mejoras de la propia extensión y de sus herramientas.
7. Repetir el ciclo sin trasladar al operador tareas técnicas ordinarias.

La interfaz de Harmonia debe evolucionar hacia una UI moderna, pulida y simplificada. La telemetría debe servir para medir tiempos de solución/ciclo, cobertura, muestras incompletas y comportamiento de la captura.

## 2. Decisiones y reglas operativas consolidadas

### 2.1. Operación técnica

- Todas las tareas técnicas locales se realizan mediante RDC en el dispositivo y workspace autorizados.
- El operador no debe tener que ejecutar, recordar ni administrar archivos CMD, scripts PowerShell, comandos o rutas. Son componentes internos; su mantenimiento y ejecución corresponden al agente mediante RDC.
- Las pruebas de navegador se hacen exclusivamente con Chromium headless, perfiles temporales aislados y CLI.
- No abrir, enfocar, navegar, inspeccionar ni modificar el Chrome principal. No usar el único monitor interactivo del operador.
- Los perfiles temporales y artefactos de prueba se eliminan al concluir cada ensayo.
- No publicar, hacer commit, push, merge, PR ni despliegue sin autorización expresa.

### 2.2. Eficiencia y calidad

- Evitar comprobaciones repetitivas, ceremoniales o que no discriminen entre hipótesis.
- Preferir ciclos cortos y una primera pasada eficiente; se acepta que una hipótesis requiera corrección, pero no reducir los criterios de calidad final.
- Comunicar inmediatamente cualquier bloqueo que requiera intervención del operador.
- Pedir al operador solamente la intervención mínima que no pueda resolverse mediante RDC o pruebas aisladas.
- No volver a pedir datos ya proporcionados ni trasladar tareas técnicas ordinarias al operador.

### 2.3. Privacidad y alcance de la observación

- No leer, persistir ni exportar textos de prompts, respuestas, borradores o del compositor.
- No recoger cookies, credenciales, tokens, cuerpos de solicitudes, contenido de mensajes ni identificadores de sesión/conversación/pestaña.
- Los diagnósticos se limitan a metadatos agregados, estado de la observación, contadores, señales, cobertura, medidas y errores acotados.
- Las pruebas headless usan fixtures sin sesión ni texto conversacional y bloquean tráfico ajeno al origen de prueba.

### 2.4. Interpretación de las mediciones

- T1: primera transición visual observable a procesamiento activo.
- T2: primera transición a inactivo cuando el DOM ya representa una respuesta del asistente.
- La ventana settle de 1500 ms confirma el cierre; no se suma a la latencia T1–T2.
- chatgpt-ui-generation.v1 mide transiciones observables de la interfaz, no inferencia interna ni latencia del servidor.
- Los fixtures sintéticos y las ejecuciones headless verifican comportamiento técnico, pero no cuentan como ciclos naturales para BMO-01.
- BMO-01 requiere al menos cinco ciclos naturales correlacionados y persistidos, junto con mediana/P90, tamaño de muestra, cobertura, incompletos/no medidos, revisión de matriz, popup/privacidad y cierre reproducible.

### 2.5. Separación normativa

La telemetría operativa de Harmonia es distinta de ART-027. El conteo de consultas o recuperaciones normativas no mide la aplicación de principios y no debe asociarse a una conversación o ciclo. Harmonia mide comportamiento operativo observable y no amplía implícitamente ART-027.

## 3. Decisiones sobre recarga y participación del operador

- El operador informó que recargó manualmente una versión anterior de la extensión. Ese reporte no verifica por sí solo qué build quedó activa.
- El mecanismo de autorrecarga mediante Chrome DevTools/CDP se había diseñado como objetivo, pero no está integrado ni verificado en Chrome principal.
- OMM-01-019 conserva la autorrecarga como mejora secundaria P1. No se debe intentar habilitar depuración remota del Chrome principal ni alterar el navegador principal bajo la regla operativa vigente.
- La autenticación de una sesión real no está disponible en perfiles headless aislados. Por ello, headless no sustituye la comprobación natural del operador; tampoco autoriza a inspeccionar su perfil.
- Cuando sea imprescindible una observación natural, se solicitará un resultado agregado del popup o el informe JSON, nunca una captura ni contenido de chat.

## 4. Estado técnico vigente al corte de esta continuidad

El contenido histórico suministrado terminaba en OCP v0.59 y candidata 0.4.2. Ese estado se conserva como antecedente, no como estado actual.

Estado local más reciente verificado en el workspace:

- OCP: HARMONIA v0.61, SHA-256 2C6FD259EAECE2D19FDCB7BD9E208460360DAACFA978B9C602FB621831F6030B.
- Rama: work/harmonia-front-workspace-20261110.
- HEAD: 9fd5c18205e39b6db12c9152b07d8f880f6b256d.
- Extensión candidata local: 0.4.4, build LOCAL-OMM-01-022-ARIA-LABEL-CYCLE-SIGNAL.
- La candidata 0.4.4 añade aria-label al attributeFilter del MutationObserver de ciclos, porque ChatGPT puede cambiar la etiqueta accesible del mismo control entre enviar y detener generación.
- Suite automatizada: 21/21 PASS.
- E2E headless dirigido: el mismo botón cambia Enviar → Detener → Enviar; se observa un T1, un T2 y un barrido; duración sintética 469,1 ms.
- La duración de 469,1 ms es sintética y no cuenta para BMO-01.
- La activación de 0.4.4 en el navegador del operador y la captura natural posterior siguen pendientes de evidencia.
- OCP v0.61 contiene §27 (informe JSON copiable) y §28 (corrección aria-label).
- El árbol de trabajo contiene modificaciones previas y archivos no rastreados; no limpiarlo ni revertirlo como parte de esta continuidad.

## 5. Cola provisional de trabajo

| Prioridad | Tarea | Estado / siguiente criterio |
| --- | --- | --- |
| P0 | OMM-01-018 · Arranque, primer evento y persistencia | Pruebas headless PASS; falta validar observación natural con 0.4.4. |
| P0 | OMM-01-003/004 · T1 y T2 naturales | Pendientes de ciclos naturales; no aceptar fixtures. |
| P1 | OMM-01-007/009 · Matriz de ciclos y popup | Completar casos límite, cobertura, estados incompletos y privacidad. |
| P1 | OMM-01-021 · Informe diagnóstico | JSON común y lectura headless verificados; copia efectiva al portapapeles del navegador principal no acreditada. |
| P1 | OMM-01-022 · Señales aria-label | Corrección 0.4.4; 21/21 y E2E headless PASS; validación natural pendiente. |
| P1 | OMM-01-019 · Autorrecarga | Diseño CDP registrado; no integrada ni verificada en Chrome principal. |
| P2 | OMM-01-002/016 · Ejecutor Codex CLI | Bloqueado por autenticación/contexto; no iniciar sesión ni manipular credenciales sin autorización. |
| Continuo | UI moderna y simplificada | Mejorar solo con evidencia de uso/cobertura y sin distraer del cierre de BMO-01. |

Siguiente paso técnico: validar la candidata 0.4.4 con el informe diagnóstico agregado tras su activación manual por el operador; analizar versión, cola, barridos, ciclos, cobertura y errores. Si continúan cero ciclos después de actividad natural, añadir contadores estructurales de transiciones admitidas/no admitidas, sin recopilar contenido.

## 6. Salida literal del último ciclo incluido en el tramo suministrado

La siguiente reproducción conserva literalmente el último mensaje del modelo que aparece en el texto proporcionado por el operador. Sus datos de versión y pruebas son históricos; el estado vigente queda definido en §4.

~~~text
Resultado del ciclo
OCP v0.59 actualizado y verificado
Quedaron incorporados:

Tus nuevas reglas de eficiencia y calidad.

La obligación de avisarte cuando encuentre un bloqueo.

La separación entre consultas y autorizaciones.

La restricción a CLI y Chromium headless.

La recarga manual que informaste.

El estado real de la autorrecarga, todavía pendiente.

Mi cola provisional de trabajo y sus prioridades.

Persistencia: OCP v0.59, 1.253 líneas, SHA-256:

9F42100C721EF926217D1BBBAD2344D82452D6F2C43838CAA19D96CAAF01C743

La versión v0.58 quedó preservada. No publiqué ni hice commits.

Estado técnico
20/20 pruebas PASS
La candidata 0.4.2 sigue funcionando en headless. También quedó corregida la presentación singular del contador: ahora muestra «1 muestra gráfica».

La siguiente prioridad es dejar de probar fixtures y comprobar actividad natural. Después seguiremos con la matriz de ciclos y la autorrecarga.

Necesito un único dato para desbloquear la siguiente etapa
Como ya recargaste manualmente la extensión, abre su popup en Chrome y dime qué valores aparecen en:

Muestras gráficas

Barridos registrados

Eventos en cola

No necesito capturas ni contenido de tus conversaciones. Con esos tres números sabré si ya estamos capturando actividad real o si queda algún problema de inyección.

Trazabilidad
IPZ: v0.7 · antigüedad NO VERIFICADA.

DUG: v388 / NX-388m · blob SHA 4db0ebadfd1e48b2bdec9236ba7f344921e4a865 · antigüedad NO VERIFICADA.

CONV: PENDIENTE / NO ASIGNADO.

CICLO: PENDIENTE / NO ASIGNADO.

A / B: PENDIENTES / NO ASIGNADOS.

OCP: HARMONIA v0.59 · SHA y read-back PASS.

FOL1: PREPARADA / NO ACTIVA.

BMO-01: NO ALCANZADO.

No necesitamos seguir acumulando pruebas sintéticas. Ahora toca comprobar el comportamiento real.
~~~

## 7. Trazabilidad de esta persistencia

- OCP v0.61 preservado antes de la edición en archive/OBJETO-CANONICO-v0.61-pre-continuity-rules-20261110.md.
- SHA-256 del original y del archivo preservado: 2C6FD259EAECE2D19FDCB7BD9E208460360DAACFA978B9C602FB621831F6030B; comparación PASS.
- Esta nota conserva la salida anterior de forma literal y separa su estado histórico del estado técnico vigente.
- Dispositivo RDC: PC10RCIF4EI4 · UUID autorizado b573344f-c68f-47c9-9c2e-ae67f2e63bdb.
- Rama local: work/harmonia-front-workspace-20261110 · HEAD 9fd5c18205e39b6db12c9152b07d8f880f6b256d.
- Sin commit, push, merge, PR ni despliegue.
- CONV / CICLO / A / B: PENDIENTES / NO ASIGNADOS.
- FOL1: PREPARADA · NO ACTIVA.
- MCP normativo: DESACTIVADO.

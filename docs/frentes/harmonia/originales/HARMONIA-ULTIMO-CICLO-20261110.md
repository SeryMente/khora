# Harmonia · último tramo de continuidad y salida literal
**Corte documental:** 2026-11-10 · America/Mexico_City  
**Frente:** KHORA / Harmonia  
**Sprint:** HARMONIA OMM-01 — Observa · Mide · Mejora  
**Naturaleza:** original de continuidad parcial; no es telemetría ni sustituye el OCP.

## 1. Instrucción actual de persistencia · D-012

El operador repitió la misma solicitud dos veces. Se conservan ambas grafías tal como fueron suministradas:

~~~text
Persiste en el frente de trabajo harmonia el ultimo tramo de la converacion,  bienformateado pero sin tardarte myucho, y repite el ultimo ciclo, la salida del modelo literal
~~~

~~~text
Persiste en el frente de trabajo harmoniael ultimo tramo de la converacion,  bienformateado pero sin tardarte myucho, y repite el ultimo ciclo, la salida del modelo literal
~~~

## 2. Instrucción que precede a la salida repetida

~~~text
Ok consolida ahora todo lo que tenemos para la extension, verbatim, reglas de operacion,decicisiones , etc. TODO. Y construye bien tu OCP de frente de trabajo HARMONIA,  por que necesito que esto corra fino. Quita lo que no necsites, no quiero contenido obsoleto en el ocp.

Como le llamaremos al sprint?
~~~

## 3. Salida visible del modelo · último ciclo · transcripción literal

El sprint se llamará:

HARMONIA OMM-01 — Observa · Mide · Mejora
El nombre refleja el propósito completo: observar la plataforma, medir su comportamiento y utilizar la evidencia para mejorar automáticamente la propia suite.

OCP v0.48 consolidado localmente
1. Reconstruí el OCP del frente
Reorganicé el objeto completo en una estructura operativa de 449 líneas, eliminando del documento activo la acumulación cronológica de decisiones antiguas, transferencias, estados repetidos y propuestas ya superadas.

Ahora tiene 15 secciones:

Sección

Contenido

1–4

Identidad, sprint, gobierno y reglas de operación

5

Registro de instrucciones verbatim

6–7

Arquitectura, telemetría, almacenamiento y seguridad

8–9

Continuidad Markdown, interfaz y catálogo de observación

10–11

Estado técnico y restricciones

12

Backlog único del sprint

13–15

Aceptación, referencias y estado operativo

No destruí el documento anterior: lo conservé íntegro en:

docs/frentes/harmonia/archive/OBJETO-CANONICO-v0.47-historico-20261110.md

Su SHA-256 coincide exactamente con el del documento anterior a la consolidación. El archivo histórico queda separado y ya no gobierna el trabajo activo.

2. Registro verbatim
La sección 5 conserva nueve instrucciones identificadas como D-001 a D-009.

Incluye tus dictados sobre:

El bucle semiautomatizado de desarrollo.

La medición de ciclos desde Enter.

La prioridad ChatGPT gratuito.

La distinción entre latencia local y desempeño de generación.

Las señales gráficas de T₁ y T₂.

La continuidad documental y Markdown.

La operación exclusivamente mediante RDC.

Codex CLI.

La consolidación del OCP.

Cada tarea del backlog referencia las instrucciones que la originaron. Las formulaciones originales permanecen separadas de las interpretaciones técnicas.

3. Reglas operativas consolidadas
Quedaron expresamente establecidas:

Tú defines el propósito mediante dictados. No necesitas diseñar cada iteración.

Harmonia observa. Utiliza datos estructurales, cobertura y estados observables de la interfaz.

Yo coordino el desarrollo. Selecciono tareas, priorizo, reviso evidencia y actualizo el OCP.

Codex CLI ejecuta el desarrollo. Modifica código dentro del workspace autorizado, ejecuta pruebas y produce diffs que deben revisarse.

El ciclo se repite. Cuando la observabilidad sea insuficiente, se mejora el observador. Cuando sea suficiente, se mejora el producto conforme a tus instrucciones.

Todo el mantenimiento técnico se realiza mediante RDC. No volveré a trasladarte la ejecución de scripts o comandos auxiliares.

4. Codex CLI: estado real
Instalado
codex-cli 0.167.0

Localicé el ejecutable en el perfil fila4. Sin embargo, hay una condición pendiente:

RDC ejecuta los procesos como CENTRAL\MantenimientoRCI.

La consulta de autenticación realizada en ese contexto devolvió Not logged in.

No he iniciado una sesión ni accedido a credenciales.

Por tanto, Codex CLI está instalado, pero todavía no está operativo como ejecutor autenticado del sprint. Su integración queda registrada en el backlog.

5. Decisiones técnicas que quedan fijadas
El primer adaptador será exclusivamente para ChatGPT Web gratuito.

El núcleo de telemetría será agnóstico y quedará preparado para OpenWebUI de Cora y APIs posteriores.

La métrica principal será:

T₂ − T₁
chatgpt_ui_generation_ms

T₁: señal gráfica que indica el comienzo del procesamiento.

T₂: señal gráfica que indica la finalización de la generación de la respuesta final.

No se utilizará el tiempo de estabilización DOM como sustituto. Tampoco se recogerán CPU o RAM para corregir artificialmente la medición. La limitación que tiene observar cambios gráficos bajo carga local queda documentada.

El duration_ms anterior conserva su significado histórico y no se presentará como esta nueva métrica.

6. Restricciones de continuidad documental
Preservé tu objetivo de exportación Markdown y recuperación contextual, pero separé lo solicitado de lo que puede implementarse.

La extracción automática y programática de las salidas de ChatGPT está prohibida por los términos vigentes de OpenAI. No implementaré esa extracción ni automatizaré controles para evitar límites del servicio.

OpenAI

Sí quedó prevista la transformación local de una exportación oficial descargada por el titular. Esta posibilidad está disponible para ChatGPT Free.

OpenAI Help Center

7. Backlog único
El nuevo OCP tiene un solo backlog, en la sección 12, con 17 tareas y una ruta crítica.

Las prioridades inmediatas son:

OMM-01-001: reconciliar la candidata 0.3.2. Hay rutas incompatibles entre 0.3.0, 0.3.1 y 0.3.2 en los scripts y documentación. No se debe inicializar todavía.

OMM-01-002: resolver la disponibilidad y autenticación de Codex CLI bajo el contexto autorizado.

OMM-01-003 y 004: identificar las señales gráficas reales de T₁ y T₂.

OMM-01-005 y 006: implementar el núcleo neutral y el adaptador ChatGPT Free.

OMM-01-007: validar los estados y casos especiales mediante pruebas.

OpenWebUI y API permanecen en la sección FUTURO: están preparados conceptualmente, pero no distraerán de la primera entrega urgente.

8. Verificación documental
OCP nuevo

Read-back confirmado
449 líneas · 44.347 bytes

SHA-256

E13794FEC97479C7AE3469CB12579325287A1FA4DD3E56A68A79A1778B666AE1

Archivo histórico v0.47

Integridad confirmada
2.587 líneas · 351.881 bytes

La suite técnica continúa con 15/15 pruebas sintéticas PASS, seis comprobaciones sintácticas JavaScript PASS y parser PowerShell PASS. Estas pruebas no acreditan todavía la nueva métrica T₁/T₂ ni una sesión natural de Chrome.

Publicación: ninguna. Todo permanece en la rama local work/harmonia-front-workspace-20261110, sin commit ni push.

Resultado
Ya tenemos un único OCP operativo, instrucciones verbatim recuperables, reglas de ejecución, decisiones técnicas, restricciones, un agente ejecutor definido y un backlog secuenciado.

La siguiente tarea ya está elegida: OMM-01-001, corregir la coherencia de la candidata 0.3.2. No necesitas volver a decidir qué debe hacerse después.

Trazabilidad
IPZ: v0.7 · antigüedad NO VERIFICADA.

DUG: v388 · NX-388m · antigüedad de main NO VERIFICADA.

OCP Harmonia: v0.48 local.

CONV / OCP: PENDIENTE / NO ASIGNADO.

CICLO / OCP: PENDIENTE / NO ASIGNADO.

A / OCP: PENDIENTE / NO ASIGNADO.

B / OCP: PENDIENTE / NO ASIGNADO.

UUIDv7 local: 01a1c6fc-4105-7624-aa02-52f907e28973.

FOL1: PREPARADA · NO ACTIVA.

Dispositivo RDC: UUID autorizado b573344f-c68f-47c9-9c2e-ae67f2e63bdb.

MCP normativo: DESACTIVADO.

## 4. Relación con el OCP vigente

La salida anterior se conserva literalmente como evidencia de lo que se respondió en ese ciclo. Sus afirmaciones de estado (v0.48, 449 líneas, 15/15 pruebas y tarea OMM-01-001 como siguiente) son históricas y no sustituyen el estado posterior verificado: OCP local v0.50 al inicio de esta actualización, candidata local 0.4.0, 16/16 pruebas sintéticas y OMM-01-001 ya marcada como completada localmente. La fuente operativa actual es ../OBJETO-CANONICO.md.

El operador informó en esta continuidad que ya cargó la extensión en Chrome. La declaración se conserva como dato reportado por el operador; no equivale a una verificación independiente del perfil, versión activa ni observación natural de T₁/T₂.

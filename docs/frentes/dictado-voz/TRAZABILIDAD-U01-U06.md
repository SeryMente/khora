# Trazabilidad verbatim → resultado (U01–U06)

Fuente literal: [INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl](originales/INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl) (copia idéntica, blob `fb35dc95`). Las citas de esta tabla se copian de ahí sin corregir faltas.

Base de trabajo: cabeza del #330 (`4fb3b7d`). El #334 se cierra sin fusionar; solo se porta lo marcado «portar».

Estados: **CUMPLE** (verificado en interfaz y prueba) · **PARCIAL** · **FALTA** · **SIN VERIFICAR** (no se ha comprobado contra la base #330).
Regla: una fila no pasa a CUMPLE sin elemento de interfaz (`data-ui-id`), archivo y prueba que falle si se pierde.

## Seguimiento de U06 (checklist)

| Id | Verbatim (cita) | Resultado esperado en interfaz | Estado inicial | Nota / origen |
|---|---|---|---|---|
| U06-01a | «Graficamente debe de estar bien diseñado. Y robusto. Pero no en exceso» | Checklist visualmente cuidado, sin sobrecarga | SIN VERIFICAR | Revisar #330 `CronicaCoverage` vs #334 `CronicaPersonalChecklist` y decidir cuál se queda |
| U06-01b | «deben de “deshacerse”, o “desmoronarse” … estimulante, que genere la sensacion de completud» | Al resolverse, cada ítem se deshace/desmorona con animación breve y respeta movimiento reducido | PARCIAL | #334 solo atenúa y tacha; no hay desmoronamiento |
| U06-02 | «conforme el contenido se analize en vivo, con groq» | Análisis en vivo con pausa, cancelación y respaldo si falla | PARCIAL | #334 lo cumple (900 ms, fallback); #330 usa detección local por expresiones. Portar endpoint del #334 |
| U06-03 | «empiezan de unmodo resuelto, pero si no se pueden vefificar … se vuelven activos» | Fecha y hora inician RESUELTAS; pasan a ACTIVAS solo si no se verifican por método automático | FALTA | #334 lo tiene invertido (inician activas) |
| U06-04 | «siempr ese debe obtener la IPV4, del lugar» | IPv4 obtenida y registrada junto con la entrada | PARCIAL | #334 la lee pero no la persiste ni resuelve el criterio Lugar |
| U06-05 | «la huella digital complet ay exhaustiva, a ungrado super ultra obsesivo … por cualquier canal … no solo para cronica» | Huella exhaustiva (lugar, dispositivo, sesión) para cualquier tipo de entrada, documentada | FALTA | Contrato #334 dice «no se maximiza la identificación»; solo cubre crónica |
| U06-06 | «deduce un conjunto, rico, por categorias, … desde lo mas general … hasta unso mas cocnretos» | Vocabulario de Momento con categorías general → concreto (→ especializada) | FALTA | #334 lo aplanó a 9 términos el 23-oct sin petición del operador; revertir |
| U06-07 | «1. Si no hay un campo adecuado … 2. … es mejor que los campos prediseñados, 3. … pulido mediante un c riterio de noramlizacion … 4. Por excepcion» | Propuesta IA de término nuevo solo si cumple 1–4; criterio acotado y documentado | FALTA | Sin categorías la condición 3 no puede cumplirse |
| U06-08 | «QUe haces, me parece poco adecuado. Seria mejor que pasa.» | Criterio «Qué pasa», libre, sin acción obligada | CUMPLE (por confirmar en base #330) | #334 lo cumple; confirmar en #330 |
| U06-09 | «Registra esta y otras insturcciones verbatim mias … en el Objeto Canonico» | Instrucciones verbatim registradas en OBJETO-CANONICO.md | PARCIAL | Esta copia y matriz son el primer paso; falta entrada en el Objeto Canónico |
| U06-10 | «Dame un checklist ordenado, limpio, amigable, no una pared de texto» | Estado y pendientes en formato corto (esta tabla) | PARCIAL | La entrada C033 del Objeto Canónico es una pared de texto; sustituir por resumen enlazado a esta matriz |

## Otras instrucciones

| Id | Verbatim (cita) | Resultado esperado | Estado inicial | Nota |
|---|---|---|---|---|
| U03 | «No haga sexplicito momento … pero que el sistema lo traduzca y lo diferencia» | Momento no se muestra explícito al usuario; el sistema lo traduce y lo hace comprensible en el microblog | FALTA | La interfaz del #334 enseña la lista de términos |
| U04 | «deja listo lo del audio … backblaze sea el medio de almacenamiento para datos de usuario» | Audio de usuario almacenado en Backblaze, sin depender de Vercel Blog | SIN VERIFICAR | Fuera del alcance del cambio de interfaz; verificar estado en #330 |
| U05 | «Nueva conexion, termina de extremo a extremo» | Entrega de extremo a extremo con evidencia de build y pruebas | SIN VERIFICAR | El comando de PowerShell no consta en el verbatim |
| U01/U02 | «sprint por fases» / «veintidós elementos» | Sprint por fases con los veintidós elementos | SIN VERIFICAR | Los veintidós elementos no están en el extracto; localizar en C032/C035 |

## Instrucciones posteriores del operador (23-oct, aún no custodiadas)

- Modos de grabación como íconos en la parte superior, no dropdown → commit `1323e96` (barra de íconos en `TipoEntradaControl.tsx`); falta moverla arriba en `IngresoWorkspace.tsx`.
- Recuperar la regresión de modos: base = cabeza del #330.
- Trabajo desatendido, trazabilidad punto por punto del verbatim a la interfaz.

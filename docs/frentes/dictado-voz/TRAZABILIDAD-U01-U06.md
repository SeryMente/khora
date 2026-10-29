# Trazabilidad verbatim → resultado (U01–U06)

Fuente literal: [INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl](originales/INSTRUCCIONES-VERBATIM-TAIL-C032-20261022.jsonl) (copia idéntica, blob `fb35dc95`). Las citas de esta tabla se copian de ahí sin corregir faltas.

Base de trabajo: cabeza del #330 (`4fb3b7d`). El #334 se cierra sin fusionar; solo se porta lo marcado «portar».

Estados: **CUMPLE** (verificado en interfaz y prueba) · **PARCIAL** · **FALTA** · **SIN VERIFICAR** (no se ha comprobado contra la base #330) · **SUPUESTO — por confirmar** (mantenido según orden explícita del operador).
Regla: una fila no pasa a CUMPLE sin elemento de interfaz (`data-ui-id`), archivo y prueba que falle si se pierde.

## Seguimiento de U06 (checklist)

| Id | Verbatim (cita) | Resultado esperado en interfaz | Estado actual | Nota / origen |
|---|---|---|---|---|
| U06-01a | «Graficamente debe de estar bien diseñado. Y robusto. Pero no en exceso» | Checklist visualmente cuidado, sin sobrecarga. `CronicaCoverage` como checklist único visible | PARCIAL | Verificado en base #330: `CronicaCoverage` es el único componente visible en `IngresoWorkspace.tsx`. Se mantendrá como base y se integrará el análisis Groq en segundo plano con fallback local. |
| U06-01b | «deben de “deshacerse”, o “desmoronarse” … estimulante, que genere la sensacion de completud» | Al resolverse, cada ítem se deshace/desmorona con animación breve (~600-900ms) y colapso; respeta movimiento reducido y `aria-live` | FALTA | Por implementar en `CronicaCoverage.tsx`. |
| U06-02 | «conforme el contenido se analize en vivo, con groq» | Análisis en vivo con pausa (~900 ms), cancelación de peticiones obsoletas y respaldo local si falla o falta clave | PARCIAL | Portar endpoint endurecido de #334 y conectar a `CronicaCoverage` sin alterar la vista si falla. |
| U06-03 | «empiezan de unmodo resuelto, pero si no se pueden vefificar … se vuelven activos» | Fecha y hora inician RESUELTAS solo cuando la comprobación automática está disponible; en caso contrario quedan ACTIVAS | PARCIAL | El estado ahora depende de un resultado explícito de disponibilidad del reloj local; falta validar en navegador y confirmar si el origen del tiempo satisface el criterio de aceptación. |
| U06-04 | «siempr ese debe obtener la IPV4, del lugar» | IPv4 obtenida de cabeceras seguras de servidor (`x-real-ip`, `x-vercel-forwarded-for`) y registrada junto con la entrada. Usada en el criterio Lugar sin presentarse como prueba de lugar del suceso | FALTA | Por implementar en backend y flujo de entrada. |
| U06-05 | «la huella digital complet ay exhaustiva, a ungrado super ultra obsesivo … por cualquier canal … no solo para cronica» | Huella exhaustiva de navegador (zona horaria, idiomas, resolución, viewport, núcleos, memoria, etc.), servidor (IP, headers) y sesión para cualquier tipo de entrada | SUPUESTO — por confirmar | Captura de APIs estándar sin GPS/cookies de terceros ni fingerprinting encubierto; documentado en Objeto Canónico. |
| U06-06 | «deduce un conjunto, rico, por categorias, … desde lo mas general … hasta unso mas cocnretos» | Vocabulario de Momento con categorías general → concreta → especializada | PARCIAL | Existe `lib/ingreso/momento-categorias.ts`, pero falta integrar el vocabulario al flujo de análisis y verificarlo de extremo a extremo. |
| U06-07 | «1. Si no hay un campo adecuado … 2. … es mejor que los campos prediseñados, 3. … pulido mediante un c riterio de noramlizacion … 4. Por excepcion» | Propuesta IA de término nuevo solo si cumple reglas 1–4; criterio acotado, con pruebas y documentado | PARCIAL | Existe `evaluarSugerenciaMomentoIA`, pero la suficiencia semántica de las condiciones y su integración con el análisis real no están demostradas. |
| U06-08 | «QUe haces, me parece poco adecuado. Seria mejor que pasa.» | Criterio «Qué pasa», libre, sin acción obligada | PARCIAL | La interfaz declara la etiqueta `Qué pasa` en `CronicaCoverage.tsx`; falta una prueba de interfaz que detecte una regresión del texto. |
| U06-09 | «Registra esta y otras insturcciones verbatim mias … en el Objeto Canonico» | Instrucciones verbatim registradas en OBJETO-CANONICO.md | PARCIAL | Pendiente de registrar entrada completa en Objeto Canónico. |
| U06-10 | «Dame un checklist ordenado, limpio, amigable, no una pared de texto» | Estado y pendientes en formato corto (esta tabla) | PARCIAL | Sustituir paredes de texto en Objeto Canónico por resumen enlazado a esta matriz. |

## Otras instrucciones

| Id | Verbatim (cita) | Resultado esperado | Estado actual | Nota |
|---|---|---|---|---|
| U03 | «No haga sexplicito momento … pero que el sistema lo traduzca y lo diferencia» | Momento no se muestra explícito en la pantalla de entrada (sin listas/formularios de términos); se resuelve internamente y se presenta comprensible solo en el microblog | SUPUESTO — por confirmar | Implementar resolución interna y marca de supuesto en la matriz. |
| U04 | «deja listo lo del audio … backblaze sea el medio de almacenamiento para datos de usuario» | Audio de usuario almacenado en Backblaze, sin depender de Vercel Blog | SIN VERIFICAR | Fuera del alcance directo del flujo de UI de Ingreso. |
| U05 | «Nueva conexion, termina de extremo a extremo» | Entrega de extremo a extremo con evidencia de build y pruebas | SIN VERIFICAR | Ejecutar verificaciones `npm ci`, `typecheck`, `test:unit`, `ui:contract`, `build`. |
| U01/U02 | «sprint por fases» / «veintidós elementos» | Sprint por fases con los veintidós elementos | SIN VERIFICAR | Se dará cumplimiento mediante trazabilidad completa. |

## Instrucciones posteriores del operador (23-oct)

- Modos de entrada como barra de íconos en la PARTE SUPERIOR de `IngresoWorkspace.tsx`, no dropdown → `TipoEntradaControl.tsx` actualizado (commit `1323e96`); falta montarla arriba en `IngresoWorkspace.tsx`.
- Preservar `CronicaCoverage` como checklist único visible con fallback local si Groq no responde o no hay clave.

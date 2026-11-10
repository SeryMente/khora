<!-- BASELINE_ARCHIVO=0.1; STATUS=PROVISIONAL; PARENT=CUSTODIA-01 -->
# Estado base para archivo · CUSTODIA-01 · 2026-11-10

> Este documento consolida el punto de partida reportado en los ciclos visibles. Es una línea base para ejecutar el objetivo de archivo; no certifica nuevas lecturas físicas ni nuevas escrituras.

## Objetivo

Archivar todos los registros que puedan archivarse. Al terminar, dejar pendientes únicamente los registros con un impedimento actual, concreto y documentado. No realizar auditoría de resiliencia, pruebas de nuevos dictados, reparaciones generales ni rediseño. No borrar ni sobrescribir fuentes originales.

## Identidad y fuente local

- Equipo/sesión activa válida: `PC10RCIF4EI4`.
- Único perfil Chrome autorizado: `Profile`, asociado a `the.willfreeman@gmail.com`.
- El perfil alterno queda excluido; no abrir ni consultar sus archivos.
- El perfil autorizado contiene 409 registros en `khora-custodia-v1/records`, una entrada en `keys`, 1.136 eventos de telemetría y 251 archivos bajo `.blob` (20.371.333 bytes), según el inventario previo.
- No se leyó la clave ni se descifró contenido durante la inspección documentada.

## Línea base reportada de sesiones de la cuenta

| Grupo | Sesiones | Componentes reportados | Tratamiento de archivo |
|---|---:|---|---|
| Texto + audio remoto | 44 | 1.039 partes: 785 B2 y 254 Vercel Blob | Archivar solo cuando el contenido y los componentes requeridos estén accesibles y verificados; los componentes Blob bloqueados permanecen identificados como existentes/bloqueados. |
| Texto sin audio remoto ni local detectado | 32 | Texto y SHA registrados; 31 con historial de revisiones y 1 registro legado sin historial | Archivar como texto sin audio conforme a la instrucción del operador; `Audio: No localizado`; `Procedencia: No verificada`. |
| Audio local | 2 | 216 fragmentos cifrados y 2 snapshots | Recuperación C autorizada; procesar por mecanismo KHORA, transferir a B2, verificar bytes/longitud/SHA y vincular; preservar originales locales. |
| Revisiones locales ya archivadas | 1 grupo | 191 revisiones con coincidencia exacta en remoto | Excluir de nuevo archivo; evitar duplicación. |

El grupo de 32 texto-only se obtiene de 34 sesiones sin audio remoto menos las dos sesiones en las que se localizó audio local. Las dos sesiones con audio local no deben clasificarse como texto-only.

## Otros grupos excluidos o bloqueados

| Grupo | Cantidad reportada | Estado |
|---|---:|---|
| Sesiones de otros titulares | 6 | No archivar bajo la cuenta del operador. |
| Sesiones sin titular demostrado | 81 | 244 partes de audio; mantener separadas y no reclamar por inferencia. |
| Señales de telemetría sin fila de sesión | 41 IDs / 42 eventos | Señales sin contenido de dictado localizado; no crear Volcados a partir de metadatos solos. |
| Sesiones ya archivadas | 22 en el corte posterior | Excluir y evitar duplicación. |
| Volcados históricos sin `session_id` | 54 | Ya archivados como objetos; no duplicar. |

## Bloqueos actuales reportados

### Vercel Blob

El store `khora-audio` fue reportado como `limits-exceeded-suspended`, con 636 objetos y 1.010.497.194 bytes. Los objetos de las 39 sesiones de la cuenta con Blob están localizados por referencias, pero el proveedor bloquea GET mientras el store siga suspendido. No clasificarlos como inexistentes ni eliminados. No sustituirlos por una copia vacía ni marcar el audio como `No localizado` cuando existe una referencia física localizada.

### Backblaze B2

Las 785 partes B2 de la cuenta, distribuidas en cinco sesiones, tienen verificación histórica, SHA y tamaños positivos en Neon. Falta una lectura física actual de cada objeto para volver a acreditar disponibilidad e integridad antes de archivar sus sesiones.

### Sesiones sin titular

Las 81 sesiones con 244 partes no deben archivarse bajo la cuenta del operador hasta que exista evidencia suficiente de titularidad. Las 6 sesiones de otros titulares tampoco se mezclan.

## Reglas de decisión por registro

1. `ARCHIVADO_VERIFICADO`: Volcado y vínculos confirmados, con los componentes que se pudieron archivar leídos de vuelta; excluir de pendientes.
2. `PENDIENTE_BLOQUEO_ACTUAL`: existe contenido o evidencia de persistencia, pero un proveedor, acceso o control impide archivarlo ahora; anotar componente, proveedor y prueba del impedimento.
3. `PENDIENTE_TITULARIDAD`: el contenido no se atribuye a una cuenta por inferencia.
4. `PENDIENTE_INTEGRIDAD`: existe una referencia, pero no se ha verificado el contenido o su integridad actual.
5. `SIN_CONTENIDO_LOCALIZADO`: solo hay señales/metadatos o no se localizó contenido después de agotar fuentes pertinentes; no se crea un Volcado ficticio.
6. `IRRECUPERABLE_EN_ESTE_MOMENTO`: usar solo si el impedimento está demostrado para el momento actual y las fuentes pertinentes se han agotado. No equivale a borrado físico ni a pérdida definitiva.

## Secuencia de ejecución

1. Reconciliar el inventario existente, excluyendo lo ya archivado y deduplicando por vínculos/identidad comprobada.
2. Archivar textos elegibles sin audio con las etiquetas de procedencia y audio indicadas por el operador.
3. Para registros con audio B2, hacer GET/read-back y cotejar bytes, longitud y SHA antes de archivarlos como dictado con audio.
4. Procesar las dos sesiones de audio local bajo la autorización C; conservar los originales.
5. Mantener los objetos Vercel Blob localizados pero bloqueados mientras el store esté suspendido; no declararlos perdidos.
6. No atribuir ni archivar bajo el usuario los registros de otros titulares o sin titular demostrado.
7. Registrar cada Volcado realmente creado, su vínculo, resultado de lectura de vuelta y componentes faltantes. No inventar IDs ni resultados.
8. Cerrar CUSTODIA-01 cuando todos los registros elegibles estén archivados y solo permanezcan casos actualmente bloqueados, sin titularidad o sin contenido, cada uno con evidencia concreta.

## Estado de ejecución de este ciclo documental

- Instrucción y salida literal: preservadas en archivos separados.
- Archivo de registros: no ejecutado en esta actualización.
- Escrituras en Neon Production, B2 o Vercel Blob: ninguna en esta actualización.
- Código, despliegue, credenciales y perfiles locales: sin cambios.
- Compuertas del control generación 11: continúan vigentes hasta su modificación formal y lectura de vuelta.
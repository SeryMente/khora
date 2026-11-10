<!-- EVIDENCE_VERSION=0.1; EVIDENCE_STATUS=PROVISIONAL; NOT_A_CANONICAL_OBJECT=true -->
# Inventario del panel de recuperación de Cora · 2026-11-10

> **Tipo:** preservación documental de un ciclo previo de conversación.
> **Frente propietario:** CUSTODIA.
> **Fuente:** último tramo de conversación aportado por el operador en la solicitud de persistencia.
> **Integridad del alcance:** esta pieza conserva literalmente el prompt de consulta y la salida del modelo. No es una exportación nativa exhaustiva de la conversación.
> **Límite probatorio:** las cifras que siguen son las comunicadas en esa salida previa. Describen un inventario de metadatos; no constituyen una nueva consulta ni certifican GET físico, reproducción, descifrado o integridad actual de los objetos.

---

## 1. Entrada literal del operador

Bueno, ahora vamos a revisar la recuperabilidad de los archivos que están en recuperación. Tu tarea es la siguiente: ver cuántos archivos aparecen en recuperables en el panel de recuperación de Cora, cuáles están en versel blob todavía inaccesibles por los límites ya discutidos y cuáles no.

---

## 2. Salida literal del modelo

Cora · Inventario del panel de recuperación
Consulta de producción completada · Solo lectura
Revisé el catálogo remoto de recuperación en Neon, las referencias de audio y el código que construye el panel. El resultado distingue tarjetas de recuperación, referencias a partes y objetos físicos únicos.

Hallazgo principal: hay archivos históricos de Vercel Blob que continúan referenciados en las sesiones de recuperación. No están perdidos por el hecho de que Blob esté suspendido, pero Cora no puede leerlos mientras siga cerrado el acceso legado.

1. ¿Cuántas capturas aparecen en Recuperar capturas?
El catálogo remoto registra 85 tarjetas, distribuidas entre tres ámbitos de propietario:

Ámbito anonimizado

Tarjetas

Con punto recuperable

Sin punto recuperable

Mayor volumen

79

42

37

Segundo

5

5

0

Tercero

1

1

0

Total

85

48

37

Hay una distinción importante:

48 tarjetas tienen una revisión remota y permiten iniciar la recuperación.

37 tarjetas aparecen en el catálogo, pero carecen de revisión. El botón de recuperación queda deshabilitado.

El panel carga 20 registros por página y permite consultar los anteriores.

No puedo asociar con certeza esos tres ámbitos a tu sesión de usuario sin consultar una sesión autenticada. Tampoco están incluidos los snapshots locales de IndexedDB: el panel combina capturas del servidor y del dispositivo.

2. Archivos de las 48 capturas accionables
Desglose por proveedor

Backblaze B2

1.044
Objetos físicos únicos · 6 sesiones · 85.354.051 bytes registrados

Vercel Blob histórico

12
Objetos físicos únicos · 4 sesiones · 82.358.132 bytes registrados

Hay una duplicación importante que he descontado: las cuatro sesiones que apuntan a Blob tienen 12 objetos físicos compartidos. Neon registra 48 referencias a esos objetos —12 por sesión—, pero no son 48 archivos físicos diferentes.

Las cuatro sesiones corresponden al 20 de octubre de 2026. En cambio, las seis sesiones B2 contienen 1.044 localizadores físicos distintos.

Interpretación: las capturas con B2 no están bloqueadas por la suspensión de Blob. Sin embargo, no ejecuté un GET físico de esos 1.044 objetos durante este inventario; su disponibilidad actual no queda certificada por esta consulta.

3. Las 37 tarjetas que no permiten recuperar
Aquí encontré una anomalía relevante:

Situación

Tarjetas

Partes Blob únicas

Sin revisión, pero con partes de audio registradas

35

206

Sin revisión y sin partes registradas

2

0

Total

37

206

Las 206 partes están marcadas históricamente como verificadas en Neon, pero las 35 sesiones no tienen una revisión de checkpoint que permita ejecutar la recuperación normal.

Además, el código del catálogo calcula un contador audio_count, pero no lo utiliza para construir el campo audioParts: utiliza la información de la snapshot. Por eso, cuando no hay snapshot, la interfaz puede mostrar «Sin audio en este punto guardado» aunque Neon conserve referencias a esos 206 objetos.

Esto es una discrepancia real entre los metadatos de persistencia y lo que comunica el panel.

4. Archivos Blob que ni siquiera aparecen en el panel
Encontré otro grupo:

81
Sesiones sin propietario registrado

Estado: uploading.

Referencias de audio: 244.

Objetos físicos únicos: 244.

219 referencias con verificación pendiente.

25 marcadas históricamente como verificadas.

Fuera del catálogo de recuperación
Estas sesiones quedan excluidas porque la consulta del panel exige que la sesión tenga un propietario que coincida con el usuario autenticado.

No deben confundirse con las 37 tarjetas anteriores: estas 81 sesiones no aparecen en el panel por falta de propietario registrado.

5. Inventario global de referencias
En toda la tabla productiva dictado_audio_parte:

Proveedor

Referencias en Neon

Localizadores físicos únicos

Estado histórico

Vercel Blob

624

564

306 verificadas / 318 pendientes

Backblaze B2

1.311

1.311

1.311 verificadas

En Blob, las diferencias entre referencias y objetos físicos se explican por referencias duplicadas entre sesiones.

Blob: lectura pausada La variable KHORA_LEGACY_BLOB_READS_ENABLED no está configurada en Production. Como el código solo habilita la lectura cuando esa variable vale exactamente true, Cora mantiene cerrada la lectura de objetos Blob.

Por tanto, los 306 registros históricamente verificados no deben interpretarse como objetos actualmente recuperables. Esa verificación corresponde a su estado registrado anteriormente, no a una lectura física actual.

6. Dictamen
La situación queda dividida en cuatro grupos:

B2 accionable: 1.044 objetos únicos en 48 capturas. No dependen de Vercel Blob; falta comprobar su disponibilidad física actual mediante GET.

Blob accionable: 12 objetos únicos referenciados por cuatro sesiones. El acceso está bloqueado por la suspensión y la compuerta de lectura.

Blob visible pero no recuperable desde el panel: 206 objetos únicos distribuidos en 35 sesiones sin revisión.

Blob excluido del panel: 244 objetos únicos distribuidos en 81 sesiones sin propietario.

No se ha declarado ningún objeto perdido ni corrupto. Tampoco he ejecutado lecturas de audio, reasignaciones de propietarios, migraciones, cambios de referencias o borrados.

Fuentes técnicas
El análisis corresponde al main actual de KHORA:

Catálogo y consulta de recuperación

Interfaz Recuperar capturas

Integración de recuperaciones locales y remotas

Siguiente prioridad recomendada: resolver la identidad y recuperabilidad de las 81 sesiones sin propietario y las 35 sesiones con audio Blob pero sin checkpoint. Son los grupos que el mecanismo normal de recuperación no está exponiendo correctamente.

Trazabilidad

IPZ: v0.7 · antigüedad NO VERIFICADA.

DUG: versión y firma NO VERIFICADAS.

CONV: PENDIENTE · NO ASIGNADO.

CICLO: PENDIENTE · NO ASIGNADO.

A / B: PENDIENTES · NO ASIGNADOS.

FOL1: PENDIENTE · NO ASIGNADO.

Fuente de datos: Neon khora, rama main.

Operación: consultas SQL de solo lectura.

Resultado: inventario de metadatos; no prueba de recuperación física.

---

## 3. Nota de continuidad

- Este registro no actualiza el estado de CUSTODIA-B2-006 ni cierra la aceptación E2E autenticada.
- No se modifican referencias históricas, propietarios de sesiones, manifiestos ni objetos.
- La lectura de Vercel Blob y la migración Blob→B2 permanecen diferidas hasta que el servicio vuelva a permitir acceso, se compruebe GET físico y el operador autorice expresamente esa fase.
- El uso de B2 para nuevas escrituras continúa regido por el OCP y la lista vigente de CUSTODIA; esta pieza no los sustituye.

**Referencia operativa:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md) · [LISTA-TAREAS-PROVISIONAL.md](../LISTA-TAREAS-PROVISIONAL.md).

<!-- TASK_STATUS=PROVISIONAL; PARENT_TASK=CUSTODIA-04; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true; DIAGNOSTIC_STATUS=STATICALLY_VERIFIED; ROOT_CAUSE_OF_REPORTED_SESSION=UNDETERMINED; PRODUCT_FIX=IMPLEMENTED_IN_ISOLATED_BRANCH; VALIDATION=BLOCKED_NO_RUNNER -->
# CUSTODIA-04 · Incidente de archivado Dictado → Custodia

**Estado:** `en_curso` · expediente provisional de la tarea existente CUSTODIA-04.  
**Tipo:** expediente de incidente, corrección y aceptación E2E; subordinado al OCP Custodia.  
**Identificador:** CUSTODIA-04, ya existente. Este expediente no crea otro identificador de tarea, no crea CUSTODIA-05 y no altera la numeración histórica.  
**Alcance:** desde la entrada a la pantalla Dictado y el inicio explícito de captura hasta el clic en «Archivar registro»; desde ese clic, la comprobación del manifiesto, el archivado y el recibo durable de Custodia.  
**Estado de garantía:** NO CERTIFICADA. El defecto de coordinación y la solución propuesta están documentados; la corrección está implementada en la rama aislada de PR #354. La causa runtime de la captura original y la validación automatizada/física siguen pendientes.

## 1. Instrucción y procedencia

**Instrucción directa del operador, 2026-11-06 (America/Mexico_City):**

> «encargate de manera longitudinal del defecto. Y coriggelo.»

Instrucción complementaria del mismo ciclo:

> «documenta cuidadosamente una forma de tarea provisional, como las que tiene custodia para sus propios asuntos en este frente de trabajo, antes de continuar a resolver lo más rápido posible lo que toca. Ahí incluye tu diagnóstico, tu verificación del diagnóstico, tu solución y todo lo que tiene que ver con este incidente.»

Estas instrucciones autorizan conducir el incidente longitudinalmente y preparar/corregir el producto en una rama aislada y entornos no productivos. No autorizan por sí solas merge, publicación, despliegue, cambios de configuración productiva, credenciales, datos personales, SQL de producción ni operaciones destructivas. Cualquier actuación productiva requiere su compuerta específica.

La tarea conserva la prioridad formal vigente de Custodia: CUSTODIA-03 continúa siendo la prioridad de rescate de capturas ausentes/presuntamente perdidas. Este expediente de CUSTODIA-04 se trabaja en rama aislada y sin intervenir esas fuentes; no declara terminado, pospuesto ni resuelto el rescate.

## 2. Enunciado del incidente

El operador informó que se trataba de una **captura nueva**, no de una sesión recuperada: inició el dictado, detuvo la captura, obtuvo la transcripción y, al pulsar «Archivar registro», recibió el bloqueo.

**Mensaje comunicado literalmente por el operador:**

> «No se puede archivar el registro. Cora no ha verificado la custodia íntegra de todas las partes de audio».

El literal leído en el código de producción inspeccionado utiliza «Khora», no «Cora». Se conserva aquí la cita del operador como cita suya; no se afirma que ambas cadenas sean iguales.

**Resultado observado por el usuario:** texto transcrito disponible, captura detenida, archivado rechazado. No se ha obtenido la traza de red ni el identificador técnico de esa sesión.

**No confundir:** la transcripción del navegador y la custodia del audio son confirmaciones distintas. Que exista texto no demuestra que todas las partes WebM hayan sido almacenadas, releídas, cotejadas y vinculadas con la sesión.

## 3. Línea base técnica y procedencia del código

- Repositorio: `SeryMente/khora`.
- Rama base observada: `main`, commit `d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2`.
- Producción observada: deployment `dpl_6Ndatsufuk5iLFzvbzHpwNQCh6HB`, estado `READY`, commit publicado `953e69484eabb4e8dc8221d1d8fc188373531bfa`, alias `khora-web.vercel.app`.
- La comparación Git entre el commit productivo y la punta de `main` observada devolvió 120 commits de adelanto en `main`. Para los archivos centrales del flujo inspeccionado, los blobs coinciden entre el despliegue y `main`; por tanto, el defecto de coordinación leído no se explica por haber inspeccionado únicamente un cambio local posterior.
- La rama de corrección de este expediente parte del commit `d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2`: `fix/custodia-04-dictado-archivar-e2e-20261106`.

Archivos y blobs inspeccionados:

| Componente | Archivo | Blob SHA |
|---|---|---|
| Orquestación de captura, detención y archivo | `khora-web/app/components/ingreso/IngresoWorkspace.tsx` | `d42f819c2867a678d0d45e309db8f58cad80dc0d` |
| Reintento HTTP de una parte | `khora-web/lib/client/subir-audio-custodia.ts` | `ed456b00d1d3e1e5aa5392307e6e87fe16ab12db` |
| Validación de manifiesto | `khora-web/lib/audio/custodia.ts` | `1628a5841d26941546b58a4d62ef93d0d5e99266` |
| Endpoint de almacenamiento y verificación | `khora-web/app/api/audio/route.ts` | `0711b9e720d3b3df50f3101f5e684adc78095cc9` |
| Registro transaccional y archivo de dictado | `khora-web/lib/server/dictado.ts` | `911fc6ab6e1ba3d09753ce5554b64294ead64863` |
| Contrato E2E existente | `khora-web/e2e/contracts/audio-por-partes.spec.ts` | `af491e478a5f21d3614748006676db401241d58a` |

## 4. Diagnóstico verificado

### 4.1 Defecto de coordinación confirmado

1. `subirParteActual()` congela los chunks del `MediaRecorder`, crea una parte numerada y la conserva en memoria. Intenta conservar también una copia local antes de enviarla.
2. `subirAudioCustodiado()` ejecuta hasta tres intentos HTTP. Exige respuesta satisfactoria, `verificado === true`, SHA-256 válido y bytes iguales al Blob. Los 4xx definitivos (salvo 408/429) dejan de reintentarse; otros fallos aplican espera incremental.
3. Si la subida sigue fallando, el `catch` de `ejecutarSubida` registra la función en `pendingUploadsRef`, actualiza el contador y muestra detalle técnico. **La excepción se absorbe**: la promesa de la subida se resuelve para quien la esperaba, aunque la parte continúe pendiente.
4. `detener()` espera la finalización del grabador y la promesa de subida, pero esa espera no equivale a una confirmación remota cuando el error ya fue capturado internamente. Por ello el flujo puede continuar con la transcripción aunque haya partes pendientes.
5. Existe `reintentarCustodia()`, conectada a la acción explícita «Reintentar sincronización». Recorre las funciones pendientes y guarda checkpoint.
6. **`guardar()` no invoca ese reintento.** Espera, como máximo, la subida actualmente referenciada; después calcula el número esperado de partes y evalúa el manifiesto local.
7. Si la integridad no se acredita, `guardar()` muestra el bloqueo y retorna antes de enviar `POST /api/dictado`.

**Conclusión demostrada:** el código permite que texto/transcripción continúe después de un fallo de subida absorbido y el camino de archivado no drena la cola de reintentos antes de validar. Esto es un defecto real de coordinación del flujo E2E. El bloqueo de integridad evita archivar audio incompleto; no debe eliminarse ni saltarse.

### 4.2 Salvaguardas de Custodia observadas

- `/api/audio` autentica la solicitud, calcula SHA-256 del original, cifra, escribe en Vercel Blob, relee el objeto, descifra y compara bytes y SHA-256. Solo después intenta registrar la parte vinculada a la sesión.
- Si falla la lectura posterior devuelve un error no verificable; si falla el vínculo a la sesión después de almacenar/verificar el objeto, devuelve un error de vinculación y conserva el localizador recuperable.
- `registrarParteAudio` impide sustituir silenciosamente una parte por otro contenido: un reintento del mismo índice solo puede actualizar su localizador si bytes, SHA y fuente son compatibles.
- `guardarDictado()` vuelve a cotejar el manifiesto recibido con las partes persistidas y valida cantidad, índices, bytes, hash y estado. El servidor mantiene la autoridad final; no se debe confiar solo en el estado del navegador.
- `evaluarCustodiaAudio()` valida metadatos del manifiesto; no realiza por sí solo una nueva lectura física del Blob durante el archivado. La disponibilidad física posterior sigue siendo un criterio distinto (F-13/R-09).

**Conclusión:** no se ha demostrado un defecto dentro del validador o de la transacción de archivo de Custodia. Sus salvaguardas observadas son necesarias y deben conservarse. El defecto ya demostrado está en la coordinación del cliente; cualquier modificación adicional de Custodia requerirá evidencia que la justifique.

### 4.3 Verificación reproducible existente

La prueba `no-JSON audio failure blocks archive and preserves captured text` del archivo `audio-por-partes.spec.ts`:

- simula `/api/audio` con HTTP 502 y cuerpo no JSON;
- simula reconocimiento de voz que entrega texto final;
- detiene la captura y pulsa archivar;
- comprueba que `/api/dictado` no fue llamado y que la interfaz muestra el bloqueo de custodia.

Esto confirma que el conjunto de pruebas contiene una reproducción del mecanismo compatible con el síntoma. **No se afirma que esta prueba se haya ejecutado en este ciclo**, ni que reproduzca la sesión real del operador: sus respuestas de red son simuladas.

### 4.4 Observabilidad y límites forenses

- La consulta de errores agregados de Vercel para `/api/audio` y `/api/dictado`, ventana de siete días, no devolvió grupos de errores.
- Una consulta de runtime logs para la ruta de audio en ventana reciente tampoco devolvió entradas.
- Esto **no descarta** respuestas HTTP fallidas que la aplicación captura y convierte en estados controlados.
- No se ha consultado la base de datos productiva, el objeto Blob de la captura, el catálogo de sesiones del usuario ni el estado de sus checkpoints/IndexedDB.
- No se dispone de request ID, sesión técnica verificada, índice de parte fallida, status HTTP real ni reason code de esa captura.

**Dictamen forense:** causa exacta del fallo de la captura reportada = **NO DETERMINADA**. Causa funcional del bloqueo compatible con el código = falta de una o más partes verificadas. Defecto de coordinación que puede dejar esa condición sin intentar resolver antes de archivar = **CONFIRMADO ESTÁTICAMENTE**.

## 5. Hipótesis que siguen abiertas

| Hipótesis | Evidencia necesaria | Estado |
|---|---|---|
| Fallo de red/timeout en la subida | Respuesta HTTP y reason code de la parte | ABIERTA |
| Relectura del objeto Blob falla o devuelve bytes distintos | Resultado del endpoint, bytes/SHA recalculados en entorno autorizado | ABIERTA |
| Blob se escribe, pero el vínculo DB falla | Código de respuesta de vínculo y registro de sesión | ABIERTA |
| Parte local no se conservó | Recibo local IndexedDB de esa parte, solo metadatos | ABIERTA |
| Hay índices esperados que no aparecen en el manifiesto | Conteo e índices de sesión/partes, sin abrir audio | ABIERTA |
| Captura se cerró sin último chunk/ACK completo | Eventos de detención, conteo final y cierre de MediaRecorder | ABIERTA |

No elegir una de estas causas por inferencia. No incorporar texto, audio, URL firmadas, credenciales, correo ni identificadores personales a este expediente.

## 6. Solución técnica prevista

### 6.1 Barrera única de finalización y reconciliación

Crear o consolidar una rutina idempotente y de ejecución única (*single-flight*) que, antes de preparar el manifiesto de archivo:

1. confirme que la captura está detenida y que el grabador entregó todos los eventos `dataavailable` finales;
2. espere la finalización de las operaciones de subida ya en curso;
3. drene de forma secuencial la cola de partes pendientes, reutilizando el mismo `sessionId`, número de parte y bytes originales;
4. actualice los recibos locales únicamente después de una confirmación remota verificada;
5. compruebe que no quedan partes pendientes y que todos los índices esperados son únicos, consecutivos y verificables;
6. compare, mediante el contrato existente, la evidencia local con el manifiesto que Custodia tiene persistido;
7. habilite `POST /api/dictado` solo cuando todas las guardas se satisfagan.

El archivado no debe depender de que el operador recuerde pulsar antes un botón secundario de sincronización.

### 6.2 Fallo persistente: bloqueo seguro y diagnóstico accionable

Si después de los reintentos una parte sigue pendiente o hay una discrepancia:

- no enviar el archivado;
- no marcar la parte como verificada ni degradar la exigencia del servidor;
- conservar el texto y las copias locales originales;
- exponer la parte/índice, número pendiente, último status HTTP y reason code disponible, sin filtrar contenido privado ni SHA completo;
- ofrecer una única acción principal para reintentar y archivar;
- distinguir cero partes generadas, cierre/ACK ausente, subida pendiente, fallo de lectura/verificación, error de vinculación y discrepancia de manifiesto.

Una respuesta perdida seguida de reintento no debe duplicar el registro ni permitir sobrescribir otra parte. Se conserva la idempotencia existente por sesión/índice/firma del contenido.

### 6.3 Recibo y conservación

La copia local de audio/checkpoint no debe eliminarse ni invalidarse al recibir solo una respuesta parcial. La limpieza/sellado local debe esperar el recibo durable de archivo de Custodia. El texto confirmado debe seguir disponible incluso ante un fallo permanente de audio.

### 6.4 Custodia: cambios condicionados por evidencia

No modificar la compuerta de seguridad para «hacer que archive». No rebajar verificación, no inventar manifiestos ni aceptar metadatos del cliente como prueba autoritativa. Si las pruebas muestran un defecto real en lectura Blob, idempotencia, registro de parte, transacción o recibo, corregir ese componente de forma puntual y documentar su evidencia en este mismo expediente, manteniendo la separación de responsabilidades.

## 7. Plan de trabajo y pruebas de regresión

| Fase | Trabajo | Evidencia de salida |
|---|---|---|
| 0 · Protección | Preservar rama base, identificadores de sesión y originales; reproducir el escenario con datos sintéticos | Fixture reproducible, sin datos de usuario |
| 1 · Corrección cliente | Barrera de finalización, reintentos pendientes automáticos, single-flight, estados y mensajes por causa | Diff revisado y pruebas unitarias |
| 2 · Contrato E2E | Fallo transitorio → retry satisfactorio → archivo exitoso; fallo permanente → bloqueo seguro y texto preservado | Playwright con aserciones de llamadas, partes, manifiesto y recibo |
| 3 · Regresión | Una/múltiples partes, fin de captura, timeout, 4xx permanente, 408/429, respuesta no JSON, ACK tardío, doble clic, índice faltante/duplicado, recarga | Suite unitaria, integración y navegador |
| 4 · Custodia no productiva | Usar proveedor real autorizado en un entorno no productivo, leer de vuelta, descifrar y recalcular bytes/SHA; comprobar vínculo DB y reintento | Evidencia saneada de proveedor y DB aislados |
| 5 · Aceptación | Revisión funcional de extremo a extremo y cotejo de límites | Aceptación humana y lista de brechas |

Comandos base disponibles en `khora-web` (sujeto a los requisitos del entorno):

- `npm run typecheck`
- `npm run test:unit`
- `npx playwright test e2e/contracts/audio-por-partes.spec.ts`
- `npm run ui:contract`
- `npm run ui-review:check`
- `npm run build` (después de los controles previos definidos por el proyecto).

No se declarará una suite aprobada sin ejecutar el comando y conservar salida, código de retorno y commit exacto. Los mocks y el build local no certifican por sí mismos Vercel Blob, Neon ni el micrófono físico.

## 8. Criterios de aceptación y cierre

El expediente solo podrá cerrarse cuando:

1. Una captura nueva genera partes de audio numeradas, conserva copia local y espera el cierre real del grabador.
2. Con una primera respuesta transitoria fallida y posterior respuesta satisfactoria, el sistema reintenta automáticamente al archivar, obtiene confirmación real de cada parte y termina el archivo una sola vez.
3. Con un fallo permanente, el sistema conserva texto/audio disponible, muestra el motivo y mantiene el archivado bloqueado.
4. No se pierde el último chunk ni se confunde la finalización de transcripción con la custodia del audio.
5. No hay pendientes, índices duplicados/huecos, hashes ausentes/incorrectos ni discrepancia entre el manifiesto cliente y el servidor.
6. Custodia valida el dueño, sesión, bytes, SHA, referencias, verificación y estado transaccional; no se evade la validación del servidor.
7. Un timeout o ACK perdido seguido de reintento no crea duplicados ni sobrescribe contenido distinto.
8. La copia local permanece hasta que existe recibo durable; después de una recarga autorizada se conserva la recuperación de lo no archivado.
9. Los controles de tipo, unitarios, integración, UI y E2E ejecutados en el commit candidato pasan; cada limitación queda explícita.
10. La prueba no productiva verifica el objeto físico real del proveedor y su lectura de vuelta. Una respuesta simulada no cumple este criterio.
11. El operador puede completar el recorrido desde Dictado hasta el recibo final de Custodia con una acción clara y sin pasos manuales secundarios inesperados.

**No es criterio de aceptación:** quitar el mensaje, forzar el botón, ignorar partes faltantes, archivar solo el texto de una captura que exige audio o declarar que el problema está resuelto porque compila.

## 9. Límites operativos y de seguridad

- Trabajo autorizado ahora: diagnóstico, cambios de código y pruebas en la rama indicada y entornos aislados/no productivos.
- No autorizado por esta instrucción: merge a `main`, despliegue/promoción de producción, cambios de secretos/credenciales, configuración de bucket productivo, SQL/backfill productivo, lectura de audio/texto personal, eliminación/sobrescritura de originales o recuperación destructiva.
- No cambiar ni transferir el control de responsabilidad de Dictado o Custodia mediante este expediente. La tarea hereda gobierno y autorización del OCP padre; no crea un titular independiente.
- No introducir telemetría con texto dictado, audio, tokens, URL Blob firmadas, identificadores personales ni SHA completo.
- CUSTODIA-03 conserva prioridad formal de rescate. Este trabajo en rama no declara rescatada ninguna sesión ausente ni desplaza esa tarea.
- La expresión «vida o muerte» del operador se registra como énfasis de urgencia; no es evidencia de que Khora sea un dispositivo de soporte vital ni sustituye la actuación ante una emergencia humana real.

## 10. Fuentes y enlaces verificables

- [Código de captura y archivado en la base actual](https://github.com/SeryMente/khora/blob/d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2/khora-web/app/components/ingreso/IngresoWorkspace.tsx).
- [Cliente de subida de audio](https://github.com/SeryMente/khora/blob/d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2/khora-web/lib/client/subir-audio-custodia.ts).
- [Verificador de integridad de partes](https://github.com/SeryMente/khora/blob/d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2/khora-web/lib/audio/custodia.ts).
- [Endpoint /api/audio](https://github.com/SeryMente/khora/blob/d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2/khora-web/app/api/audio/route.ts).
- [Registro y archivo transaccional](https://github.com/SeryMente/khora/blob/d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2/khora-web/lib/server/dictado.ts).
- [Prueba de contrato de audio por partes](https://github.com/SeryMente/khora/blob/d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2/khora-web/e2e/contracts/audio-por-partes.spec.ts).
- [Contrato transversal de Custodia continua de dictados](https://github.com/SeryMente/khora/blob/d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2/khora-web/docs/CUSTODIA-DICTADOS.md).
- [OCP Custodia](../../OBJETO-CANONICO.md), [control de responsabilidad](../../CONTROL-RESPONSABILIDAD.json), [lista provisional](../../LISTA-TAREAS-PROVISIONAL.md) e [instrucción de prioridad de rescate](../../originales/INSTRUCCION-REORDENAMIENTO-PRIORIDAD-RECUPERACION-20261106.md).

## 11. Estado de ejecución de este expediente

**Al momento de crear esta ficha:**

- Diagnóstico estático de la cola de pendientes y del camino de archivado: **VERIFICADO**.
- Reproducción compatible en prueba E2E existente: **VERIFICADA POR INSPECCIÓN DE LA PRUEBA; NO EJECUTADA EN ESTE CICLO**.
- Causa runtime de la captura concreta: **NO DETERMINADA**.
- Corrección de producto: **PENDIENTE; no se ha modificado código todavía**.
- Nuevas pruebas de retry-success y fallo permanente: **PENDIENTES**.
- Proveedor real no productivo y lectura de vuelta: **PENDIENTES**.
- Merge/despliegue/producción: **NO AUTORIZADOS**.
- Aceptación del operador: **PENDIENTE**.

**Rama de trabajo:** `fix/custodia-04-dictado-archivar-e2e-20261106`.  
**Commit base:** `d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2`.  
**OCP padre Custodia observado:** CUSTODIA-v0.16 · generación 7.  
**OCP relacionado Dictado observado:** DICTADO-v0.6.19 · generación 5.  
**FOL1:** PREPARADA, NO ACTIVA; folios PENDIENTE/NO ASIGNADO.

---

## Registro de cambios

- **2026-11-06 · Alta de expediente CUSTODIA-04 / Incidente de archivado Dictado→Custodia:** se estructura el diagnóstico, las verificaciones, límites forenses, solución y criterios E2E a partir del commit productivo `953e694...` y de `main` `d4f29f7...`. No se modifica código en esta operación documental. El defecto cliente de reintento omitido queda confirmado estáticamente; la causa runtime de la captura del operador sigue abierta.


## 12. Actualización de ejecución · 2026-11-06 · implementación en rama

Esta sección actualiza el estado de ejecución de §11. §11 conserva deliberadamente la fotografía histórica del instante en que se creó el expediente; no debe interpretarse como estado actual.

### 12.1 Corrección implementada en la rama aislada

**Rama:** `fix/custodia-04-dictado-archivar-e2e-20261106`  
**Base:** `d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2`  
**Head observado de PR #354:** `81c6c67c3c72cefe94c2f03c6ad05c9f5e6adfcb`  
**PR:** [#354 · fix(dictado): reintentar custodia de audio antes de archivar](https://github.com/SeryMente/khora/pull/354) · OPEN · DRAFT · NOT MERGED.

Cambios actuales leídos de vuelta:

| Archivo | Blob SHA actual |
|---|---|
| `khora-web/app/components/ingreso/IngresoWorkspace.tsx` | `1b36f7fb9bca46f66686cd9a72964b84e12c938e` |
| `khora-web/app/components/shared/IngresoView.tsx` | `7170dca2e7efa7506f00cb9fa6d8cf4467821db1` |
| `khora-web/e2e/contracts/audio-por-partes.spec.ts` | `8470889c17bb8cb334501c4913a3a4dce0be8946` |

La corrección del cliente ahora:

1. Serializa los drenajes de reintento mediante una promesa *single-flight* para evitar dos recorridos concurrentes de la misma cola.
2. Rechaza iniciar el drenaje mientras la captura siga activa o finalizando.
3. Espera la subida que ya estaba en curso y recorre las partes pendientes en orden de índice, reutilizando el cierre de subida existente y sus mismas identidades/contenidos.
4. Al pulsar «Archivar registro», guarda checkpoint, espera la subida actual y drena automáticamente los reintentos antes de validar el manifiesto y llamar a `/api/dictado`.
5. Si una parte continúa pendiente, no invoca el endpoint de archivo; conserva texto y copia local, mantiene el bloqueo de integridad y muestra los índices pendientes.
6. Alinea el diagnóstico del manifiesto con el evaluador común para detallar si faltan partes, hay índices inválidos o no se cumple bytes/SHA/estado verificado.
7. Ofrece «Reintentar y archivar» como acción visible directamente cuando el contador de partes pendientes es mayor que cero. La acción solo continúa al archivo si el reintento obtiene confirmación; no se ofrece para errores de manifiesto sin elementos pendientes en la cola.

La compuerta de Custodia en servidor no se eliminó, relajó ni sustituyó. No se modificó el endpoint productivo, el esquema DB, el proveedor, credenciales ni configuración de producción.

### 12.2 Regresión añadida

En `audio-por-partes.spec.ts` se añadió el caso `archive retries transient audio failures before sending the verified manifest`:

- simula que las tres tentativas iniciales responden 503;
- confirma que al detener queda una parte pendiente y aún no se llama a `/api/dictado`;
- al pulsar «Archivar registro», la cuarta petición de audio se confirma con bytes y SHA calculados sobre el Blob de la prueba;
- exige una sola llamada de archivo y que el manifiesto enviado contenga una parte con `verificado:true` y SHA-256 válido.

El caso permanente 502 se conserva y ahora comprueba que el texto sigue en el editor, que aparece la acción «Reintentar y archivar» y que, al reiterar el fallo permanente, el endpoint de archivo sigue sin ser llamado y el texto continúa disponible.

Estas pruebas son contratos de navegador con proveedor simulado. No demuestran almacenamiento físico, disponibilidad actual del Blob ni integración productiva.

### 12.3 Estado real de validación automatizada

Se abrió PR #354 como **borrador** para activar los workflows de CI, UI Quality y `khora-ok / gate`, sin habilitar el auto-merge ni el despliegue de producción.

GitHub Actions inició ejecuciones para las puntas de los commits `863da9d0e03b5ad95ec3caef7053f7ad062777bd`, `87d8cc3f11624039ce7488e3d72948ecb21148fd` y `bfcf6c17f40d538f7f851beaaa7a363974c67ccf`. En las consultas de detalle a cada job, GitHub devolvió:

- `runner_id = 0`;
- `runner_name = ""`;
- `steps = []`;
- conclusión `failure` en aproximadamente 2–3 segundos.

Se reintentaron los jobs fallidos de las primeras ejecuciones; la siguiente ejecución volvió a terminar sin asignar runner ni ejecutar pasos. Por tanto, **no existe evidencia de que typecheck, unitarias, UI contract, build o Playwright se hayan ejecutado**. El estado no debe interpretarse como fallo de aserciones de producto ni como aprobación de código.

Los checks Vercel heredados para commits de PR devolvieron failure con destino de actualización del plan `github-private-org-to-hobby`; no son resultados de build/E2E. No se generó deployment Preview ni Production por esta PR.

En la punta final documentada `56a7f713168c36d0780a590b572ac9e17c622097`, GitHub volvió a crear las tres ejecuciones `CI` (`42301830097`), `UI Quality` (`42301830081`) y `khora-ok / gate` (`42301830015`). A las `2026-11-06T22:04:31Z`, los seis jobs asociados reportaron `runner_id=0`, `runner_name=""`, `steps=[]` y conclusión `failure`. Se confirma por tanto que tampoco esta punta ejecutó los controles; no se infiere fallo de código ni aprobación.

### 12.5 · Concurrencia entre «Reintentar y archivar» y «Archivar registro»

La revisión de la punta posterior detectó una carrera posible: la acción secundaria podía iniciar el drenaje de reintentos y, antes de terminar, otro evento de archivo podía continuar por el camino principal. El drenaje de partes ya era *single-flight*, pero eso no garantizaba que la operación completa de archivado fuera única.

**Corrección añadida:**
- `archiveInFlightRef` protege la operación completa de archivo, de forma síncrona antes del primer `await`; una segunda activación retorna sin abrir otro POST.
- «Reintentar y archivar» reutiliza directamente `guardar()`, que ya realiza el drenaje automático. Se elimina la secuencia separada «reintentar y luego llamar a guardar», origen de la ventana de carrera.
- La liberación de la guarda queda en `finally`, incluso cuando hay fallo persistente o error de preparación.
- La prueba de éxito ahora dispara dos activaciones inmediatas de «Reintentar y archivar» y exige una sola llamada a `/api/dictado` y un único manifiesto verificado.

**Persistencia de esta corrección:** `6c124ed227782af1a6be90c31fce87ac9416aad3` (código) y `46a36cd856bd4d43f75ab5ee27ad80cf15485c15` (regresión). Lectura de vuelta de ambos archivos confirmada. Los cambios están en la rama aislada; no se afirma que la prueba se haya ejecutado.

### 12.4 Estado actualizado

| Elemento | Estado |
|---|---|
| Expediente provisional documentado y enlazado | VERIFICADO EN RAMA |
| Defecto cliente de reintento omitido | CONFIRMADO ESTÁTICAMENTE |
| Corrección del flujo de archivado | IMPLEMENTADA EN RAMA AISLADA |
| Acción visible «Reintentar y archivar» | IMPLEMENTADA EN RAMA AISLADA |
| Exclusión mutua del archivado completo entre acciones concurrentes | IMPLEMENTADA EN RAMA AISLADA |
| Regresión de doble activación inmediata | AÑADIDA; NO EJECUTADA |
| Prueba retry-transitorio→éxito | AÑADIDA; NO EJECUTADA |
| Prueba fallo permanente y no-bypass | AMPLIADA; NO EJECUTADA |
| Typecheck, unitarias, UI contract y build | PENDIENTES DE EJECUCIÓN |
| Suite Playwright | PENDIENTE DE EJECUCIÓN |
| Proveedor real no productivo y read-back físico | PENDIENTES |
| Causa runtime de la captura original | NO DETERMINADA |
| Verificación de esta captura real del operador | NO REALIZADA |
| PR #354 | OPEN · DRAFT · NOT MERGED |
| Main / Production | SIN CAMBIOS EN ESTE CICLO |
| Aceptación del operador | PENDIENTE |

**Bloqueo de validación:** los runners de GitHub Actions no se están asignando (jobs con runner 0 y cero pasos). No se usó una estación de trabajo remota distinta sin confirmar que fuera el entorno autorizado. Para completar la verificación hace falta una ejecución real de los controles desde un runner disponible o el checkout local autorizado. La implementación no se declara aceptada ni lista para desplegar hasta obtener esa evidencia.

**Siguiente secuencia:** desbloquear un runner; ejecutar typecheck, unitarias, UI contracts, build y la prueba Playwright focalizada; corregir cualquier fallo real; ejecutar una prueba con proveedor autorizado no productivo y lectura física de vuelta; reconciliar el recibo con el manifiesto del servidor. Mantener PR en borrador mientras cualquiera de esas compuertas falle o permanezca sin evidencia. La punta final de la rama tras el expediente y la actualización de la descripción de PR #354 es `56a7f713168c36d0780a590b572ac9e17c622097`; el último `main` observado es `aa11ece612866378296c34a3f9305071d58ad175`. La PR conserva `base_sha=d4f29f7044b80b30e01e00bf2ae2fc5f0207f0c2` y GitHub la reporta mergeable, pero permanece borrador y no se integró.

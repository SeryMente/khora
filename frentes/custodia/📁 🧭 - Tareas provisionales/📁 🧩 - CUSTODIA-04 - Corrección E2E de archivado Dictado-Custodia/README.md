<!-- TASK_STATUS=PROVISIONAL; PARENT_TASK=CUSTODIA-04; PARENT_OCP=CUSTODIA; NO_INDEPENDENT_CONTROL=true; DIAGNOSTIC_STATUS=STATICALLY_VERIFIED; ROOT_CAUSE_OF_REPORTED_SESSION=UNDETERMINED; SESSION_ORIGIN=UNDETERMINED; PRODUCT_FIX=IMPLEMENTED_IN_ISOLATED_BRANCH; VALIDATION=LOCAL_E2E_3_OF_3_TYPECHECK_PASS_UNIT_572_OF_572_UI_CONTRACT_PASS_UI_REVIEW_PASS -->
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

La transcripción fuente no contiene una confirmación expresa de si la sesión problemática era una captura nueva o una sesión recuperada: el asistente formuló esa pregunta, pero no consta respuesta del operador. El origen de la sesión queda **NO DETERMINADO**. Se corrige aquí una afirmación anterior del expediente que la clasificaba como captura nueva sin sustento literal.

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

### 12.6 · Sincronización final de rama y última validación de CI

- `main` avanzó con cambios documentales de Dictado sobre control, OCP y manifiesto. Se revisó la comparación por archivo antes de sincronizar; no hay rutas compartidas con los seis archivos de corrección.
- Se integró a la rama aislada `main` hasta `0aa7497a6316772ccf846620685a87b0711e346c` con commit de dos padres `7553847edac736e7346771340dc6be109a98d48d`. `main` no fue modificado por esta operación.
- Comparación verificada después de la sincronización: `ahead 23 / behind 0`; PR #354 `mergeable=true`, `draft=true`, `merged=false`.
- Último workflow `CI` en la punta sincronizada: run `42302390805`; jobs `calidad`, `api-tests` y `khora-web-gate` finalizaron en failure con `runner_id=0`, `runner_name=""`, `steps=[]` entre `2026-11-06T22:08:41Z` y `22:08:44Z`. No ejecutaron controles.
- Los checks Vercel/Netlify siguen siendo rechazos de Preview por la restricción del plan para repositorio privado de organización; no se interpretan como pruebas del producto.
- No se generó deployment ni se modificó `main` o Production. Typecheck, unitarias, UI contracts, Playwright, build, proveedor no productivo/read-back físico y aceptación permanecen pendientes.

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

**Siguiente secuencia:** desbloquear un runner; ejecutar typecheck, unitarias, UI contracts, build y la prueba Playwright focalizada; corregir cualquier fallo real; ejecutar una prueba con proveedor autorizado no productivo y lectura física de vuelta; reconciliar el recibo con el manifiesto del servidor. Mantener PR en borrador mientras cualquiera de esas compuertas falle o permanezca sin evidencia. La punta de la rama después de la última sincronización es `7553847edac736e7346771340dc6be109a98d48d`; se incorporó `main` hasta `0aa7497a6316772ccf846620685a87b0711e346c` mediante merge commit de dos padres, sin cambiar `main`. La comparación contra ese `main` quedó `ahead 23 / behind 0`, merge base `0aa7497a6316772ccf846620685a87b0711e346c`; PR #354 conserva `base_sha=0aa7497a6316772ccf846620685a87b0711e346c`, `mergeable=true`, `draft=true`, `merged=false`. El árbol de la rama contiene de vuelta los blobs actuales de `CONTROL-RESPONSABILIDAD.json` (`8fa5721013b47b88729b38869c712863bc6a69d7`), `OBJETO-CANONICO.md` (`a1d83ccb7fd2b222af4b8f2d7754351467436219`), `MANIFIESTO-CUSTODIA.json` (`e7a7c0a2c75b0583032173db722e46ce0c08e0bb`) y el original exportado (blob `a022d13920cb80280dd3c5bb89475348f8c908b7`).


### 12.7 Validación local por RDC · 2026-11-06

**Entorno y preservación.** Se utilizó la conexión RDC local `PC10RCIF4EI4` y una copia temporal aislada en `%TEMP%\khora-custodia-04-verification-20261106`, obtenida desde `refs/pull/354/head` (`5728d0062f0925d4987fae4f2f491061c21120f8`). El clon preexistente `C:\Users\MantenimientoRCI\Desktop\Khora` permaneció intacto: estaba en `main`, 606 commits detrás y contenía cinco cambios locales ajenos sin confirmar. La copia temporal no usó credenciales, datos ni proveedores productivos. `npm ci --no-audit --no-fund` terminó con código 0 e instaló 683 paquetes.

**Defecto adicional detectado y corregido durante la validación.** El primer `npm run typecheck` detectó `TS18048` en `IngresoView.tsx`: `audioPendiente` es opcional y se comparaba directamente con `0`. Se corrigió con `(v.audioPendiente ?? 0) > 0`, sin modificar ni relajar la compuerta de custodia. El segundo defecto era temporal del contrato de prueba: el estado pendiente se muestra antes de que finalice la política de tres intentos con backoff; la aserción leía el contador anticipadamente. Se sustituyó por `expect.poll(...).toBe(3)` con timeout acotado. No se cambió la política de subida.

**Resultados ejecutados sobre el árbol de la PR más estos dos ajustes locales:**

| Control | Resultado | Evidencia |
|---|---|---|
| `npm ci --no-audit --no-fund` | APROBADO | exit code 0; 683 paquetes |
| `npm run typecheck` | APROBADO | exit code 0 después del ajuste opcional |
| `npm run ui:contract` | APROBADO | exit code 0; contrato de navegación íntegro |
| `npx playwright test --config=playwright.audio-custodia.local.config.ts` | APROBADO | 3/3 escenarios; exit code 0; 40.6 s |
| `npm run build --ignore-scripts` | APROBADO CON ADVERTENCIAS | exit code 0; webpack, TypeScript interno, 78/78 páginas y trazas completadas |
| `npm run test:unit` | PARCIAL | 571/572 aprobadas; una falla CUSTODY-12 descrita abajo |

**E2E aprobado.** Los tres escenarios ejecutados son: (1) subida multipart, errores y límites; (2) tres respuestas 503, cuarto intento satisfactorio, manifiesto con SHA-256 verificado y exactamente una llamada de archivo ante doble activación; (3) respuesta 502 no-JSON que conserva el texto y mantiene cerrado `/api/dictado`. La configuración temporal Playwright utilizó servidor Next local, Chromium disponible y variables/datos sintéticos; no se incorporó al commit. La primera ejecución falló solo por lectura prematura del contador; tras sincronizar la expectativa con `expect.poll`, los tres escenarios pasaron.

**Falla unitaria heredada, no atribuible a esta corrección.** `tests/unit/custody-regression.test.ts`, caso CUSTODY-12, exige el literal `parts[0].fuente_audio !== "audio_archivo"`; la ruta actual añade una condición legítima de compatibilidad `&& parts[0].driver !== "audio_archivo"`. Se cotejaron los blobs de ambos archivos entre la rama de la PR y `main`: son idénticos (`test a32e54fc3dec836f8a6a6bdd75d2549f9b6c9fef`; ruta `8f4172e23d6928b02994a0f6d5c8636a9dfb6223`). La falla está presente en la misma línea base `main`; no se alteró el test ni la ruta ajena al incidente. Resultado global unitario: 571 pass, 1 fail, 0 skipped.

**Build y advertencias.** El build se ejecutó explícitamente con `--ignore-scripts` para separar la compilación Next del hook `prebuild`, cuyo `test:unit` de línea base contiene la falla CUSTODY-12 descrita. `next build --webpack` finalizó con código 0: compilación, TypeScript, 78 páginas estáticas y trazado de rutas. Persisten advertencias preexistentes: convención `middleware` deprecada y uso de APIs Node/CompressionStream/DecompressionStream en imports detectados por Edge Runtime. No se afirma que `npm run build` con todos los hooks previos haya pasado.

**Estado, límites y siguiente paso.** La corrección de coordinación, el reintento automático antes de validar, el bloqueo ante persistencia de fallos y la exclusión mutua del archivado tienen pruebas locales E2E aprobadas. La causa runtime exacta de la captura originalmente reportada continúa NO DETERMINADA. No se hizo ensayo con proveedor real, lectura física/read-back en Blob, reconciliación contra base de datos productiva, acceso al audio del operador, merge ni despliegue. El build y los mocks no sustituyen esa evidencia. La falla CUSTODY-12 debe corregirse como deuda de la línea base, en un cambio separado, sin introducirla como parte artificial de este incidente.

**PR #354:** permanece abierta en borrador y sin merge. `main` observado `0aa7497a6316772ccf846620685a87b0711e346c`; `Production` sin cambios. Los dos ajustes validados se deben publicar únicamente en la rama `fix/custodia-04-dictado-archivar-e2e-20261106`. La aceptación final de Custodia y la garantía del producto siguen NO CERTIFICADAS.


### 12.8 Validación local final por RDC · 2026-11-06 · árbol probado desde `5728d0062f0925d4987fae4f2f491061c21120f8`; sincronización posterior `68f9dbd5797932be5f2a84885f88cd23de7dbd6c`

**Entorno y aislamiento.** Se ejecutó la validación en un *worktree* separado `C:\Users\fila4\Desktop\Khora\khora-custodia-04-validation`, detached exactamente en la punta remota indicada. El checkout `khora-main` preexistente se mantuvo intacto. El `package-lock.json` conserva el blob `987316f16dae22a60766b7354d81b34e11857960`; no se modificaron `package.json` ni lockfile. La instalación npm se hizo offline y sin lifecycle scripts. Para completar los tests del codec, se copió al worktree el ejecutable `ffmpeg.exe` de la instalación local que comparte la misma versión `ffmpeg-static 5.3.0`; la huella SHA-256 del binario origen y destino coincide: `04E1307997530F9CF2FE35CBA2CA7E8875CA91DA02F89D6C7243DF819C94AD00`. El ejecutable declara FFmpeg 6.1.1. Esta restauración fue exclusivamente local y no añadió archivos versionados.

**Correcciones adicionales descubiertas durante la validación.**
- `IngresoView.tsx`: la condición visible de «Reintentar y archivar» compara ahora `(v.audioPendiente ?? 0) > 0`; elimina TS18048 al tratar de forma segura el campo opcional. No relaja la compuerta de custodia ni cambia la regla de estado pendiente.
- `custody-regression.test.ts` / CUSTODY-14: se actualizó la aserción estática de dependencias de `guardar()` para incluir `reintentarCustodia`, que ya forma parte del callback real. No altera comportamiento productivo.
- `audio-por-partes.spec.ts`: la expectativa del contador espera explícitamente los tres intentos automáticos del helper mediante `expect.poll`; además, el escenario simula el recibo POST de `/api/dictado/checkpoint` con `sessionId`, `revisionId`, SHA-256 y longitud coherentes. Se conserva el contrato de tres intentos (backoff 1 s/2 s), un cuarto intento explícito satisfactorio y una sola llamada a `/api/dictado`. No se añadieron reintentos al cliente ni se deshabilitó la verificación del checkpoint.

**Resultados finales observados en el worktree.**

| Control | Resultado | Evidencia |
|---|---|---|
| `npm run typecheck` | APROBADO | exit 0, tras la guarda de `audioPendiente` opcional |
| `npm run test:unit` | **APROBADO: 572/572** | 572 pass, 0 fail, 0 skipped; incluye 17/17 pruebas de Custodia y los dos tests reales de codec MP3 |
| `npm run ui:contract` | APROBADO | exit 0; contrato de navegación íntegro |
| `npm run ui-review:check` | APROBADO | exit 0; escenarios, ui_ids, componentes y prerender íntegros |
| Playwright `audio-por-partes.spec.ts` | **APROBADO: 3/3** | Chromium; 34.8 s; salida y código 0 |
| `git diff --check` | APROBADO | sin errores de whitespace |

**E2E focalizada 3/3.** (1) carga multipart, errores y límites; (2) tres respuestas 503, persistencia visible de la cola, retry explícito satisfactorio, checkpoint confirmado, manifiesto con parte verificada y exactamente un archivado aun con doble activación; (3) 502 no-JSON persistente, texto conservado y ruta de archivado bloqueada. El servidor Next se inició manualmente con Webpack en localhost y variables sintéticas; Chromium utilizó una configuración Playwright temporal no versionada, eliminada antes del commit. Los endpoints de red del escenario E2E son simulados. Por tanto, este resultado valida la coordinación del navegador y sus contratos, no la disponibilidad real de Blob/Neon ni un archivo productivo.

**Falla previa de unitarias resuelta/explicada.** La primera ejecución con `npm ci --ignore-scripts --offline` falló solo en los dos tests de codec porque el hook omitido no instaló `ffmpeg.exe`. Se cotejó versión 5.3.0, se restauró el binario idéntico en el worktree y se repitió el lote: **572/572 aprobadas**. Los otros tres controles UI/tipos y Playwright se ejecutaron también después de las modificaciones del código y de las pruebas.

**CI remoto y checks externos.** Para la punta `5728d0062f0925d4987fae4f2f491061c21120f8`, GitHub Actions creó:
- CI run `42302467260`: jobs `calidad`, `api-tests`, `khora-web-gate`.
- UI Quality run `42302467188`: jobs `UI E2E`, `UI Contract`.
- `khora-ok / gate` run `42302467165`: job `khora-ok`.

Los seis jobs terminaron con `failure`, pero su lectura de pasos devolvió `steps=[]`; GitHub no ejecutó comandos de prueba. No se contabiliza como fallo de código ni como aprobación CI. Los checks de Vercel/Netlify continúan rechazando Preview por la restricción del plan frente a repositorio privado de organización; no son validación funcional de la aplicación.

**Estado y límites.** La corrección de cliente pasa typecheck, suite unitaria completa, contrato UI, UI review y E2E focalizada en navegador. La ejecución local se realizó en un worktree derivado de `5728d006` con los deltas descritos. Durante la validación, la rama remota recibió `68f9dbd`, que incorporó de forma idéntica la guarda de `audioPendiente` y la espera `expect.poll`; al reconciliar, se conservan ambos cambios y se agregan el recibo sintético del checkpoint y la aserción de CUSTODY-14 actualizada. El conjunto de archivos de código/pruebas quedó equivalente al árbol probado. PR #354 sigue abierta, en borrador y sin merge. No se ejecutó build de producción, despliegue, cambio de `main`, lectura/escritura de base de datos productiva ni prueba con proveedor real no productivo. No se realizó lectura física posterior del objeto Blob real, no se verificó el micrófono físico y no hubo aceptación humana. La causa runtime exacta de la captura original sigue **NO DETERMINADA**. La aceptación de Custodia continúa **NO CERTIFICADA** hasta completar la prueba de proveedor no productivo/read-back y el recorrido físico autorizado.

**Siguiente secuencia controlada:** publicar estos cambios y esta evidencia en la rama aislada/PR #354; comprobar que la nueva punta ejecuta CI en un runner real; después preparar una prueba separada con proveedor no productivo autorizado y lectura física de vuelta. Mantener el PR en borrador y no fusionar ni desplegar hasta satisfacer las compuertas pendientes. CUSTODIA-03 conserva su prioridad de rescate y no se modifica por este ciclo.

[executed on device: PC10RCIF4EI4 (d0bbb2a3-d7b4-45e1-8870-652c2c3844fc)]


### 12.9 Consolidación final del expediente y entrega a Custodia · 2026-11-06

**Propósito.** Reunir la evidencia disponible sobre el bloqueo comunicado el 2026-11-06, reconciliar las notas anteriores con los resultados posteriores de la rama/PR y dejar un único punto de continuidad dentro de CUSTODIA-04. Esta actualización cierra la intervención paralela de diagnóstico y documentación de esta conversación; no declara aceptado el producto ni cierra CUSTODIA-04.

#### A. Hechos de origen y procedencia

- **Fuente primaria:** docs/frentes/dictado-voz/originales/ChatGPT-DICTADO-20261106-1540.txt; blob Git a022d13920cb80280dd3c5bb89475348f8c908b7. El archivo fuente local tuvo SHA-256 B59FA7524DDAEB8CAAA06A422BBC11415C4AB4814DC2E920AC80658675EE768A.
- **Cita literal del operador:** «no se puede archivar el registro. Cora no ha verificado la custodia íntegra de todas las partes de audio». Se conserva «Cora» como literal comunicado, sin normalizarlo. En el código inspeccionado, el producto muestra «Khora» y la frase completa citada en la sección 2.
- **Paráfrasis posterior:** «no se puede garantizar la integridad de la…». Es una evocación incompleta, no una segunda cadena de error verificada.
- **Corrección de procedencia:** la transcripción pregunta si la sesión problemática era una captura nueva o una recuperación, pero no registra respuesta del operador. Por tanto, SESSION_ORIGIN=UNDETERMINED. La afirmación anterior que la clasificaba como captura nueva queda corregida; no debe utilizarse para seleccionar una causa raíz.
- **Estado visible reportado:** había texto transcrito y el intento de «Archivar registro» fue rechazado. No se obtuvo request ID, identificador técnico de sesión, índice de parte, respuesta HTTP, reason code ni traza de red de esa ejecución.
- **Frontera acordada:** Dictado abarca desde la entrada a su pantalla y el inicio de transcripción/captura hasta la activación de «Archivar registro». Ese mismo evento abre la responsabilidad de Custodia sobre verificación del manifiesto, persistencia durable, lectura de vuelta y recuperación. Es una frontera de contrato entre dos frentes, no un traspaso de titularidad.

#### B. Diagnóstico y dictamen causal

1. El texto de error se origina en khora-web/app/components/ingreso/IngresoWorkspace.tsx, dentro de guardar(), en la compuerta cliente anterior a POST /api/dictado.
2. La compuerta exige partes de audio completas y verificadas: índices válidos/contiguos, bytes positivos, SHA-256 válido y verificado=true. El rechazo impide archivar una sesión que no acredita el audio esperado; no se debe quitar ni eludir.
3. La rutina de subida realiza hasta tres intentos automáticos, con backoff de 1 s y 2 s. Si fallan, el error puede quedar absorbido y la función de reintento permanece en pendingUploadsRef; la transcripción puede continuar aunque haya una parte pendiente.
4. Antes de la corrección, guardar() esperaba la subida actualmente referenciada, pero no drenaba toda la cola de reintentos pendientes antes de validar. Esta omisión está CONFIRMADA ESTÁTICAMENTE y constituye el defecto de coordinación corregido en esta rama.
5. /api/audio autentica, calcula hash, cifra, almacena, relee/descifra y coteja bytes y SHA antes de registrar la parte como verificada. POST /api/dictado contrasta el manifiesto con las filas persistidas. evaluarCustodiaAudio() valida metadatos, pero no ejecuta por sí mismo un nuevo GET físico al proveedor durante el archivado.
6. La evidencia estática demuestra una ruta por la que el cliente puede llegar a la compuerta con una parte pendiente; no demuestra que esa ruta ocurriera en la sesión específica. También existe el caso distinto de cero partes generadas/cierre incompleto; tampoco se comprobó para esa sesión.

**Dictamen:** defecto de coordinación cliente (no drenar toda la cola de reintentos antes de validar) = CONFIRMADO EN CÓDIGO. Bloqueo de integridad de audio = CONDUCTA DE SEGURIDAD INTENCIONADA. Causa runtime exacta de la captura reportada = NO DETERMINADA. Origen nuevo/recuperado de la sesión = NO DETERMINADO. No afirmar que el audio de esa sesión se perdió.

#### C. Solución persistida en la rama de corrección

Rama: fix/custodia-04-dictado-archivar-e2e-20261106.  
PR: [#354 · reintentar custodia de audio antes de archivar](https://github.com/SeryMente/khora/pull/354).  
Commit de código y pruebas validado localmente: 55449a08719f04982dbfceb15ec28f43c7b68118.

La corrección implementa:
- drenaje secuencial single-flight de partes pendientes antes de volver a validar el manifiesto;
- reutilización de sessionId, índice y bytes originales;
- guarda síncrona single-flight para el archivado completo, evitando dos llamadas por activaciones duplicadas;
- «Reintentar y archivar» reutiliza el mismo camino de guardado;
- ante fallo persistente, mantiene el bloqueo de integridad y conserva texto/copia local; no llama a POST /api/dictado;
- mantiene la validación autoritativa del servidor: no fuerza verificado, no inventa partes ni elimina el gate.

También se incorporaron el ajuste del tipado opcional de audioPendiente, la aserción CUSTODY-14 de dependencias de guardar() y la sincronización E2E con los tres intentos/backoff existentes.

#### D. Pruebas efectivamente ejecutadas

Validación por RDC en worktree aislado C:\Users\fila4\Desktop\Khora\khora-custodia-04-validation. El checkout preexistente se mantuvo intacto. package-lock.json no se modificó. La instalación npm fue offline y con lifecycle scripts omitidos; el binario local ffmpeg.exe de ffmpeg-static 5.3.0 se restauró desde la misma versión y el SHA-256 del origen/destino coincidió: 04E1307997530F9CF2FE35CBA2CA7E8875CA91DA02F89D6C7243DF819C94AD00.

| Control | Resultado registrado |
|---|---|
| npm run typecheck | APROBADO · exit 0 |
| npm run test:unit | APROBADO · 572/572, 0 fallas, 0 omitidas |
| npm run ui:contract | APROBADO · exit 0 |
| npm run ui-review:check | APROBADO · exit 0 |
| Playwright audio-por-partes.spec.ts | APROBADO · 3/3 en Chromium |
| git diff --check | APROBADO · sin errores de whitespace |

Los tres escenarios E2E fueron: (1) multipart, errores y límites; (2) tres 503 automáticos, cuarto intento explícito satisfactorio, checkpoint sintético confirmado, manifiesto verificado y doble activación con una sola llamada a archivo; (3) 502 persistente no-JSON, archivado bloqueado, texto conservado y ningún bypass.

**Límite de estas pruebas:** Next/Chromium ejecutaron en local con datos sintéticos y respuestas simuladas para /api/audio, /api/dictado/checkpoint y /api/dictado. Las pruebas acreditan coordinación del cliente y contratos. No acreditan micrófono físico, escritura/read-back de Blob real, Neon real, archivo productivo, restauración tras reinicio ni disponibilidad actual de objetos. No se ejecutó npm run build sobre la punta combinada actual.

#### E. CI remoto y estado de publicación

Para el commit de código 55449a08719f04982dbfceb15ec28f43c7b68118 se observaron:
- CI run 42308741732: khora-web-gate, api-tests, calidad;
- UI Quality run 42308741716: UI Contract, UI E2E;
- khora-ok run 42308741666.

Los seis jobs reportaron failure, pero el detalle devuelto fue steps=[]: no llegaron a ejecutar comandos. Se clasifica como bloqueo de ejecución/runner, no como fallo de aserciones ni como CI aprobado. Los checks de Vercel/Netlify no habilitaron Preview por la restricción del plan ante repositorio privado de organización; tampoco constituyen prueba funcional.

La PR #354 permanece OPEN · DRAFT · NOT MERGED. La comparación observada con main fue ahead 27 / behind 0, merge-base 0aa7497a6316772ccf846620685a87b0711e346c. main y Production no fueron modificados. No se realizó merge, deploy, cutover ni cambio de configuración/credenciales productivas.

#### F. Pendientes que permanecen dentro de CUSTODIA-04

1. Ejecutar los workflows en un runner real y resolver el bloqueo de Actions; revisar el resultado de la punta documental posterior sin confundir «workflow creado» con «pasos ejecutados».
2. Ejecutar un ensayo con proveedor real autorizado en entorno no productivo: escribir, leer físicamente el objeto, descifrar cuando aplique, recalcular tamaño/SHA-256 y verificar el vínculo de sesión/manifiesto; conservar evidencia saneada y lectura de vuelta.
3. Realizar el recorrido funcional autorizado Dictado → «Archivar registro» → recibo durable de Custodia, incluyendo reintento exitoso, fallo persistente y doble activación. No utilizar captura personal como fixture.
4. Si se reproduce el caso original, adquirir telemetría minimizada: request ID, status/reason, índices y estados de partes, cierre/ACK, checkpoint y manifiesto. No copiar texto/audio, URL firmadas ni hashes completos al expediente.
5. Conseguir aceptación funcional del operador; hasta entonces no declarar la garantía de producto certificada.

#### G. Separación de incidentes y entrega

- **Dictado ausente del 2026-10-28, última entrada visible reportada a las 17:08 y contador 40→20:** pertenece a CUSTODIA-03 (#1 rescate). No fue resuelto por este trabajo. La sesión candidata 20:29/264 checkpoints y las fuentes B2, Vercel Blob e IndexedDB mantienen los estados y límites registrados en el OCP/inventario; no se afirma que el dictado específico haya sido identificado, que la pérdida sea definitiva ni que se hayan recuperado unidades productivas.
- **Unidades visibles en Recuperación:** permanecen en CUSTODIA-01 (#2); el catálogo completo y la verificación por unidad siguen pendientes.
- **Error al archivar del 2026-11-06:** permanece dentro de CUSTODIA-04 (#3). Diagnóstico estático, solución implementada en rama y evidencia de pruebas locales quedan reunidos aquí y en PR #354.
- **CUSTODIA-02** continúa retirada. **No crear CUSTODIA-05**: el subalcance ya pertenece a la CUSTODIA-04 existente.

**Cierre de intervención de esta conversación:** la investigación documental y la corrección diagnóstica de este incidente se consideran ENTREGADAS A CUSTODIA-04. No queda una tarea paralela independiente de este hilo. CUSTODIA-04 continúa EN CURSO hasta superar las compuertas del apartado F; las garantías del producto siguen NO CERTIFICADAS. Este cierre no modifica titularidad, generación, autorización ni control de Custodia o Dictado.


### 12.10 Bloqueo material de mergeabilidad y divergencia · control SCI 354Q · 2026-11-07

**Corte:** 2026-11-07 16:07 America/Mexico_City. Esta sección registra la fotografía del head anterior a esta actualización documental; no describe el SHA que producirá este commit.

- PR #354 verificada: OPEN · DRAFT · NOT MERGED; rama `fix/custodia-04-dictado-archivar-e2e-20261106`, base declarada `main`.
- Head examinado: `53f2a5a99b92cd72067d0d20799171ffb225e44d`. El head histórico de la bitácora inicial era `21a2aefb697bf2eda3ee4e14a78621e85214220f`; por tanto, la punta cambió.
- Metadata REST de PR: `mergeable=false`, `mergeable_state=dirty`. El ref vivo de `main` observado fue `7be5712a19aa98837e6d34449585ecb40e634af3`; el ref de la rama fue el head anterior indicado. Compare `main...rama`: DIVERGED, 32 commits ahead, 44 behind, merge-base `0aa7497a6316772ccf846620685a87b0711e346c`. GitHub señala estado `dirty`; los archivos concretos en conflicto no se determinaron en este control.
- En el head examinado, CI run [42311230342](https://github.com/SeryMente/khora/actions/runs/42311230342), UI Quality run [42311229909](https://github.com/SeryMente/khora/actions/runs/42311229909) y khora-ok / gate run [42311230072](https://github.com/SeryMente/khora/actions/runs/42311230072) tienen dos intentos observados. En ambos intentos, los seis jobs finalizaron `completed/failure` con `runner_id=0`, `runner_name=""` y `steps=[]`; ninguno ejecutó comandos. Los logs del segundo intento devolvieron HTTP 404 `BlobNotFound`; no hay salida de tests que diagnosticar.
- Checks externos permanecen separados: cinco contextos Vercel y el deploy-preview Netlify reportan failure. Los comentarios de sus bots atribuyen el bloqueo a restricciones de despliegue para repositorio privado de organización en los planes actuales; son bloqueos de Preview, no resultados de pruebas de producto.
- Clasificación de este corte: `RUNNER_NO_DISPONIBLE` y `CHECK_EXTERNO_BLOQUEADO`; además, bloqueo de mergeabilidad `dirty` que requiere reconciliar la divergencia. No hay evidencia de `FALLO_DE_PRODUCTO`, `RESULTADO_VERIFICABLE` ni `CONTROLES_DE_CÓDIGO_APROBADOS` en Actions.

**Acción pendiente:** una persona con autoridad debe revisar/reconciliar la divergencia de `main` y resolver los conflictos que GitHub marca como `dirty`; después debe obtenerse ejecución CI en runners reales sobre la nueva punta. Este registro no rebasea, fusiona, cambia la base, ejecuta reruns ni altera código. La PR permanece en borrador. Los resultados locales consignados en 12.9 no sustituyen la validación remota de la punta vigente ni la prueba no productiva de proveedor/read-back. CUSTODIA-03 conserva su prioridad formal.


### 12.11 Divergencia material de la rama y bloqueo de CI · control SCI 354Q · 2026-11-09

**Corte previo a esta actualización documental:** 2026-11-09 16:23:21 America/Mexico_City. Esta fotografía describe el head examinado antes del commit de esta sección; el commit documental posterior producirá una nueva punta y puede disparar otro workflow `push`.

- PR #354 verificada: OPEN · DRAFT · NOT MERGED; rama `fix/custodia-04-dictado-archivar-e2e-20261106`, base `main`; metadata `mergeable=false`, `mergeable_state=dirty`. Head previo: `21ddb99b0e4f8160c7d290d7ebe5aa3afdfa6cdd`. El SHA de base conservado en metadata de PR continúa siendo `0aa7497a6316772ccf846620685a87b0711e346c`.
- El ref vivo de `main` observado fue `a195e7bc9073cb19b84105a5fdad82192e029982`. Compare `main...fix/custodia-04-dictado-archivar-e2e-20261106`: DIVERGED, 33 commits ahead / 180 behind, merge-base `0aa7497a6316772ccf846620685a87b0711e346c`. Frente al control del 2026-11-08 (33 ahead / 71 behind), `main` avanzó y la divergencia aumentó en 109 commits behind; la rama de corrección no cambió. Los archivos concretos en conflicto no se determinaron.
- Para el head previo `21ddb99b0e4f8160c7d290d7ebe5aa3afdfa6cdd`, la consulta exhaustiva de runs por SHA devolvió únicamente [CI #42419288859](https://github.com/SeryMente/khora/actions/runs/42419288859), evento `push`; la consulta específica de runs `pull_request` devolvió cero. No se encontraron UI Quality ni `khora-ok / gate` para ese SHA.
- Jobs de CI: [khora-web-gate](https://github.com/SeryMente/khora/actions/runs/42419288859/job/128544035167), [calidad](https://github.com/SeryMente/khora/actions/runs/42419288859/job/128544035334) y [api-tests](https://github.com/SeryMente/khora/actions/runs/42419288859/job/128544035461). Los tres finalizaron `completed/failure`, `runner_id=0`, `runner_name=""`, `steps=[]`; cero pasos ejecutados. Las descargas de logs de los tres jobs devolvieron HTTP 404 `BlobNotFound`. No existe evidencia de test, build o typecheck remoto ejecutado.
- Checks externos separados: cinco contextos Vercel en `failure` con descripción explícita de restricción de despliegue desde repositorio privado de organización en plan Hobby; Netlify Deploy Preview en `failure` con descripción genérica, causa específica NO VERIFICADA; además, tres checks Netlify (`Redirect rules`, `Header rules`, `Pages changed`) en `failure`, todos vinculados al mismo deployment Preview. Ninguno se contabiliza como prueba del producto.
- Clasificación: `RUNNER_NO_DISPONIBLE`, `FALLO_DE_INFRAESTRUCTURA`, `CHECK_EXTERNO_BLOQUEADO` y bloqueo de mergeabilidad `dirty`. `FALLO_DE_PRODUCTO`, `RESULTADO_VERIFICABLE` y `CONTROLES_DE_CÓDIGO_APROBADOS` no demostrados en Actions.
- **Cambio material:** la divergencia pasó de 71 a 180 commits behind en un día. Requiere decisión humana sobre reconciliación de la rama con `main`; no se identificaron ni resolvieron conflictos en este control.

**Siguiente acción:** revisión humana de la divergencia y de los conflictos que GitHub resume como `dirty`; después, obtener runners reales y validar los pasos sobre la punta reconciliada. Esta sección no rebasea, fusiona, cambia la base, ejecuta reruns ni modifica código. El commit de esta sección es documental y deberá tratarse como una nueva punta en el siguiente control CI. La prueba con proveedor real no productivo/read-back, la causa runtime de la captura original y la aceptación humana continúan pendientes. CUSTODIA-03 conserva su prioridad formal.

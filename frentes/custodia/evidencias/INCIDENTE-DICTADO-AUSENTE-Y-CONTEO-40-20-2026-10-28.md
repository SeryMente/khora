<!-- INCIDENT_VERSION=0.4; INCIDENT_STATUS=OPEN; NOT_A_CANONICAL_OBJECT=true -->
# Incidente provisional · Dictado no visible en Recuperación y contador 40→20

> **ESTADO: ABIERTO · CAUSA DE LA CAPTURA AUSENTE NO CONFIRMADA · RECUPERABILIDAD PRODUCTIVA NO CERTIFICADA.** Este informe es evidencia auxiliar del frente Custodia; el único estado vivo sigue en [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).

- Frente: CUSTODIA.
- Folio de investigación original: CUSTODIA-INC-RECUP-SES-20261028-R6K2M9Q4-C004.
- Ciclo de formalización de tareas: CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005.
- Fecha de investigación: 2026-10-28.
- Instrucción literal: [INSTRUCCION-INCIDENTE-DICTADO-AUSENTE-2026-10-28.md](../originales/INSTRUCCION-INCIDENTE-DICTADO-AUSENTE-2026-10-28.md).
- Fuente normativa en la investigación original (histórica): Samantha v356 · NX-356m; Metacanon 1.22; GOW v2.6; blob `c364e179e8e9b6a3d566a8e690dfa1a7cce91798`.
- Fuente normativa vigente de este ciclo: Samantha v358 · NX-358m; Metacanon 1.23; GOW v2.7; blob `89a28e4d05f5baab9c4b86abdb9fbfc532690c75`.
- Límite: se inspeccionó código desde `SeryMente/khora/main`; no se obtuvo catálogo autenticado, consulta productiva de base de datos, bytes del proveedor ni correlación entre esta rama y el despliegue productivo. No se hizo ningún intento de recuperación en producción.

## 1. Relato comunicado por el operador — NO verificado de forma independiente

1. El 28 de octubre de 2026, el operador dictó contenido hacia el final de una sesión de uso de terminal en un cibercafé.
2. Al terminar el tiempo de uso, abandonó la terminal, esperando poder recuperar el dictado después; informó que las terminales se reinician cuando termina la sesión de un usuario.
3. Al regresar, el dictado esperado no apareció en Ingresos → Dictado → Recuperación.
4. La última entrada que el operador ve como recuperable muestra el 28 de octubre de 2026 a las 17:08, hora local según su interfaz.
5. El contador de «Recuperar capturas» fue observado en 40 y después en 20 cuando terminó la carga.

Estos datos describen el reporte y no demuestran que el dictado nunca se persistiera, que la terminal eliminara todos los datos del perfil, ni que existan 20 capturas distintas omitidas.

## 2. Hallazgo de código: dos rutas de carga forman el inventario de manera diferente

**Clasificación: CONFIRMADO EN CÓDIGO; relación exacta con las lecturas 40 y 20: EXPLICACIÓN MUY PLAUSIBLE, AÚN NO VERIFICADA EN PRODUCCIÓN.**

Fuentes inspeccionadas desde `main`:

- `khora-web/app/components/ingreso/IngresoWorkspace.tsx`, blob `d42f819c2867a678d0d45e309db8f58cad80dc0d`.
- `khora-web/app/components/shared/IngresoView.tsx`, blob `59ec9c2e1c7b8ee671770e26b51582fcc6868e37`.
- `khora-web/app/components/ingreso/RecoveryDrawer.tsx`, blob `3a408e3712d1cbe20578fa5ae923b75b0bc74342`.

Observación reproducible en el código:

- La hidratación automática al preparar Ingreso configura la lista con `[...localCatalog(local.snapshots), ...data.items]`, concatenando las entradas locales agrupadas por sesión y la página remota sin aplicar en ese punto el filtro de solapamientos.
- La recarga explícita ejecuta `cargarRecuperaciones`: filtra los snapshots locales cuyas sesiones ya aparecen en la página remota con una fecha remota igual o posterior y vuelve a formar la lista.
- La insignia de la vista recibe `recoveryItems.length`; por tanto cuenta las tarjetas cargadas en memoria, no un total independiente consultado al servidor.
- En consecuencia, una captura local y su correspondiente sesión remota pueden contarse dos veces durante la hidratación inicial y dejar de contarse dos veces después de la recarga. La observación del operador 40→20 es compatible con este mecanismo.

**No concluido:** no se ha cotejado la composición de ninguna de esas 40/20 entradas reales. No es correcto interpretar la diferencia como 20 capturas perdidas, ni afirmar que el duplicado explica cada unidad, sin comparar las identidades de sesión de la interfaz autorizada.

## 3. Hallazgo de código: el catálogo remoto pagina en bloques de veinte

**Clasificación: CONFIRMADO EN CÓDIGO.**

Fuente: `khora-web/lib/server/custodia-recuperacion.ts`, blob `278a479db46e6f2bed72ea7d31f88cc373fa67d1`.

- El catálogo define `limit=20`, solicita hasta 21 filas para detectar la existencia de otra página, devuelve como máximo 20 entradas y genera `nextCursor` cuando hay más.
- `RecoveryDrawer.tsx` incluye la acción «Más capturas anteriores» cuando el cursor no es nulo.
- No hay en la respuesta del catálogo un total global que coincida con la insignia de Ingreso.
- Por eso, 20 puede ser el número de entradas de la página/lista actualmente cargada, no el número total de unidades conservadas. Para determinar el total real es necesario recorrer páginas hasta que `nextCursor=null`, y reconciliar los datos locales con los remotos por identidad.

## 4. Hallazgo de código: el checkpoint local no acredita por sí solo el checkpoint remoto

**Clasificación: CONFIRMADO EN CÓDIGO Y CONTRATO; estado de la sesión del operador: NO VERIFICADO.**

Fuentes:

- `khora-web/app/components/ingreso/IngresoWorkspace.tsx`, blob `d42f819c2867a678d0d45e309db8f58cad80dc0d`.
- `khora-web/lib/client/custodia-local.ts`, blob `13129ff0e03f749607631b9c0465230faebcd125`.
- `khora-web/lib/custodia/contrato.ts`, blob `0ea3251c1270ff2fa988c751e06de6effef4135f`.
- `khora-web/app/api/dictado/checkpoint/route.ts`, blob `86138d60e1a2d25d277c468dc9af90f460334243`.

El cliente intenta guardar el snapshot en IndexedDB (`khora-custodia-v1`) y luego envía un POST autenticado al endpoint remoto. Solo después de validar respuesta, revisión y sesión marca «Checkpoint confirmado en el servidor». Si el POST falla, el estado distingue «Sin confirmación remota; consulta el estado de la copia local». El contrato fija disparadores de checkpoint por inactividad de 1.5 s y actividad continua de 10 s; son frecuencias de intento, no prueba de un acuse para este dictado concreto.

La copia local está ligada al origen/perfil de navegador y a su material de clave local. Si el reinicio o saneamiento del cibercafé eliminó ese perfil o sus datos del sitio, esa copia podría dejar de estar disponible. No se verificó si el terminal efectivamente borró IndexedDB, si conservó el mismo perfil, ni si el checkpoint remoto de esa sesión fue confirmado. No se debe afirmar ninguna de esas posibilidades como hecho.

## 5. Hipótesis abiertas para la captura ausente

En orden de comprobación, no de certeza:

1. **Checkpoint remoto nunca confirmado:** la captura quedó solo en estado local o en memoria y el perfil local se limpió; es compatible con la arquitectura, pero falta el registro/acuse de esa sesión.
2. **Captura almacenada en servidor pero fuera de la lista consultada:** puede depender de la identidad autenticada, estado de sesión, cursor/paginación o condición de filtro del catálogo. Hay que recorrer y reconciliar el catálogo completo.
3. **Sesión ya cerrada/archivada:** el catálogo de capturas abiertas filtra las sesiones con estado `complete`; una sesión archivada debe buscarse en Custodia, no suponerse perdida por no aparecer en Recuperación.
4. **Fallo en captura o reconocimiento antes del checkpoint:** el dictado comunicado no habría quedado contenido en el snapshot enviado. No hay logs de sesión de usuario adquiridos que permitan comprobarlo.
5. **Interrupción/cambio de perfil antes de terminar el POST:** el cierre de página y el reinicio del terminal no garantizan completar una solicitud en curso.

No hay evidencia actual para escoger una de estas hipótesis como causa raíz.

## 6. Impacto y estado de recuperación

- Incidente: **ABIERTO**.
- Dictado esperado localizado: **NO**.
- Pérdida definitiva demostrada: **NO**.
- Recuperación productiva intentada/confirmada en este ciclo: **NO / 0**.
- Catálogo autenticado completo recorrido: **NO**.
- Total de unidades reales verificado: **NO**.
- Diferencia 40→20: defecto de consistencia de carga/contador confirmado en el código; número de unidades únicas y contribución exacta al incidente no determinados.
- Código de producción, datos productivos, claves, credenciales, configuración y despliegue modificados: **NO**. Hay una propuesta de corrección en una rama aislada; no está fusionada ni desplegada.

## 7. Plan de verificación y corrección

1. Desde la sesión autenticada autorizada, consultar Ingresos → Dictado → Recuperación, recorrer todas las páginas hasta cursor nulo y registrar de manera minimizada: número de filas remotas, sesiones únicas, puntos locales, intersecciones y timestamp más reciente. No copiar texto real ni UUID de sesión a GitHub.
2. Buscar si hay una entrada posterior a 2026-10-28 17:08, y determinar si las capturas del período de abandono están en el catálogo abierto o archivadas en Custodia. Usar solo la cuenta propietaria y el acceso autorizado.
3. Cuando exista acceso de solo lectura autorizado, cotejar timestamps de recepción y filas de checkpoint con la ventana del incidente. Inspeccionar contenido únicamente en el entorno de la cuenta propietaria; conservar en la evidencia compartida los resultados minimizados, no el dictado.
4. Si aparece el punto, recuperarlo a un destino distinto, preservar el origen y verificar lectura de vuelta, contenido, integridad y procedencia antes de declarar éxito.
5. Corregir el cliente para compartir una sola función de reconciliación/deduplicación entre hidratación inicial y recarga manual. La identidad de sesión debe gobernar la deduplicación; los puntos locales y remotos más recientes deben mostrarse sin ocultar versiones ni descartar capturas locales sin una regla explícita.
6. Corregir el contrato del contador: o devolver total global confiable desde el servidor, o etiquetar claramente «N cargadas» y «hay más», sin presentarlo como total de recuperables.
7. Añadir pruebas de regresión para duplicados local/remoto, snapshot local más reciente, páginas de 20/21/múltiples páginas, cursor nulo, conteo antes/después de hidratación, fallo de POST remoto, terminal/perfil limpiado y lectura del último checkpoint confirmado. Usar datos sintéticos.
8. No alterar originales, borrar registros ni realizar recuperación destructiva. Los cambios de código y el despliegue requieren un ciclo de implementación/validación aparte; este registro documental no autoriza por sí mismo esa ejecución.

## 8. Evidencia que sigue faltando

- Acceso a la lista autenticada real y sus páginas posteriores.
- Referencia estable de sesión que permita emparejar el dictado ausente sin guardar el contenido.
- Acuse del último POST de checkpoint para la sesión incidente, o la fila remota correspondiente.
- Estado real del perfil/navegador de la terminal después del reinicio.
- Revisión desplegada que estaba activa en esa terminal.
- Resultado de búsqueda en Custodia por si la sesión se hubiera archivado.

## 10. Ampliación del alcance operativo

En el ciclo CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005, el operador pidió añadir a las dos tareas previas la investigación de los dictados que ya no aparecen o parecen no recuperables. La lista provisional formaliza esa labor como **CUSTODIA-03 · P0**, en paralelo con CUSTODIA-01. El alcance ya no se limita a la captura individual: debe buscar la captura reportada y determinar con evidencia el alcance de cualquier otra ausencia o laguna.

CUSTODIA-03 exige recorrer el catálogo autenticado completo, reconciliar por identidad las fuentes local/remoto, revisar capturas archivadas en Custodia, consultar los registros de checkpoint accesibles bajo autorización y clasificar cada caso sin equiparar ausencia de la lista con pérdida definitiva. Las unidades encontradas se recuperarán sin sobrescribir originales y solo se declararán recuperadas tras lectura de vuelta y verificación de integridad/procedencia. El cambio del contador 40→20 no se interpretará como veinte pérdidas sin reconciliación real.

En la revisión de plan del ciclo C005, CUSTODIA-02 se había registrado como revisión metodológica P1. **Ese estado es histórico y quedó supersedido por una instrucción posterior del operador:** CUSTODIA-02 se retiró de las tareas activas, no se reutiliza su identificador y se incorporó CUSTODIA-04 para completar la investigación y actualizar el sistema. Este informe no cambia el estado fáctico del incidente: el acceso productivo, la localización de la sesión y la recuperación siguen pendientes.

### Estado de implementación en CUSTODIA-04 · C007

- **Rama propuesta:** `fix/custodia-recovery-reconcile-20261028`, commit `95d7bbf2cbe0bb89b6d8ff01135438152ec8201d`; PR [#339](https://github.com/SeryMente/khora/pull/339), en borrador, no fusionada.
- **Cambios propuestos:** reconciliación común de sesiones local/remotas, contador con indicación de más páginas, distinción entre manifiesto de audio y partes verificadas persistidas, y rescate de audio legacy solo si la cadena es contigua/verificada y sin inventar sincronía.
- **Validación:** `typecheck`, `ui-review:check` y `ui:contract` pasaron. `test:unit` reportó 549/550; la única falla fue un `TLS handshake timeout` al consultar GitHub durante la prueba de sincronización metodológica. El esquema local/canónico fue cotejado aparte mediante el conector de GitHub: blob SHA idéntico `232590a1f6339e2517e67038e1b5f7e8bd1638e3`, sin diferencias JSON. La integración PostgreSQL/PGlite ampliada no se ejecutó porque `PGLITE_MODULE` no está configurado/instalado en el entorno.
- **Bloqueo vigente:** no se adquirió la lista de Recuperación autenticada, no se cotejó ninguna unidad real ni se hizo recuperación productiva. La PR no está fusionada/desplegada; Vercel ha reportado bloqueo de despliegue del repositorio privado de la organización en plan Hobby.
- **Estado del incidente:** ABIERTO. El dictado sigue sin localizarse y la pérdida definitiva sigue sin demostrarse.

## 11. Registro de cambios

- **v0.1 · 2026-10-28 · CUSTODIA-INC-RECUP-SES-20261028-R6K2M9Q4-C004:** se documentan por separado el defecto de conteo local/remoto, el límite de página de 20, el incidente reportado y las hipótesis no verificadas. Sin acceso a producción, recuperación real ni cambios de producto.
- **v0.2 · 2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005:** se vincula el incidente con CUSTODIA-03, que amplía el alcance a otras capturas esperadas no disponibles; no se modifica el estado fáctico del incidente, que sigue ABIERTO.
- **v0.3 · 2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C006:** se actualiza la referencia al plan vigente: CUSTODIA-02 deja de estar activa; CUSTODIA-04 asume el trabajo de consolidar la investigación y actualizar el sistema. Sin nueva evidencia productiva: el dictado sigue sin localizar y su pérdida definitiva no está demostrada.
- **v0.4 · 2026-10-28 · CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C007:** se registra la PR #339 en borrador con correcciones propuestas, validación local parcial, una falla de red en la prueba de contrato y la integración PGlite pendiente. El incidente permanece ABIERTO; no se obtuvo catálogo autenticado ni se recuperó el dictado ausente.

<!-- TASK_VERSION=0.1; TASK_STATUS=ACTIVE; PARENT=CUSTODIA-01; NOT_INDEPENDENT_CONTROL=true -->
# CUSTODIA-01 · Inventario forense de dictados recuperables y conciliación del panel

> **Estado:** EN CURSO · **Prioridad:** P0 · **Único expediente activo del frente CUSTODIA.**  
> **OCP padre:** [OBJETO-CANONICO.md](../../OBJETO-CANONICO.md).  
> **Control de responsabilidad:** [CONTROL-RESPONSABILIDAD.json](../../CONTROL-RESPONSABILIDAD.json).  
> **Índice provisional:** [LISTA-TAREAS-PROVISIONAL.md](../../LISTA-TAREAS-PROVISIONAL.md).

## 1. Objetivo

Determinar, archivo por archivo y dictado por dictado, qué contenido histórico permanece conservado y qué puede recuperarse en el estado actual de las fuentes. Conciliar el resultado con el panel «Recuperar capturas» para establecer qué elementos deben figurar allí y cuáles deben excluirse por estar archivados, no contener artefactos o haber sido confirmados como irrecuperables.

El objetivo no es certificar que KHORA funciona, probar la resiliencia del producto, reparar fallos ni recuperar/migrar datos. Se observa el resultado histórico que el sistema dejó y su disponibilidad actual.

## 2. Clasificación obligatoria por unidad de contenido

| Estado | Criterio |
|---|---|
| RECUPERABLE_AHORA | El contenido físico existe y una lectura actual autorizada permite obtenerlo. |
| EXISTE_BLOQUEADO | El objeto o contenido está localizado y existe evidencia suficiente de su persistencia, pero un bloqueo temporal/proveedor impide leerlo ahora (por ejemplo, Vercel Blob suspendido). |
| REFERENCIA_SIN_COTEJO_FISICO | Hay URL, fila, manifiesto, hash o referencia, pero todavía no se demostró que el contenido físico siga existiendo. |
| SOLO_SEÑAL_SIN_CONTENIDO | Solo hay telemetría, eventos o metadatos de captura; no se ha localizado texto/audio/archivo. |
| IRRECUPERABLE_CONFIRMADO | Se agotaron las fuentes pertinentes y no queda copia ni contenido recuperable. Debe adjuntarse evidencia de búsqueda y descarte por fuente. |
| NO_INSPECCIONADO | La fuente no pudo consultarse o no se ha consultado. No equivale a pérdida ni permite declarar irrecuperabilidad. |

El estado debe asignarse por componente cuando la captura sea mixta: texto/checkpoint y cada parte de audio, incluidos MP3 actuales e históricos. No extender a todas las partes el estado de una sola.

## 3. Desglose provisional de trabajo

Estas fases son subunidades internas de CUSTODIA-01; no crean nuevos identificadores maestros CUSTODIA, folios ni expedientes independientes.

### CUSTODIA-01.a · Inventario relacional y de contenido lógico

- Enumerar sesiones anteriores al corte, estados, propietarios registrados, checkpoint_text, revisiones/checkpoints y revisiones históricas.
- Enumerar cada parte de audio con su índice, proveedor, URL/localizador, estado histórico de verificación, longitud y SHA cuando estén registrados.
- Incluir MP3 actuales e históricos, manifiestos, Volcados y relaciones de archivo.
- Separar referencias, metadatos y contenido físicamente observado.
- No escribir ni reparar relaciones en Neon.

### CUSTODIA-01.b · Inventario físico de almacenes remotos

- Inventariar objetos B2 y Vercel Blob, incluidos objetos sin fila relacional.
- Inspeccionar rutas/prefijos relevantes, incluidos `khora/dictado/` y `khora/staging/`, y formatos distintos de WebM.
- Para cada objeto, registrar existencia/listado, proveedor, localizador, tamaño y metadatos disponibles; realizar GET/read-back y cotejo de bytes/SHA solo cuando exista acceso autorizado.
- Clasificar un objeto de Blob bloqueado por cuota como EXISTE_BLOQUEADO cuando el listado/metadata del proveedor confirme que sigue allí; no llamarlo perdido.
- No copiar, reescribir, migrar ni borrar objetos.

### CUSTODIA-01.c · Inventario local y fuentes de captura

- Consultar IndexedDB del navegador/perfil original disponible: snapshots mutables, revisiones inmutables y audios.
- Consultar, cuando estén disponibles, los datos locales de Aisthesis/Chrome y otras fuentes locales pertinentes.
- Registrar los dispositivos/perfiles efectivamente inspeccionados. Una fuente local inaccesible queda NO_INSPECCIONADA.
- Distinguir registros de telemetría de archivos de contenido.

### CUSTODIA-01.d · Identidad, deduplicación y exclusión de archivados

- Conciliar identificadores de sesión, referencias, hashes, URLs, manifiestos y huellas de contenido.
- Determinar propietario comprobado o no comprobado; nunca atribuir por inferencia ni usar una reclamación posterior como prueba de propiedad histórica.
- Excluir del catálogo de recuperación todo contenido ya archivado, usando vínculos verificables y deduplicación documentada.
- Mantener separadas las señales de captura sin artefacto y los elementos sin propietario.
- Conservar las discrepancias no resueltas como pendientes, no forzar coincidencias.

### CUSTODIA-01.e · Clasificación consolidada por archivo/parte

- Aplicar los estados de la sección 2 a cada texto, checkpoint, parte de audio, MP3 y objeto huérfano localizado.
- Distinguir recuperabilidad actual de bloqueo temporal y de referencia pendiente de comprobación física.
- Solo declarar IRRECUPERABLE_CONFIRMADO después del cotejo exhaustivo de las fuentes pertinentes.
- Registrar motivo, evidencia, fecha y fuentes consultadas/no consultadas por unidad.

### CUSTODIA-01.f · Conciliación con «Recuperar capturas»

- Comparar el inventario consolidado con todas las tarjetas/páginas del panel.
- Entregar el conjunto esperado: contenido recuperable ahora y contenido existente temporalmente bloqueado, con estado y motivo por separado.
- Identificar omisiones, duplicados, archivados que reaparecen y señales sin contenido que no deben presentarse como archivos recuperables.
- Emitir conteos reconciliados y una lista de diferencias. En esta fase no corregir el código ni los datos del panel.

## 4. Fuera de alcance explícito

- Auditoría de arquitectura de resiliencia o garantías de no pérdida.
- Pruebas E2E de nuevas capturas, pruebas de fallo, fault injection, pruebas de cierre de navegador o reconexión.
- Reparación de código, aplicación o catálogo; cambios de configuración/proveedor.
- Recuperación/restauración de contenido a destinos nuevos.
- Backfill, migración Blob→B2, cambios de referencias/relaciones o SQL de escritura.
- Reclamación o reasignación de propietarios.
- Eliminación, sobrescritura o limpieza física de originales.

Las lecturas necesarias para demostrar la existencia y accesibilidad actual de un archivo forman parte del inventario forense; no autorizan ninguna operación de escritura.

## 5. Criterios de cierre

1. Todas las fuentes pertinentes tienen estado explícito: inspeccionada, bloqueada o no inspeccionada.
2. Cada unidad de contenido localizada está inventariada y clasificada, o marcada con precisión como pendiente.
3. Las referencias no se confunden con objetos físicamente existentes; las marcas históricas de verificación no se presentan como lectura actual.
4. Los objetos temporalmente bloqueados no se declaran perdidos.
5. Las capturas archivadas no se duplican en recuperación.
6. Las señales metadata-only y los elementos sin propietario se separan sin atribución ni exposición indebida.
7. La lista esperada del panel se concilia con todas las tarjetas/páginas existentes y se documentan diferencias.
8. No se realizan reparaciones, restauraciones, migraciones, eliminaciones ni cambios de producto.

**Resultado final requerido:** inventario completo de lo conservado y clasificación veraz de su recuperabilidad actual. El panel no se declara completo hasta que la conciliación del punto 7 esté demostrada.

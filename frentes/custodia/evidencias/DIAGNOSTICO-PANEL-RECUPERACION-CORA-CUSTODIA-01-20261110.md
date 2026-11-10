<!-- EVIDENCE_VERSION=1.0; EVIDENCE_STATUS=PROVISIONAL; FRONT=CUSTODIA; WORK_ITEM=CUSTODIA-01 -->
# Diagnóstico de cobertura · «Recuperar capturas» de Cora

**Fecha de corte documental:** 2026-11-10  
**Frente:** CUSTODIA · expediente existente CUSTODIA-01  
**Estado:** DIAGNÓSTICO DOCUMENTAL · PANEL NO CERTIFICADO COMO COMPLETO  
**Ventana analizada:** dictaciones anteriores al 7 de noviembre de 2026; corte local aplicado: 2026-11-07 00:00, America/Mexico_City (2026-11-07 06:00 UTC).

> **Procedencia:** síntesis estructurada de la salida literal preservada en [SALIDA-MODELO-CUSTODIA-RECUPERAR-CAPTURAS-CORA-20261110.md](../originales/SALIDA-MODELO-CUSTODIA-RECUPERAR-CAPTURAS-CORA-20261110.md). Las cifras son las comunicadas por el ciclo de diagnóstico previo; no se ejecutó una nueva consulta de Neon al crear esta evidencia. No equivale a una exportación nativa exhaustiva ni a una certificación física de objetos.

## 1. Universo reportado

| Clasificación de sesiones anteriores al corte | Sesiones | Evidencia / tratamiento |
|---|---:|---|
| Vinculadas a Archivos/Volcados | 21 | Archivadas; excluir del panel de recuperación |
| Sin archivar, con texto/checkpoint | 81 | 37 texto-only; 44 texto + referencias de audio |
| Sin archivar, solo referencias de audio | 81 | Sin propietario demostrable; no atribuir por inferencia |
| Sin archivar, sin texto ni partes de audio | 1 | Fila de sesión vacía; señal separada, no contenido recuperable |
| **Total** | **184** | |

Detalle de artefactos:
- Las 81 sesiones con texto contienen checkpoint_text; 45 tienen además fila en dictado_checkpoint y 36 no. De estas 36, 35 tienen también partes de audio.
- Las 44 sesiones mixtas acumulan 914 filas de partes de audio. Las 44 tienen registros MP3 actuales y 20 conservan historial MP3; no se identificó un caso MP3-only adicional sin partes.
- Las 81 sesiones uploading sin propietario contienen 244 referencias de audio: 25 con verificación histórica y 219 pendientes. Once sesiones presentan índices de parte que empiezan en cero; deben conservarse como anomalía, no descartarse.
- En las 163 sesiones no archivadas se reportan 1,158 referencias de partes: 939 marcadas históricamente como verificadas y 219 pendientes. El estado histórico no acredita disponibilidad física actual.
- Se reportan 660 referencias B2 distribuidas en cinco sesiones con checkpoint y 498 referencias Vercel Blob en 120 sesiones (254 de estado checkpoint y 244 de estado uploading).

## 2. Evidencia que el panel no representa

1. **Texto sin revisión:** el catálogo remoto consulta dictado_checkpoint, pero no presenta como contenido el dictado_session.checkpoint_text heredado. Las 36 sesiones sin revisión pueden aparecer vacías y sin acción, aunque el endpoint individual de checkpoint sabe descifrar el texto, cotejar SHA-256 y obtener partes.
2. **Conteo de audio inconsistente:** catalogoRecuperacion() calcula audio_count y no lo utiliza para construir la tarjeta; audioParts depende del snapshot. Las partes sin verificar también deben mostrarse como pendientes, no desaparecer.
3. **IndexedDB incompleto en UI:** recuperarLocal() devuelve snapshots y audios; IngresoWorkspace construye tarjetas solo con snapshots. Una captura audio-only local queda fuera. Una fila local ilegible puede abortar la recuperación completa porque el descifrado se ejecuta en un bucle sin aislamiento por registro.
4. **Duplicación de local/remote y archivados:** el bootstrap concatena catálogo remoto y snapshots locales sin deduplicación por sesión. cerrarSnapshotLocal() elimina el snapshot mutable, pero deja revisiones inmutables; el catálogo local no comprueba antes si ya existe vínculo archivado.
5. **Objetos sin relación:** /api/audio puede conservar un objeto si falla GET/read-back o el registro de la parte en Neon. El objeto puede existir sin fila dictado_audio_parte; no aparecerá por el catálogo relacional.
6. **Enumerador insuficiente:** lib/server/reconciliation.ts reconoce rutas WebM, no staging khora/staging/, no inventaría sesiones text-only sin relaciones y no coteja bytes/SHA mediante GET. Además, su ruta DRY_RUN llama a asegurarColumnasDictado() (DDL); no se ejecutó.
7. **Aisthesis/Chrome:** el capturador offscreen retira chunks de memoria antes de subirlos; al fallar la subida no persiste una copia durable de esos fragmentos en IndexedDB. Telemetría y chrome.storage.local son señales de diagnóstico, no contenido de audio.

## 3. Archivados y señales sin artefacto

- Se reportan 22 filas de Volcado para las 21 sesiones relacionadas (una sesión tiene dos vínculos). Deben excluirse del panel.
- Otros 54 Volcados anteriores al corte no tienen session_id; ya están archivados y no deben reaparecer como recuperaciones. Los 54 tienen texto; 16 incluyen audio_url, 12 incluyen audio_partes; 25 no muestran propietario.
- Las comparaciones descritas por URL y SHA/propietario no encontraron coincidencias exactas entre esos Volcados sin session_id y las sesiones candidatas. Esto no prueba identidad semántica global: deben cotejarse vínculos y huellas sin inferir equivalencias.
- La telemetría incluye 40 session_id sin fila en dictado_session: 34 con inicio de edición en sitio; cinco con error de recuperación de checkpoint; uno con ambos. Son señales de captura, no texto ni audio localizados. La tabla de eventos no acredita titularidad y no debe alimentar directamente un panel privado por usuario.
- La función reclamarSesion() puede rellenar el propietario ausente al reclamarse una sesión; ese acto no prueba la titularidad histórica. Las 81 sesiones sin propietario deben permanecer diferenciadas y con acceso a contenido restringido hasta resolver identidad.

## 4. Fuentes todavía no inspeccionadas físicamente

| Fuente | Estado de inspección en este ciclo | Límite |
|---|---|---|
| IndexedDB del navegador autenticado original | NO INSPECCIONADA | Almacenamiento local cifrado, sin índice central de dispositivos |
| Objetos físicos B2 | NO ENUMERADOS / NO GET | No se cotejaron bytes, longitud ni SHA actuales |
| Objetos físicos Vercel Blob | NO ENUMERADOS / NO GET | Las referencias no demuestran disponibilidad actual |
| Prefijo khora/staging/ | NO ENUMERADO | Puede contener material no vinculado a filas de partes |
| Estado local de Aisthesis/Chrome | NO INSPECCIONADO | Telemetría no equivale a artefacto recuperable |

Por tanto, 939 partes con verificación histórica no equivalen a 939 objetos físicamente accesibles. Tampoco es válido interpretar una fuente vacía cuando la fuente no fue inspeccionada.

## 5. Contrato mínimo de completitud del panel

El catálogo debe conciliar y deduplicar sesiones, checkpoint_text, revisiones, cada parte de audio (verificada o pendiente), MP3 actual e histórico, objetos físicos B2/Blob, staging, snapshots/audios de IndexedDB y eventos de captura.

Cada registro debe separar al menos:
- texto/checkpoint y disponibilidad de su contenido;
- cada parte de audio, índice, proveedor, estado de verificación y presencia física comprobada;
- propietario comprobado / propietario no verificado;
- relación con Archivos/Volcados y regla de exclusión;
- origen y fecha de la evidencia;
- fuentes todavía no inspeccionadas.

Una captura mixta permanece visible mientras sobreviva texto o audio. Un evento sin artefacto debe figurar, cuando sea seguro, como «captura detectada, sin contenido localizado», nunca como contenido recuperable. Las sesiones sin propietario no se asignan por inferencia. Los archivados no se duplican. La ausencia de una fuente no consultada debe aparecer como «no inspeccionada».

## 6. Dictamen y compuerta

**DICTAMEN: PANEL NO CERTIFICADO COMO COMPLETO.**

El diagnóstico reporta brechas confirmadas en el catálogo y fuentes que todavía no fueron inspeccionadas. No se puede afirmar que «Recuperar capturas» muestre todo lo que debería.

**Compuerta vigente:** mantener el trabajo en diagnóstico e inventario hasta completar el cotejo de las fuentes señaladas y comparar el universo consolidado con las tarjetas del panel. No iniciar recuperación de contenido, reclamación de sesiones, backfill, migración, cambio de código, merge, producción ni despliegue antes de superar esa compuerta y recibir la autorización aplicable.

**Ejecución de esta persistencia:** solo escritura documental de evidencia en la rama de trabajo. No se escribieron datos en Neon, B2 o Vercel Blob; no se ejecutó reconciliación; no se accedió a IndexedDB; no se cambiaron código de producto, credenciales ni configuración de proveedor.

## 7. Referencias técnicas inspeccionadas en el diagnóstico fuente

- khora-web/app/components/ingreso/IngresoWorkspace.tsx
- khora-web/app/components/ingreso/RecoveryDrawer.tsx
- khora-web/lib/server/custodia-recuperacion.ts
- khora-web/lib/client/custodia-local.ts
- khora-web/lib/server/reconciliation.ts
- khora-web/app/api/audio/route.ts
- khora-web/app/api/audio/importar/procesar/route.ts
- khora-web/extension/harmonia/modules/live-caption/offscreen.js
- khora-web/app/api/eventos/route.ts

---
**Nota de estado:** esta evidencia documenta el diagnóstico y sus límites. No actualiza ni cierra CUSTODIA-01/03/04 o CUSTODIA-B2-006, no modifica el objeto canónico de Dictado de voz y no constituye una aceptación funcional.

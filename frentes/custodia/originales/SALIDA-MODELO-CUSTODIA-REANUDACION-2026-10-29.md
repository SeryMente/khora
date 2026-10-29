# Salida documental · Reanudación de responsabilidad CUSTODIA (C009)

- **Folio:** CUSTODIA-TRANSFERENCIA-SES-20261029-C9K4M2R8.
- **Fecha:** 2026-10-29.
- **OCP único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md).
- **Autorización literal:** «REtoma resposnabilida ddel frente CUSTODIA, de Khora».
- **Original preservado:** [INSTRUCCION-TRANSFERENCIA-RESPONSABILIDAD-2026-10-29.md](INSTRUCCION-TRANSFERENCIA-RESPONSABILIDAD-2026-10-29.md), blob SHA `240a27710d1de76fd9a5eeeb9ce97fdb6b987104`, commit `9fb5bd3a03158e1435009153c38be489c901c155`.
- **Gobernanza revalidada:** Samantha v359 · NX-359m; Metacanon 1.24; GOW 2.8. Fuente única: `SeryMente/metodologia/main:gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`, blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

## 1. Relevo de responsabilidad

El control único `frentes/custodia/CONTROL-RESPONSABILIDAD.json` fue actualizado con comparación condicional de su blob observado y se leyó de vuelta. La generación pasó de 2 a 3. El alias operativo de esta sesión es `chatgpt-custodia-SES-20261029-C9K4M2R8`; no es un identificador nativo de conversación. Se conservan el titular anterior, la generación anterior y la autorización original. No se encontró colisión exacta del folio en las consultas de commits e incidencias de `SeryMente/khora`; la unicidad en todos los repositorios/controles accesibles no está demostrada.

## 2. Estado factual de recuperación

- La lista de trabajo conserva las tres tareas activas: CUSTODIA-01 (unidades visibles en Recuperación), CUSTODIA-03 (capturas ausentes) y CUSTODIA-04 (correcciones y validación sistémica). CUSTODIA-02 sigue retirada y su identificador no se reutiliza.
- No se obtuvo el catálogo autenticado de Ingresos → Dictado → Recuperación, no se cotejó individualmente ninguna unidad productiva y no se recuperó ninguna unidad de producción. El conteo real de unidades sigue sin verificar.
- El incidente del dictado esperado después de la última entrada visible reportada para el 2026-10-28 a las 17:08 continúa ABIERTO. La pérdida definitiva no está demostrada. El salto de contador 40→20 no permite deducir 20 dictados perdidos.
- El defecto de código descrito en el inventario —el manifiesto puede declarar cero audio aun cuando existan partes separadas, y la recuperación puede limitarse por ese manifiesto— sigue necesitando validación por unidad y contra la revisión desplegada.

## 3. Código, pruebas y despliegue

- PR [#339 — CUSTODIA: reconciliar catálogo y preservar audio legacy](https://github.com/SeryMente/khora/pull/339) continúa abierta en borrador, sin fusionar ni desplegar.
- La rama `fix/custodia-recovery-reconcile-20261028` está divergida de `main`. No debe fusionarse ni desplegarse en ese estado; primero hay que reaplicar/reconciliar la corrección sobre `main` vigente y volver a ejecutar sus pruebas.
- La evidencia guardada de C008 pertenece a la punta anterior de esa rama: typecheck pasó; la integración PostgreSQL/PGlite aislada pasó 15 comprobaciones con identidad/clave sintéticas; la suite unitaria quedó 549/550 por un timeout TLS en la comprobación del contrato canónico, aunque una comparación independiente de los JSON encontró igualdad. Los workflows remotos terminaron sin runner, pasos ni logs disponibles. Estos datos no equivalen a CI verde ni a validación contra la rama reconciliada.
- El despliegue de producción observado de `khora-web` está READY y apunta a `main` en el commit `b528660e16552633d232a2397cbe42441a03438c`, anterior a los cambios documentales y a la corrección de CUSTODIA. No se modificó ni se lanzó un despliegue en C009.
- El entorno de escritorio disponible no tiene el clon de Khora en la ubicación de trabajo prevista; `git` y `gh` no están instalados en el perfil conectado. Se confirmó Node.js y npm. No se accedió al perfil de Chrome de otro usuario ni se extrajeron credenciales. El catálogo productivo sigue bloqueado por falta de una sesión autenticada autorizada o una vía de lectura autorizada equivalente.

## 4. Siguiente actuación

1. Obtener el inventario real de Recuperación mediante la sesión autorizada, recorriendo páginas hasta `nextCursor=null` y reconciliando por identidad estable.
2. Investigar por separado el dictado ausente, los checkpoints y el archivo Custodia, con acceso de solo lectura y clasificación por evidencia.
3. Rebasar/reconstruir la propuesta de código contra `main` vigente, revisar los cambios y volver a ejecutar los controles locales pertinentes; resolver la infraestructura de CI/despliegue antes de publicar.
4. Solo después realizar recuperación de prueba no destructiva, leer de vuelta el destino y cotejar texto, audio, integridad y procedencia. No alterar ni eliminar originales.

**Dictamen de cierre de C009:** se completó el relevo documental de responsabilidad y se alinearon las referencias de gobernanza. La investigación de recuperabilidad sigue abierta; no se certifica la recuperabilidad productiva y no hay nuevas pruebas de recuperación de datos en este ciclo.

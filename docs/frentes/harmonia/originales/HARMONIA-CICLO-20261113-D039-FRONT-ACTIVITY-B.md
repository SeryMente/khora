# Harmonia · D-039 · Salida visible B

**Conversación local UUIDv7:** `01a1d657-ab45-752b-a309-359a8665439a`  
**Ciclo local UUIDv7:** `01a1d653-2042-70fc-b73e-2ec4ac841ce8`  
**A:** `originales/HARMONIA-INSTRUCCIONES-VERBATIM-20261113-D039.md` · SHA-256 `938F9CEB01A53CF6CA48A611B721863328A1052E6768452E604BE906851B068C` · 4,502 bytes.  
**FOL1:** PREPARADO / NO ACTIVO; no se asignan folios globales.

## 1. Resultado del desarrollo · OMM-FUT-004

Se implementó localmente una primera candidata del reporte de frentes trabajados:

- Filtros móviles exactos: 24 h, 48 h, 72 h y 168 h.
- Una sola conversación activa/última por frente.
- Asociación explícita de la conversación ChatGPT abierta al frente desde el popup. No se infiere leyendo prompts, respuestas, títulos ni contenido.
- La URL se conserva como origen y ruta canónica de conversación; se excluyen query y fragment.
- Las actividades que actualizan el frente se derivan de señales de inicio de intervención y cierre de respuesta ya reconocidas por el observador.
- La fila visible contiene nombre del frente, etiqueta relativa, fecha/hora local y URL de conversación.
- La nueva asociación sustituye la anterior para el reporte; el JSONL histórico se conserva.

**Contrato:** `front.assignment` y `front.activity`.  
**Consulta local:** `GET /fronts?window=24h|48h|72h|7d`, autenticada.  
**Persistencia:** outbox, JSONL e índice existentes. No se creó un segundo banco de observabilidad.

## 2. Vista de datos semilla al 2026-11-13 13:25 · America/Mexico_City

La siguiente vista se calculó a partir de encabezados de exportaciones nativas ya localizadas. No equivale aún a observación natural continua de todas las conversaciones de la organización.

**Últimas 24 horas**

- **Harmonia** — hace 2 h · vie, 13 nov de 2026, 10:50 — https://chatgpt.com/c/6af63886-1a9c-83e8-a5ae-448392d6d61d

**Últimas 48 horas**

- **Harmonia** — hace 2 h · vie, 13 nov de 2026, 10:50 — https://chatgpt.com/c/6af63886-1a9c-83e8-a5ae-448392d6d61d

**Últimas 72 horas**

- **Harmonia** — hace 2 h · vie, 13 nov de 2026, 10:50 — https://chatgpt.com/c/6af63886-1a9c-83e8-a5ae-448392d6d61d

**Últimos 7 días**

- **Harmonia** — hace 2 h · vie, 13 nov de 2026, 10:50 — https://chatgpt.com/c/6af63886-1a9c-83e8-a5ae-448392d6d61d
- **Dictado** — viernes pasado · tarde · vie, 06 nov de 2026, 15:38 — https://chatgpt.com/c/6aee2cb8-85e0-83e8-a166-6aa3890966ac

Los encabezados del exportador no declaran zona horaria; para esta vista se normalizaron con la zona configurada `America/Mexico_City`. La hora absoluta y la etiqueta relativa provienen de la misma fecha normalizada. El origen se conserva como `export_header`.

Khora MCP queda fuera de siete días según la última exportación localizada. Custodia y Notas no se muestran porque su material más reciente no contiene ID/URL nativa y hora exacta suficientes. Tareas automáticas no tiene conversación asociada verificable. No se afirma que las exportaciones disponibles sean el inventario exhaustivo de hilos activos; un hilo posterior que no fue exportado aún no puede aparecer como seed.

## 3. Suficiencia del conjunto de observabilidad · OMM-FUT-006

El banco heredado se inspeccionó antes de desarrollar. El corte contiene 3,190 eventos en 70 JSONL, 54 sesiones, 1,336 huellas de superficie y 1,271 trazas diagnósticas. La distribución heredada es de captura, barrido/reutilización estructural y diagnóstico; no identifica un frente ni conserva el ID nativo/URL de la conversación. El campo `conversation` antiguo identifica una pestaña, las rutas se anonimizan y `capturedAt` fecha eventos de observación, no la última actualización del hilo. El último evento del runtime observado es del 12 de noviembre a las 12:49 local, por tanto el pool no respaldaba actividad del 13 de noviembre dentro de 24 horas.

La traza redactada del 22 de octubre contiene 627 eventos sin frente/hilo; la fixture de 11 eventos es sintética y no cuenta como evidencia de actividad natural. Las exportaciones nativas aportan nombre, ID/URL y Updated solo para los hilos efectivamente exportados.

**Dictamen:** el pool anterior era útil para investigar estructura y fallos del observador, parcial para secuenciar estados y **insuficiente por sí solo** para producir el reporte solicitado. La solución combina catálogo de frentes, metadatos explícitos de exportaciones, selección del vínculo por el operador y actividad de ciclo persistida en el flujo actual. No se crea otro banco.

### Hallazgos propuestos, aún no autorizados

1. **OBS-PROP-001:** reconciliar captura de `aria-label`/`placeholder` con las banderas de privacidad `labelsCaptured:false`; revisar productor, sanitización, payload y pruebas.
2. **OBS-PROP-002:** desarrollar un importador local/idempotente de encabezados de exportaciones oficiales para resolver huecos de URL/ID/Updated, conservando el timestamp y zona original (nula cuando no se declare).

No se asignan IDs ni se amplía el observador por estas propuestas hasta contar con autorización expresa. La regla recurrente OMM-FUT-006 exige acumular evidencia y presentar solo mejoras convergentes; no exige una tarea nueva por ciclo.

## 4. Versionado · OMM-FUT-005

- **0.4.9 — Baseline PRE-D039:** todo el trabajo de extensión anterior a este primer esfuerzo semiautomatizado.
- **0.5.0 — Esfuerzo D-039:** reporte de frentes, asociación explícita, eventos de actividad, ventanas móviles, etiquetas de tiempo, registro SemVer y primera iteración recurrente de auditoría de observabilidad.

Las tres filas OMM-FUT-004/005/006 del registro histórico apuntan a la misma versión 0.5.0 porque constituyen un mismo esfuerzo funcional. El registro no fuerza una versión distinta por tarea.

## 5. Validación y estado

- Node `--check` para módulos nuevos y modificados: PASS.
- Suite focal de contrato, almacén, API y etiquetas: **16/16 PASS**.
- API ejecutada contra colector aislado y temporal: PASS; se retiró el directorio de prueba. No se inició el colector del perfil del operador.
- JSON de manifest, build-info, catálogo de frentes y manifiesto de procedencia: parseo PASS.
- Parser PowerShell 5.1 de `INICIAR-HARMONIA.ps1`: PASS; el inicializador no se ejecutó.
- **No verificado:** instalación/recarga del paquete 0.5.0 y aceptación del popup en Chrome natural.
- **BMO-01: NO ALCANZADO.**
- No se abrió ni modificó Chrome principal; no se alteró `main`; sin commit, push, PR, merge o deploy.
- El DUG Samantha v393 / NX-393m tiene discrepancias de representación humana/estructurada en §§4/37/52. Este esfuerzo no adjudica esas discrepancias ni implementa medición T1/T2, duración o latencia.
- OCP local v0.81; especificación general v1.1.0; ambas no publicadas.

---
**Estado de esta salida B:** persistida para lectura de vuelta y SHA-256. Esta salida no constituye aceptación natural, publicación ni folio global.

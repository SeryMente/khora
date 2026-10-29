# Matriz preliminar de escenarios de propagación transversal

**Versión:** 0.1 provisional · **Corte:** 2026-10-29.  
**Objeto rector:** [OCP Publicabilidad](../OBJETO-CANONICO.md), PUBLICABILIDAD-v0.4.  
**Mapa relacionado:** [Mapa de dependencias y propagación v0.1](../MAPA-DE-DEPENDENCIAS-Y-PROPAGACION-v0.1.md).  
**Relación con el PSP v0.2:** el PSP v0.2 sigue documentando el subconjunto de publicación Khora/Vercel; esta matriz agrega rutas transversales sin sustituirlo ni declarar probadas sus secuencias.

## 1. Cómo usar la matriz

La unidad de análisis es una **arista** entre la fuente canónica de un activo y un destino que debe reflejarlo. Cada fila indica lo que debe investigarse antes de construir el procedimiento definitivo. «Candidato» no significa mecanismo confirmado; «pendiente» significa que no existe evidencia suficiente. Toda secuencia debe preservar permiso, autorización, trazabilidad, observabilidad y recuperación.

| ID / escenario | Fuente y destino | Preflight y secuencia candidata | Evidencia de éxito | Parada / fallback |
|---|---|---|---|---|
| G01 · Cambio de norma/gobernanza | `SeryMente/metodologia/main` → prompts, instrucciones, contextos y plataformas de modelos identificados | Leer canon vigente y registrar SHA; identificar exactamente los destinos afectados; aplicar aprobación que corresponda; cambiar primero la fuente autorizada; luego actualizar cada espejo por su mecanismo específico y leerlo de vuelta. | Versión/SHA del canon y cada destino, contenido cotejado, destinos no propagados enumerados. | Si un destino no puede leerse o actualizarse, declarar el canon verificado y el espejo pendiente/divergente; nunca elevar un espejo a fuente normativa. No modificar la fuente normativa sin autorización explícita requerida por su propia gobernanza. |
| G02 · Release de KHORA | `SeryMente/khora` → Actions/gates → autoridad única → Vercel → dominio/smoke | Fijar candidato SHA; diagnosticar CI; verificar protección/permissions, autoridad única, migraciones y URL smoke; usar una sola ruta aprobada. | SHA de origen = SHA desplegado; deployment ID/target/URL, gates, prueba posterior y acceso esperado registrados. | CI pre-steps sin logs: detener la promoción y recoger run/job IDs. RDC solo cuando haya step/comando replicable localmente; no usar un deployment MCP paralelo para eludir gates. |
| G03 · Sitio de marketing WordPress/Divi | `SeryMente/serymente` → módulos/código instalados en WordPress/Divi → sitio público | Identificar URL/sitio canónico, mapa de instalación por archivo, propietario del destino, mecanismo real de publicación, entorno de ensayo y rollback antes de cambiar contenido. | Hash/versión de los archivos origen, versión/ubicación instaladas y smoke visual/funcional en URL pública identificada. | Hoy el destino y mecanismo efectivos no están verificados; no simular publicación ni desplegar por una ruta supuesta. |
| G04 · Instrumento público OGP | `SeryMente/otrogranprograma` → GitHub Pages declarada → URL pública → JSON, assets y PWA/service worker | Verificar settings/branch de Pages y SHA servido; comprobar archivos canónicos/runtime, navegación, consola, service worker y caché; registrar procedimiento de invalidación si aplica. | SHA/ref de fuente, workflow/publicación de Pages (si existe), URL, revisión de artefactos y prueba en navegación limpia/actualizada. | No tomar HTTP 200 del HTML como prueba suficiente si el JS/JSON o caché sirven versión antigua. Configuración de Pages no comprobada aún. |
| G05 · Extensión Signal Interpreter | `SeryMente/signal-interpreter` → ZIP/artefacto → Native Messaging host → Chrome en equipo autorizado | Fijar commit/versión; construir paquete reproducible; comprobar contenido y hashes; ejecutar instalador permitido; recargar extensión; probar capturas/funciones con evidencia real por equipo. | Commit + SHA-256 del paquete + versión/ID de extensión + estado del host + resultado de prueba del equipo. | Distinguir paquete construido, instalación preparada, extensión cargada y capacidad en vivo. No declarar prueba E2E por el solo hecho de que exista el ZIP. |
| G06 · Gestor de Procesos/GDP | `SeryMente/GDP` → extensión Chrome + Apps Script + Sheets/Drive + helper local | Enumerar versiones compatibles de todos los targets; fijar manifest/version ID; validar schema/contract, auth y datos; publicar cada target en secuencia aprobada; ejecutar probes y E2E focal. | Recibo por target, versión de Apps Script, versión de extensión, estado de datos/helper, probes y E2E con datos autorizados. | El README observado reporta extensión HF33 y backend HF32/versión 12 con E2E pendiente. No declarar el sistema sincronizado hasta resolver y comprobar compatibilidad. |
| G07 · Documentación/OCP y activos personales | `SeryMente/personal`, `SeryMente/tercer-ambito` y OCP respectivos → destinos especificados por cada objeto | Leer primero el OCP/control pertinente; identificar si el destino es otro repo, fichero local, plataforma o solo referencia; usar revisión/hash; preservar estructura y responsabilidad. | Lectura de vuelta del destino, versión/hash y evidencia vinculada al OCP correcto. | No copiar o publicar automáticamente todos los documentos; algunos son evidencia o datos locales y no tienen destino externo. |
| G08 · Repositorio no caracterizado | `SeryMente/khora-effectif` → destinos desconocidos | Leer metadatos y documentación autorizada; identificar el activo, dueño funcional, fuente de verdad, consumidores, pipeline y efectos del cambio. | Ficha de caracterización con evidencia enlazada y destinos confirmados. | README no se recuperó en esta lectura; no suponer propósito, inexistencia de README o ruta de publicación. No propagar cambios hasta conocer el camino. |
| G09 · Cambios que afectan varias plataformas de modelos | Canon/objeto/prompt aprobado → cada plataforma/contexto/connector de trabajo aplicable | Inventariar nombre del destino, fuente aplicada, versión, limitaciones y permisos reales; actualizar solo tras identificar el mecanismo permitido; leer de vuelta o probar comportamiento con un check reproducible. | Matriz de destinos con versión/hash o evidencia de contenido, fecha, permiso y estado de lectura de vuelta. | No presumir conectividad/sincronización por compartir un modelo, repositorio o conector; si no puede medirse la recepción, marcar no verificado. |
| G10 · Propagación parcial o resultado ambiguo | Cualquier fuente → múltiples targets | Ante timeout/resultado incierto, consultar el estado antes de reintentar; comparar revisiones efectivas; identificar qué targets avanzaron; fijar un punto estable y reconciliar de forma ordenada. | Estado de cada target: actualizado, verificado, pendiente, bloqueado, divergente o no aplicable, con razón y recibo. | Detener más promociones si existe incompatibilidad crítica. No repetir una acción con efectos secundarios solo porque la respuesta se perdió. |
| G11 · Cambio de esquema, migración o configuración | Código/config/schema → runtime, DB, variables, conectores o servicios downstream | Enumerar consumidores, orden, contrato, seguridad, concurrencia, idempotencia demostrada y recuperación; comprobar precondiciones antes de ejecutar. | Prueba dirigida y lectura de versión/esquema; log sin secretos; compatibilidad confirmada. | No inferir idempotencia por `IF NOT EXISTS`; no asumir que rollback de código revierte datos; no tocar secrets/settings fuera de autorización. |
| G12 · Error de GitHub/CI posiblemente local | Workflow/test/build remoto → comando/step local equivalente, si existe | Recuperar YAML, job, paso, log y entorno; clasificar runner/servicio, permisos, dependencias, test, lint/build o aplicación. Solo después de identificar un comando fallido reproducible, usar RDC para ejecutar esa reproducción local; conservar salida y versión del entorno. | Diagnóstico que vincula el síntoma remoto con una reproducción local concreta, versión/comando/resultado, o evidencia de que no hay reproducer accesible. | Si falla antes de runner/steps o no hay logs, no afirmar que puede reproducirse localmente ni usar RDC como prueba sustituta. No usar RDC para otras actividades sin aviso previo y autorización. |

## 2. Niveles de evidencia

- **Documentado:** la guía o README afirma una ruta/capacidad; no se confirma que funcione hoy.
- **Observado:** una herramienta devolvió un estado concreto o una revisión identificada.
- **Probado:** se ejecutó la secuencia y se comprobó la condición de éxito descrita.
- **Pendiente/no verificable:** faltan acceso, datos, permiso, una prueba o evidencia legible.

Cada fila debe actualizarse con esta categoría; no elevar automáticamente documentado a observado ni observado a probado.

## 3. Campos mínimos para cerrar un escenario

`fuente_canónica`, `revisión_origen`, `target`, `mecanismo`, `autorización/permisos`, `precondiciones`, `dependencias`, `pasos`, `señal_de_error`, `criterio_de_reintento`, `criterio_de_parada`, `prueba_de_éxito`, `recibo`, `rollback/recuperación`, `estado_de_evidencia`.

## 4. Priorización propuesta

1. Fallo transversal de GitHub Actions: confirmar si los fallos pre-runner se deben a una condición externa/configuración y recuperar logs. Sin un paso local identificable, no activar la ruta RDC.
2. KHORA: resolver autoridad única, migración, SHA candidato y smoke.
3. Metodología → plataformas de modelos: levantar el catálogo de superficies derivadas y controles de versión/lectura de vuelta.
4. WordPress/Divi y Otro Gran Programa: confirmar mecanismo, URL y smoke públicos.
5. GDP y Signal Interpreter: versionado coordinado de múltiples componentes y prueba real por destino.
6. Caracterizar `khora-effectif`; validar exhaustividad del catálogo de repositorios.
7. Completar OCPs/documentos secundarios y automatizar solo donde el flujo se haya verificado.

Esta matriz es investigación documental. Ninguna fila autoriza por sí misma publicación, cambios de configuración o despliegue.

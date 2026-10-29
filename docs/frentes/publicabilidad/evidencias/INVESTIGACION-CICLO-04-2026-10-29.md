# Investigación documental · Ciclo 04 · Ampliación transversal de Publicabilidad

**Fecha:** 2026-10-29, America/Mexico_City.  
**OCP rector:** PUBLICABILIDAD-v0.4.  
**Alcance ejecutado:** lectura de la fuente normativa, búsqueda/lectura de repositorios, lectura de estados GitHub/Vercel y escritura documental solo en la rama Publicabilidad. Sin publicación ni intervención local.

## 1. Resultado ejecutivo

Publicabilidad se amplía del foco inicial en Vercel/KHORA a un sistema transversal de propagación controlada para todos los repositorios de la organización SeryMente y los destinos externos que dependan de sus activos. El objetivo no es centralizar cada activo en un solo repositorio: es identificar **una fuente canónica por activo**, el grafo de dependencias, los mecanismos de propagación y los recibos que acreditan que cada destino quedó actualizado.

Una búsqueda `org:SeryMente` devolvió nueve repositorios: `khora`, `khora-effectif`, `metodologia`, `serymente`, `otrogranprograma`, `signal-interpreter`, `GDP`, `personal` y `tercer-ambito`. La búsqueda no se considera prueba de inventario exhaustivo; falta contrastar el catálogo completo con el propietario y mapear destinos externos. Se leyeron los README recuperados, no el código completo de cada repo.

Se crearon dos documentos preliminares: un mapa de dependencias/propagación y una matriz transversal de 12 escenarios. Se registra también una dependencia estratégica declarada por el operador: Otro Gran Programa, como proyecto insignia, necesita KHORA/CoMind y Metodología para resolver su objetivo. El repo `SeryMente/otrogranprograma` es el instrumento de comunicación identificado, no necesariamente todo el proyecto. La relación técnica exacta está pendiente de mapear. El PSP v0.2 se conserva como subconjunto especializado de publicación Khora/Vercel. No se alteró Metodología ni ningún otro repositorio de la organización.

## 2. Referencia normativa realmente adquirida

Fuente única consultada en `SeryMente/metodologia/main`: Documento Único de Gobernanza (DUG) v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

Fuente: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html

El README leído de `SeryMente/metodologia` sigue declarando referencias previas (DUG v339, Metacanon 1.21, GOW 2.2 y un archivo `.md` como puntero de gobierno), mientras el HTML normativo consultado se identifica v359/1.24/2.8 y se declara fuente normativa única. Se registra como divergencia de índice/espejo pendiente de reconciliación; no se modificó el repositorio de Metodología ni se trató el README como autoridad normativa.

## 3. Inventario inicial y evidencia recuperada

| Repositorio | Observación directa desde README/metadatos | Grado de conocimiento en este ciclo |
|---|---|---|
| `SeryMente/khora` | README documenta app Next.js, frentes/OCP y sistema Khora; la investigación previa documenta Vercel y GitHub Actions. | Parcial; no se inspeccionó el código completo ni todos los destinos. |
| `SeryMente/khora-effectif` | El buscador de repos devolvió el repo privado, pero la recuperación de `README.md` terminó en 404. | No caracterizado. No implica que el repo o sus documentos no existan. |
| `SeryMente/metodologia` | Fuente preponderante de gobernanza en `main`; DUG HTML v359 adquirido. README de repo con referencias que parecen obsoletas frente al HTML. | Canon leído; espejos/modelos concretos aún no inventariados. |
| `SeryMente/serymente` | README: WordPress + Divi, código personalizado por página/sección, plugin propio y entorno Codespaces/Docker. | Código declarado; destino WordPress público y ruta real de publicación no verificados. |
| `SeryMente/otrogranprograma` | README: instrumento público de comunicación; URL declarada `https://serymente.github.io/otrogranprograma/`; sitio estático, JSON canónico/runtime, PWA/service worker. | Ruta de Pages declarada; settings efectivos y SHA servido no comprobados. |
| `SeryMente/signal-interpreter` | README: extensión Chrome y puente Native Messaging Windows; ZIP/instalador/pruebas por equipo. | Diseño declarado; package, hash e instalación viva no comprobados en este ciclo. |
| `SeryMente/GDP` | README: extensión Chrome, Apps Script, Sheets/Drive y helper local; informa extensión HF33 y backend HF32/versión 12, E2E pendiente. | Ejemplo explícito de targets/versiones distintos; compatibilidad/estado actual no reprobados. |
| `SeryMente/personal` | README: OCPs, evidencia, guías, referencias a assets locales. | No existe un único destino de publicación inferible; depende del OCP de cada activo. |
| `SeryMente/tercer-ambito` | README: documentación de ámbito ético con fuentes/evidencia/originales en árbol `etica/`. | Destinos externos y OCP/control autoritativo requieren comprobación específica. |

Estos descubrimientos justifican un catálogo por activo y destino. No autorizan mover carpetas, copiar todo a KHORA ni aplicar una publicación genérica a todos los repositorios.

## 4. Estado vivo de KHORA/GitHub/Vercel

### GitHub refs

| Elemento | Valor observado |
|---|---|
| `main` | `e463e0c6efa857f4c4229894a96fab747a8a7574` (commit a las 2026-10-29T02:34:08Z) |
| Rama documental | `publicabilidad/inauguracion-20261028` |
| HEAD de la rama documental al iniciar este ciclo | `c364fea2750d4f67b3dbae41285e1835cefb5503` |
| Último run CI de la rama antes de la escritura de este ciclo | `40900763575`, run fallido sobre SHA `c364fea2750d4f67b3dbae41285e1835cefb5503` |

### CI / excepciones GitHub

Run observado: https://github.com/SeryMente/khora/actions/runs/40900763575

Los jobs `khora-web-gate`, `api-tests` y `calidad` comenzaron el 2026-10-29T15:21:44Z y terminaron entre 15:21:45Z y 15:21:46Z. Los tres devuelven `runner_id=0`, nombre de runner vacío, labels `ubuntu-latest` y `steps=[]`. La recuperación de los logs de job devolvió `BlobNotFound`.

También se observan otros flujos de main fallidos en la ventana: `Jules Auto-Respond Cron` (run `40904382749`, 15:43Z), `Sync Todoist and Notion` (`40889858840`, 14:16Z), `Board Orchestrator` (`40889195532`, 14:12Z) y `Khora API Healthcheck` (`40878917996`, 13:06Z). En este ciclo se recuperaron resúmenes de runs y, para algunos, un resumen de jobs; no se inspeccionó el detalle completo de jobs/logs de cada uno. No se atribuye que compartan la misma causa sin recuperar la evidencia faltante.

La evidencia más reciente del CI de la rama sigue siendo compatible con fallo antes de que haya un runner/step ejecutable, pero **la causa raíz permanece NO DETERMINADA**. No prueba cuotas agotadas, falta de permisos, un incidente del servicio ni un error de YAML/código.

**Aplicación de la restricción de RDC definida por el operador:** no se usó Desktop Commander Remote. En los datos actuales no hay un step/comando concreto que se pueda reproducir localmente; no corresponde fingir una reproducción. Si se identifica un fallo de workflow/test/build reproducible, RDC queda dentro del alcance para esa reproducción específica. Cualquier uso de RDC para otro propósito requiere aviso previo y autorización expresa.

### Vercel

Lectura de solo consulta del proyecto `khora-web`, team `team_QBa5UlffJWznZ8ogFfKjaGQb`:

- `live=false`; dominios enumerados incluyen `khora-web.vercel.app` y el alias de main. SSO reportado activo para `all_except_custom_domains`, password protection desactivada.
- El objeto de proyecto devuelve un `latestDeployment` READY con ID `dpl_4NQWjXhtdaf9MWx2VDbVrdSZUXvm`, URL `khora-b5c5ip5lb-victorhugotorresmendez-8991s-projects.vercel.app` y `target=null`. Al no tener target `production` en esa respuesta, no se declara que haya reemplazado producción.
- La lista filtrada por `target=production` sigue devolviendo como más reciente `dpl_H7ModaV6GTefp9qbjiUnpiHmxgFH`, estado READY, SHA `b528660e16552633d232a2397cbe42441a03438c`, URL `khora-ouns596t1-victorhugotorresmendez-8991s-projects.vercel.app`, creado el 2026-10-24T21:59:10Z.
- `main` sigue en `e463e0c6efa857f4c4229894a96fab747a8a7574`; el desfase productivo conocido no se ha resuelto en estas lecturas.
- No se verificaron uso/consumo de cuotas, acceso HTTP anónimo, configuración efectiva de protecciones/rulesets ni equivalencia entre las URLs de smoke.

Fuentes operativas:
- https://github.com/SeryMente/khora/commit/e463e0c6efa857f4c4229894a96fab747a8a7574
- https://github.com/SeryMente/khora/actions/runs/40900763575
- https://vercel.com/victorhugotorresmendez-8991s-projects/khora-web/H7ModaV6GTefp9qbjiUnpiHmxgFH

## 5. Decisiones documentales de ciclo 04

1. Se define Publicabilidad como proceso de propagación/publicación transversal; no solo release de KHORA.
2. Se crea un mapa inicial con nueve repositorios localizados y sus destinos/lagunas conocidas.
3. Se crea una matriz transversal G01–G12 para gobernanza, KHORA, WordPress/Divi, GitHub Pages/PWA, extensiones, GDP, repositorios documentales, superficies de modelos, propagación parcial, esquema/configuración y fallos CI reproducibles.
4. Se mantiene el PSP de Khora/Vercel como procedimiento especializado; no se mezcla con rutas cuyo mecanismo real todavía no se conoce.
5. La excepción CI actual se trata como no reproducible localmente hasta que exista un step/comando observable. No hubo rerun, workflow_dispatch ni prueba local.
6. Se actualiza el OCP en esta rama, manteniendo su propósito fundacional literal y registrando por separado la ampliación de alcance.
7. Se deja el catálogo de repositorios como preliminar y se prohíben propagaciones masivas por conjetura.

## 6. Pendientes

- Obtener una lista completa de repositorios/activos del propietario y cruzarla con la búsqueda inicial.
- Investigar en GitHub Actions la razón de los fallos, el evento runner/servicio y recuperar logs legibles; decidir si existe una reproducción local que justifique RDC.
- Reconciliar la divergencia del README de Metodología mediante el procedimiento gobernado por ese repo; no modificar su fuente desde este ciclo.
- Inventariar los destinos concretos de prompts/instrucciones/contextos de plataformas de modelos y cómo comprobar su revisión aplicada.
- Confirmar URL y mecanismo público del sitio WordPress/Divi y settings/SHA servido de GitHub Pages en OGP.
- Definir paquete/hash/instalación de Signal Interpreter y release compatible multi-target de GDP.
- Caracterizar `khora-effectif` con evidencia autorizada.
- Resolver bloqueos de KHORA previos a cualquier publicación productiva: CI, autoridad única, migración, URL smoke y SHA candidato.

## 7. Límites

No se editaron otros repositorios, ni `main`, ni el código del producto; no se desplegó, publicó, ejecutó migración, cambió un secreto/configuración/plan/dominio, ni ejecutó una acción con coste. No se utilizó RDC. Las lecturas no constituyen inventario exhaustivo ni prueban rutas de publicación externas.

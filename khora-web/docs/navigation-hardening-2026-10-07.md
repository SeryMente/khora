# Endurecimiento de navegación · trazabilidad ejecutable

**Artefacto:** `khora-web/docs/navigation-hardening-2026-10-07.md`  
**Problema de origen:** el menú Sistema se convirtió en un contenedor monolítico que absorbía Seguridad, Capturar y múltiples superficies heterogéneas.  
**Estado inicial verificado:** commit `9cd28610395ee9cf0876294480204dfcb45a7c1e`.  
**Criterio de cierre:** no basta con que existan `href`; la navegación debe expresar jerarquía, cobertura de rutas, reachability, ausencia de regresión y evidencia ejecutada.

## Estrategia

1. **Registro único:** una fuente declarativa define dominios de nivel 1, submenús y cobertura funcional.
2. **Separación semántica:** Ingreso agrupa Dictado/Edición/Ingesta; Grafo agrupa Mapa; Seguridad vuelve a ser dominio de nivel 1; Sistema deja de absorber Seguridad y Capturar.
3. **Extensibilidad controlada:** KPIs permanece como superficie secundaria de Sistema/Extensiones y no ocupa nivel 1.
4. **Guardia bidireccional:** cada ruta de producto debe estar cubierta por el registro y cada entrada canónica debe apuntar a una ruta real; aliases históricos y superficies técnicas quedan explícitamente clasificados.
5. **Unificación de superficies:** la página inicial y la barra inferior consumen el mismo registro; se elimina el segundo inventario de navegación.
6. **Prueba de no-regresión:** los tests deben fallar si reaparece la arquitectura mega-menú, aunque todos los `href` sigan existiendo.
7. **Trazabilidad:** este documento se actualiza con commits, checks, resultado de CI, deployment y evidencia post-deploy.

## Arquitectura resultante

**Nivel 1 (máximo 7 dominios):**

- Volcados
- Ingreso
- Grafo
- Consulta
- Capturar
- Seguridad
- Sistema

**Segundo nivel:**

- Ingreso → Ingreso / Dictado / Edición / Ingesta
- Grafo → Grafo / Mapa
- Seguridad → Seguridad / Entorno Persistente / Bóveda / Control MCP
- Sistema → Herramientas / OPI-VRI / KPIs / Roadmap / Adherencia / Evidencia normativa / Registro

**No son nivel 1:** KPIs, Dictado, Edición, Ingesta, Mapa, Bóveda, Control MCP, Registro, Evidencia normativa, OPI/VRI, Bitácora, Roadmap y Adherencia.

## Invariantes de cierre

- [ ] Un solo registro declarativo de navegación.
- [ ] Seguridad está fuera de Sistema en nivel 1.
- [ ] Capturar está fuera de Sistema en nivel 1.
- [ ] KPIs no aparece en nivel 1.
- [ ] Sistema no contiene Seguridad ni Capturar.
- [ ] Home no mantiene un inventario paralelo.
- [ ] Las rutas técnicas/legacy tienen clasificación explícita.
- [ ] El guard no confunde assets estáticos con rutas.
- [ ] El guard comprueba cobertura y referencias en ambos sentidos.
- [ ] Existe prueba negativa de la arquitectura mega-menú.
- [ ] CI pasa.
- [ ] Producción acredita exactamente el commit desplegado.
- [ ] Smoke/E2E post-deploy confirma navegación real.

## Evidencia de ejecución

| Momento | Evidencia | Resultado |
|---|---|---|
| Baseline | `main@9cd28610395ee9cf0876294480204dfcb45a7c1e` | Regresión de mega-menú identificada |
| Rama | `fix/canonical-navigation-20261007` | Implementación completa; cierre global condicionado |
| Implementación | Registro + barra + home + guard + tests + docs | COMPLETADA en `8b6d3105f65e7c5b130241562ac2bdde045ff2ae` |
| CI | `khora-ok / gate`, `CI`, `UI Quality` | BLOQUEADA por fallos preexistentes/infraestructura; no se falsea el gate |
| Producción | SHA exacto en `ep-main-live.json` | NO APLICADO: PR abierto; no se desplegó producción |

## Resultado posterior

### Evidencia observada

- **Commit final de la rama:** `8b6d3105f65e7c5b130241562ac2bdde045ff2ae`.
- **Pull Request:** #279, abierto; no se ejecutó merge forzado.
- **Contrato de navegación:** PASS. El guard produjo `✅ Contrato de navegación íntegro: jerarquía, cobertura, enlaces, aliases y rutas verificadas.`
- **Batería específica de navegación:** PASS, **5 tests / 5 pass / 0 fail**.
- **Build independiente del SHA actual:** PASS; Vercel `dpl_72PTmekhSaAoRLbAxTeMt5AjU21A` quedó `READY`. Durante el build se observó `✓ Compiled successfully` y `Finished TypeScript in 11.0s`.
- **Build independiente previo:** `dpl_2HYrZ8YFv15rr5b5Bs5iCiyfzx6g` también quedó `READY` y confirmó compilación de las rutas del producto.
- **E2E Playwright independiente:** NO CONCLUYENTE POR INFRAESTRUCTURA. El runner no tenía el ejecutable Chromium requerido; ambos tests fallaron antes de ejecutar la aplicación.
- **Suite unitaria global:** NO CONCLUYENTE PARA ESTE CAMBIO. Se detuvo por fallos ajenos en EP Security/Neo4j.
- **Typecheck global:** NO CONCLUYENTE PARA ESTE CAMBIO. Existe un error sintáctico preexistente en `tests/unit/service_observability_coverage.test.ts(18,41): TS1109`.
- **Preview HTTP:** NO CONCLUYENTE. El entorno protegido devolvió error de configuración de NextAuth y correspondió a `/api/auth/[...nextauth]`.
- **Integración GitHub→Vercel/Netlify:** BLOQUEADA POR PLAN. Los bots reportaron que el repositorio privado de la organización no puede desplegarse desde Hobby; esto impide usar esos checks como evidencia de producción.
- **Producción:** NO MODIFICADA. El cambio no se publicó a `main` ni se promovió a producción.

### Falsaciones ejecutadas

1. Se comprobó que la barra ya no contiene una lista manual de menús: consume `NAVIGATION_REGISTRY`.
2. Se comprobó negativamente que Sistema no contiene Seguridad, Capturar ni Dictado.
3. Se comprobó que Seguridad vuelve a ser dominio de nivel 1.
4. Se comprobó que KPIs no es dominio de nivel 1.
5. Se comprobó unicidad de cobertura canónica.
6. Se comprobó que las referencias a assets estáticos no generan falsos `ENLACE_SIN_RUTA`.
7. Se ejecutó el build real del SHA actual después de contrato y pruebas de navegación.

### Decisión RAP

**PROVISIONAL / EN ESPERA DE CIERRE CI.**

La estrategia de navegación está implementada y certificada de forma independiente, pero el cierre canónico queda deliberadamente abierto porque los gates globales del repositorio siguen bloqueados por incidencias no pertenecientes a esta corrección y por restricciones de infraestructura. No se hace bypass del merge ni se declara producción modificada.

### Próximo cierre legítimo

El cierre definitivo requiere que los bloqueos globales sean resueltos en su propio ciclo y que el PR #279 obtenga sus checks obligatorios en verde; después podrá promoverse el SHA exacto a `main` y comprobarse producción.

## Auditoría final del ciclo — 2026-10-07

**SHA de implementación certificado:** `8b6d3105f65e7c5b130241562ac2bdde045ff2ae`  
**SHA de trazabilidad anterior:** `db9d0997a3dc8be04ab228ce3f171af01d881bf9`  
**PR:** #279 — OPEN / NOT MERGED.

### Estado de invariantes

PASS — registro único.  
PASS — Seguridad fuera de Sistema en nivel 1.  
PASS — Capturar fuera de Sistema en nivel 1.  
PASS — KPIs fuera de nivel 1.  
PASS — Sistema no contiene Seguridad ni Capturar.  
PASS — Home sin inventario paralelo.  
PASS — rutas técnicas/legacy clasificadas.  
PASS — assets estáticos excluidos del guard.  
PASS — cobertura y referencias verificadas en ambos sentidos.  
PASS — batería específica: 5/5 pruebas de navegación.  
BLOCKED — CI global: incidencias preexistentes documentadas.  
NOT APPLIED — promoción a producción: PR no fusionado.  
NOT CONCLUSIVE — E2E visual: runner remoto sin Chromium.

### Decisión

**PROVISIONAL / EN ESPERA DE CIERRE CI.**

No se autoriza merge forzado ni despliegue de producción como mecanismo para ocultar los bloqueos externos.

## Rectificación y cierre operacional — 2026-10-07

Esta sección **sustituye cualquier estado operativo anterior** del presente documento.

**Integración**
- PR #279 — MERGED. Merge SHA: `7a0545d9d1b7010f16561b0843b23ca0622e8829`.
- PR #281 — MERGED por squash. Merge SHA: `7b6d707174d949054837057795386040d28b7b22`.
- `main` del cierre técnico antes de esta anotación: `7b6d707174d949054837057795386040d28b7b22`.

**Bloqueo de build encontrado y resuelto**
- Vercel identificó en `app/api/mcp/route.ts:104` el error `Cannot find name 'assertNormativeRuntimeContext'`.
- El símbolo ya estaba exportado por `lib/server/normative-runtime.ts`; el hotfix restauró el archivo íntegro y añadió exclusivamente el import faltante.
- El hotfix preproducción `dpl_2qmKqU5Rfvz72bFZbcdP51VMa3xm` quedó `READY`.

**Producción verificada antes de esta anotación**
- Proyecto canónico: `khora-web` / scope `victorhugotorresmendez-8991s-projects`.
- Deployment de producción: `dpl_AEVqgJ3tAf6jKwXgbuG6etcpCWLt`.
- SHA desplegado: `7b6d707174d949054837057795386040d28b7b22`.
- Estado Vercel: `READY`.
- Alias canónico: `khora-web.vercel.app`.
- Smoke HTTP post-deploy: `/`, `/sistema/seguridad`, `/sistema/mcp`, `/ingreso` y `/grafo` respondieron HTTP 200.
- El HTML servido en producción expone exactamente 7 entradas primarias: `volcados`, `ingreso`, `grafo`, `consulta`, `capturar`, `seguridad`, `sistema`.
- Se verificó negativamente que el menú Sistema no contiene Seguridad ni Capturar en el HTML servido.
- No hubo errores `error/fatal` en runtime durante la ventana de verificación final de producción.

**Limitaciones que permanecen explicitadas**
- Los workflows globales de GitHub Actions continúan en rojo por incidencias de suite/infraestructura independientes del cambio de navegación y por restricciones de integración GitHub→Vercel en el plan Hobby; no se presentan como verdes.
- El E2E visual con navegador no pudo ejecutarse en el runner utilizado por falta del ejecutable Chromium; el smoke HTTP/HTML aporta evidencia de serving y estructura, pero no sustituye una inspección visual humana.
- No se modificaron variables ni configuración del proyecto Vercel para ocultar dichos bloqueos.

**Estado de cierre**
- **PUBLICADO EN PRODUCCIÓN: SÍ.**
- **SHA EXACTO PUBLICADO: VERIFICADO.**
- **ESTRATEGIA DE NAVEGACIÓN: IMPLEMENTADA Y CERTIFICADA POR GUARD + 5/5 TESTS ESPECÍFICOS + BUILD VERCEL.**
- **CI GLOBAL: NO VERDE; LIMITACIÓN REGISTRADA.**
- **E2E VISUAL: NO CONCLUYENTE POR INFRAESTRUCTURA.**

La conclusión operativa es que el cambio solicitado está integrado en `main` y publicado en producción, con evidencia post-deploy verificable; los bloqueos de CI/E2E quedan diferenciados de la funcionalidad desplegada y no se ocultan.

## Corrección UX/UI responsive — 2026-10-07

Delta verificado: `overflow-x-auto` en la barra recortaba los submenús; el icono se sustituía por una flecha y el estado abierto quedaba mal indicado; Ingreso y Capturar estaban duplicados como primer nivel.

Corrección aplicada: seis dominios primarios; Capturar dentro de Ingreso; contenedor raíz sin overflow de scroll; paneles con CSS responsive dedicado; icono de dominio persistente; ChevronDown cerrado / ChevronUp abierto; `aria-controls`; pruebas de bounds para 1440×900, 1024×768, 768×900 y 390×844.

Build independiente Vercel: `dpl_6kXnDmYGhXLcyerwcNNsBAKu1CaG` → READY.

Captura autenticada de la sesión del operador: no disponible en este entorno porque RDC no tiene cuenta vinculada y el navegador headless está bloqueado por política de organización. No se presenta una recreación como captura real.


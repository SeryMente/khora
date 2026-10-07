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

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
| Rama | `fix/canonical-navigation-20261007` | En ejecución |
| Implementación | Registro + barra + home + guard + tests + docs | Pendiente de cerrar |
| CI | `khora-ok / gate`, `CI`, `UI Quality` | Pendiente de ejecución |
| Producción | SHA exacto en `ep-main-live.json` | Pendiente de evidencia |

## Resultado posterior

Actualizar esta sección **solo con evidencia observada**, nunca por inferencia:

- Commit final:
- Checks verdes:
- Resultado de E2E:
- URL de producción:
- SHA acreditado en producción:
- Smoke post-deploy:
- Incidencias o regresiones restantes:
- Decisión final RAP: **CERRADO / PROVISIONAL / REVERTIDO**

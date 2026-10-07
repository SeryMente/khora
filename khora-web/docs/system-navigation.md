# Navegación canónica del sistema

**Estado:** IMPLEMENTADO  
**Fecha de cierre:** 2026-10-06

## Invariante

Toda capacidad de producto que tenga una ruta operativa debe tener una entrada de interfaz alcanzable desde la navegación principal. No se consideran superficies de producto los harnesses de prueba, rutas de diagnóstico protegidas o páginas explícitamente marcadas como construcción interna.

## Navegación principal

La barra inferior mantiene las entradas operativas de uso frecuente:

- Volcados → `/sistema/volcados`
- Ingreso → `/sistema/ingreso`
- Grafo → `/grafo`
- Consulta → `/sistema/consulta`
- KPIs → `/sistema/kpis`
- Sistema → abre el inventario completo de módulos especializados y de seguridad.

El menú **Sistema** expone:

### Operación

- Dictado → `/sistema/dictado`
- Edición → `/sistema/editar`
- Ingesta → `/sistema/ingesta`
- KPIs → `/sistema/kpis`
- Mapa → `/mapa`
- Capturar → `/capturar`
- Herramientas → `/herramientas`
- Roadmap → `/roadmap`
- Adherencia → `/adherence`

### Seguridad y control

- Seguridad → `/sistema/seguridad`
- Control MCP → `/sistema/mcp`
- Evidencia normativa → `/sistema/otros`
- Registro → `/sistema/registro`

La barra y el menú son complementarios: una función no debe depender de que el usuario conozca una URL interna.

## Menú Herramientas

`/herramientas` conserva sus propios submódulos visibles:

- Bitácora 24/365 → `/herramientas/bitacora` → redirige a la superficie canónica actual de Volcados `/sistema/volcados`.
- OPI/VRI → `/herramientas/opi-vri`.

El acceso histórico a Bitácora no apunta a una URL retirada; funciona como alias de compatibilidad hacia Volcados.

## Menú Seguridad

`/sistema/seguridad` es la superficie canónica de seguridad. Sus submódulos son:

- Seguridad
- Entorno Persistente
- Bóveda
- Control MCP

**Control MCP** reutiliza la consola existente `/sistema/mcp`; allí se administran OAuth, Bearer Tokens manuales, scopes y revocación.

Las rutas estables `/sistema/boveda` y `/sistema/entorno-persistente` redirigen a sus submódulos dentro de Seguridad.

## Superficies técnicas no navegables

`/ui-review` permanece protegido como harness de revisión y no se expone en el menú operativo. Las rutas de autenticación/OAuth y `/offline` son superficies de infraestructura/protocolo y conservan sus propios disparadores; no son módulos de producto que el usuario deba localizar desde el menú Sistema.

La ruta `/capturar/compartir` es una superficie de recepción externa de Share Target: dispone de UI propia y se activa por el mecanismo de compartición del sistema, no por navegación interna. No se clasifica como módulo de menú.

Las demás páginas de producto enumeradas en el árbol `app/**/page.tsx` —incluidas Capturar, Herramientas, Roadmap y Adherencia— tienen una entrada de navegación.

## Guardia contra regresiones

La navegación se protege en tres niveles:

- `tests/unit/system_navigation.test.ts`: rutas del menú, submódulos de Seguridad, aliases históricos y semántica ARIA de pestañas.
- `scripts/check_navigation_contract.ts`: descubre rutas estáticas, detecta enlaces internos muertos y rechaza páginas de producto huérfanas.
- `e2e/shell-v2.spec.ts` + `e2e/ui-quality.spec.ts`: renderización real, menú completo, aliases, accesibilidad básica, tema, overflow y prerender sin JavaScript en escritorio y móvil.

El workflow `UI Quality` ejecuta estos controles en cada cambio de `main` y pull request.

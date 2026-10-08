# Navegación canónica del sistema

**Estado:** IMPLEMENTADO Y ENDURECIDO  
**Última revisión:** 2026-10-08

## Invariante

Toda capacidad de producto que tenga una ruta operativa debe tener una entrada alcanzable desde la navegación principal o desde el submenú semántico de su dominio. La jerarquía debe reflejar la función, no simplemente la existencia de una URL.

## Navegación principal

La barra inferior contiene seis dominios primarios de uso frecuente más el control de tema:

- Ingreso → `/sistema/ingreso`
- Volcados → `/sistema/volcados`
- Grafo → abre Grafo / Mapa
- Consulta → `/sistema/consulta`
- Seguridad → abre Seguridad / Entorno Persistente / Bóveda / Control MCP
- Sistema → abre Herramientas / OPI-VRI / KPIs / Roadmap / Adherencia / Evidencia normativa / Registro

**Decisión semántica:** Capturar, Dictado, Edición e Ingesta no son dominios primarios independientes. Son fases/capacidades del mismo ciclo de entrada de memoria y se alojan dentro del workspace canónico **Ingreso**.

## Workspace Ingreso

La única superficie de producto para la captura es:

`/sistema/ingreso`

No existen modos internos navegables. Voz, texto y captura desde Chrome son mecanismos equivalentes de entrada al mismo objeto; la pantalla no obliga a elegir un modo.

La revisión, edición, aprobación y el estado de ingesta viven en **Volcados** (`/sistema/volcados`). La secuencia canónica es:

**Ingreso → Volcados → revisión/ratificación → ingesta → Núcleo**.

La ingesta es una operación downstream sobre una versión aprobada; no es un dominio de navegación ni una superficie hermana de Ingreso.

## Menú Grafo

- Grafo → `/grafo`
- Mapa → `/mapa`

## Menú Seguridad

- Seguridad → `/sistema/seguridad`
- Entorno Persistente → `/sistema/seguridad?tab=entorno-persistente`
- Bóveda → `/sistema/seguridad?tab=boveda`
- Control MCP → `/sistema/seguridad?tab=mcp`

Las rutas estables `/sistema/boveda` y `/sistema/entorno-persistente` permanecen como aliases históricos.

## Menú Sistema

Sistema queda reservado a capacidades secundarias de administración, observabilidad, herramientas y gobierno:

### Herramientas
- Herramientas → `/herramientas`
- OPI / VRI → `/herramientas/opi-vri`

### Extensiones
- KPIs → `/sistema/kpis`

### Gobierno y observabilidad
- Roadmap → `/roadmap`
- Adherencia → `/adherence`
- Evidencia normativa → `/sistema/otros`
- Registro → `/sistema/registro`

## Comportamiento responsive obligatorio

La barra no utiliza `overflow-x-auto` en su contenedor raíz, porque un submenu que debe emerger por encima queda recortado por un contexto de overflow.

La fila primaria se mantiene centrada y compacta:

- escritorio: botones de mayor tamaño, ancho máximo de la barra y separación uniforme;
- móvil: botones compactos, sin scroll horizontal obligatorio;
- submenús de escritorio: flotan sobre el botón origen;
- submenús móviles: se fijan con márgenes laterales seguros y ancho útil de viewport;
- todos los submenús deben quedar completamente dentro del viewport.

El indicador de apertura es una pequeña flecha junto al texto. El icono del dominio se conserva siempre; nunca se sustituye por la flecha.

## Interacción

- Click en un dominio con submenú: abre/cierra su menú.
- Click en otro dominio: cambia al menú correspondiente.
- Click en una opción: navega y cierra el menú.
- Click fuera de la barra: cierra el menú.
- `Escape`: cierra el menú.
- Cambio de ruta: cierra el menú.
- El estado abierto se refleja con `aria-expanded` y el panel se relaciona mediante `aria-controls`.

## Aliases y superficies técnicas

Las rutas históricas de Ingreso permanecen operativas como compatibilidad y redirigen al workspace canónico:

- `/capturar` → `/sistema/ingreso`
- `/sistema/dictado` → `/sistema/ingreso`
- `/sistema/editar` → `/sistema/volcados`
- `/sistema/ingesta` → `/sistema/volcados`
- `/herramientas/bitacora` → `/sistema/volcados`
- `/sistema/boveda` → `/sistema/seguridad?tab=boveda`
- `/sistema/entorno-persistente` → `/sistema/seguridad?tab=entorno-persistente`
- `/capturar/compartir` permanece como Share Target externo y no aparece como módulo de menú.
- `/ui-review`, autenticación/OAuth y `/offline` permanecen como superficies técnicas.

## Guardia contra regresiones

La navegación se protege con:

- `app/navigation/registry.ts`: fuente declarativa única.
- `scripts/check_navigation_contract.ts`: cobertura bidireccional y clasificación de rutas.
- `tests/unit/system_navigation_hardened.test.ts`: límites, agrupación semántica, ausencia de overflow y affordance de flechas.
- `e2e/shell-v2.spec.ts`: apertura real de los tres submenús restantes, bounds del viewport en 1440/1024/768/390 y cierre; Ingreso y Volcados se validan como las dos primeras superficies del ciclo.
- `e2e/ui-quality.spec.ts`: navegación y accesibilidad por escritorio y móvil.


# Navegación canónica del sistema

**Estado:** IMPLEMENTADO Y ENDURECIDO  
**Última revisión:** 2026-10-07

## Invariante

Toda capacidad de producto que tenga una ruta operativa debe tener una entrada alcanzable desde la navegación principal o desde el submenú semántico de su dominio. La jerarquía debe reflejar la función, no simplemente la existencia de una URL.

## Navegación principal

La barra inferior contiene seis dominios primarios de uso frecuente más el control de tema:

- Volcados → `/sistema/volcados`
- Ingreso → abre el dominio de entrada y captura
- Grafo → abre Grafo / Mapa
- Consulta → `/sistema/consulta`
- Seguridad → abre Seguridad / Entorno Persistente / Bóveda / Control MCP
- Sistema → abre Herramientas / OPI-VRI / KPIs / Roadmap / Adherencia / Evidencia normativa / Registro

**Decisión semántica:** Capturar no es un dominio primario independiente. Es una acción de entrada rápida y, por tanto, pertenece al dominio **Ingreso**.

## Menú Ingreso

- Ingreso → `/sistema/ingreso`
- Capturar → `/capturar`
- Dictado → `/sistema/dictado`
- Edición → `/sistema/editar`
- Ingesta → `/sistema/ingesta`

Esto evita presentar como dominios hermanos dos capacidades que pertenecen al mismo ciclo de entrada de memoria.

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
- `e2e/shell-v2.spec.ts`: apertura real de los cuatro submenús, bounds del viewport en 1440/1024/768/390 y cierre.
- `e2e/ui-quality.spec.ts`: navegación y accesibilidad por escritorio y móvil.


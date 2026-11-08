# Navegación canónica del sistema

**Estado:** IMPLEMENTADO Y ENDURECIDO  
**Última revisión:** 2026-11-08

## Invariante

Toda capacidad de producto que tenga una ruta operativa debe tener una entrada alcanzable desde la navegación principal o desde el submenú semántico de su dominio. La jerarquía debe reflejar la función, no simplemente la existencia de una URL.

## Navegación principal

La barra inferior contiene seis dominios primarios de uso frecuente más el control de tema:

- Custodia → `/sistema/custodia`
- Ingreso → `/sistema/ingreso`
- Grafo → abre Grafo / Mapa
- Chat → `/chat` (Open WebUI)
- Seguridad → abre Seguridad / Entorno Persistente / Bóveda / Control MCP
- Sistema → abre Herramientas / OPI-VRI / KPIs / Roadmap / Adherencia / Evidencia normativa / Registro

**Decisión semántica:** Capturar, Dictado, Edición e Ingesta no son dominios primarios independientes. Son fases/capacidades del mismo ciclo de entrada de memoria y se alojan dentro del workspace canónico **Ingreso**.

## Workspace Ingreso

La única superficie de producto para el ciclo de entrada es:

`/sistema/ingreso`

El workspace expone modos internos, no dominios hermanos:

- Entrada → `/sistema/ingreso`
- Dictado → `/sistema/ingreso?modo=dictado`
- Captura → `/sistema/ingreso?modo=captura`
- Archivo → `/sistema/ingreso?modo=archivo`
- Revisión → `/sistema/ingreso?modo=revision`
- Ingesta → `/sistema/ingreso?modo=ingesta`

El flujo canónico es **captura → transcripción/procesamiento → revisión → aprobación → ingesta**. La navegación primaria no debe volver a exponer estas fases como entradas independientes.

## Workspace Chat

`/chat` mantiene la barra principal de Cora y presenta la interfaz oficial de Open WebUI dentro de un marco integrado. La aplicación original no se modifica ni se publica en un host adicional.

El marco utiliza el proxy autenticado de Cora en el mismo origen. El backend y los recursos upstream no reciben credenciales del navegador: la identidad se deriva de la sesión autenticada, el proxy firma la petición servidor a servidor y solo reenvía las rutas permitidas. Los recursos estáticos se extraen durante el build desde la rueda oficial Open WebUI 0.12.3 tras comprobar su SHA-256.

La integración requiere `KHORA_CHAT_ENABLED=1` en el entorno de producción. La ruta histórica `/sistema/consulta` se conserva como alias y redirige a `/chat`; la antigua pantalla de consulta ya no se sirve como superficie de producto.

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

Las rutas históricas permanecen operativas como compatibilidad:

- `/sistema/consulta` → `/chat`
- `/capturar` → `/sistema/ingreso?modo=captura`
- `/sistema/dictado` → `/sistema/ingreso?modo=dictado`
- `/sistema/editar` → `/sistema/custodia`
- `/sistema/ingesta` → `/sistema/custodia`
- `/herramientas/bitacora` → `/sistema/custodia`
- `/sistema/boveda` → `/sistema/seguridad?tab=boveda`
- `/sistema/entorno-persistente` → `/sistema/seguridad?tab=entorno-persistente`
- `/capturar/compartir` permanece como Share Target externo y no aparece como módulo de menú.
- `/ui-review`, autenticación/OAuth y `/offline` permanecen como superficies técnicas.

## Guardia contra regresiones

La navegación se protege con:

- `app/navigation/registry.ts`: fuente declarativa única.
- `scripts/check_navigation_contract.ts`: cobertura bidireccional y clasificación de rutas.
- `tests/unit/system_navigation_hardened.test.ts`: límites, agrupación semántica, ausencia de overflow y affordance de flechas.
- `tests/unit/chat_proxy.test.ts`: autenticación, firma de identidad, allowlist, restricciones de método y redacción de respuestas.
- `tests/unit/chat_static_assets.test.ts`: verificación del origen y los recursos estáticos oficiales.
- `e2e/shell-v2.spec.ts`: apertura real de los tres submenús restantes, bounds del viewport en 1440/1024/768/390 y cierre; Ingreso se valida como enlace directo y workspace de modos.
- `e2e/ui-quality.spec.ts`: navegación y accesibilidad por escritorio y móvil.

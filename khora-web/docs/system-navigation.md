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

Las demás páginas de producto enumeradas en el árbol `app/**/page.tsx` —incluidas Capturar, Herramientas, Roadmap y Adherencia— tienen una entrada de navegación.

## Guardia contra regresiones

`tests/unit/system_navigation.test.ts` comprueba que las rutas esenciales permanezcan declaradas en `SystemBar.tsx` y que Seguridad conserve sus submódulos. El E2E de shell comprueba además que los elementos sean visibles y navegables como UI.

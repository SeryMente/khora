# Khora Agents Knowledgebase

## Khora Session Script Anti-Fragmentation Rule

**IMPORTANT PERMANENT RULE**:
REGLA PERMANENTE (v7): El único punto de entrada es khora.ps1 (gate). PROHIBIDO crear scripts de entrada paralelos o copias khora-v*.ps1. Un componente = un archivo en modules/; el orden de carga lo define khora.barrel.ps1. Toda modificación sube $SCRIPT_VERSION en el mismo commit.
Está ESTRICTAMENTE PROHIBIDO crear archivos `khora-v*.ps1` paralelos. Esta regla existe de forma permanente debido a que tareas aisladas en el pasado produjeron 10 fragmentos divergentes y generaron regresiones masivas.
## EP-ARCHITECTURE — CONTEXTO CANÓNICO DEL ENTORNO PERSISTENTE

ep-medio-architectura.md es un componente del propio Entorno Persistente de KHORA y constituye su **definición estructural canónica y vigente**.

### Regla obligatoria para agentes

ANTES de comprender, diagnosticar, modificar, reconstruir o depurar cualquier aspecto relacionado con el Entorno Persistente, el agente DEBE leer:

ep-medio-architectura.md

Ese archivo contiene el modelo estructural del EP: entidades, fronteras, rutas, estados, componentes, responsabilidades, flujos, persistencia, autenticación, Vault, VS Code, Chrome, Guardian, Handoff, Cleanup, invariantes y referencias de implementación.

### Regla de sincronización

Cuando una modificación cambie directa o indirectamente la estructura, responsabilidades, flujo de ejecución, estado, persistencia, seguridad, dependencias, fronteras o mecanismos de reconstrucción del EP, el agente DEBE actualizar ep-medio-architectura.md dentro del mismo cambio lógico.

Un cambio arquitectónico NO se considera terminado mientras ep-medio-architectura.md contradiga la implementación vigente.

### Regla de autoridad

El código vigente determina el comportamiento real. ep-medio-architectura.md proporciona el modelo estructural canónico para interpretar ese código.

Si ambos divergen:

1. identificar la diferencia;
2. determinar el comportamiento real de la implementación;
3. actualizar ep-medio-architectura.md para representar la versión vigente;
4. verificar nuevamente los invariantes arquitectónicos.

### Prohibición

No crear una arquitectura paralela para resolver una necesidad que ya tenga un mecanismo dentro del EP. Primero debe localizarse y reutilizarse el componente existente.

Antes de crear código nuevo para una capacidad del EP, el agente DEBE localizar y reutilizar el mecanismo existente que ya desempeñe esa responsabilidad.


## Entorno Persistente Medio v1.0.1

- La especificación única es `ep-medio-architectura.md`.
- Mantén el punto de entrada único `scripts/khora/khora.ps1`.
- Conserva identificadores `EP-*`; no renumeres identificadores publicados.
- Todo cambio de flujo, seguridad, token, bitácora, persistencia o limpieza exige actualizar la arquitectura y `ep-integrity-manifest.sha256`.
- Nunca añadas acceso anónimo, fallback sin BitLocker, secretos en logs o `git add -A`. Conserva el despliegue obligatorio y verificable del SHA exacto de `main` en `EP-IN-080`; nunca despliegues `ep-wip/*`.

## Custodia continua de dictados — lectura obligatoria

Antes de modificar captura manual o transcrita, audio, checkpoints, Archivar, recuperación, títulos, versiones, MP3 o herramientas MCP de audio, leer [Custodia continua de dictados](khora-web/docs/CUSTODIA-DICTADOS.md). Es la entrada única de mantenimiento de ese circuito. Actualizar código, pruebas, contratos y ese documento en el mismo cambio. No convertir texto a voz; conservar originales además del MP3; no declarar producción certificada a partir de mocks o compilación. Mantener visibles las brechas pendientes y sus pruebas terminales.

## Grafos: continuidad, calidad y no-simulación

Antes de modificar extracción, identidad, comunidades, materialización o consulta sobre el grafo, leer [el objeto de continuidad del frente](khora-web/docs/GRAPH-TWINS.md) y [el estándar de calidad](khora-web/docs/GRAPH-QUALITY-DRAFT.md). Conservar explícitos su estado de adopción y los bloqueos: documentación no equivale a implementación ni acreditación. No presentar anclaje literal, métricas topológicas o pruebas con servicios simulados como prueba de fidelidad semántica o recorrido integral. Actualizar hallazgos y evidencia en el mismo cambio lógico; no multiplicar objetos canónicos paralelos ni elegir stack, diseño de interfaz o seguridad sin las autorizaciones correspondientes.

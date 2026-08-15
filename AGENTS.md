# Khora Agents Knowledgebase

## Khora Session Script Anti-Fragmentation Rule

**IMPORTANT PERMANENT RULE**:
REGLA PERMANENTE (v7): El único punto de entrada es khora.ps1 (gate). PROHIBIDO crear scripts de entrada paralelos o copias khora-v*.ps1. Un componente = un archivo en modules/; el orden de carga lo define khora.barrel.ps1. Toda modificación sube $SCRIPT_VERSION en el mismo commit.
Está ESTRICTAMENTE PROHIBIDO crear archivos `khora-v*.ps1` paralelos. Esta regla existe de forma permanente debido a que tareas aisladas en el pasado produjeron 10 fragmentos divergentes y generaron regresiones masivas.
## EP-ARCHITECTURE — CONTEXTO CANÓNICO DEL ENTORNO PERSISTENTE

EP-ARCHITECTURE.md es un componente del propio Entorno Persistente de KHORA y constituye su **definición estructural canónica y vigente**.

### Regla obligatoria para agentes

ANTES de comprender, diagnosticar, modificar, reconstruir o depurar cualquier aspecto relacionado con el Entorno Persistente, el agente DEBE leer:

EP-ARCHITECTURE.md

Ese archivo contiene el modelo estructural del EP: entidades, fronteras, rutas, estados, componentes, responsabilidades, flujos, persistencia, autenticación, Vault, VS Code, Chrome, Guardian, Handoff, Cleanup, invariantes y referencias de implementación.

### Regla de sincronización

Cuando una modificación cambie directa o indirectamente la estructura, responsabilidades, flujo de ejecución, estado, persistencia, seguridad, dependencias, fronteras o mecanismos de reconstrucción del EP, el agente DEBE actualizar EP-ARCHITECTURE.md dentro del mismo cambio lógico.

Un cambio arquitectónico NO se considera terminado mientras EP-ARCHITECTURE.md contradiga la implementación vigente.

### Regla de autoridad

El código vigente determina el comportamiento real. EP-ARCHITECTURE.md proporciona el modelo estructural canónico para interpretar ese código.

Si ambos divergen:

1. identificar la diferencia;
2. determinar el comportamiento real de la implementación;
3. actualizar EP-ARCHITECTURE.md para representar la versión vigente;
4. verificar nuevamente los invariantes arquitectónicos.

### Prohibición

No crear una arquitectura paralela para resolver una necesidad que ya tenga un mecanismo dentro del EP. Primero debe localizarse y reutilizarse el componente existente.

Antes de crear código nuevo para una capacidad del EP, el agente DEBE localizar y reutilizar el mecanismo existente que ya desempeñe esa responsabilidad.

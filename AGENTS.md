# Khora Agents Knowledgebase

## Khora Session Script Anti-Fragmentation Rule

**IMPORTANT PERMANENT RULE**:
REGLA PERMANENTE (v7): El único punto de entrada es khora.ps1 (gate). PROHIBIDO crear scripts de entrada paralelos o copias khora-v*.ps1. Un componente = un archivo en modules/; el orden de carga lo define khora.barrel.ps1. Toda modificación sube $SCRIPT_VERSION en el mismo commit.
Está ESTRICTAMENTE PROHIBIDO crear archivos `khora-v*.ps1` paralelos. Esta regla existe de forma permanente debido a que tareas aisladas en el pasado produjeron 10 fragmentos divergentes y generaron regresiones masivas.

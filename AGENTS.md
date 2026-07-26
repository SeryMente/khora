# Khora Agents Knowledgebase

## Khora Session Script Anti-Fragmentation Rule

**IMPORTANT PERMANENT RULE**:
Toda modificación futura al script de Khora DEBE EDITAR el único script canónico existente (actualmente `scripts/khora/khora-v6.9.2.ps1`) y subir `$SCRIPT_VERSION`, renombrando el archivo en el mismo commit de manera acorde (e.g. `scripts/khora/khora-v7.0.0.ps1`).
Está ESTRICTAMENTE PROHIBIDO crear archivos `khora-v*.ps1` paralelos. Esta regla existe de forma permanente debido a que tareas aisladas en el pasado produjeron 10 fragmentos divergentes y generaron regresiones masivas. Solo un archivo debe existir en la carpeta `scripts/khora/` en cualquier momento.

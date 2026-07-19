# 38. Gravedad del dato y Exportación

## Qué hace
Garantiza que la copia canónica de los datos viva en el entorno del operador (bóveda, típicamente `~/.khora/` fuera del repositorio). Todo servicio externo o base de datos es tratado únicamente como una *vista*. Este módulo proporciona comandos de consola (CLI) para realizar exportaciones e importaciones de *todo* el grafo de forma canónica hacia un único artefacto empaquetado.

Los comandos CLI son:
- `khora exportar <destino>`
- `khora importar <origen>`

## Cómo se usa
```bash
# Exportar el sistema completo a un archivo tar.gz
khora exportar /ruta/a/mi_backup.tar.gz

# Restaurar en una instancia vacía
khora importar /ruta/a/mi_backup.tar.gz
```
El export produce un `.tar.gz` que contiene al menos un archivo `grafo.jsonl` (formato JSON línea a línea con la proveniencia intacta) y un `manifiesto.json` con hashes SHA-256 para verificación. Todo puede ser inspeccionado mediante herramientas comunes de Linux (`tar`, `cat`).

## Cómo se reemplaza
La lógica de exportación está acoplada directamente a los puertos definidos en `khora_kernel/api/` (CH-1), en particular `MemoriaOrganizada`. Si el mecanismo subyacente de almacenamiento cambia (por ejemplo, reemplazar el motor Neo4j u otro driver en CH-3), los comandos `exportar` e `importar` funcionarán intactos siempre y cuando el nuevo driver cumpla el contrato de la interfaz hexagonal.

## Costo de reemplazo
- **Talla**: L
- **Nota**: El formato del paquete (`.tar.gz` + `jsonl`) es un estándar abierto, reemplazar la lógica de empaquetado es factible utilizando otras librerías estándar como `zipfile`, o exportando en formatos binarios alternativos, aunque esto obligaría a crear herramientas de conversión si se desea compatibilidad hacia atrás en restauraciones (import).

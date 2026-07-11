# Board Orchestrator Tick

Este endpoint implementa la lógica automática de orquestación de tareas en Jules a partir de un tablero de Notion, logrando que el ciclo sea desatendido.

## Secretos requeridos

Para que el orquestador funcione, se deben configurar las siguientes variables de entorno:

- `NOTION_TOKEN`: Token de integración de Notion (Integration secret).
- `NOTION_ROADMAP_DATABASE_ID`: ID de la base de datos de Roadmap en Notion donde residen las tareas.
- `INTERNAL_TRIGGER_SECRET`: Clave secreta para autorizar llamadas internas. Este endpoint usa la misma validación que `/api/jules/trigger`.
- `MAX_CONCURRENT_JULES_SESSIONS` (opcional): Número máximo de sesiones de Jules simultáneas. Por defecto es 3.
- `DATABASE_URL`: URI de conexión a la base de Neon para tomar locks y registrar auditorías.

## Integración con Notion

El operador humano debe asegurarse de que la integración de Notion (correspondiente a `NOTION_TOKEN`) tenga acceso compartido y de lectura/escritura a la base de datos de Roadmap identificada por `NOTION_ROADMAP_DATABASE_ID`.

## Diagrama de decisión (Workflow del Tick)

1. **Locks**: Verifica un lock en Neon (tabla `orchestrator_lock`) para evitar corridas simultáneas.
2. **Consulta a Notion**: Busca páginas en la base de datos que estén en estados de candidatas (`Firmada · lista para prompt`) o activas (`En curso`, `Prompt emitido`, `En Jules`, `PR abierto`).
3. **Control de Capacidad**: Si el número de activas `>= MAX_CONCURRENT_JULES_SESSIONS`, no dispara nada (cupo lleno).
4. **Filtros (Elegibilidad)**: Una candidata es elegible si:
   - Su `Ejecutor` es `🤖 Jules`.
   - Todas las tareas de su lista de `⛔ Bloqueada por` están en un estado terminal (Hecho, Fusionado, Integrada, Auditada, Cancelado, Anulada).
   - Su `Zona de colisión` no se solapa con la de ninguna tarea activa actual, ni de ninguna otra candidata que ya haya sido seleccionada en este mismo tick.
   - Su cuerpo tiene un bloque de texto que empieza en `👻 PROMPT PARA JULES` y termina en `🖋️ FIRMA-JULES`.
5. **Disparo**:
   - Ordena por `Orden de disparo` y URL.
   - Dispara Jules reutilizando la lógica base.
   - Actualiza en Notion el `Estado` a `En Jules` y el `ID tarea Jules`.
6. **Auditoría**: Cada decisión (si fue ignorada y el motivo, o si fue disparada con éxito o error) se registra en Neon en la tabla `orchestrator_log`.

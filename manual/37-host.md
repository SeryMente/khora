# Host de módulos

## Qué hace
El host de módulos es la tabla de montaje del sistema (ADR-10). Se encarga de instalar, activar, desactivar y desinstalar módulos de manera declarativa sin modificar el kernel. Es la única pieza del sistema que conoce rutas absolutas, inyecta dependencias (puertos) en los módulos y previene caídas cratéricas mediante el montaje de mocks ante fallas de drivers. Asegura un aislamiento estricto: rechaza de inmediato cualquier módulo que intente importar el kernel directamente.

## Cómo se usa
El host se instancia inyectándole configuración (con la ruta base al corpus en `~/.khora/`), los puertos disponibles (los 6 definidos en CH-4) y una función `registrar` para trazar su ciclo de vida.
Log real de una aplicación trivial:
1. `instalar`: Verifica el código estáticamente. Rechaza imports ilegales. Almacena el manifiesto de la aplicación.
2. `activar`: Inyecta los puertos declarados al entorno aislado del módulo y lo inicializa en memoria, logueando el estado activo del componente. Si falla, loguea error y detiene la activación (sin crash).
3. `desactivar`: Limpia el módulo de la memoria activa.
4. `desinstalar`: Remueve permanentemente el módulo del sistema de registro del host.

## Cómo se reemplaza
Se reemplaza únicamente creando una nueva implementación de orquestación de vida en `kernel/src/khora_kernel/host/` que satisfaga los tipos declarados para `ManifiestoModulo` e inyecte los puertos. Post v1.0, el reemplazo podría involucrar mover la carga en proceso (en el mismo entorno de Python local) a la carga aislada mediante subprocesos o contenedores ligeros.

## Costo de reemplazo
El costo estimado de reemplazo de este componente en v1.0 es de talla **M**.
Esto se debe a la estricta naturaleza aislada: cualquier reemplazo requerirá construir o traer herramientas de parsing sintáctico y sandboxing más potentes si se desean barreras extra (OS-level sandboxing, hot-reload, etc.) pero el contrato exterior del host hacia el kernel y hacia los módulos en sí se mantiene ligero y basado en inyección pura.

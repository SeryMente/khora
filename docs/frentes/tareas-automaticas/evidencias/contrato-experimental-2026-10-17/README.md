# Contrato experimental aislado de tareas

No conectado a Khora. No selecciona proveedor, no autentica ni extrae tareas de texto con un modelo, no persiste ni implementa interfaz. Material de diseño ejecutable, no entrega productiva ni sustituto del contrato de arquitectura. Solo datos sintéticos.

Validaciones: forma cerrada, identidad/versionado/huella SHA-256 de snapshots, citas exactas con offsets UTF-16 sin partir pares subrogados, constancia de todas las fuentes autorizadas, cero tareas frente a fallo explícito, fechas calendario con evidencia y ancla de captura/zona. La constancia de fuentes no demuestra lectura/comprensión del modelo y una cita exacta no demuestra implicación semántica de la tarea o de su fecha. No declara esos problemas resueltos.

Ejecución realizada: Node.js v24.14.1 con soporte TypeScript nativo y node:test, 37 aprobadas, cero fallos. Tipos estrictos aislados con TypeScript 5.9.3 y @types/node 20.19.43; salida de tsc vacía y código 0. Dependencias instaladas sin scripts en directorio temporal único; sin cambios de package.json/lock del producto. Se preservan ambas fuentes y la salida real. No es el código perdido del modelo anterior ni evidencia de sus 25 pruebas.

La integración necesita adapter a snapshots autorizados, pruebas del aislamiento real, persistencia/idempotencia y control de descartes, ejecución durable, revisión de interfaz y política de procesamiento, pruebas de modelo y despliegue autenticado. No importar desde esta carpeta como runtime ni promoverla sin revisión del contrato vigente y del diff.

# Validación de la restauración v1.0

## Verificado en el sandbox

- `tests/validate_ep.py`: **OK**.
- Gate embebido en la API idéntico byte por byte al punto de entrada: **OK**.
- Codificación UTF-8 con marca de orden de bytes y finales CRLF para PowerShell: **OK**.
- Delimitadores léxicos de PowerShell: **OK**.
- Sintaxis de los archivos TypeScript y TSX nuevos mediante TypeScript `transpileModule`: **OK**.
- Parseo adicional de rutas y página mediante esbuild: **OK**.
- Escaneo de patrones de secretos en texto plano: **OK**.

## No verificado en este entorno Linux

- ejecución de Windows PowerShell 5.1;
- BitLocker, Disco Duro Virtual versión 2, tareas programadas y Protección de Datos de Windows;
- compilación completa de Next.js, porque el adjunto no contiene `node_modules` y la red del sandbox no resolvió paquetes;
- migración y comportamiento de PostgreSQL real;
- autenticación Google OpenID Connect, GitHub, Vercel y reinicios reales.

Estas pruebas son obligatorias antes de declarar despliegue de producción.

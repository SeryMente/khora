# Registro Anti-Regresión Khora

Este documento es el mapa que el operador usa para marcar la casilla 🧪 en el tablero.
Relaciona cada test de humo con la función del sistema que protege y la tarjeta de donde provino.

## Patrón de Adición
Para futuras fusiones, **cada nuevo Pull Request que entregue una funcionalidad (Feature)** debe añadir su respectivo smoke test de validación (headless) en la suite `smoke.spec.ts` de este directorio y agregar una fila a la tabla de abajo, documentando lo que protege.

Si el entorno de CI no tiene un navegador, el test correrá en modo headless como Playwright ya lo hace por defecto para CI.
Si se requieren secretos (tokens, keys) de producción o de servicios de terceros para probar comportamiento lógico, debe mockearse SOLO el sistema de terceros en el código de test para validar el funcionamiento de nuestro sistema.

## Tabla de Protección

| Test | Tarjeta / Origen | Qué protege |
| :--- | :--- | :--- |
| `PWA arranca y renderiza el shell (ATHANOR)` | Core / REG-01 | Asegura que la aplicación frontend levanta y no tiene errores fatales al mostrar la pantalla principal inicial. |
| `Flujo de captura de bitácora acepta entrada` | Entregado / REG-01 | Protege el modal principal de captura manual por teclado asegurando que se despliega desde ShellNav y permite ingreso de datos. |
| `Punto de entrada de dictado por micrófono existe` | Entregado / REG-01 | Protege que el botón del micrófono existe, aún si el sistema de captura de voz estuviera dañado o en mantenimiento (permite testing paralelo como en FIX-MIC sin colisiones). |
| `Endpoints existentes responden (status)` | Entregado / REG-01 | Garantiza que las rutas del backend en Next.js (como el healthcheck) resuelven con 200 OK y no arrojan errores de servidor (500). |

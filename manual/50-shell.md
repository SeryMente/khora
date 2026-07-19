# 50. Shell Terminal de Captura

La **Terminal de Captura** es la primera superficie visible de Khora, construida estrictamente como un cliente de la frontera del kernel (arquitectura hexagonal). Provee una interfaz de línea de comandos (REPL) para que el operador interactúe con el sistema.

## Propósito
Traducir la intención del usuario a llamadas hacia la API pública del kernel y hacer visible el resultado de estas llamadas, manteniendo cero lógica de negocio. Es simplemente la interfaz, no el motor.

## Capacidades (Comandos Mínimos)
- `capturar <texto>`: Delega al motor de ingesta y muestra un reflejo de que la entidad fue capturada.
- `consultar <pregunta>`: Delega al motor de consulta. Muestra las fuentes (provenance) honestamente, y si no hay información, reporta insuficiencia sin inventar contenido (cero alucinación/heurística).
- `olvidar <id>`: Delega la eliminación a través de la API y muestra el acta de olvido devuelta por el sistema (si el motor está disponible).
- `dictar`, `registro`: Estos comandos reportan indisponibilidad cuando el kernel aún no expone la funcionalidad pública para ellos. No se implementa lógica paralela en la shell.
- `version`: Muestra la versión del kernel reportada por la API pública.
- `salir`: Termina la sesión de la terminal.

## Privacidad por defecto
El prompt por defecto (`khora · ● privado >`) refleja que el sistema opera exclusivamente en contexto privado. No existe soporte ni rutas para alterar perfiles o cambiar visibilidades directamente desde esta versión de la shell.

## Diseño y Costo de Reemplazo
La terminal usa el módulo estándar `cmd` de Python, asegurando que se requiere de **cero dependencias** externas.
El costo de reemplazo es extremadamente bajo: la shell completa es descartable, dado que las reglas de retención, acceso, visibilidad y asimilación de datos viven en el kernel y sus adaptadores.

## Dependencias
- `khora_kernel.api` (frontera pública)
- Python Stdlib (`cmd`, `sys`)

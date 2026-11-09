# A · Instrucción urgente de transferencia segura de claves B2 · 2026-11-09

**A UUIDv7 local:** `01a1c19d-259d-7348-ab19-4ba87044a8d8`  
**Ciclo UUIDv7 local:** `01a1c19d-259d-7d30-b6df-67e4257d5f35`  
**Folio global:** PENDIENTE/NO ASIGNADO · FOL1 INACTIVO.

## Entrada literal del operador

> tienes 10 minutos para recuperar de la boveda de pc 14, llas notas efimeras, configurar las variavbles y aseguarrte que queden persistidas en boveda de fila4 por que me voy a cambiar de maquiona.

Se conserva literalmente, incluidos sus errores de transcripción.

## Intención

Extraer las notas efímeras actuales de EP Vault en PC-14, promover los valores Key ID y Master Application Key a variables formales de la bóveda canónica y asegurarse de que queden persistidas en la bóveda del perfil fila4 antes del cambio de máquina. No incluir los secretos en esta documentación ni en el chat.

## Resultado de la comprobación de acceso

- PC-14 apareció en línea en Desktop Commander con device ID `4fc35a07-2192-4b88-81ec-96cb450d565e`.
- Una consulta de identidad no destructiva devolvió `PC-14\PC 13`, perfil `C:\Users\PC 13`. No devolvió `CENTRAL\fila4`.
- La consulta de sesiones devolvió una sesión terminal bloqueada, PID 20908; no se examinó su contenido.
- El primer filtro de procesos buscó nombres coincidentes con EP/Vault y devolvió procesos de Epic; no se confirmó la presencia ni la lectura de la sesión EP Vault en ese proceso.
- Una llamada posterior de inspección devolvió que la cuota mensual de Desktop Commander está agotada y que las llamadas están pausadas. La respuesta del servicio indica expresamente no reintentar ni reconectar y remite al panel de Desktop Commander para revisar uso/restablecimiento.
- No se obtuvo un endpoint operativo fila4. No se utilizó PC10 ni se accedió a su sesión.

## Resultado operativo

**NO EJECUTADO:** lectura de las notas efímeras, promoción de los dos valores a la bóveda de fila4, read-back cifrado, importación de variables, configuración Vercel o prueba B2.

No se imprimió ni copió ningún secreto, no se cambió ninguna variable y no se alteró ninguna bóveda. La intención está autorizada por el operador, pero la ejecución está bloqueada por la disponibilidad de Desktop Commander y por la falta de una sesión efectiva de fila4.

## Continuación segura

1. Resolver el bloqueo de cuota de Desktop Commander desde su panel, sin repetir llamadas ni reconectar ahora.
2. Proporcionar una sesión autorizada con identidad efectiva `CENTRAL\fila4` para la bóveda destino.
3. Una vez disponible, recuperar los dos valores de la sesión efímera PC-14 sin mostrarlos; transferirlos mediante el mecanismo seguro soportado por EP Vault/bóveda, sin argumentos de línea de comandos ni logs.
4. Ejecutar el guardado de cada variable formal por separado; leer de vuelta la bóveda cifrada y comprobar que ambas entradas existen y se descifran correctamente dentro de fila4, sin imprimir el contenido.
5. Solo después importar temporalmente las variables y ejecutar el preflight B2 de solo lectura.

La presente entrada es registro de intención y comprobación parcial; no constituye evidencia de persistencia de las claves.

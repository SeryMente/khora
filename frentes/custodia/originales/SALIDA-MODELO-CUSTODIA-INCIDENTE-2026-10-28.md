# Salida visible · Investigación del dictado ausente y contador 40→20

- **Frente:** CUSTODIA.
- **Ciclo:** CUSTODIA-INC-RECUP-SES-20261028-R6K2M9Q4-C004.
- **Fecha:** 2026-10-28.
- **OCP vigente tras esta investigación:** CUSTODIA-v0.4.
- **Estado:** CUSTODIA-01 EN CURSO; incidente ABIERTO; garantías de recuperación productiva NO CERTIFICADAS.

## Dictamen

Se inspeccionaron en `SeryMente/khora/main` los componentes de hidratación/recarga de Ingreso, la insignia de conteo, el catálogo de recuperación y el flujo de checkpoints. El hallazgo principal es que las dos rutas de carga no reconcilian local y remoto de la misma forma:

- La hidratación inicial concatena las capturas locales con la página remota sin aplicar en ese punto la misma deduplicación que la recarga explícita.
- La recarga filtra algunas coincidencias locales/remotas; por tanto, la lectura reportada de **40 y después 20** es compatible con capturas duplicadas entre ambos orígenes, pero la lista real no fue adquirida y no se puede afirmar que ese sea todo el delta.
- El catálogo remoto pagina de **20 en 20**, con cursor. La insignia se deriva de las entradas cargadas, no de un total global. Por ello 20 tampoco demuestra que el catálogo completo tenga solo 20 unidades.

El operador reporta que falta un dictado realizado hacia el final de una sesión de terminal y que la última captura que puede ver data del 28 de octubre de 2026 a las 17:08, hora local. No se obtuvo la lista autenticada, sus páginas posteriores, la fila de checkpoint ni su acuse remoto; tampoco se verificó qué datos sobrevivieron al reinicio del perfil. El dictado no está localizado, pero **no se ha demostrado que se haya perdido definitivamente**.

El código intenta persistir localmente y luego enviar un checkpoint remoto. Solo declara el checkpoint remoto confirmado tras validar la respuesta. Si no hubo acuse y el reinicio eliminó IndexedDB del perfil de navegador, la copia local podría no estar disponible; esta secuencia es una hipótesis pendiente de evidencia, no la causa raíz confirmada.

## Artefactos persistentes

- [OCP · CUSTODIA-v0.4](https://github.com/SeryMente/khora/blob/main/frentes/custodia/OBJETO-CANONICO.md).
- [Inventario provisional · v0.2](https://github.com/SeryMente/khora/blob/main/frentes/custodia/evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md).
- [Informe del incidente · v0.1, ABIERTO](https://github.com/SeryMente/khora/blob/main/frentes/custodia/evidencias/INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md).
- [Lista provisional de tareas · v0.4](https://github.com/SeryMente/khora/blob/main/frentes/custodia/LISTA-TAREAS-PROVISIONAL.md).
- [Instrucción literal preservada](https://github.com/SeryMente/khora/blob/main/frentes/custodia/originales/INSTRUCCION-INCIDENTE-DICTADO-AUSENTE-2026-10-28.md).

## Estado comprobado de este ciclo

- Código estático leído: sí.
- Defecto de consistencia de conteo confirmado en código: sí.
- Que las 20 entradas de diferencia sean capturas perdidas: no demostrado.
- Catálogo productivo completo y páginas siguientes recorridos: no.
- Total real de sesiones únicas verificado: no.
- Dictado incidente localizado: no.
- Recuperación productiva ejecutada/confirmada: 0 / 0.
- Cambios de código, datos, credenciales, proveedor o despliegue: ninguno.

## Siguiente paso

Desde la sesión autenticada autorizada, recorrer el catálogo hasta `nextCursor=null`, reconciliar las identidades de sesión entre copias locales/remotas y revisar Custodia por si la sesión está archivada. Con acceso autorizado de solo lectura, cotejar la ventana temporal de checkpoints y cualquier acuse disponible. Si se encuentra el dictado, recuperar en un destino separado y comprobar lectura de vuelta, integridad y procedencia sin alterar el original. Después se deberá implementar y probar una sola función de reconciliación para hidratación/recarga, corregir la semántica del contador y añadir pruebas de paginación, duplicados, fallo remoto y reinicio de perfil. Estas correcciones no se han realizado ni quedan autorizadas automáticamente por este documento.

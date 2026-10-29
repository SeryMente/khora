# Salida visible · Ampliación del plan de recuperabilidad

- **Frente:** CUSTODIA.
- **Ciclo:** CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C005.
- **Fecha:** 2026-10-28.
- **OCP:** CUSTODIA-v0.5.
- **Lista provisional de tareas:** v0.5.
- **Metodología leída:** Samantha v358 · NX-358m; Metacanon 1.23; GOW v2.7; blob 89a28e4d05f5baab9c4b86abdb9fbfc532690c75.
- **Propósito:** mantener el objetivo de recuperabilidad y ampliar las tareas para investigar los dictados que no aparecen o parecen no recuperables.

## Tareas que quedan

### CUSTODIA-01 · Recuperar y verificar las unidades que hoy aparecen en Recuperación

**Prioridad:** P0 · EN CURSO.

Adquirir el catálogo autenticado completo, recorrer todas las páginas hasta cursor nulo, reconciliar entradas locales y remotas por identidad, y recuperar cada unidad visible sin sobrescribir el original. Comprobar texto, audio, integridad y procedencia por lectura de vuelta. El conjunto actualmente visible es solo un universo de trabajo; no se presumirá que contiene todas las capturas que deberían existir.

### CUSTODIA-03 · Investigar las capturas esperadas que no aparecen o parecen no recuperables

**Prioridad:** P0 · ABIERTA.

Investigar el dictado que el operador esperaba recuperar y cualquier otra captura que parezca ausente. Para la incidencia actual, la última unidad que el operador dice poder ver fecha del **28 de octubre de 2026 a las 17:08**; la captura esperada posterior no ha sido localizada. Recorrer todo el catálogo, revisar fuentes locales/remotas y posibles capturas archivadas en Custodia; consultar los registros de checkpoint y acuses de servidor únicamente mediante acceso autorizado. Establecer el alcance real de las ausencias y sus causas; recuperar las unidades localizadas de forma no destructiva. No inferir que la diferencia 40→20 equivale a 20 dictados perdidos.

Cada caso debe quedar clasificado con evidencia como recuperado y verificado, localizado pero bloqueado, archivado, duplicado, parcial/incompleto, registro existente con objeto no comprobado, no localizado tras revisar fuentes especificadas, irrecuperabilidad demostrada o no determinado. «No aparece» y «no se pudo comprobar» no son sinónimos de «se perdió definitivamente».

**Criterio de cierre:** la captura denunciada y los demás casos detectados tienen un estado sustentado; se registra el universo examinado y los límites de acceso; todo elemento rescatado pasa lectura de vuelta e integridad/procedencia con el original preservado; se documentan causas y medidas preventivas. Si faltan fuentes necesarias, la tarea permanece abierta.

### CUSTODIA-02 · Revisar el diseño de la lista de tareas conforme a la metodología de OCP/FT

**Prioridad:** P1 · PENDIENTE.

Conservar su identificador original. Revisar si la lista provisional y su relación con el OCP satisfacen la metodología vigente, sin crear un segundo estado canónico. Esta tarea queda después de encaminar las dos prioridades operativas de recuperabilidad.

## Orden operativo

CUSTODIA-01 y CUSTODIA-03 son prioridades P0 y se deben abordar en paralelo en lo posible: una verifica y recupera lo que aparece; la otra investiga el universo que falta o parece no estar disponible. CUSTODIA-02 es P1 y conserva su objetivo metodológico independiente.

## Estado y límites comprobados

La ampliación de tareas y su registro persistente sí se completaron. La causa del incidente sigue abierta: no se adquirió el catálogo autenticado completo, no se obtuvo la fila/acuse del checkpoint de la captura y no se localizaron las unidades productivas individualmente. No se realizó recuperación productiva ni se modificaron código, datos, credenciales, configuración o despliegue. La investigación no declara pérdida definitiva ni garantiza recuperación sin evidencia.

## Fuentes persistentes

- [OCP de Custodia · v0.5](https://github.com/SeryMente/khora/blob/main/frentes/custodia/OBJETO-CANONICO.md)
- [Lista provisional de tareas · v0.5](https://github.com/SeryMente/khora/blob/main/frentes/custodia/LISTA-TAREAS-PROVISIONAL.md)
- [Inventario provisional de recuperabilidad · v0.3](https://github.com/SeryMente/khora/blob/main/frentes/custodia/evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md)
- [Informe del incidente · v0.2, abierto](https://github.com/SeryMente/khora/blob/main/frentes/custodia/evidencias/INCIDENTE-DICTADO-AUSENTE-Y-CONTEO-40-20-2026-10-28.md)
- [Instrucción original de ampliación](https://github.com/SeryMente/khora/blob/main/frentes/custodia/originales/INSTRUCCION-AMPLIACION-TAREAS-RECUPERABILIDAD-2026-10-28.md)

# Salida documental · Reordenamiento y secuencia de CUSTODIA

- **Ciclo:** CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C006.
- **Fecha:** 2026-10-28.
- **Objeto canónico:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md); el estado vivo del frente permanece allí.
- **Instrucción literal conservada:** [INSTRUCCION-REORDENAMIENTO-Y-ACTUALIZACION-RECUPERABILIDAD-2026-10-28.md](INSTRUCCION-REORDENAMIENTO-Y-ACTUALIZACION-RECUPERABILIDAD-2026-10-28.md), blob `f44aa5588389bdf382fd1c976a7c7e6d84252db6`.

## Decisión

Se retira **CUSTODIA-02** de la lista activa a petición del operador. Se conserva su referencia solamente en la historia documental anterior; el identificador no se reutiliza y no se interpreta la retirada como certificación metodológica de la lista.

Se incorpora **CUSTODIA-04 · Completar la investigación y actualizar el sistema para restablecer la recuperabilidad comprobable**, con prioridad P0 y estado ABIERTA. Quedan tres tareas activas: CUSTODIA-01, CUSTODIA-03 y CUSTODIA-04.

## Secuencia operativa

### Fase 1 · Línea base no destructiva — CUSTODIA-03

Antes de restaurar o cambiar el producto, obtener el catálogo autenticado y recorrer todas las páginas hasta el final; reconciliar por identidad las representaciones locales/remotas; buscar capturas archivadas en Custodia y cotejar, cuando exista autorización de solo lectura, los checkpoints asociados a la ventana del dictado ausente. Registrar conteos minimizados, fuentes consultadas y límites de evidencia. No asumir que la diferencia reportada 40→20 equivale a veinte pérdidas.

### Fase 2 · Recuperación de las unidades visibles — CUSTODIA-01

Con la línea base preservada, recuperar individualmente las unidades disponibles y verificar contenido, audio, integridad y procedencia según aplique. Mantener los originales intactos. Esta tarea puede avanzar en paralelo con la continuación de CUSTODIA-03; no es necesario esperar al cierre de toda la investigación histórica para recuperar datos que ya se puedan localizar con seguridad.

### Fase 3 · Corrección sistémica y verificación — CUSTODIA-04

Consolidar las causas demostradas por CUSTODIA-01 y CUSTODIA-03, corregir los defectos reproducibles, añadir pruebas unitarias/integración/navegador con datos sintéticos, validar paginación y reconciliación local/remoto, corregir el tratamiento de partes de audio, y dar al contador un significado fiable. Validar el flujo completo de recuperación en el entorno autorizado y comprobar el resultado por lectura de vuelta. La modificación de código o una compilación satisfactoria no bastan para declarar recuperabilidad actualizada. Las acciones de publicación y comprobación productiva deberán ceñirse a la autorización y el acceso disponibles.

## Criterio global

- El conjunto visible queda recorrido por completo y cada unidad tiene una clasificación/evidencia individual.
- La captura denunciada como ausente queda recuperada y verificada, localizada con impedimento, o clasificada como no localizada/irrecuperable solo con las fuentes y pruebas pertinentes documentadas.
- Las causas demostradas se corrigen y sus pruebas de regresión pasan.
- La actualización se valida de extremo a extremo; si falta acceso productivo autorizado o evidencia de lectura real, la garantía sigue sin certificarse y CUSTODIA-04 permanece abierta.
- Ninguna recuperación sobrescribe o elimina el original, y no se introducen transcripciones, audios, credenciales, cookies, UUID reales ni URLs privadas en el repositorio.

## Estado factual al cerrar este ciclo documental

El ciclo solo actualizó el plan y su evidencia documental. No se obtuvo acceso a la interfaz autenticada, no se recorrieron páginas del catálogo productivo, no se localizó el dictado que el operador reportó como ausente y no se ejecutaron recuperaciones productivas ni cambios de código/despliegue. La pérdida definitiva del dictado sigue sin demostrarse; tampoco se ha demostrado su recuperabilidad. El contador 40→20 sigue sin reconciliación sobre las entradas reales.

## Artefactos actualizados y lectura de vuelta pendiente de registrar en el OCP

- Lista provisional de tareas v0.6: blob `a1ed1ee94a58796f9fe47c1d00980645d4dab580`; commit `334400187e4ff5baf9fbd8ab4ba7cec3317e826b`.
- Inventario de recuperabilidad v0.4: blob `7a7260053d0df71404beaec070c734b6960c6966`; commit `87f16435e5d2a27fb6a6b3104a0552aba18deebd`.
- Informe del incidente v0.3: blob `5ae953c3119d25228c8696a94ed49df2d5825b14`; commit `112aa294b4cee43784fa63801801795d1e95efe7`.
- Instrucción literal nueva: blob `f44aa5588389bdf382fd1c976a7c7e6d84252db6`; commit `51cc35c72b45fc73260a0ed202e951a64c62614d`.

Esta salida conserva el criterio de secuencia y los límites; no es una fuente de estado paralela al OCP.

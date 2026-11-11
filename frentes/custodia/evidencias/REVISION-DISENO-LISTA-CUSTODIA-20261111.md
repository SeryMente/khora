# Revisión de diseño de tareas provisionales · CUSTODIA
Fecha: 2026-11-11 · Frente: CUSTODIA · OCP de entrada: CUSTODIA-v0.61 · Lista de entrada: v0.49.

## Dictamen

El objetivo y el expediente único CUSTODIA-01 están bien planteados. La descomposición provisional, sin embargo, no estaba lista para dirigir ejecución: mezclaba fases operativas, guardrails, dependencias contingentes y un backlog ajeno al archivo; además, varios estados no reflejaban las últimas compuertas y la fase 01.a seguía prescribiendo Chrome/RDC aunque el operador excluyó expresamente ese canal.

## Defectos corregidos

1. **Canal local contradictorio:** se elimina Chrome, monitor y RDC como ruta de inspección. Los datos locales de las dos sesiones permanecen identificados y preservados, pero su procesamiento queda bloqueado hasta disponer de un canal independiente permitido.
2. **Bloqueos genéricos:** se separan el contexto NextAuth requerido por texto sin audio, el GET físico histórico B2 y el acceso a los 216 fragmentos locales. No se agrupan bajo un mismo «acceso al runtime».
3. **Estado B2 impreciso:** el preflight del deployment Production muestra PASS en autenticación/configuración, pero no ha descargado las 77 partes históricas. Se refleja como prevalidado, con GET físico pendiente; no como recuperación aprobada ni como bloqueo de credenciales B2.
4. **Mezcla de tipos de trabajo:** la búsqueda de X_KHORA_KEY se convierte en dependencia condicional solo cuando un objeto concreto falle al descifrarse; el PIN queda como guardrail; la lectura EP de credenciales GitHub se retira del sprint porque no es criterio ni dependencia demostrada del archivo; la dependencia del catálogo queda como backlog separado y no activo.
5. **Criterios de salida insuficientes:** se hace explícito qué prueba cierra cada fase: titularidad y deduplicación; checkpoint descifrado y SHA; GET físico y cotejo por objeto; copia local y read-back; clasificación residual por componente; y reconciliación final del inventario.

## Descomposición vigente

| Fase | Estado actualizado | Criterio de salida |
|---|---|---|
| CUSTODIA-01.a · Conciliación | EN CURSO | Cada unidad identificada por fuente, titularidad, componentes, vínculo existente y estado; excluidos únicamente por evidencia. No usar navegador local. |
| CUSTODIA-01.b · Texto sin audio | BLOQUEADA POR CONTEXTO NEXTAUTH INDEPENDIENTE | Recuperar por endpoint canónico, descifrar y cotejar SHA; POST de archivo y lectura de vuelta con propietario y vínculo. Primer candidato: 48586f80-63d6-4969-9691-27e55cb5d5f5. |
| CUSTODIA-01.c · Audio B2 | PREVALIDADA · GET HISTÓRICO PENDIENTE | Para cada objeto: GET, longitud, bytes y SHA-256 cotejados; descifrado cuando corresponda; archivo y read-back del Volcado. Candidato prioritario: manifiesto de 77 partes. |
| CUSTODIA-01.d · Audio local | BLOQUEADA POR CANAL LOCAL EXCLUIDO | Obtener una vía independiente autorizada que no utilice monitor, Chrome local ni RDC; después procesar las 216 partes conservando originales y verificando read-back B2. |
| CUSTODIA-01.e · Residuales | EN CURSO | Registrar por registro/componente la existencia, proveedor, titularidad, integridad y causa actual del bloqueo, sin inferir pérdida. |
| CUSTODIA-01.f · Cierre | PENDIENTE · GATE FINAL | Conciliar todos los registros; retirar pendientes solo tras read-back verificado; dejar únicamente residuales con causa actual sustentada. |

## Dependencias y guardrails fuera de la secuencia de fases

- **X_KHORA_KEY:** no iniciar una búsqueda autónoma. Solo activar la ruta de dos bóvedas previamente delimitada si una recuperación concreta demuestra fallo de descifrado atribuible a esa llave; no rotar ni reemplazar.
- **PIN:** no restablecerlo como método de recuperar la llave; no es una fase.
- **Credencial GitHub/EP:** la comprobación de /api/ep/github-credential no es necesaria para el archivo definido ni bloquea CUSTODIA-01. Queda fuera del sprint salvo nueva evidencia de dependencia directa.
- **Catálogo y X_KHORA_KEY:** backlog de producto separado, no activo y sin cambios de código dentro de CUSTODIA-01.

## Límites de ejecución

No usar monitor, Chrome local ni RDC. No leer ni copiar cookies, contraseñas o secretos. No modificar código, variables, proveedores ni despliegues; no ejecutar escrituras directas en Neon; no borrar ni sobrescribir originales. Las operaciones de archivo permanecen sujetas al flujo canónico, titularidad, idempotencia, integridad y read-back.

**Resultado de la revisión:** el diseño se corrige sin crear expedientes maestros nuevos ni cambiar la autorización de archivo. La lista provisional se hace ejecutable por fases; el OCP conserva la prioridad de texto, después sesiones textuales restantes y luego B2.

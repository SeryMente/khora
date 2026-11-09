# Instrucción original · Autorización B2 Production · 2026-11-09

## A · Entrada literal del operador

«Correcto , actualiza tareas provisionales rapidamente, y resuelve.»

## Contexto inmediato de la respuesta

La entrada responde a la pregunta explícita: «¿Autorizas expresamente esa operación sobre las credenciales B2 de Production y el despliegue productivo condicionado a que todas esas pruebas pasen? No se expondrían los secretos en esta conversación.»

## Lectura de autorización y alcance

El «Correcto» se registra como asentimiento contextual a la autorización solicitada, limitado a:

1. Verificar y, solo si la evidencia lo justifica, corregir las variables y credenciales B2 del entorno **Production** del proyecto Vercel `khora-web`, usando exclusivamente la bóveda canónica autorizada de Khora y sin revelar valores.
2. Ejecutar el despliegue productivo **solo después** de que se satisfagan y queden registrados todos los criterios técnicos de aceptación de CUSTODIA-B2-006 y las verificaciones residuales aplicables de CUSTODIA-B2-005.
3. No rotar ni sustituir una clave por mera sospecha. Toda corrección debe estar vinculada a un diagnóstico confirmado, preservar el resto de las variables y utilizar el flujo seguro de la bóveda.

## Límites que permanecen

- No copiar secretos, claves, tokens, cabeceras Authorization ni valores descifrados a la conversación, logs o documentos.
- No leer ni exportar contenido personal de dictados.
- No borrar ni sobrescribir objetos originales; las pruebas de escritura usan objetos sintéticos identificables y limpian únicamente los objetos creados por la propia prueba.
- No cambiar seguridad, CORS, permisos ni configuración del bucket.
- No ejecutar SQL, backfill ni migraciones manuales sobre Neon Production. Antes de cualquier despliegue se debe inspeccionar el hook de build existente; si implica mutaciones productivas fuera de esta autorización, detener ese tramo y documentarlo.
- No inferir éxito a partir de BUILD READY. El despliegue queda condicionado a preflight, PUT/GET físico, SHA-256/bytes, vínculo de partes, archivado E2E y recuperación posterior a recarga.
- No autoriza cambios en otras credenciales o variables ajenas a B2.

## Trazabilidad

- UUIDv7 local de esta entrada: `01a1c17d-189a-7fea-a644-6be002e2c07a` (no es ID nativo de plataforma ni folio FOL1).
- OCP padre: `frentes/custodia/OBJETO-CANONICO.md`.
- Lista auxiliar: `frentes/custodia/LISTA-TAREAS-PROVISIONAL.md`.
- Tarea de ejecución: `CUSTODIA-B2-006`; diagnóstico residual: `CUSTODIA-B2-005`.
- Estado al registrar la autorización: **autorización recibida; ejecución y aceptación técnica pendientes**.

# Instrucción del operador · B2 KHORA y backfill Vercel Blob · 2026-11-09

- **A local UUIDv7:** 01a1c28e-d442-7dc9-a18f-c1fdac28de01
- **Evento local UUIDv7:** 01a1c28e-d442-7297-911a-c7b0b5da5be1
- **Fecha:** 2026-11-09
- **Tipo:** autorización acotada de ejecución y actualización del alcance del control de Custodia.

## Literal de la instrucción recibida

> RESUELVE AQCCESO BACKVBLAZE PARA KHORA CONFROME AL CONVERSACIOn, Y QUE AHORA TODO SE GUARDE EN BACKBLAAZE; REVISA LAS TAREAS PROVISIONAALES DALES UNA ACTUALZIADITA: RECUERDA SE TRATA DE TENER ACCESO A BACKBGLAZE PARA GUARDAR TODO A APRTYIR D EAHORA; y luego pasar todo lo de VERCEL BLOB AHI.

## Aclaraciones explícitas vigentes en esta conversación

> la cuenta es de uso exclusivo para el propostiod e kjhora, la master applciation se usara de manera ubicua. Putno final.

> Nada de eso, eso es estupido, olvbidate de fila4, y nunca asumas de nuevo que existe, PC 7 es la unica terminal rdc disponbile.

## Alcance autorizado

1. Usar exclusivamente la Master Application Key de la cuenta Backblaze dedicada a KHORA; no crear Application Keys individuales ni usar credenciales de EP.
2. Configurar las variables maestras canónicas de KHORA en Vercel Production mediante transferencia local segura, ejecutar preflight y publicar el runtime solo después de pruebas satisfactorias.
3. Dirigir todas las nuevas escrituras de KHORA a Backblaze B2. Vercel Blob permanece como origen histórico/lectura legacy hasta completar el backfill.
4. Después de estabilizar el archivado, inventariar y copiar a B2 todo el universo de objetos Vercel Blob, verificar cada copia mediante read-back, bytes, SHA-256 y validación del formato/cifrado, y reconciliar sus referencias.
5. Conservar los originales de Vercel Blob durante y después del backfill; esta instrucción no autoriza borrado de fuentes.
6. La única terminal RDC operativa disponible es PC-7. La identidad efectiva debe observarse en la sesión real de PC-7; no se debe asumir otra cuenta, perfil o terminal.

## Límites conservados

- No crear claves adicionales de Backblaze.
- No mezclar ni intercambiar las cuentas o credenciales B2 de KHORA y EP.
- No modificar CORS, seguridad, lifecycle ni otras políticas del bucket fuera de lo estrictamente necesario y de una autorización específica.
- No cambiar variables o credenciales ajenas a KHORA B2.
- No ejecutar referencias productivas de Neon hasta corregir el defecto de conteo/posestado de updateReferences(), demostrar el dry-run, transacción e idempotencia y comprobar el estado final.
- No borrar ni sobrescribir objetos fuente de Blob.
- No volver a solicitar ni asumir CENTRAL\\fila4, PC-14 o PSK14 como requisito. PC-7 es la única terminal RDC disponible.

## Criterios de aceptación

- Vercel Production registra las dos variables maestras canónicas como secretos y el runtime publicado supera preflight.
- Un archivado real E2E de KHORA completa sin fallback silencioso a Blob; una falla de B2 deja el dato local/pendiente y comunica degradación.
- Cada objeto histórico Blob está inventariado; su copia B2 se lee de vuelta y coincide en bytes/SHA-256; cada referencia queda reconciliada y comprobada.
- El backfill no borra originales; la aceptación no se infiere de una respuesta de upload.

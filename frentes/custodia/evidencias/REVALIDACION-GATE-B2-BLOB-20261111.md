# Revalidación del gate B2 y estado de Blob · 2026-11-11

## Propósito y alcance

Evidencia instrumental de CUSTODIA-01. Esta comprobación no cambia el objetivo: archivar todos los registros propios que puedan archivarse, conservando titularidad, integridad, procedencia y vínculo; dejar pendientes solo los casos con un impedimento actual y documentado.

## Resultado de la revalidación

### Vercel Blob

La consulta de metadata del store `khora-audio` confirmó:

- Store: `store_VyX9EI8q6DKhp4RV`.
- Estado: `limits-exceeded-suspended`.
- `billingState=suspended`.
- `usageQuotaExceeded=true`.
- Tamaño declarado: 1.010.497.194 bytes.
- Objetos declarados: 636.
- Última actualización de metadata: `2026-11-11T05:41:45.504Z`.

No se ejecutó listado ni GET físico de objetos. La metadata no permite determinar si la suspensión se debe al límite del plan o a una decisión del proveedor. Se mantiene el bloqueo: revisar el store en https://vercel.com/dashboard/storage y, si no hay una reactivación clara o la suspensión parece incorrecta, abrir soporte en https://vercel.com/help. No borrar, recrear, vaciar ni sobrescribir el store.

La compuerta de lecturas históricas no se modificó. No habilitar `KHORA_LEGACY_BLOB_READS_ENABLED` hasta que el proveedor permita leer físicamente un objeto de prueba y se verifiquen bytes, longitud y SHA-256.

### Gate B2 y acceso de ejecución

- El esquema de Neon confirma la presencia de las tablas `public.dictado_session`, `public.dictado_audio_parte`, `public.dictado_checkpoint` y `public.volcado`. La consulta fue de metadatos del esquema; no leyó ni modificó filas de negocio.
- El manifiesto B2 de 77 partes y 6.251.747 bytes continúa siendo la prioridad documental definida por la conciliación del 2026-11-10; esta revalidación no volvió a consultar sus filas individuales.
- El canal de ejecución disponible no permitió verificar una sesión NextAuth del propietario ni el estado de desbloqueo de la bóveda KHORA. No se leyeron cookies, credenciales ni secretos.
- No se efectuó GET B2, descifrado ni recálculo SHA de objetos. Por tanto, el estado `verificado` almacenado en Neon sigue sin constituir prueba de disponibilidad física actual.

### Límites y no-acciones

Durante esta comprobación:

- Las lecturas de Neon se limitaron a `information_schema`.
- No hubo INSERT, UPDATE, DELETE ni transacción de escritura en Neon.
- No se modificaron objetos ni configuración de B2 o Blob.
- No se modificaron variables, claves, código, despliegues ni el clon local.
- No se creó ni vinculó ningún Volcado.
- No se declaró recuperado, duplicado, perdido o corrupto ningún registro.

## Próxima operación estrictamente necesaria

1. Disponer de un canal de ejecución autenticado como propietario en KHORA Production y con la bóveda desbloqueada, sin compartir cookies ni secretos.
2. Ejecutar GET/read-back del manifiesto B2 continuo de 77 partes mediante el runtime canónico; comprobar por cada parte respuesta, longitud, bytes y SHA-256 recalculado.
3. Solo tras superar esa prueba, archivar mediante `POST /api/dictado` y verificar de vuelta el Volcado y el vínculo de sesión.
4. Mantener Blob bloqueado hasta intervención del operador en Vercel y un GET físico satisfactorio.

## Fuentes vinculadas

- [OCP CUSTODIA · §27](../OBJETO-CANONICO.md): conciliación de titularidad, hashes y manifiestos B2.
- [RECONCILIACIÓN Neon/manifiestos B2 · 2026-11-10](RECONCILIACION-NEON-MANIFIESTOS-B2-20261110.md).
- [Preflight B2 Production/estado local · 2026-11-10](PREFLIGHT-B2-PRODUCTION-Y-ESTADO-LOCAL-20261110.md).
- Documentación oficial de Vercel: https://vercel.com/docs/vercel-blob/blocked-store.

**Conclusión:** el bloqueo Blob permanece confirmado por metadata del proveedor. El candidato B2 de 77 partes conserva prioridad, pero su recuperabilidad física no está demostrada. CUSTODIA-01 sigue activa y no se archiva ningún registro por inferencia.

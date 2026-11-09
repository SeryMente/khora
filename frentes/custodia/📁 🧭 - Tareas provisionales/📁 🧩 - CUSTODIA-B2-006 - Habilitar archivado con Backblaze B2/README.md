# CUSTODIA-B2-006 · Habilitar archivado con Backblaze B2

> **Estado:** propuesta_pendiente_aprobacion · **Prioridad:** P0 · **Hito:** 2 de 5.
> **Depende de:** CUSTODIA-B2-005. **Desbloquea:** CUSTODIA-B2-007.
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.
> **Alcance propuesto:** corrección en rama y prueba no productiva. Producción conserva una compuerta separada.

## 1. Objetivo

Restablecer el archivo de registros de Cora/Khora usando Backblaze B2 como destino operativo inmediato, con captura de audio/texto, persistencia física, lectura de vuelta y vínculo a la sesión comprobados.

B2 es el medio inmediato para desbloquear el servicio; esta tarea no declara que deba ser el único proveedor final.

## 2. Precondiciones

- CUSTODIA-B2-005 identifica la causa exacta y no deja un bloqueo sin caracterizar.
- El acceso a la cuenta/bucket correcto de Khora está disponible.
- La credencial necesaria existe en la bóveda autorizada de Khora y no requiere una rotación no aprobada.
- La rama de código se basa en main reconciliado y cuenta con pruebas del fallo previo.

Si se requiere cambiar/rotar una credencial o modificar producción, se detiene solo esa mutación y se solicita la autorización específica correspondiente. No se imprimen ni transportan secretos por chat.

## 3. Alcance

**Incluye**
- Corregir el problema identificado de autenticación/configuración B2 en una rama.
- Validar autenticación, cuenta, capacidades requeridas, bucket privado y región.
- Hacer PUT/GET físico de un objeto sintético cifrado, comparando bytes, longitud y SHA-256.
- Verificar subida de partes, vínculo persistido, manifiesto y archivado de extremo a extremo en entorno no productivo.
- Comprobar reintentos, interrupción de red y recuperación tras recarga.

**No incluye**
- Fallback silencioso a Blob mientras se implementa el desbloqueo B2.
- Merge, deploy o cambio de selector en producción sin autorización específica.
- SQL/backfill en Neon Production.
- Borrado/sobrescritura de fuentes históricas o cambio de seguridad/CORS del bucket.

## 4. Secuencia mínima

1. Corregir solo la causa confirmada en CUSTODIA-B2-005.
2. Ejecutar preflight B2 real de solo lectura.
3. Ejecutar PUT → GET → SHA/longitud/KHC1 sobre objeto sintético.
4. Ejecutar dictado con varias partes y confirmar cada parte por lectura de vuelta y vínculo.
5. Ejecutar «Archivar registro», recargar y recuperar la captura archivada.
6. Preparar el recibo de aceptación y una compuerta separada para producción.

## 5. Criterios de aceptación

| Criterio | Evidencia exigida | Resultado |
|---|---|---|
| B2 autentica y el bucket es el correcto/privado | Preflight real con recibo saneado | PENDIENTE |
| Objeto sintético se conserva físicamente | PUT/GET y SHA-256/longitud coincidentes | PENDIENTE |
| Cada parte queda vinculada y verificada | Registro de parte más read-back físico | PENDIENTE |
| El archivado concluye sin omitir partes | E2E con múltiples partes y manifiesto íntegro | PENDIENTE |
| Se recupera tras recarga | Read-back de texto/audio desde el flujo de recuperación | PENDIENTE |
| No hay fallback silencioso | Pruebas de error y revisión de rutas | PENDIENTE |

## 6. Salida

Cora vuelve a aceptar y archivar registros de prueba de extremo a extremo en el entorno autorizado. La publicación de producción y la aceptación con una cuenta propietaria real son una compuerta independiente; no se infieren del éxito no productivo.

# CUSTODIA-B2-003 · Preflight y seguridad del proveedor

**Estado:** `en_curso`  
**Tipo:** tarea provisional subordinada al OCP Custodia.  
**Identificador:** local y estable dentro del registro provisional de este frente; no es folio global, sesión ni control.

## Enunciado enraizado en la instrucción

**Fragmento literal de origen:**

> «sigue resolviendo la migración al backplane de extremo a extremo»

**Fuente literal:** [INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md](../../../originales/INSTRUCCION-SPRINT-BACKPLANE-2026-10-31.md).

**Desglose operativo (derivado, no cita literal):** asegurar que el preflight de Backblaze B2 pruebe cifrado, privacidad del bucket, lectura de vuelta, PUT firmado y CORS de origen exacto sin cambiar configuración del proveedor como efecto implícito de una comprobación.

## Estado y evidencia observada

- Se inspeccionó `scripts/preflight-object-storage.ts`, SHA de blob `851d1d26e1eff2b2e73635cb8b45442d9bd32525`.
- **Hallazgo de seguridad/configuración:** el script importa `PutBucketCorsCommand` y, si no encuentra una regla, añade una regla CORS al bucket. Esto convierte un preflight de validación en una mutación real del proveedor. Se requiere retirar esa escritura automática: el preflight debe leer la configuración existente y fallar con un código explícito cuando falte la regla.
- El script crea objetos sintéticos de diagnóstico/staging y los elimina de manera acotada por clave/sesión. No se ha ejecutado; esa comprobación debe apuntar a un bucket/entorno de prueba, no a producción.
- No se han verificado aún privacidad anónima, CORS efectiva, permisos de las claves ni región/bucket del entorno de prueba.

## Criterio de cierre

1. El preflight no debe importar ni invocar `PutBucketCorsCommand`, ni cambiar políticas, CORS, ACL, claves u otros parámetros del bucket.
2. Debe probar en el entorno aislado: escritura cifrada sintética, lectura firmada, cotejo SHA, rechazo de acceso anónimo, PUT firmado temporal, CORS del origen autorizado y rechazo de un origen no autorizado.
3. Una configuración ausente debe producir un bloqueo claro y una instrucción operativa separada; no debe autocorregirse.
4. Los objetos sintéticos deben usar prefijos de diagnóstico/staging, registrar exactamente las claves propias y eliminar solo sus versiones exactas; si la limpieza no se verifica, debe declararse.
5. Registrar los SHA/read-back del preflight y no transferir sus resultados sintéticos a evidencia de integridad de datos reales.

## Límites

No ejecutar el preflight contra el bucket productivo en esta etapa y no cambiar CORS/seguridad del proveedor real. La corrección de código se prepara en la rama de migración; cualquier ajuste de configuración del bucket requiere una acción y autorización material específicas. La responsabilidad, autorización y sesión se heredan del [control único de Custodia](../../CONTROL-RESPONSABILIDAD.json), generación 6; no se crea un control por tarea.

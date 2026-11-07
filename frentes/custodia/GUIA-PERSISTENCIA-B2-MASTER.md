# Guía operativa · Persistencia Backblaze B2 con Master Application Key

**Ámbito:** frente transversal CUSTODIA de `SeryMente/khora`.  
**Estado:** procedimiento recomendado y experiencia transferida desde EP; no implica que la migración Khora esté ejecutada ni que producción esté autorizada.  
**Objetivo:** reproducir la prueba de persistencia de EP con el menor número de pasos, usando exclusivamente la **Master Application Key de la cuenta B2 dedicada a Khora**, sin crear ni depender de Application Keys individuales.

## 1. Decisión de arquitectura

1. Khora debe tener una **cuenta Backblaze B2 separada** de EP y de cualquier otro proyecto.
2. Dentro de esa cuenta, usar la pareja nativa de la Master Application Key: `keyID` + `applicationKey`. No generar claves individuales por bucket, flujo, entorno o componente.
3. La Master Application Key es de alcance amplio dentro de su cuenta. La separación entre proyectos se consigue principalmente mediante cuentas distintas; el bucket y prefijo de Khora se fijan como límites operativos, no se presentan como restricciones impuestas por la Master Key.
4. No reutilizar la cuenta, credenciales, caché de autorización, bóveda ni identificadores de EP. La cuenta Khora debe ser propietaria de sus buckets y objetos.
5. El consumidor Khora no debe recibir la Master Key. La credencial se usa en el entorno servidor/operador autorizado para autorizar el cliente B2; el producto consume el adaptador de almacenamiento del lado servidor.

**Trade-off explícito:** esta ruta reduce la fricción de configuración y evita administrar múltiples Application Keys, pero aumenta el radio de impacto de una filtración. La cuenta B2 separada es una frontera de aislamiento esencial; la Master Key no debe exponerse en cliente, navegador, logs, repositorio ni variables públicas.

## 2. Secuencia mínima reproducible

### Paso 0 — Preflight de cuenta y destino

- Confirmar que la cuenta B2 pertenece exclusivamente a Khora.
- Crear/confirmar el bucket dedicado de Khora y fijar un prefijo de aplicación, por ejemplo `khora/` (o el prefijo canónico ya ratificado por el frente).
- Confirmar región, bucket ID, privacidad y cifrado esperado.
- No copiar ni migrar objetos productivos todavía. No cambiar el selector de proveedor ni hacer cutover.

### Paso 1 — Guardar la Master Key en la bóveda

Guardar únicamente los dos valores nativos:
- `keyID` (identificador de la Master Application Key).
- `applicationKey` (secreto de la Master Application Key).

Usar la bóveda cifrada ya aprobada por el entorno Khora, con ACL restringida, respaldo previo y mecanismo de read-back. No escribir los valores en Markdown, JSON de evidencia, consola, transcripción, GitHub o chat. Validar sintaxis y longitud sin imprimir el contenido. Si ya existen entradas, descifrarlas en memoria y comparar igualdad; no reescribirlas por rutina.

**No asumir** nombres de variables, ruta de bóveda, KDF, algoritmo de cifrado o esquema del archivo de EP. Reutilizar el mecanismo canónico de Khora o implementar una bóveda propia solo mediante cambio aprobado y revisado.

### Paso 2 — Autorización aislada del cliente B2

- Leer la Master Key desde la bóveda en memoria protegida.
- Ejecutar `b2 account authorize` y comprobar con `b2 account get`.
- Usar una caché de autorización independiente para Khora (por ejemplo, un archivo dedicado bajo el directorio privado de estado de Khora); nunca compartir la caché de EP ni la caché global por defecto.
- Restaurar el valor previo de `B2_ACCOUNT_INFO` al terminar cada invocación. No persistir la Master Key en variables de entorno.
- Cerrar/limpiar variables en memoria cuando finalice la operación.

La caché contiene un token de cuenta sensible aunque no sea la Master Key: ACL restringida, no versionarla y no adjuntarla a evidencias.

### Paso 3 — Preflight de bucket, solo lectura

Consultar el bucket por nombre mediante la caché aislada. Registrar solo metadatos no sensibles: bucket ID, nombre, privacidad, región si está disponible, cifrado, reglas CORS/lifecycle y estado de Object Lock. Confirmar que la respuesta corresponde al bucket de Khora. No cambiar configuración durante el preflight.

### Paso 4 — Smoke test pequeño antes de integrar el producto

1. Crear un archivo sintético local, sin datos de usuario, de tamaño conocido.
2. Calcular SHA-256 local.
3. Subirlo al bucket de Khora bajo el prefijo de prueba acordado, solicitando SSE-B2/AES256 si ese es el estándar aprobado.
4. Obtener metadatos del objeto remoto mediante `b2 file info`.
5. Descargar el mismo objeto a una ruta local independiente.
6. Recalcular SHA-256 y comparar con el origen; cotejar también tamaño, File ID, bucket ID, nombre remoto y cifrado.
7. Limpiar solo los archivos locales temporales. No borrar el objeto remoto de prueba sin una disposición explícita del frente; dejarlo inventariado como objeto de verificación.

**Esquema real de metadatos:** en la respuesta de `file info`, el tamaño se expone como `size`; no asumir campos `contentLength` o `bucketName`. El bucket se vincula mediante su ID conocido y el nombre/ruta remota del objeto.

### Paso 5 — Integración dual de Khora

Solo después del smoke test:
- Mantener lectura compatible de referencias históricas de Vercel Blob.
- Enrutar nuevas escrituras a B2 mediante el adaptador servidor y el selector ya existente, inicialmente en rama/entorno no productivo.
- Mantener cifrado de aplicación KHC1 y verificación de integridad según el contrato de Custodia; SSE-B2/AES256 es cifrado del lado del proveedor y no sustituye KHC1.
- Persistir localizadores estables, nunca secretos ni URLs firmadas temporales.
- No borrar ni sobrescribir originales de Vercel Blob durante la migración.
- Migrar por lotes idempotentes: inventario paginado completo, identidad estable, tamaño/hash, copia, lectura de vuelta, descifrado y comparación; registrar cada unidad como pendiente/copied/readback-verified/accepted. No marcar como migrado por el solo hecho de recibir respuesta de subida.

## 3. Errores de EP que CUSTODIA debe evitar

1. **No confundir autenticación con persistencia.** `account authorize` y `account get` prueban autenticación; no prueban acceso correcto al bucket ni integridad de objetos.
2. **No confundir subida con recuperación.** Exigir descarga real y SHA-256 recalculado del destino.
3. **No validar con campos JSON supuestos.** El tamaño observado en `file info` fue `size`; validar contra el esquema real.
4. **No usar una caché B2 compartida.** Separar caché de autorización por cuenta/proyecto y restaurar `B2_ACCOUNT_INFO` después de cada operación.
5. **No dejar que el CLI falle por espacio temporal.** El CLI empaquetado puede extraer runtime/DLLs en `%TEMP%`; si el disco del sistema está lleno puede fallar antes de ejecutar la operación. Comprobar espacio libre antes del primer uso. No borrar carpetas temporales indiscriminadamente; identificar procesos y directorios creados por la ejecución y limpiar solo los propios, tras comprobar que no están en uso.
6. **No asumir que el primer `git.exe` o ejecutable hallado recursivamente es el entrypoint correcto** al instalar herramientas portables; conservar la estructura del paquete y verificar el ejecutable desde su ruta oficial.
7. **No confundir el alcance operativo con una restricción técnica.** Una Master Key puede tener permisos amplios en toda su cuenta. Nunca afirmar que un prefijo limita la Master Key si el proveedor no lo impone.
8. **No usar secretos de EP ni reutilizar su cuenta.** Khora necesita su propia cuenta y su propio ciclo de autorización.
9. **No declarar cierre por una prueba de 126 bytes.** El smoke test demuestra el trayecto básico de un objeto sintético; no acredita migración histórica, recuperación multiubicación, continuidad de sesiones, consumidores ni aceptación productiva.
10. **No hacer cutover ni tocar producción por inferencia.** El alcance vigente de CUSTODIA autoriza trabajo en ramas y entornos aislados no productivos; merge, despliegue, selector de producción, credenciales, seguridad efectiva del bucket, SQL/backfill de Neon Production y eliminación de objetos fuente permanecen excluidos salvo autorización específica.

## 4. Evidencia mínima que debe producir el ciclo

- Identidad de cuenta y bucket de Khora (sin secretos).
- Identificación de la caché aislada, ACL y limpieza/restauración de variables, sin publicar su contenido.
- Resultado de autorización y `account get` saneado.
- Metadatos del bucket leídos de vuelta.
- Tamaño, File ID, ruta/prefijo, cifrado y SHA-256 del objeto sintético.
- SHA-256 del archivo descargado y comparación PASS.
- Confirmación de que el objeto fuente no se borró ni sobrescribió.
- Commit, blob SHA y read-back de los documentos de evidencia.

No incluir Master Key, tokens, datos reales de usuario, audio, transcripciones, URLs firmadas, identificadores de sesión ni hashes de contenido personal.

## 5. Criterio de salida

El smoke test B2 solo pasa con: autorización correcta + bucket correcto + subida + metadatos remotos coherentes + descarga + tamaño coincidente + SHA-256 coincidente + cifrado esperado. La integración dual pasa cuando las rutas no productivas de escritura B2 y lectura Blob legacy están probadas. La migración solo se acepta cuando el inventario completo de fuentes y destinos está reconciliado, cada objeto fue leído de vuelta/descifrado/verificado y los consumidores autorizados lo recuperan correctamente.

**Experiencia transferida desde EP:** el camino más corto y fiable es autenticar una sola vez con la Master Key de la cuenta dedicada, mantener una caché aislada, hacer un GET del bucket, probar un objeto sintético pequeño con SSE-B2/AES256, descargarlo y comparar SHA-256. Después se integra el adaptador dual en no producción. No empezar migrando datos reales ni cambiando el selector de producción.

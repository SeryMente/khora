# Divergencias y verificación · Entorno Persistente Medio v1.0

## Resueltas en el código

- repositorio privado y descarga autenticada;
- llave de bóveda como raíz del Disco Duro Virtual versión 2 cifrado;
- orden llave → GitHub → Vercel;
- bitácora remota persistente con identificadores y cadena hash;
- token Khora efímero por sesión, emitido tras Google OpenID Connect;
- continuidad cifrada de Visual Studio Code;
- salida manual, Guardian, mecanismo de hombre muerto y limpieza al reinicio;
- despliegue obligatorio del SHA exacto de `main` durante `EP-IN-080`, con prueba de procedencia en el alias canónico.

## Verificación pendiente fuera de este paquete

- ejecución integral en Windows con BitLocker;
- aplicación de la migración PostgreSQL en producción;
- compilación Next.js con dependencias instaladas;
- despliegue real, verificación del alias canónico y prueba de Google OpenID Connect.

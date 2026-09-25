# EP v1.0.1 — evidencia de validación

**Host Khora:** 7.5.2
**Firma:** NX-326m

## Hallazgos post-auditoría — corregidos

- **Corrección de borrado sobre rutas cortas 8.3 en `%TEMP%` (`EP-IN-030`):** En ejecuciones en vivo donde `%TEMP%`/`%TMP%` resuelven a la forma corta 8.3 (ej. `C:\Users\PC13~1\...`), `EP-IN-030` fallaba con `PSArgumentException` (`InvalidArgument`) en `Remove-Item -LiteralPath`. La causa aislada demostró que el proveedor de sistema de archivos de PowerShell tropieza con rutas cortas 8.3, mientras que I/O directo vía .NET (`[IO.File]`, `[IO.Directory]`) y procesos Win32 nativos no presentan inconveniente. Se corrigieron los 3 puntos de limpieza sobre `$env:TEMP` en `scripts/khora/khora.ps1` (`Invoke-KhoraElevation`, `Invoke-KhoraDiskpart` y `Materialize-KhoraRepository`) sustituyendo `Remove-Item` por invocaciones directas a `[IO.File]::Delete` y `[IO.Directory]::Delete` envueltas en bloques `try/catch` silenciosos.

## Aprobado en auditoría estática Linux

- Gate único, arquitectura, launcher y bootstrap embebido coherentes.
- Bootstrap idéntico byte a byte al gate, con UTF-8 BOM y CRLF.
- Launcher sin `ScriptBlock.Create`: `.ps1` y blob DPAPI temporales, invocación explícita de Windows PowerShell 5.1 y limpieza en `finally`.
- JWT HS256 estricto, firma en tiempo constante, audiencia canónica, scopes, expiración, revocación y códigos públicos.
- UI reorganizada como Seguridad → Entorno Persistente (normal-only + lanzamiento simplificado): comando estático visible antes/después, emisión y copia automática de token al portapapeles sin renderizado, reintento exclusivo ante bloqueo del navegador.
- Modo `clean-host` rechazado explícitamente con HTTP 400 (`unsupported_launch_mode`), sin mutación de estado.
- Descarga privada de GitHub, Vercel 59.3.0 fijada, redacción de secretos y preflight de Escritorio local.
- Escaneo de secretos, rutas inseguras y artefactos excluidos.

## Obligatorio antes de fusionar

No se afirma ejecución real de Windows desde este sandbox Linux. En Windows compatible deben aprobarse: parser oficial Windows PowerShell 5.1, emisión/copias, lanzamiento hasta `EP-IN-010`, elevación, VHDX/BitLocker XTS-AES-256, restauración, dos superficies, deadman/inactividad/reinicio y limpieza total. También deben repetirse `npm run typecheck`, `npm run ui-review:check`, `npm run prebuild`, pruebas y `next build --webpack` con las dependencias del repositorio local. No desplegar ni fusionar antes de esas pruebas.

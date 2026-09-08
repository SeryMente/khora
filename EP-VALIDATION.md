# EP v1.0 — evidencia de validación

**Host Khora:** 7.5.0
**Firma:** NX-326m

## Aprobado en auditoría estática Linux

- Gate único, arquitectura, launcher y bootstrap embebido coherentes.
- Bootstrap idéntico byte a byte al gate, con UTF-8 BOM y CRLF.
- Launcher sin `ScriptBlock.Create`: `.ps1` y blob DPAPI temporales, invocación explícita de Windows PowerShell 5.1 y limpieza en `finally`.
- JWT HS256 estricto, firma en tiempo constante, audiencia canónica, scopes, expiración, revocación y códigos públicos.
- UI reorganizada como Seguridad → Entorno Persistente, selector normal/clean-host, copia independiente y exacta de comando/token, token no renderizado, estados accesibles, expiración y descarte.
- `clean-host` ligado al JWT y al manifiesto; PATH, HOME, APPDATA, temporales y cachés aislados; Git, GitHub CLI, Node.js, Python y Visual Studio Code portátiles obligatorios.
- Descarga privada de GitHub, Vercel 59.3.0 fijada, redacción de secretos y preflight de Escritorio local.
- Escaneo de secretos, rutas inseguras y artefactos excluidos.

## Obligatorio antes de fusionar

No se afirma ejecución real de Windows desde este sandbox Linux. En Windows compatible deben aprobarse: parser oficial Windows PowerShell 5.1, emisión/copias, lanzamiento hasta `EP-IN-010`, elevación, VHDX/BitLocker XTS-AES-256, restauración, dos superficies, deadman/inactividad/reinicio y limpieza total. También deben repetirse `npm run typecheck`, `npm run ui-review:check`, `npm run prebuild`, pruebas y `next build --webpack` con las dependencias del repositorio local. No desplegar ni fusionar antes de esas pruebas.

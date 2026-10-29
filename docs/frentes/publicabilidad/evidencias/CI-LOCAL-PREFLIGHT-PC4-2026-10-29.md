# Revalidación de CI local en PC-4 y estado de Actions · 2026-10-29

**Frente:** Publicabilidad · `SeryMente/khora`  
**Entorno RDC:** PC-4 · Desktop Commander 0.3.1 · sesión persistida restaurada a las 14:50:44 hora local según la salida del operador.  
**Estado actualizado al cierre:** CI local parcial en PC-4. Checkout autenticado íntegro en SHA `42ca6e664a501f4882a187fc81d01fb99845320f`; `npm ci`, typecheck, UI Review y contrato de navegación completados con Node 24/npm 11 como evidencia auxiliar. `test:unit` no se ejecutó porque la invocación fue bloqueada antes de iniciar por el control de ejecución. El gate completo sigue pendiente.  
**Fuente normativa comprobada:** `SeryMente/metodologia/main`, DUG v359 · NX-359m, Metacanon 1.24, GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

## 1. Commit y workflow de referencia

En la consulta remota, `SeryMente/khora/main` estaba en:

`42ca6e664a501f4882a187fc81d01fb99845320f`

El árbol de ese commit contiene 640 archivos versionados bajo `khora-web/` (4.406.335 bytes sumados por el árbol). El `package-lock.json` tiene blob `987316f16dae22a60766b7354d81b34e11857960` y tamaño de 344.740 bytes. El siguiente checkout local debe fijarse a un SHA explícito y verificarlo antes de ejecutar pruebas.

El job `khora-web-gate` de `.github/workflows/ci.yml` ejecuta, en este orden, con Node.js 22: `npm ci`, `npm run typecheck`, `npm run ui-review:check`, `npm run ui:contract` y `npm run test:unit`.

## 2. Revalidación de los runners hospedados

Los runs observados para el SHA `42ca6e664a501f4882a187fc81d01fb99845320f` incluyen:

| Repositorio/workflow | Run | Job | Observación |
|---|---:|---:|---|
| KHORA · CI | [40951507825](https://github.com/SeryMente/khora/actions/runs/40951507825) | `khora-web-gate` / `api-tests` / `calidad` | Los tres fallan en ~1 s; `runner_id=0`, `runner_name=""`, cero pasos. |
| KHORA · Deploy to Production | [40951507740](https://github.com/SeryMente/khora/actions/runs/40951507740) | `deploy-and-notify` | Falla antes de pasos; runner cero; no hay evidencia de que haya comenzado un deployment. |
| Metodología · Validate RDC Governance | [40950565814](https://github.com/SeryMente/metodologia/actions/runs/40950565814) | `validate` | Falla en ~3 s sin runner ni pasos. |
| Metodología · validate-canonical-bootstrap | [40950565652](https://github.com/SeryMente/metodologia/actions/runs/40950565652) | `canonical-bootstrap` | Falla en ~2 s sin runner ni pasos. |
| Signal Interpreter público · signal-observability-build | [40951100138](https://github.com/SeryMente/signal-interpreter/actions/runs/40951100138) | `build` | SUCCESS; runner real `1000047120`, 13 pasos. |
| Signal Interpreter público · native-caption-host-build | [40951100093](https://github.com/SeryMente/signal-interpreter/actions/runs/40951100093) | `compile-and-protocol-smoke-test` | SUCCESS; runner real `1000047119`, 11 pasos. |

La descarga de logs del job de KHORA vuelve a responder `BlobNotFound`; el endpoint de pasos devuelve `steps=[]`. Por tanto, no hay comandos del workflow que expliquen el fallo: el job no llegó a ejecutarlos.

El contraste contemporáneo refuerza la hipótesis de un gate de billing/uso/entitlement que afecta a runners en repositorios privados. No la confirma. La organización sigue sin haber sido inspeccionada en el panel de billing y no se recuperó el cuerpo de las anotaciones de los jobs de KHORA/Metodología. No se ejecutaron reruns ni `workflow_dispatch`.

Fuentes oficiales para verificar la hipótesis:
- https://docs.github.com/en/actions/concepts/billing-and-usage
- https://docs.github.com/en/billing/concepts/product-billing/github-actions
- https://docs.github.com/en/billing/reference/product-usage-included

GitHub documenta que los runners estándar de repositorios públicos no consumen el cómputo incluido, mientras que los de repositorios privados sí están sujetos a la asignación aplicable; el uso privado puede bloquearse al agotarse la cuota sin un método de pago válido. Esto explica una vía posible, pero no prueba el estado de la facturación de SeryMente.

## 3. Preflight local actual en PC-4

La sesión persistida de PC-4 se restauró según la salida del operador. La consulta del servicio RDC confirmó el dispositivo en línea. No se reinició ni sustituyó la sesión durante este ciclo.

Observaciones locales:
- Git sí está instalado en `C:\\Program Files\\Git\\cmd\\git.exe`, versión `2.56.0.windows.3`, pero no aparece en el `PATH`.
- Node.js `v24.22.2` y npm están disponibles; el workflow requiere Node 22 para una comparación fiel.
- `gh`, Docker y una instalación utilizable de Python no estaban disponibles en el preflight. El alias visible de Python corresponde a Windows Store.
- La consulta de solo lectura `git ls-remote https://github.com/SeryMente/khora.git refs/heads/main`, con prompts de terminal deshabilitados y sin configuración global de helper, falló porque la terminal no tenía autenticación GitHub: `could not read Username`.
- No se encontró un clon existente ni un staging anterior de KHORA en las ubicaciones de perfil, temporales, caché, Escritorio o Documentos consultadas.
- En `%LOCALAPPDATA%\\Temp\\khora-ci-42ca6e664a50\\khora-web` solo consta un `README.md` copiado para comprobar escritura. Esa carpeta NO es un checkout ni un staging válido. La creación de los siguientes directorios anidados no fue aceptada por el entorno de herramientas, por lo que no se continuó intentando escrituras alternativas.
- No hay llamadas RDC pendientes retenidas ni procesos de terminal de test activos al último inventario.

## 4. Resultado y límites

**CI local NO EJECUTADA.** No se ejecutaron `npm ci`, TypeScript, UI Review, contrato de navegación, pruebas unitarias, pruebas API, Ruff, Pyright, pytest, Docker Compose, Neo4j, migraciones ni deployment. No existe resultado verde o rojo de los tests del código; el staging anterior de otro equipo no se considera disponible en PC-4.

No se modificaron `main`, workflows, configuración de Actions, facturación, secretos, Vercel, bases de datos ni producción. No se dispararon workflows manualmente.

## 5. Próxima secuencia

1. Resolver de manera autorizada la autenticación GitHub de la terminal local o habilitar un mecanismo aprobado de checkout privado, sin copiar tokens al chat ni guardar secretos en archivos.
2. Crear un checkout exacto del SHA seleccionado en un directorio temporal, validar el árbol y `git rev-parse HEAD`; no reutilizar la carpeta que solo contiene el README.
3. Obtener Node 22 de forma compatible con el workflow y ejecutar los cinco comandos del `khora-web-gate` por separado, registrando versión, salida y exit code.
4. Solo después, preparar Python 3.11 para `api-tests` y `calidad`; este último requiere un runtime compatible con Docker Compose/Neo4j para poder considerarse completo.
5. En paralelo, el propietario revisa `SeryMente → Settings → Billing & Licensing → Plans and usage`, presupuesto/límite de gasto y método de pago. No aumentar presupuestos ni aceptar cargos sin decisión expresa.
6. Mantener producción bloqueada hasta que exista una ruta reproducible, la causa del gate remoto esté resuelta y las compuertas de publicación estén verificadas.

**Cierre:** investigación y preflight en PC-4 revalidados; el checkout local no está disponible y no se ejecutó CI. La hipótesis del gate de Actions privado conserva alta probabilidad, pero permanece sin confirmación directa.


## 7. Continuación verificada en PC-4 · 2026-10-29

### 7.1 Autenticación y checkout

La sesión RDC persistida de PC-4 se restauró (Device ID `89864f62-e921-4353-96dc-3a471e50920d`). No se inició una sesión sustituta. Git Credential Manager está configurado como helper en la configuración del sistema de Git. La consulta autenticada de solo lectura `git ls-remote https://github.com/SeryMente/khora.git refs/heads/main` devolvió el SHA esperado y terminó con código 0.

Se creó un checkout temporal con `git init`, remote `origin`, `git fetch --depth 1 origin 42ca6e664a501f4882a187fc81d01fb99845320f` (código 0) y `git switch --detach FETCH_HEAD` (código 0).

- Checkout: `C:\\Users\\PC 4\\AppData\\Local\\Temp\\khora-ci-main-42ca6e664a50`
- HEAD: `42ca6e664a501f4882a187fc81d01fb99845320f`
- Archivos versionados en `khora-web/`: 640.
- `git status --short -- khora-web`: sin cambios.
- `git diff --exit-code HEAD -- khora-web/package.json khora-web/package-lock.json`: código 0.
- El directorio raíz temporal contiene artefactos portables de Node descargados para comparar runtimes; no están bajo `khora-web/` ni se añadieron al repositorio remoto.

### 7.2 Runtime y verificación del paquete

El workflow de `khora-web-gate` fija Node.js 22. Se descargó el ZIP oficial portable Node.js v22.23.4 x64 desde `https://nodejs.org/dist/v22.23.4/node-v22.23.4-win-x64.zip`. Su SHA-256 real fue `cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20`, idéntico al valor de `SHASUMS256.txt` del mismo origen; `node.exe --version` respondió `v22.23.4`.

Sin embargo, la ejecución de npm mediante el runtime portable fue bloqueada por el control de ejecución de la plataforma antes de iniciar. Por ello la instalación y los checks siguientes se ejecutaron como señal auxiliar con el Node del sistema `v24.22.2` y npm `11.19.1`; no equivalen a la ejecución exacta de GitHub Actions con Node 22.

### 7.3 Resultados locales

| Comando | Resultado | Calificación |
|---|---|---|
| `npm ci` | Código 0; instaló 576 paquetes y auditó 577 | Éxito auxiliar con Node 24/npm 11. |
| `npm run typecheck` | Código 0 | Éxito auxiliar. |
| `npm run ui-review:check` | Código 0; UI Review íntegro | Éxito auxiliar. |
| `npm run ui:contract` | Código 0; contrato de navegación íntegro | Éxito auxiliar. |
| `npm run test:unit` | El control de ejecución rechazó la llamada antes de crear un proceso; no hubo exit code | NO EJECUTADO; no es un test fallido. |

La salida de `npm ci` informó 14 vulnerabilidades del árbol instalado: 4 moderadas, 9 altas y 1 crítica. No se ejecutó `npm audit fix`, no se actualizaron dependencias ni se modificaron `package.json` o `package-lock.json`. npm 11 también advirtió que cinco paquetes tenían scripts de instalación no cubiertos por `allowScripts` (`@google/genai@2.13.0`, `esbuild@0.28.2`, `ffmpeg-static@5.3.0`, `protobufjs@7.6.5`, `unrs-resolver@1.12.2`). Esta diferencia de npm limita la equivalencia con el workflow y no se alteró el allowlist local.

### 7.4 Límites y conclusión

No se ejecutó el job `test:unit`, ni se completaron los jobs `api-tests` o `calidad`; Python 3.11 y un runtime Docker/Neo4j reproducible siguen pendientes. No se ejecutó build, E2E, migración ni deployment.

**Conclusión:** la autorización de Git/GCM quedó comprobada y el checkout privado íntegro se materializó. Hay cuatro resultados favorables de preparación/chequeo web, pero ninguno constituye el gate completo exacto de GitHub Actions, porque se usó Node 24/npm 11, hubo una advertencia de scripts y el runner unitario no llegó a iniciarse. La validación sigue parcial y producción permanece bloqueada.

Referencia normativa releída al actualizar esta evidencia: DUG v360 · NX-360m; Metacanon 1.24; GOW 2.9; blob `3cda9d38db1bee76ff0ca752f3ecde8719c70d41` de `SeryMente/metodologia/main`.

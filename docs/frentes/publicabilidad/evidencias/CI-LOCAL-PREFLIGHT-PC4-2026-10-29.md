# Revalidación de CI local en PC-4 y estado de Actions · 2026-10-29

**Frente:** Publicabilidad · `SeryMente/khora`  
**Entorno RDC:** PC-4 · Desktop Commander 0.3.1 · sesión persistida restaurada a las 14:50:44 hora local según la salida del operador.  
**Estado:** PREPARACIÓN PARCIAL; CI local NO EJECUTADA.  
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

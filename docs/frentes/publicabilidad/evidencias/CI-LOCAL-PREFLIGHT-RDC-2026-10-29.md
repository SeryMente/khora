# Preflight para CI local sustitutiva · RDC

**Fecha:** 2026-10-29 · America/Mexico_City  
**Propósito:** ejecutar localmente, por medio de RDC, los checks del workflow de GitHub Actions como validación sustitutiva mientras el runner remoto falla antes de los steps.  
**Estado del intento:** PREPARACIÓN PARCIAL; **NINGÚN TEST DE CI LOCAL HA SIDO EJECUTADO**.  
**Fuente de código prevista:** `SeryMente/khora/main` en SHA `e463e0c6efa857f4c4229894a96fab747a8a7574`.

## 1. Entorno local observado mediante RDC

Dispositivo: PC-14, Windows x64, Desktop Commander 0.3.1.

| Componente | Observación | Implicación |
|---|---|---|
| Node.js | `C:\Program Files\nodejs\node.exe`, versión `v24.22.2` | El workflow `khora-web-gate` fija Node 22; conviene instalar/usar un ZIP portable de Node 22 para comparación fiel. |
| npm | `C:\Program Files\nodejs\npm.cmd`, versión `11.19.1` | `npm.cmd` funciona. La invocación de `npm.ps1` falla por la política de ejecución de PowerShell. No se modificó la política; usar `npm.cmd` o un shell CMD. |
| Git | No se encontró `git` en PATH ni en las rutas convencionales comprobadas (`Program Files\Git`, GitHub Desktop y `LocalAppData\Programs\Git`). | No hay una forma de clonar/consultar el repo por CLI en este entorno sin preparar Git portable. |
| Docker | No se encontró `docker.exe` en PATH ni en la ruta común de Docker Desktop. | El job `calidad` no puede reproducir por ahora `docker compose up -d` para Neo4j. No se ha comprobado WSL u otro runtime alternativo. |
| Python | El launcher visible era el alias de Windows Store; no se encontró una instalación Python utilizable ni `py.exe`. | Los jobs `api-tests` y `calidad` requieren disponer de Python 3.11 y dependencias de test para aproximarse al workflow. |
| GitHub CLI | `gh` no está disponible en PATH. | No necesario para ejecutar los tests, pero no debe asumirse que hay autenticación CLI. |
| Red | HEAD a `https://nodejs.org/dist/v22.14.0/SHASUMS256.txt` y `https://registry.npmjs.org/next` devolvieron HTTP 200. | Hay conectividad a los orígenes consultados; aún no se probó la instalación de dependencias. |

## 2. Localización del repositorio

Se comprobaron las rutas convencionales:
- `%USERPROFILE%\Desktop\Khora\khora-main`
- `%USERPROFILE%\Desktop\Khora\khora`
- `%USERPROFILE%\Desktop\Khora`
- `%USERPROFILE%\Documents\GitHub\khora`
- `%USERPROFILE%\source\repos\khora`

No se encontró el clon en ellas. El Escritorio observado contenía `signal-interpreter-main`, pero no un clon de KHORA. Se abrió en el navegador el enlace de archivo ZIP de `SeryMente/khora/main`; no apareció un ZIP reciente `khora*.zip` en Downloads. No se determinó si esto fue por autenticación, descarga o navegador; no se ingresaron credenciales ni se leyeron tokens.

## 3. Materialización parcial, no ejecución de CI

La API de GitHub devolvió el árbol completo de `main` en SHA `e463e0c6efa857f4c4229894a96fab747a8a7574`; el subárbol `khora-web` contiene 640 archivos, aproximadamente 4.2 MiB. Se excluyeron intencionalmente archivos binarios PNG, el archivo opaco `khora-web/.vercel-disparador`, plantillas de entorno y logs. El `package-lock.json` se recuperó con blob SHA `987316f16dae22a60766b7354d81b34e11857960` y se escribió en:

`%LOCALAPPDATA%\Temp\khora-ci-local\khora-web\package-lock.json`

Se intentó materializar el resto del snapshot a partir de la conexión autorizada de GitHub en manifests temporales bajo `%LOCALAPPDATA%\Temp\khora-ci-local\source-*.jsonl`. La transferencia de las primeras partes avanzó, pero una operación grande de escritura/lectura quedó pendiente; posteriormente incluso `get_config` de RDC dejó de responder dentro de la ventana síncrona. La consulta posterior del historial remoto marcó las operaciones `read_file`/`write_file` implicadas como `failed` con `Timeout - no response from device`. No se confirmó que los manifests finales se hubieran escrito íntegramente, ni se ejecutó el script de extracción. El agente no respondía a consultas nuevas al cierre de este ciclo.

Por tanto:
- no se ejecutó `npm ci`;
- no se ejecutó `npm run typecheck`;
- no se ejecutó `npm run ui-review:check`;
- no se ejecutó `npm run ui:contract`;
- no se ejecutó `npm run test:unit`;
- no se ejecutaron `pytest`, Ruff, Pyright ni pruebas conectadas a Neo4j;
- no se modificó la política de PowerShell, no se instalaron herramientas globales, no se tocó `main`, no se desplegó y no se ejecutaron migraciones.

## 4. Traducción de los jobs del workflow a una ejecución local

El workflow `.github/workflows/ci.yml` define tres jobs independientes.

### Job `khora-web-gate`

En `khora-web`, el orden exacto es:

1. Checkout de código.
2. Node.js 22.
3. `npm ci`.
4. `npm run typecheck`.
5. `npm run ui-review:check`.
6. `npm run ui:contract`.
7. `npm run test:unit`.

Para que sea evidencia sustitutiva, el snapshot debe corresponder al SHA registrado, las dependencias han de instalarse desde el lockfile sin alterar la resolución, cada comando debe registrar exit code y salida, y debe guardarse la versión exacta de Node/npm. Un éxito de pruebas en Node 24/npm 11 se registraría como resultado auxiliar, no equivalente al workflow que fija Node 22.

### Job `api-tests`

Instalar Python 3.11, luego `pip install -r api/requirements.txt`, `pip install pytest httpx` y ejecutar `pytest api/tests/`. Este job no necesita Docker según el YAML leído, aunque su ejecución completa no fue posible en el entorno inspeccionado.

### Job `calidad`

Instalar Python 3.11 y `kernel/[ci]`, Ruff, Pyright, pytest y pytest-mock; ejecutar `ruff check .` y `pyright` en `kernel`; después levantar Neo4j por Docker Compose, inicializar el esquema y ejecutar pytest. Sin Docker/Neo4j, solo podrían ejecutarse checks parciales y estos deben etiquetarse como parciales; no equivalen a pasar el job completo.

## 5. Estado de RDC y siguiente acción segura

Al concluir el intento, RDC dejó de devolver respuesta a `get_config`; inicialmente mostró operaciones de lectura/escritura `pending`, y la consulta posterior de historial las marcó `failed` con `Timeout - no response from device`. El dispositivo aparecía Online en el registro, pero `Last seen` ya no era reciente. No se repitieron las operaciones: el resultado de sus escrituras parciales no está confirmado.

Antes de reanudar:
1. El operador debe asegurar que el terminal de Desktop Commander Remote siga activo; si perdió la sesión, volver a iniciar `npx @wonderwhy-er/desktop-commander@latest remote` y completar su autenticación según el procedimiento del equipo.
2. Consultar el resultado de las operaciones RDC que quedaron pendientes; no repetir escrituras hasta saber si completaron.
3. Verificar la integridad de `khora-ci-local`; terminar o borrar los manifests parciales solo después de confirmar el estado.
4. Elegir una vía estable para obtener el checkout privado (un clon autorizado o snapshot autenticado). No exponer PATs/secrets ni abrir el archivo `.vercel-disparador`.
5. Instalar herramientas portables en el directorio temporal, si siguen faltando; respetar Node 22 y Python 3.11 del workflow. Para el job kernel, confirmar un runtime de contenedores disponible antes de declarar cobertura completa.
6. Ejecutar los tres jobs por separado, guardar logs y exit codes, vincular cada recibo al SHA `e463e0c6...`, y comparar el alcance que realmente cubren los checks locales con el de Actions.

## 6. Interpretación

El patrón remoto `runner_id=0`, runner vacío, `steps=[]` y `BlobNotFound` sigue apuntando a un fallo previo a los steps, pero su causa raíz continúa **NO DETERMINADA**. Este intento no demuestra que el código pase o falle los tests localmente. El único resultado técnico positivo es que Node/npm están presentes, la red respondió a los dos endpoints consultados y la transferencia inicial de algunos archivos fue aceptada; no es un resultado de CI.

La ejecución local futura puede dar evidencia sustitutiva para validar un candidato, pero **no repara por sí sola GitHub Actions ni establece checks verdes a nivel de GitHub**. Cualquier publicación productiva sigue bloqueada hasta resolver la ruta de release y cumplir las compuertas documentadas por el OCP.

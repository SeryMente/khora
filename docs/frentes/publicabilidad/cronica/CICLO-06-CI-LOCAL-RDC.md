# Crónica · Ciclo 06 · Intento de CI local sustitutiva mediante RDC

**Fecha:** 2026-10-29 · America/Mexico_City.  
**Objeto rector:** [OCP Publicabilidad](../OBJETO-CANONICO.md), PUBLICABILIDAD-v0.7.  
**Referencia normativa adquirida:** DUG v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

## Propósito

Ejecutar mediante RDC, bajo autorización expresa del operador, los checks del workflow de GitHub Actions en un entorno local como señal de validación sustitutiva mientras los runners hospedados fallan antes de ejecutar steps.

## Resultado real

**El intento llegó al preflight y a una transferencia parcial de fuentes; no ejecutó ningún test.**

En PC-14 (Windows x64, Desktop Commander 0.3.1) se observó Node.js v24.22.2 y npm.cmd 11.19.1. No se localizaron Git, Docker, Python 3.11, `py` o `gh` en las rutas comunes. El clon de KHORA tampoco estaba en los directorios convencionales inspeccionados. Invocar `npm.ps1` fue rechazado por la política vigente de PowerShell; no se cambió la política y se confirmó que `npm.cmd` sí funcionaba. Las pruebas HEAD a nodejs.org y registry.npmjs.org devolvieron HTTP 200.

La conexión autorizada de GitHub proporcionó el árbol de `khora-web` en `main` SHA `e463e0c6efa857f4c4229894a96fab747a8a7574`. El package-lock con blob `987316f16dae22a60766b7354d81b34e11857960` se escribió en un directorio temporal `%LOCALAPPDATA%\Temp\khora-ci-local`. Se generaron manifests parciales de los archivos fuente, excluyendo PNG, plantillas de entorno, logs y el archivo opaco `.vercel-disparador`; no se confirmó la materialización completa.

Después, llamadas de lectura/escritura de RDC quedaron en estado `pending`. El canal dejó también de responder a `get_config`; el dispositivo aparecía Online, pero `Last seen` era antiguo. La consulta posterior del historial remoto marcó las operaciones implicadas como `failed` con `Timeout - no response from device`. No se repitieron los writes porque su estado parcial no está confirmado. No se ejecutó `npm ci`, typecheck, UI Review, contrato UI, unit tests, pytest, Ruff, Pyright, Docker Compose, Neo4j, migraciones ni deployments.

## Interpretación

Este resultado no informa si el código pasa o falla los tests; solo informa que el preflight detectó dependencias ausentes y que RDC perdió respuesta durante la transferencia de un snapshot relativamente pequeño. La evidencia remota del runner privado continúa sugiriendo un bloqueo previo a los steps que puede corresponder a un gate de billing/usage; la hipótesis permanece de alta probabilidad, no confirmada directamente. Una CI local sí podrá validar el código después de restablecer la transferencia y toolchain, pero no puede crear un check-run verde en GitHub ni quitar un entitlement gate de hosted runners.

## Artefactos

- [OCP actualizado](../OBJETO-CANONICO.md), §20 para el diagnóstico transversal y §21 para el preflight local.
- [Preflight técnico de RDC](../evidencias/CI-LOCAL-PREFLIGHT-RDC-2026-10-29.md).
- [Diagnóstico de probable gate de billing/usage](../evidencias/DIAGNOSTICO-BLOQUEO-ACTIONS-BILLING-2026-10-29.md).

## Continuación autorizada

1. Reestablecer el agente RDC desde su terminal si perdió respuesta; completar autenticación según el procedimiento autorizado.
2. Consultar los resultados pendientes de las operaciones RDC antes de repetir cualquier lectura/escritura con efecto.
3. Verificar el estado del directorio temporal o reconstruirlo desde un checkout privado válido por SHA.
4. Ejecutar el job `khora-web-gate` con Node 22; luego ejecutar `api-tests` y `calidad` con Python 3.11 y Neo4j disponible, registrando comando, entorno, salida y exit code.
5. No cambiar main, workflows, billing/settings, secretos o Vercel; no realizar deployment productivo como parte del ensayo.
6. En paralelo, el propietario revisa Billing & Licensing/usage y anotaciones de los jobs privados. No modificar límites de gasto sin decisión expresa.

## Cierre del ciclo

Ciclo documental y diagnóstico local parcial; **CI local no ejecutado**, resultado pendiente de restablecer RDC y materializar un checkout exacto. No se hicieron cambios al producto ni publicación.

# Harmonia · recuperación de portabilidad y puerta E2E

- Fecha: 2026-10-29 (America/Mexico_City).
- OCP de cierre: v0.30 / `HARMONIA-v0.30`.
- DUG adquirido: v362 / NX-362m, Metacanon 1.24, GOW 2.11; `MCP-NORMATIVO: DESACTIVADO`; Metodología sin cambios.
- Candidata: `SeryMente/khora`, rama `feat/harmonia-e2e-20261021`, HEAD `f80508106d40024ad002d0c9e2baf1cedfe9ccd2`, árbol `ee5066b3aee0acdb515bcfb1656e2850bd28f6bf`; PR #333 sigue abierta en borrador.

## Resultado de ingeniería remota

Se corrigió la portabilidad al perfil activo Windows, la raíz de datos v0.4.0, la separación de logs, el fail-closed del colector sin `HARMONIA_DATA`, la consulta con `-DataRoot` o perfil por SID, el bootstrap verificado de Node.js v22.23.4 x64 y la regresión de replay idempotente después de reiniciar el colector. La rama final contiene los archivos bajo `apps/harmonia-observability/`; el intento intermedio con rutas en la raíz se corrigió y esos artefactos no permanecen en el árbol final.

## CI

Los runs Harmonia `40994888854` y `40995126363` fallaron antes de ejecutar pasos. En el segundo, el job `123866497297` y su intento 2 reportaron `steps=[]`, sin runner/logs recuperables. No se dispone de evidencia de ejecución del validador o de `node:test`; no declarar PASS ni atribuir fallo a los tests.

## Entorno y aceptación

El perfil PC-8 autorizado fue reidentificado, pero su agente RDC no respondió. Las llamadas de lectura/escritura concluyeron por timeout. El acuse de creación de directorios no demuestra la copia de archivos: paquete, runtime, token, manifiesto local y colector siguen NO VERIFICADOS. Chrome habitual no fue manipulado. La prueba real sigue siendo el uso natural del operador; no se intentó sustituirla por headless/CDP.

## Dictamen

**E2E ABIERTA / NO ACEPTADA.** El trabajo remoto está avanzado y publicado en la rama candidata, pero la preparación física depende de restablecer RDC. Una vez responsivo, el asistente completa todo lo técnico. El operador solo tendrá que usar Harmonia normalmente para aportar aceptación local.

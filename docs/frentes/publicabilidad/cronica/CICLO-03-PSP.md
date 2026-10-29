# Crónica · Ciclo 03 · Auditoría del bloqueo de publicación

Frente: Publicabilidad. Fecha local: 2026-10-29, America/Mexico_City. OCP: PUBLICABILIDAD-v0.3.
Fuente normativa: Documento Único de Gobernanza (DUG) de Ser y Mente · Samantha v359; NX-359m; Metacanon 1.24; GOW 2.8; blob b2ff2845a5a99dc4ce3cafafc4f8e43607d48145.

## Objetivo

Actualizar evidencia viva de GitHub/Vercel, caracterizar mejor el bloqueo de Actions, ampliar el PSP con una matriz v0.2 y mantener el alcance documental, sin publicar.

## Resultado

- La norma única fue releída; no se modificó.
- main se observó en e463e0c6efa857f4c4229894a96fab747a8a7574 y producción en b528660e16552633d232a2397cbe42441a03438c; delta informado: 102 commits.
- Actions CI/UI/deploy fallaron sin runner/steps visibles; logs dieron BlobNotFound. Causa raíz NO DETERMINADA.
- GitHub reporta protected=false para main, pero las consultas de reglas completas no están autorizadas en esta integración.
- Se documentó la posible doble ejecución de migrate-runtime y la discrepancia entre las URL smoke.
- Se creó una matriz PSP v0.2 nueva conservando v0.1, y se actualizaron OCP y README.

## Estado y restricciones

Solo escritura documental en la rama Publicabilidad. No hubo deployment ni preview; no se ejecutaron pruebas ni migraciones; no se modificó main, secretos, variables, dominios, SSO, proyecto ni plan Vercel; no se usó RDC/CLI ni workflow_dispatch. Acceso anónimo y saldo Usage no comprobados.

La causa raíz de Actions permanece sin determinar. PSP v1.0 requiere resolver/acotar el bloqueo, seleccionar candidato, reconciliar migración y smoke y definir una única autoridad productiva con evidencia verificable.

## Referencias

- [OCP v0.3](../OBJETO-CANONICO.md)
- [Matriz PSP v0.2](../evidencias/MATRIZ-PRELIMINAR-ESCENARIOS-PUBLICACION-v0.2.md)
- [Investigación de ciclo 03](../evidencias/INVESTIGACION-CICLO-03-2026-10-29.md)
- [Matriz PSP v0.1 histórica](../evidencias/MATRIZ-PRELIMINAR-ESCENARIOS-PUBLICACION-v0.1.md)
- [Run de producción](https://github.com/SeryMente/khora/actions/runs/40807127395)
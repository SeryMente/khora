# Crónica · Ciclo 06 · Diagnóstico transversal de GitHub Actions

**Fecha local:** 2026-10-29 · America/Mexico_City  
**OCP:** PUBLICABILIDAD-v0.6.  
**Referencia normativa realmente leída:** DUG de SeryMente v359 · NX-359m; Metacanon 1.24; GOW 2.8; blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

## Objetivo

Resolver el bloqueo P0 de Publicabilidad que impide validar cambios de KHORA desde ChatGPT Free y publicar mediante Vercel. Se autorizó RDC para diagnosticar o reproducir localmente fallas de GitHub/CI dentro del propósito del frente, después de entender la causa y contexto.

## Investigación ejecutada

1. Releí el DUG canónico, el OCP y el control de responsabilidad; la rama de trabajo sigue separada de `main`.
2. Comprobé CI en KHORA: run `40913146359`, SHA `7666a24e535f734f6e395bbe210aa3da5806b47f`. Los tres jobs terminaron en 2–3 segundos con `runner_id=0`, runner vacío y `steps=[]`; la API de check runs registró dos anotaciones por cada job.
3. Confirmé el mismo patrón en los repositorios privados Metodología (`40903838336`, job `123553074772`) y GDP (`40876634258`, job `123457013462`). En ambos, el job falló antes de steps y los logs devolvieron `BlobNotFound`.
4. Obtuve un control positivo reciente: Signal Interpreter es un repositorio público de la misma organización; el run `40922616949` ejecutó pasos reales en un runner GitHub y terminó SUCCESS a las 2026-10-29T17:35:17Z.
5. Consulté documentación oficial de GitHub sobre cuentas bloqueadas, autorización de pago fallida y cuotas de Actions. Encontré además reportes comunitarios con la misma firma, uno con anotación literal indicando que la cuenta estaba bloqueada por un problema de facturación.
6. Usé RDC en el dispositivo PC-14 solo para diagnosticar esta falla. No había clon KHORA en las ubicaciones de proyecto/Escritorio consultadas, Git CLI no estaba disponible, GitHub CLI `gh` no estaba instalada, y Node.js `v24.22.2` sí estaba disponible. No instalé herramientas ni cloné el repo: el fallo ocurre antes del primer paso remoto, de modo que una reproducción del código local no reproduce el gate de GitHub.

## Conclusión

La evidencia cruzada eleva a **alta probabilidad** un bloqueo de facturación/uso/entitlement de GitHub Actions que afecta los repositorios privados de SeryMente. No es razonable continuar alterando código o YAML de KHORA como primer remedio. El hecho exacto de facturación sigue **NO CONFIRMADO**: el conector puede leer el recuento de anotaciones, pero no sus cuerpos; tampoco puede consultar las páginas privadas Billing & Licensing.

La acción de mayor valor es que el propietario revise `SeryMente → Settings → Billing & Licensing → Plans and usage` y `Payment information`, incluyendo la cuota de Actions, límites de gasto, autorización de pago y bloqueo que aparezca. Si no se presenta una explicación, abrir soporte GitHub con los run/job IDs y solicitar el contenido de las anotaciones. No subir presupuesto ni aceptar cargos sin una decisión explícita.

## Restricciones respetadas

- No hubo reruns, `workflow_dispatch`, push de código de producto, cambio de configuración, ajustes de facturación, instalación de Git/gh, clone local ni prueba manual del build.
- No se publicó Preview ni producción; no se tocó Vercel, base de datos, secretos o dominios.
- No se alteró `main` ni otros repositorios. Los commits de este ciclo son documentación de Publicabilidad en `publicabilidad/inauguracion-20261028`.
- El control de responsabilidad permanece `unassigned`.

## Artefactos

- [OCP Publicabilidad v0.6](../OBJETO-CANONICO.md).
- [Diagnóstico transversal billing/Actions](../evidencias/DIAGNOSTICO-BLOQUEO-ACTIONS-BILLING-2026-10-29.md).
- [Diagnóstico de viabilidad ChatGPT Free → Vercel](../evidencias/DIAGNOSTICO-VIABILIDAD-CHATGPT-FREE-VERCEL-2026-10-29.md).

## Siguiente acción

El propietario de facturación debe confirmar el estado de Actions/uso privado y resolver el gate si existe. Solo después debe observarse una ejecución controlada con runner/steps/logs y reanudarse el trabajo de configurar una autoridad única de producción. Hasta entonces, producción sigue bloqueada y no deben repetirse runs sin nueva evidencia.

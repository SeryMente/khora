# Salida documental · Validación de integración CUSTODIA-04

- **Ciclo:** CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C008.
- **Fecha local:** 2026-10-28.
- **Repositorio y rama de revisión:** `SeryMente/khora`, `fix/custodia-recovery-reconcile-20261028`.
- **Punta de la PR:** `cbb9efd89048daf3bd9f07cc69c2e6d7209aa55d`.
- **PR:** [#339 — CUSTODIA: reconciliar catálogo y preservar audio legacy](https://github.com/SeryMente/khora/pull/339), abierta en borrador, no fusionada.
- **OCP vivo único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md); esta salida conserva evidencia del ciclo, no constituye un segundo estado de trabajo.

## 1. Resultado principal del ciclo

Se completó el ensayo SQL de integración que no había podido ejecutarse en C007. Se instaló `@electric-sql/pglite` en un directorio temporal fuera del repositorio y se configuró `PGLITE_MODULE` solo para el proceso de prueba. El arnés ahora configura un usuario de prueba, sesión JWT sintética y clave de cifrado sintética; inicializa el contexto de solicitud que espera NextAuth/Next.js, sin cambiar la autenticación ni los secretos de producción.

Resultado observado:

```json
{"status":"PASS","checks":15,"realSQL":true,"engine":"PostgreSQL/PGlite WASM","productionServices":false,"concurrentConnections":false}
```

Las comprobaciones cubren el catálogo y la paginación/revisiones, el manejo del punto seleccionado, recuperación/idempotencia, titularidad, protección de origen, audio legacy sin manifiesto, rechazo de cadena con huecos, integridad básica del audio y preservación del registro y partes originales.

## 2. Validaciones locales confirmadas

- `npm run typecheck`: PASÓ sobre el worktree con el arnés actualizado de la punta de PR.
- `npm run ui-review:check`: PASÓ en la validación local previa; desde entonces solo cambiaron el arnés de integración y su configuración de pruebas.
- `npm run ui:contract`: PASÓ en la validación local previa; desde entonces solo cambiaron el arnés de integración y su configuración de pruebas.
- `npm run test:unit`: 549/550 en la ejecución registrada. La única falla fue `methodology_contract_sync.test.ts`, cuyo acceso remoto a GitHub agotó el tiempo con `TLS handshake timeout`. Una comparación independiente mediante el conector de GitHub confirmó que el JSON local y el canónico coinciden exactamente, con blob SHA `232590a1f6339e2517e67038e1b5f7e8bd1638e3`; la prueba dependiente de red no tuvo una pasada propia.
- El ensayo PGlite no prueba conexiones concurrentes ni servicios productivos de Neon/Blob; la recuperabilidad real requiere pruebas adicionales en el entorno autorizado.

## 3. CI remoto: fallo sin ejecución de pasos

Se reintentaron una vez los workflows `UI Quality`, `CI` y `khora-ok / gate`. En el segundo intento los tres terminaron como fallidos en aproximadamente 2–3 segundos. Sus jobs muestran `runner_name=""`, cero pasos ejecutados (`steps=[]`) y los logs responden `BlobNotFound`. Por tanto, no se dispone de logs que atribuyan el resultado a código ni de una ejecución real de esos controles en GitHub Actions. La causa exacta de esta condición no quedó determinada; la ejecución remota de CI permanece bloqueada.

## 4. Estado de la PR y de producción

- PR #339 sigue abierta en borrador, no fusionada. La punta es `cbb9efd89048daf3bd9f07cc69c2e6d7209aa55d`.
- El código de corrección continúa separado de `main`; no se publicó un despliegue.
- El bloqueo de despliegue de Vercel para el repositorio privado bajo el plan Hobby sigue reportado; no se verificó en este ciclo un despliegue alternativo.
- El catálogo de Ingresos → Dictado → Recuperación no se obtuvo mediante una sesión autenticada autorizada: 0 unidades reales cotejadas y 0 recuperaciones productivas.
- El dictado que el operador reportó ausente tras la última entrada visible de las 17:08 del 2026-10-28 sigue sin localizarse. Su pérdida definitiva tampoco está demostrada.

## 5. Siguiente secuencia operativa

1. Resolver acceso autorizado y verificable al CI y al despliegue; no marcar la PR como lista para revisión basándose en jobs sin pasos.
2. Adquirir la línea base autenticada de Recuperación, recorrer todas las páginas hasta `nextCursor=null`, reconciliar las sesiones locales/remotas y revisar Custodia por capturas archivadas.
3. Recuperar de forma no destructiva las unidades identificables; verificar lectura de vuelta, integridad y procedencia.
4. Investigar por separado el dictado ausente y cualquier otra brecha.
5. Tras evidencia de CUSTODIA-01/03, validar la propuesta integrada en el entorno autorizado y solo entonces evaluar la fusión y publicación.

**Estado de CUSTODIA-04:** EN CURSO. El arnés de integración ya pasó; los bloqueos de CI remoto, acceso al catálogo productivo, despliegue y lectura de recuperación real siguen abiertos. No se modificaron datos/objetos de producción, credenciales productivas ni `main`.

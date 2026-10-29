# Salida documental · Primera ejecución de CUSTODIA-04

- **Ciclo:** CUSTODIA-PLAN-RECUP-SES-20261028-R6K2M9Q4-C007.
- **Fecha operativa local:** 2026-10-28.
- **Repositorio:** `SeryMente/khora`.
- **Rama de corrección:** `fix/custodia-recovery-reconcile-20261028`.
- **Commit de la rama:** `95d7bbf2cbe0bb89b6d8ff01135438152ec8201d`.
- **PR de revisión:** [#339 — CUSTODIA: reconciliar catálogo y preservar audio legacy](https://github.com/SeryMente/khora/pull/339). Está en borrador; no se fusionó.
- **Fuente única de estado:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md); esta salida es evidencia del ciclo, no un objeto vivo paralelo.

## 1. Trabajo implementado en una rama aislada

1. Se añadió `lib/custodia/catalogo-recuperacion.ts`, una función pura que agrupa las fuentes por sesión y preserva variantes locales y remotas, sin reemplazar una copia por otra.
2. La hidratación inicial, la recarga manual y la carga de páginas usan la misma reconciliación. El panel presenta una tarjeta por sesión y permite elegir entre puntos locales y remotos.
3. La insignia de Ingreso describe las sesiones únicas cargadas y señala cuando hay páginas anteriores pendientes; no presenta una página de 20 como total global.
4. El catálogo remoto separa las partes declaradas por el punto de recuperación del número de partes que siguen almacenadas y verificadas en Custodia. La interfaz distingue ambos hechos.
5. Para snapshots legacy sin manifiesto de audio, la recuperación propuesta puede incluir las partes persistidas si forman una cadena contigua y verificada, sin fabricar `corteAudio` ni afirmar sincronía. Si la cadena tiene huecos o partes no verificadas, la ruta devuelve conflicto antes de crear un destino parcial.
6. Se añadieron cinco pruebas unitarias de reconciliación y escenarios de integración PostgreSQL/PGlite para manifiestos legacy, audio verificado, rechazos por huecos y preservación del original. Los archivos de integración están escritos, pero la ejecución del ensayo todavía no se logró en este entorno.

## 2. Validación disponible

| Control | Resultado |
|---|---|
| `npm run typecheck` | PASÓ |
| `npm run ui-review:check` | PASÓ |
| `npm run ui:contract` | PASÓ |
| `npm run test:unit` | 549 de 550 pasaron; 1 falla ambiental de acceso remoto |
| `tests/integration/ingreso-recuperacion-postgres.ts` | NO EJECUTADA: falta `PGLITE_MODULE` configurado/instalado |

La única falla unitaria fue `methodology_contract_sync.test.ts`: tanto la consulta HTTP como el fallback de `gh api` terminaron con `TLS handshake timeout` al consultar GitHub. Esto no demuestra una diferencia entre contratos. Una comparación independiente mediante el conector autenticado de GitHub encontró que el esquema local y el canónico tienen el mismo blob SHA `232590a1f6339e2517e67038e1b5f7e8bd1638e3` y cero diferencias de contenido. La prueba unitaria propiamente dicha sigue sin completarse por la limitación de conectividad.

El despliegue tampoco puede darse por hecho: el estado de Vercel reportado en el repositorio indica que el repositorio privado de la organización no se puede desplegar con el plan Hobby actual. La rama no está en `main` y la PR permanece en borrador precisamente porque falta la prueba de integración y la aceptación de extremo a extremo.

## 3. Estado factual del incidente y del producto

- El catálogo autenticado real no se pudo enumerar ni cotejar.
- Se cotejaron **0 unidades reales del catálogo productivo**; se realizaron **0 recuperaciones productivas**.
- El dictado posterior a la última entrada visible comunicada a las 17:08 sigue sin localizarse. Su pérdida definitiva tampoco está demostrada.
- La discrepancia 40→20 no queda explicada de forma concluyente por el código; la reconciliación implementada en la rama debe confirmarse contra identidades reales y todas las páginas.
- No se modificaron datos de producción, originales, credenciales ni despliegues.

## 4. Secuencia siguiente

1. Conseguir un entorno autorizado que pueda ejecutar la integración PostgreSQL/PGlite y consultar el contrato canónico sin fallos de red; completar la regresión.
2. Obtener la sesión autenticada autorizada para recorrer todas las páginas de Recuperación hasta `nextCursor=null`, reconciliar con el catálogo local y revisar Custodia por capturas archivadas.
3. Recuperar y comprobar las unidades que se localicen, sin alterar los originales; investigar por separado el dictado ausente y las demás lagunas.
4. Solo después de las pruebas integradas y del acceso de despliegue autorizado, decidir la revisión final/merge de la PR y verificar la versión efectiva del producto mediante lectura de vuelta.

**Estado del ciclo:** CUSTODIA-04 EN CURSO. La corrección está propuesta en rama y parcialmente validada; la recuperabilidad productiva permanece sin certificar.

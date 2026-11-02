# HARMONIA · integración local-first sobre main · generación 14 · 2026-11-01

## Alcance de este ciclo

Continuar HARMONIA desde el control de responsabilidad vigente de generación 14, usando únicamente PC-8 (7595d30a-bd63-4bc0-a274-f4ae90928247). No modificar la máquina ni el clon local de Custodia. La actividad principal fue portar la capa local-first a una rama limpia desde el main actual, corregir referencias de ejecución y preparar una PR de revisión.

## Gobierno y frontera EP adquiridos

- DUG fuente: Samantha v377 / NX-377m, Metacanon 1.28, GOW 2.17; blob 54064c8fe00f872023a455f06596061ed69062ae; commit vigente consultado 8ee2482866b3dd085e58e05006727256d0274376.
- OEP fuente: SeryMente/metodologia/main:frentes/ep/OEP.md; v0.3.26 / VCU-EP-v28; blob 986005a15858f8109921bf14e37741b360d31b54; commit consultado 75fc9be48354f347796567e1b41617b5e102f676.
- OEP §91 dispone que el único bucket B2 previsto para EP es OCP-MCP; OCP-MSP y metodologia-ep-persistencia son destinos erróneos. OEP §95 mantiene bucket, key, prefix y permisos como NO VERIFICADOS. No se usa B2 ni se modifica OEP/DUG desde HARMONIA.
- El último mensaje de coordinación DTC EP solicita a Gobernanza ampliar criterios para la continuidad MCP-OCP, pero no existe acuse/read-back posterior verificable. No se escribió en el objeto de coordinación ajeno a esta titularidad ni se asumió el rol de Gobernanza/EP.

## Código y publicación candidata

- main base: 8850b47fdfc2b24a670f653b1e3cf883f2bde055.
- Rama nueva: feat/harmonia-local-first-mainline-20261101.
- Commit de código: db2b1e05a131ec37688124276f7c7dd6b381564d.
- Commit de build metadata: e263163f78b6509267ed21408f4d891355a30784.
- Commit de documentación inicial: adb3944b2235c04855784945bcfea23967285680; commit de manifiesto: 09d8d5976245bc226e264d7969e5a1f920a4081c. Estos son snapshots previos a los últimos ajustes de documentación.
- Build metadata: blob 1df069d7b53d2264240d2d3bdeacebfe4cca2c69; manifiesto MV3 y contrato de captura permanecen v0.3.0; captura de mensajes visibles false.
- Compare al crear la PR: 2 commits ahead / 0 behind; después del primer lote documental: 4 ahead / 0 behind. PR #351, abierta en borrador y no fusionada; GitHub la reportó mergeable=true.
- Archivos portados: IndexedDB outbox, adaptador de ledger local, colector con JSONL/fsync y reconciliación, popup con estado de persistencia y botón de consulta de metadatos, build-info, suites de outbox/ledger/colector y workflow.
- Corrección de ruta: el colector usa LOCALAPPDATA o os.homedir(); no conserva el literal de perfil fila4.
- El content script de main no se sustituyó; la antigua candidata v0.4.1 de captura de mensajes queda fuera de esta PR para revisión separada.

## Evidencia y límites de validación

- El workflow anterior 41355059144 pasó en el corte antiguo 3fc095557ca090e4d446a9caf375f6e0043ddf57. No acredita la nueva rama.
- Runs nuevos de push: 41364608505 (HARMONIA local-first) y 41364608607 (CI general); runs de PR: 41365195109 (HARMONIA), 41365195098 (CI), 41365195100 (UI Quality) y 41365195137 (khora-ok/gate). Todos failure; los jobs consultados devuelven steps=[] y las descargas de logs consultadas responden BlobNotFound. Causa raíz de ausencia de steps/logs NO DETERMINADA. No atribuirlo a una aserción ni declarar tests ejecutados.
- Intento de materialización de fixtures en un directorio temporal PC-8 fue bloqueado por el control de seguridad del conector. No se obtuvo prueba local alternativa.
- Checks Vercel fallan con el mensaje del proveedor sobre repositorio privado de organización en plan Hobby. No constituyen test de código.
- No se ejecutó la extensión en Chrome; no se modificó el perfil ni se realizaron pruebas MV3 reales, E2E natural, medición CPU/RAM/latencia, escritura Neon, B2 o transporte remoto.

## Estado y siguiente compuerta

La candidata local-first está publicada en PR #351 draft. Antes de salir de borrador se requiere ejecución efectiva de los tests con logs, revisión del diff y aceptación del operador en Chrome. La capa remota EP permanece bloqueada hasta obtener contrato oficial/versionado, auth/scopes, allowlist, semántica de recibo y read-back; el único destino previsto por EP es OCP-MCP, aún no autenticado ni verificado. No merge, deploy, B2, backfill ni EP_PERSISTED_VERIFIED.

## Anclas

- OCP propuesto en esta PR: docs/frentes/harmonia/OBJETO-CANONICO.md, v0.42 / HARMONIA-v0.42, §§46–48. Main conserva v0.41 hasta merge.
- PR: https://github.com/SeryMente/khora/pull/351
- Rama: https://github.com/SeryMente/khora/tree/feat/harmonia-local-first-mainline-20261101
- DUG: https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.html
- OEP: https://github.com/SeryMente/metodologia/blob/main/frentes/ep/OEP.md

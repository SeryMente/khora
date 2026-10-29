# Harmonia · checklist actualizado y priorización por partes · SES-20261022-R8Q4N6P1

- Fecha operativa: 2026-10-22 (America/Mexico_City).
- Frente: Harmonia · repositorio `SeryMente/khora`.
- OCP: `docs/frentes/harmonia/OBJETO-CANONICO.md`, siguiente revisión documental v0.23, §30.
- Rol: asistente.
- Folio activo: `SES-20261022-R8Q4N6P1`; control de responsabilidad generación 5, blob `ac797019939f2f93dcbe2c98b73b36d71b30a900`.
- Transferencia: commit `822c09b59cba59e7ae8c4ddfd959502367e7af6c`; lectura de vuelta comprobada.
- Instrucción original de este ciclo: `originales/HARMONIA-CHECKLIST-SES-20261022-R8Q4N6P1.jsonl`.

## Gobierno adquirido desde main

- `INICIO.md`: lectura directa confirmada; fuente de autoridad `SeryMente/metodologia/main`.
- Sam: v339 / `NX-339m`, blob `fdc996078bd611492e46d6b3abf569fbb4a6effa`.
- Metacanon: 1.21 / `METACANON-OBJETOS-v1.21`, blob `cae8387a576ba4914d086a47bf57fe925717efca`. El commit/edad de modificación de esta ruta no quedó verificado en este ciclo; frescura temporal exacta: NO VERIFICADA.
- GOW: v2.2, blob `6d4f8aff292ae173d9ceeba03694597bd2f16488`; revisado al inicio del ciclo. No surgió nueva convención terminológica.
- Revisión manual de la cascada Sam y principios pertinentes completada; `MCP-NORMATIVO: DESACTIVADO`.

## Estado de partida

- El OCP previo v0.22 / blob `5be741d6ace785ab1102051ee8ad55ac10987de1` registra la candidata v0.4.0 en el Escritorio del destino RDC `PC-14`, UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb`, perfil `C:\Users\PC 13`.
- §29 conserva el resultado de entrega: una sola carpeta `C:\Users\PC 13\Desktop\Harmonia`; carpeta de carga de Chrome `C:\Users\PC 13\Desktop\Harmonia\extension`; 9/9 archivos JavaScript parseables, `HARMONIA_SOURCE_CONTRACT_OK`, 5/5 pruebas Node locales y 22/22 hashes válidos.
- Son las últimas evidencias persistidas disponibles; no se repitieron pruebas locales ni se inspeccionó el Escritorio en este ciclo.
- La extensión no se ha cargado ni probado en una conversación natural de Chrome. E2E permanece ABIERTA.
- La candidata v0.4.0 sigue en PR #333, abierta en borrador y sin fusionar; `main` mantiene v0.3.0. No se modificó código.
- Los últimos workflows consultados de GitHub Actions fallaron antes de asignar runner, sin pasos/logs/artefactos legibles. Causa raíz NO DETERMINADA. El CI local básico pasa según §29; no confundir ambos resultados.
- El inventario RDC muestra online a ese UUID de PC-14 y también a PC10RCIF4EI4. No se realizó ninguna operación remota; el perfil/cuenta debe reconfirmarse antes de una futura mutación.

## Checklist actualizado de los 17 criterios conservados

Leyenda: ✅ criterio acotado documentado/verificado; 🟡 parcial, falta prueba o integración; ⬜ pendiente; ⏸️ pospuesto hasta después de E2E.

1. 🟡 **Captura automática en todas las pestañas de ChatGPT.** Está implementada en la candidata v0.4.0 según el código/documentación; no se ha cargado en Chrome ni validado con una conversación natural.
2. ✅/**alcance: código candidato** **Eliminación del permiso `debugger`.** La candidata declara observación estructural sin ese permiso; la carga real de la extensión aún no está probada.
3. 🟡 **Sesiones y pestañas independientes.** El candidato conserva estado por pestaña y política regional; falta ensayo físico multi-pestaña para confirmar que no mezcla sesiones ni pierde deltas.
4. 🟡 **Banco de datos organizado, limpio y consistente.** El colector pasó 5/5 pruebas locales según §29; integridad, orden y recuperación bajo conversación real y varias pestañas siguen sin demostración E2E.
5. 🟡 **Deduplicación de superficies con SHA-256 y referencias compactas.** El manifiesto de archivos local dio 22/22 hashes correctos; esto no prueba por sí solo idempotencia de eventos, ausencia de duplicados ni conservación de avistamientos.
6. ⏸️ **Reducción de CPU.** La estrategia candidata restringe barridos estructurales redundantes; CPU real no está medida. Medir después de E2E.
7. ⏸️ **Reducción de RAM.** No existe medición comparativa ni aceptación de la optimización incremental; diferida después de E2E.
8. ⏸️ **Demostrar que optimizaciones preservan calidad/cobertura.** Pendiente hasta disponer de una prueba E2E aceptada y una referencia comparable.
9. 🟡 **Sincronización periódica con el repositorio canónico.** Hay build-info/metadatos en la candidata, pero no se ha demostrado sincronización efectiva y periódica. `main` permanece en v0.3.0 y no contiene toda la candidata v0.4.0.
10. 🟡 **Separar sincronización de metadatos de actualización de código ejecutable.** La candidata incorpora metadatos de versión/revisión y el gobierno prohíbe ejecutar JavaScript remoto; falta prueba integrada del flujo real de sincronización/actualización controlada.
11. ⏸️ **Arquitectura multiámbito.** Existe una propuesta candidata no aprobada; se difiere hasta aceptar el ámbito actual de observabilidad.
12. ⏸️ **Modularidad, contratos comunes, almacenamiento aislado y permisos multiámbito.** No declararlo implementado/aceptado; sigue parte de la propuesta no esencial.
13. ⏸️ **UX/UI para descubrir y supervisar futuros ámbitos.** Aplazado hasta después de E2E; no anteponer retoques visuales.
14. ✅/**documentación temporal, no aprobación** **Notas temporales de arquitectura en el OCP.** §16 ya documenta la visión multiámbito, eficiencia, integridad, colisiones y sincronización.
15. ✅/**registro hecho; ejecución futura pendiente** **Declaración de provisionalidad y formalización posterior por Metacanon.** La condición temporal queda documentada; el FT de Metacanon aún debe decidir/formalizar la propuesta.
16. 🟡 **Coherencia código–colector–manifiestos–paquete.** El paquete local tuvo 22/22 hashes correctos y build-info fijó revisión de fuente candidata; no hay igualdad total demostrada con `main`, ni la candidata está fusionada.
17. ⬜ **Aceptación E2E final.** Pendiente: abrir varias pestañas, observar eventos reales, comprobar ausencia de colisiones/pérdidas, persistencia y recuperación, sincronización y recursos. Solo declarar aceptación tras evidencia real.

## Bloqueos y pendientes transversales del esencial

- **Primer paso pendiente:** cargar `C:\Users\PC 13\Desktop\Harmonia\extension` mediante `chrome://extensions` → «Cargar descomprimida», y ejecutar una conversación de prueba sin datos sensibles.
- **Después:** comprobar envío de eventos, mensajes parciales/finales expuestos por la interfaz, sesiones de varias pestañas, lectura de originales/índice y persistencia tras reinicio. La consulta desde otro hilo requiere prueba independiente y no hay consumidor permanente demostrado.
- **CI de GitHub:** mantener como incidencia de infraestructura separada; no reintentar a ciegas, no afirmar causa raíz y no atribuirla a código sin logs. El CI local 5/5 documentado no equivale a que GitHub Actions haya pasado.
- **Carpeta única:** ya registrada como entregada en §29. No crear otra carpeta por versión ni borrar/reemplazar hasta revalidar la identidad del equipo y el paquete.
- **No esencial:** CPU/RAM/fingerprints, generalización multiámbito, UX avanzada y métricas van después de E2E. Aplicar regla anti-loop: reabrir solo por fallo reproducible, instrucción expresa o riesgo material.

## Salida por ciclo — Metacanon §4

1. **Identidad/gobierno:** Harmonia · `SeryMente/khora` · ruta OCP heredada `docs/frentes/harmonia/` · folio `SES-20261022-R8Q4N6P1` · generación 5 · Sam v339/NX-339m · Metacanon 1.21/METACANON-OBJETOS-v1.21, blob `cae8387a576ba4914d086a47bf57fe925717efca`, edad de commit NO VERIFICADA · GOW v2.2, blob `6d4f8aff292ae173d9ceeba03694597bd2f16488` · `MCP-NORMATIVO: DESACTIVADO`.
2. **Dónde estamos:** paquete candidata v0.4.0 entregado según último registro; E2E abierta.
3. **Delta:** checklist previo contrastado y actualizado; se separan evidencia, pendientes y optimización diferida.
4. **Avance:** transferencia gen5 verificada por CAS/read-back; fuentes metodológicas releídas; OCP §29 recuperado.
5. **Falta:** prueba real Chrome, multi-pestaña, persistencia/recuperación y verificación integrada de sincronización; causa del fallo de runner CI sigue desconocida.
6. **Viabilidad:** probar la candidata ya entregada es el siguiente hito de mayor valor; no es resultado conseguido en este ciclo.
7. **Tiempo/ciclos:** no actualizar el rango amplio de §28 como tiempo restante; el paso inmediato es una prueba manual y el resultado aún es desconocido.
8. **Siguiente acción:** carga de `extension` en Chrome y prueba natural sin datos sensibles.
9. **Continuación:** no se ejecutaron operaciones locales ni se modificó código en este ciclo; se pidió actualizar el checklist y trabajar por partes.
10. **Persistencia:** entrada verbatim dedicada, esta crónica y el nuevo bloque §30 del OCP. Verificar todas las escrituras mediante read-back.

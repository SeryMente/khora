# Harmonia · checklist actualizado y priorización por partes · SES-20261022-R8Q4N6P1

- Fecha operativa: 2026-10-22 (America/Mexico_City).
- Frente: Harmonia · repositorio `SeryMente/khora`.
- OCP: `docs/frentes/harmonia/OBJETO-CANONICO.md`, actualización propuesta v0.23, §30.
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

## Estado de partida verificado documentalmente

- El OCP previo v0.22 / blob `5be741d6ace785ab1102051ee8ad55ac10987de1` sitúa la candidata v0.4.0 en el Escritorio del destino RDC `PC-14`, UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb`, perfil `C:\Users\PC 13`, carpeta `C:\Users\PC 13\Desktop\Harmonia`.
- §29 conserva el resultado de entrega: una sola carpeta de proyecto `Harmonia`; directorio de carga de Chrome `C:\Users\PC 13\Desktop\Harmonia\extension`; paquete con 9/9 archivos JavaScript parseables, `HARMONIA_SOURCE_CONTRACT_OK`, 5/5 pruebas locales y 22/22 hashes válidos.
- Esas pruebas/lecturas son la última evidencia persistida encontrada, no se repitieron en este ciclo.
- La extensión no se ha cargado ni probado en una conversación natural de Chrome. La aceptación E2E sigue ABIERTA.
- PR #333 continúa como candidata v0.4.0, abierta en borrador y no fusionada; `main` mantiene v0.3.0. No se cambia código ni se usa RDC en este ciclo.
- GitHub Actions continúa sin diagnóstico raíz: los últimos jobs consultados fallaron antes de asignar runner, sin pasos/logs/artefactos utilizables. Esto es incidencia de infraestructura sin causa determinada, no prueba de que el código falló.
- El registro de dispositivo actual mostró online al UUID de PC-14 citado arriba y a otro equipo PC10RCIF4EI4. No se ejecutaron acciones remotas; cualquier nueva mutación exige reconfirmar cuenta/perfil/destino.

## Checklist actualizado (código candidata vs pruebas reales)

Leyenda: ✅ evidencia suficiente para este criterio acotado; 🟡 implementación/evidencia parcial que no demuestra aceptación; ⬜ pendiente; ⏸️ diferido hasta después de E2E.

### A. Esencial para primera aceptación E2E

1. 🟡 **Gate de código/CI:** contrato estático y 9/9 parseos, 5/5 pruebas Node locales; los workflows GitHub siguen sin runner asignado y sin logs legibles. No reintentar a ciegas ni atribuir causa raíz.
2. 🟡 **Captura automática en pestañas de ChatGPT:** existe en la candidata v0.4.0, pero no se ha cargado/re-cargado en Chrome ni validado con mensajes naturales.
3. 🟡 **Sesiones y varias pestañas:** la candidata mantiene sesiones por pestaña y coordinación regional; existe prueba aislada de política, pero no aceptación física multi-pestaña ni medición de cero colisiones.
4. 🟡 **Persistencia e integridad funcional:** el colector pasó 5/5 pruebas locales y el paquete 22/22 hashes; faltan pruebas E2E de mensajes reales, concurrencia, reinicio, reconstrucción/recuperación y ausencia de pérdida/duplicación.
5. 🟡 **UI y distribución/metadatos:** paquete v0.4.0 y build-info existen en candidata; no hay prueba en Chrome ni sincronización real confirmada entre `main`, rama candidata y paquete físico.
6. 🟡 **Gate automatizado antes de aceptar:** hay señales locales favorables, pero falta la ejecución reproducible integral con artefactos claros para el conjunto de aceptación. El problema de runner de GitHub sigue separado y con causa raíz NO DETERMINADA.
7. ✅/**revalidar antes de mutación** **Destino físico:** la entrega anterior identifica PC-14 / UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb` y el perfil `C:\Users\PC 13`; el proveedor lo muestra online en el inventario observado. No se operó el equipo en este ciclo.
8. ✅/**lectura anterior, no repetida hoy** **Carpeta única:** §29 registra la única carpeta de proyecto `Desktop\Harmonia`, con la extensión en `Desktop\Harmonia\extension`. Conservar el contenedor genérico y no crear otra carpeta por versión.
9. ⬜ **E2E físico y aceptación:** todavía no se ha cargado/re-cargado la extensión en Chrome ni ejecutado la prueba natural sin datos sensibles. Debe verificar captura al abrir, entradas, respuestas parciales/finales expuestas, varias pestañas, persistencia, estado de sincronización y consultas desde otro hilo solo en el alcance permitido.

### B. No esencial: después de aceptar E2E

10. ⏸️ **CPU:** no hay línea base de consumo real. Medir y optimizar después de E2E.
11. ⏸️ **RAM, recorrido incremental y fingerprints:** sin medición comparativa ni prueba de que la optimización preserva cobertura.
12. ⏸️ **Generalización multiámbito:** propuesta candidata no aprobada; no es prerrequisito de la primera aceptación de la observabilidad de ChatGPT.
13. ⏸️ **Modularidad/contratos/almacenamiento y permisos para otros ámbitos:** completar dentro de la generalización multiámbito, sujeto al frente Metacanon y aprobación pertinente.
14. ⏸️ **UI/UX multiámbito:** refinamiento de futuros dominios; no anteponerlo a la aceptación del núcleo actual.
15. ⏸️ **Métricas avanzadas, objetivos de desempeño y retención:** recoger primero datos reales y una línea base.
16. ✅/**documentado, formalización pendiente** **Notas de arquitectura temporales:** §16 y propuestas candidatas documentan la visión; no confieren aprobación. Formalización posterior por el FT Metacanon sigue pendiente.
17. 🟡 **Sincronización integral código–colector–manifiestos–paquete:** hashes del paquete local verificados históricamente 22/22; la igualdad con `main` no está demostrada porque la candidata sigue en PR #333 y `main` conserva v0.3.0.
18. ⏸️ **Validar que las optimizaciones no degradan cobertura:** requiere una línea base y comparación posterior a E2E.
19. ⬜ **Aceptación final:** varias pestañas activas, cero colisiones no controladas, persistencia íntegra, sincronización comprobada y recursos medidos; solo puede declararse con evidencia real de Chrome.

## Siguiente paso seleccionado

Trabajar por partes y no reabrir el trabajo no esencial. El siguiente paso de máximo valor es la prueba física E2E con la candidata ya entregada: cargar `C:\Users\PC 13\Desktop\Harmonia\extension` en `chrome://extensions` mediante «Cargar descomprimida» y probar una conversación sin datos sensibles. Después, leer los originales/index y comprobar persistencia/varias pestañas. No afirmar que este paso se ejecutó ahora.

## Salida por ciclo — Metacanon §4

1. **Identidad/gobierno:** Harmonia · `SeryMente/khora` · OCP ruta heredada `docs/frentes/harmonia/` · folio `SES-20261022-R8Q4N6P1` · gen5 · Sam v339/NX-339m · Metacanon 1.21/METACANON-OBJETOS-v1.21, blob `cae8387a576ba4914d086a47bf57fe925717efca`, edad de commit NO VERIFICADA · GOW v2.2 blob `6d4f8aff292ae173d9ceeba03694597bd2f16488` · `MCP-NORMATIVO: DESACTIVADO`.
2. **Dónde estamos:** paquete candidata v0.4.0 previamente entregado; E2E abierta.
3. **Delta:** se elaboró el checklist actualizado, separando verificado, parcial, pendiente y diferido.
4. **Avance:** titularidad gen5 confirmada por CAS/read-back; fuentes rectoras releídas; último estado de producto contrastado con §29.
5. **Falta:** cargar Chrome y hacer E2E real; después persistencia multi-pestaña/recuperación; CI GitHub sigue con causa raíz desconocida.
6. **Viabilidad:** la primera prueba E2E es alcanzable con el paquete ya documentado, si el dispositivo y Chrome siguen disponibles; el resultado no está demostrado.
7. **Tiempo/ciclos:** no se añade estimación al checklist porque el paso inmediato es una prueba manual con resultado aún desconocido; la estimación previa de 10–26 h correspondía al conjunto amplio, no al paquete ya entregado y no debe usarse como tiempo remanente actual.
8. **Siguiente acción:** carga de la carpeta `extension` en Chrome y prueba natural sin datos sensibles.
9. **Continuación:** no se ejecutaron operaciones locales ni se modificó código en este ciclo; el usuario pidió primero el checklist actualizado.
10. **Persistencia:** este registro se incorpora al OCP; la instrucción original se preserva verbatim por su JSONL dedicado. Cada escritura debe leerse de vuelta.

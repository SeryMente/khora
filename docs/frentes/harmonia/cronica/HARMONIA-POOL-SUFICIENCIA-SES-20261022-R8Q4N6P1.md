# Harmonia — pool mínimo suficiente y persistencia canónica

**Folio:** SES-20261022-R8Q4N6P1 · **Fecha:** 2026-10-22 · **Objeto:** HARMONIA-v0.24.
**Fuente normativa:** metodología/main — Sam v339 / NX-339m; Metacanon 1.21 / METACANON-OBJETOS-v1.21; GOW v2.2. Cascada Sam y principios pertinentes revisados; GOW reread al inicio del ciclo; MCP-NORMATIVO: DESACTIVADO.
**Titularidad:** generación 5, control SHA ac797019939f2f93dcbe2c98b73b36d71b30a900, folio activo SES-20261022-R8Q4N6P1.

## Instrucción y decisión

Las tres instrucciones del operador quedaron preservadas literalmente en originales/HARMONIA-POOL-SUFICIENCIA-SES-20261022-R8Q4N6P1.jsonl.

Se adopta una puerta de suficiencia finita en evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md: dos sesiones reales/dos pestañas, al menos cinco huellas, mensajes de usuario/asistente, transición progresiva hasta final cuando expuesta, IDs/timestamps/sesiones consistentes, cero líneas inválidas/mezcla/duplicados lógicos, persistencia tras reinicio, exportación saneada con SHA y read-back canónico. El catálogo exhaustivo de 68 funciones, otras regiones, CPU/RAM y multiámbito quedan fuera de la puerta esencial.

## Datos entregados a main y verificados

- Traza real saneada: datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl, 627 eventos, 0 líneas malformadas, 611 console.observed, 10 capture.started, 6 capture.stopped; 329897 bytes; SHA-256 a56aea6044f7a4ee94bd6a255a9ef24eacd78c003cf7144b72327d6176c90f21. Read-back exacto; blob publicado 9a34f1b87bb77c75af87d6d5e12734f661995621.
- Manifiesto de la traza: datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.manifest.json, read-back exacto.
- Fixture sintética: datos/observaciones/HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl, 11 eventos; cinco huellas; dos sesiones/dos pestañas; read-back exacto; todos están marcados synthetic_fixture.
- Baseline real: evidencias/HARMONIA-OBSERVACION-BASELINE-20261022.json.
- Orientación de datos: datos/observaciones/README.md.
- Criterio finito: evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md.
- OCP actual: versión 0.24 / HARMONIA-v0.24; blob de lectura de vuelta 0e80b074cfee7e46cde0e493619ae67f586fd9bd.

## Hallazgo central

La traza real no es suficiente como pool de construcción: no contiene mensajes visibles ni capturas estructurales, únicamente arranques, paradas y consola. La exportación compartida censura valores de consola a [REDACTED] y no incluye cuerpos reales de mensajes. La fixture es útil para diseño/tests del contrato, pero no se contabiliza como captura de Chrome.

La versión local 0.5.0 pasó 8/8 comprobaciones de sintaxis JS, HARMONIA_SOURCE_CONTRACT_OK y 7/7 tests Node. Son pruebas sintéticas/unitarias/integración local, no una conversación real en Chrome. E2E-CHROME-EVIDENCIA.json registra un intento previo FAIL “No ChatGPT test tab”; el runner PowerShell posterior fue bloqueado por la política local de scripts. No se cambió esa política ni se tocó el perfil personal de Chrome.

## Estado de la persistencia

Los artefactos de esta entrega están versionados en main por commits de GitHub y leídos de vuelta exactamente. **El envío automático recurrente desde el dispositivo a GitHub sigue NO CONFIGURADO.** El service worker consulta metadatos/catálogo remotos, pero no sube los eventos. El equipo no tiene gh, checkout Git ni credencial local de escritura disponible; el conector de GitHub de ChatGPT no expone su credencial al runtime local. No publicar secretos ni introducir tokens en el código de extensión.

## Próxima acción única de máximo valor

Corregir y demostrar la emisión real de ui.surface.scan y conversation.visible.delta en dos sesiones de ChatGPT; después demostrar persistencia tras reiniciar el colector. Para cumplir persistencia automática futura, habilitar un canal de escritura autenticado y gobernado desde el dispositivo o un servicio de ingesta. No reabrir optimizaciones, UX multiámbito ni catálogo exhaustivo antes de superar esa puerta.

## Salida obligatoria — Metacanon §4

1. **Identidad y gobierno:** Harmonia / SeryMente/khora; OCP v0.24 / HARMONIA-v0.24; folio SES-20261022-R8Q4N6P1, generación 5. Metacanon 1.21 / sello METACANON-OBJETOS-v1.21, blob cae8387a576ba4914d086a47bf57fe925717efca; Sam v339 / NX-339m; GOW v2.2 / blob 6d4f8aff292ae173d9ceeba03694597bd2f16488; MCP normativo desactivado.
2. **Dónde estamos:** los datos saneados reales y la fixture están en el repositorio canónico; falta captura real suficiente y sync automático futuro.
3. **Delta:** puerta de suficiencia finita fijada, baseline creado, traza real exportada y fixture sintética escrita.
4. **Avance verificable:** 627 registros válidos/0 malformados; manifiesto y read-back exactos; fixture 11/5 huellas/2 sesiones; fuente local 8/8 sintaxis, contrato OK y 7/7 tests.
5. **Pendientes:** emisión natural de eventos estructurales/mensajes; prueba reinicio/persistencia; canal de escritura autenticado del dispositivo.
6. **Viabilidad:** pool de diseño sintético disponible y diagnóstico real preservado; el conjunto natural actual no alcanza el umbral mínimo.
7. **Tiempo:** commits y verificación completados en este ciclo; no se simula fecha de cierre de las compuertas materiales restantes.
8. **Siguiente acción:** corregir captura E2E de estructura/mensajes; establecer canal seguro de publicación persistente.
9. **Continuación:** optimizaciones y arquitectura multiámbito siguen diferidas; no reabrir sin fallo reproducible o necesidad explícita.
10. **Persistencia:** OCP v0.24, traza/manifest/fixture/baseline, README de datos, criterio de suficiencia, originales y esta crónica guardados en main con read-back verificado; GOW se relee de cierre en este ciclo.

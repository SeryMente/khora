# Harmonia · carpeta canónica del frente

Entrada única de estado: [OBJETO-CANONICO.md](OBJETO-CANONICO.md). El OCP conserva estado vivo, decisiones, notas temporales, pruebas, historial breve y paquete de traspaso; no se debe crear una fuente de estado competidora.

- [Asistente · instancia fresca / traspaso v0.9](prompts/ASISTENTE.md): entrada, adquisición de gobierno, compuerta de titularidad y secuencia E2E.
- [Constructor · no instanciado](prompts/CONSTRUCTOR.md): ejecutar únicamente bajo su régimen y no utilizar Remote Desktop Commander.
- [Control exclusivo](CONTROL-RESPONSABILIDAD.json): actualmente asignado a la instancia y generación que constan en el JSON; no es un bootstrap sin propietario. Preparar el traspaso no transfiere la titularidad.
- [Originales](originales/PROCEDENCIA.md), [crónica](cronica/HARMONIA-INSTANCIACION-01.md) y [revisión](evidencias/HARMONIA-INSTANCIACION-01-revision.json).

## Fuente de código y aceptación

El código publicado en `main` sigue en v0.3.0 sin aceptación E2E. La candidata v0.4.0 está en [PR #333](https://github.com/SeryMente/khora/pull/333), abierta en borrador y sin fusionar; el fix de persistencia local se encuentra en la rama candidata y pasó 5/5 pruebas Node locales. El OCP vigente es **v0.27**; §31 conserva el criterio finito para el pool mínimo v1 y §34 registra la transferencia de titularidad vigente y el bloqueo técnico actual. Los artefactos reales saneados y la fixture sintética están en docs/frentes/harmonia/datos/observaciones/. La captura natural suficiente sigue pendiente; no confundir tests locales ni fixture con E2E de Chrome. Carpeta entregada: `C:\Users\PC 13\Desktop\Harmonia`; Chrome → Cargar descomprimida: `C:\Users\PC 13\Desktop\Harmonia\extension`. La extensión no se ha cargado ni probado naturalmente en Chrome; E2E sigue ABIERTA. La arquitectura multiámbito y UX/métricas siguen siendo propuestas no aprobadas. No inferir sincronización entre `main`, rama candidata y paquete local sin comparar huellas.

La entrega previa quedó registrada para `PC-14` / UUID `345f64ee-5d6a-429f-a97c-dab44f44cddb`, perfil histórico `C:\\Users\\PC 13`. La consulta RDC viva del 2026-10-28 muestra ese mismo UUID **OFFLINE** (último visto hace 145 horas); PC10RCIF4EI4 / UUID `86580320-19b3-421a-89c7-36dce0123559` figura ONLINE pero es otro dispositivo y no se usa como sustituto. No ejecutar operaciones locales hasta recuperar el UUID exacto y verificar cuenta → SID → perfil según Sam P036. Nunca usar ni leer `C:\\Users\\MantenimientoRCI\\` como raíz operativa.

La formalización del criterio multiámbito de §16 sigue pendiente mediante el FT de Metacanon; sus notas siguen siendo temporales hasta entonces.


## Continuidad histórica · SES-20261022-R8Q4N6P1 (generación 5 sustituida)

Control histórico de generación 5, folio `SES-20261022-R8Q4N6P1`, blob `ac797019939f2f93dcbe2c98b73b36d71b30a900`. Esta titularidad fue sustituida primero por gen6 y después por gen7 mediante transferencias registradas con CAS y lectura de vuelta. El bloque se conserva solo como historia; ya no determina el titular ni el siguiente paso.


## Entrega del pool mínimo suficiente — SES-20261022-R8Q4N6P1

[Traza real saneada](datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.jsonl) y [manifiesto](datos/observaciones/HARMONIA-TRAZA-OBSERVACION-REDACTADA-20261022.manifest.json) están guardados en main. La traza tiene 627 eventos (611 de consola, 10 de inicio, 6 de parada), cero malformados y no contiene eventos estructurales ni mensajes visibles. [Fixture sintética](datos/observaciones/HARMONIA-POOL-MINIMO-V1-SINTETICO.jsonl) aporta 11 eventos de diseño, cinco huellas y dos sesiones; no demuestra captura real. Ver [baseline](evidencias/HARMONIA-OBSERVACION-BASELINE-20261022.json) y [criterio de suficiencia](evidencias/HARMONIA-CRITERIO-SUFICIENCIA-POOL-V1.md).

La publicación puntual quedó verificada por lectura de vuelta exacta. La publicación automática recurrente desde la extensión no está implementada; el worker sincroniza metadatos de solo lectura y no sube observaciones.


## Estado histórico sustituido · SES-20261022-6E3A91F7 (generación 7)

OCP v0.26. Control exclusivo: generación 7; folio `SES-20261022-6E3A91F7`; blob del control releído `636a43c6e89355bba94154f2e48f465226030396`; transferencia desde gen6 mediante commit `0a654c4d76ac2b85ccba62d479c6c44abe371090`. Autorización `Si` literal: [original U19](originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7.jsonl). [Crónica de transferencia](cronica/HARMONIA-TRANSFER-SES-20261022-6E3A91F7.md) y [última salida íntegra](originales/HARMONIA-TRANSFER-SES-20261022-6E3A91F7-salida.md).

La consulta viva de RDC de este ciclo confirma que el UUID autorizado de PC-14 `345f64ee-5d6a-429f-a97c-dab44f44cddb` continúa OFFLINE. No se usó el otro dispositivo online. No hubo operaciones locales ni pruebas de Chrome, CI o E2E en este ciclo; el paquete local y la raíz directamente cargable siguen NO VERIFICADOS. Reanudar operaciones locales solo tras recuperar el mismo UUID y verificar usuario/perfil Windows.

## Estado activo · SES-20261028-P9K4R7M2

- OCP canónico: `docs/frentes/harmonia/OBJETO-CANONICO.md`, v0.27 / HARMONIA-v0.27, §34; blob tras lectura de vuelta `524e8759c3cef23ba90680493cfaad9f1be937d5`.
- Titularidad vigente verificada en `CONTROL-RESPONSABILIDAD.json`: generación 8, folio `SES-20261028-P9K4R7M2`, alias operativo `chatgpt-harmonia-SES-20261028-P9K4R7M2`, blob actual `2b8e5091e621b1017ed1e55f2796cc48f9ba444b`. La autorización literal `Si` está preservada en [U20](originales/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2.jsonl). El ID nativo no se expone.
- Salida visible de este ciclo, que incluye la salida anterior literal: [HARMONIA-TRANSFER-SES-20261028-P9K4R7M2-salida.md](originales/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2-salida.md), blob `14324b47502cd7363f31e02734e3d90db48543da`. Crónica del ciclo: [HARMONIA-TRANSFER-SES-20261028-P9K4R7M2.md](cronica/HARMONIA-TRANSFER-SES-20261028-P9K4R7M2.md).
- Gobierno actual: DUG v353 / NX-353m, blob `16c93745311a5405166a31b583c2a648fda0d044`; Metacanon 1.21 y GOW v2.3 integrados en el mismo archivo.
- El PC-14 autorizado sigue OFFLINE; no se hizo operación local, prueba Chrome, CI ni E2E. Paquete local y sincronización con main NO VERIFICADOS; captura real/aceptación E2E ABIERAS. Próximo paso: recuperar el mismo UUID, obtener handshake RDC y verificar cuenta Windows/SID/perfil antes de cualquier operación local.

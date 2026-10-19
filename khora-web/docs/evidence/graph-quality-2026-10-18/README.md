# Evidencia de auditoría integral del grafo · 2026-10-18

Estado: evidencia del corte observado; no certificado de conformidad ni nueva ejecución por publicarse en Git.

## Índice y alcance

- [AUDITORIA-INTEGRAL.md](AUDITORIA-INTEGRAL.md): método, matriz, causa, límites y referencias exactas del despliegue.
- [regression-evidence.json](regression-evidence.json): resultados aislados de validadores exactos del commit auditado; integridad literal, reconstrucción parcial y cuatro regresiones semánticas.
- [query.json](query.json): consulta HTTP real autenticada, pregunta y respuesta de insuficiencia; sin credenciales.
- [ui-query-evidence.txt](ui-query-evidence.txt): transcripción DOM del segundo envío real, formulación equivalente, mostrando suficiencia falsa y cero fuentes. No se presenta query.json como captura de red de ese segundo envío.
- [unit-results.txt](unit-results.txt): salida de las 21 pruebas existentes seleccionadas, no de toda la suite ni del recorrido integral.
- [documentary-validation.json](documentary-validation.json): controles de unicidad, referencias e integridad documental; no pruebas nuevas de aplicación.
- [manifest.json](manifest.json): integridad de los artefactos de esta carpeta, excluido el propio manifiesto. Su huella no demuestra verdad semántica ni ejecución independiente.

No se publica el corpus completo, tokens, cookies, respuestas de endpoints con texto masivo ni dependencias instaladas. Los originales se cotejaron en el entorno de auditoría, pero su acceso no queda garantizado para un tercero por incluir este paquete.

## Reproducción y límites

1. Obtener acceso autorizado al commit auditado, su configuración de dependencias fijadas y la revisión de fuentes/propuestas indicada en los resultados.
2. Ejecutar las pruebas existentes de graph_twins y graph-identity-refs en Node 24, con las dependencias de grafo fijadas; en esta auditoría se retiró solo la sintaxis TypeScript con stripTypeScriptTypes y se ajustaron rutas de importación para el arnés aislado. No se ejecutó toda la suite de aplicación.
3. Para las regresiones de extracción, pasar a validateExtraction el texto «otro gran programa no solamente sería un programa para alcohólicos», extremos literales correspondientes y, por separado, los predicados «no sería» y «es un planeta que orbita». Ambos fueron aceptados; el primero cambia el sentido y el segundo carece de sustento.
4. Para identidad, sobre el par persistido «la agencia» / «el flujo de llamadas de interpretación», suministrar una justificación falsa de mismo referente con citas literales a ambos lados. Tanto validateIdentities como validateIdentityReferences aceptaron. El segundo usa left_context_ref=left y right_context_ref=right. No se afirma que una nueva llamada al modelo vuelva a proponer lo mismo.
5. La integridad y reconstrucción parcial requieren las propuestas/ledger persistidos y los originales autorizados; no son reproducibles únicamente con este paquete. La revisión exacta y las restricciones están declaradas en el JSON.
6. Una consulta actual requiere sesión autorizada y puede haber cambiado tras el corte; capturar nueva versión, estado HTTP, cuerpo y pantalla. No confundir autenticación fallida con insuficiencia de conocimiento.

Publicar esta evidencia no ejecuta sus casos ni convierte un fallo en corregido. Para cierre deben repetirse los controles contra la versión corregida y completarse las pruebas todavía ausentes.

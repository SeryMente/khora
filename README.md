# Khora

El subsistema Entorno Persistente Medio v1.0 se especifica en [`ep-medio-architectura.md`](./ep-medio-architectura.md). El repositorio se opera como privado; el instanciador autenticado se emite desde `/sistema/seguridad#entorno-persistente`. Durante `EP-IN-080`, el SHA exacto de `main` se publica en producci├│n y se verifica antes de abrir Visual Studio Code.

## Documentos can├│nicos

| Documento | Contenido |
|---|---|
| [`khora-web/docs/normative-check.md`](./khora-web/docs/normative-check.md) | Documento can├│nico ├║nico del servidor MCP: capacidades, contratos, acceso, conexi├│n y diagn├│stico |
| [`PREPARACION-VOLCADOS.md`](./PREPARACION-VOLCADOS.md) | Protocolos de Custodia, Fidelidad y Legibilidad que debe superar un volcado antes de llegar a revisi├│n, y qu├® se muestra al operador cuando alguno falla |
| [`UI_REVIEW.md`](./UI_REVIEW.md) | C├│mo ver la interfaz vigente de Khora, incluidos los modelos que no ejecutan JavaScript |
| [`ep-medio-architectura.md`](./ep-medio-architectura.md) | Entorno Persistente Medio v1.0 |
| [`docs/frentes/dictado-voz/OBJETO-CANONICO.md`](./docs/frentes/dictado-voz/OBJETO-CANONICO.md) | Objeto ├║nico del frente: observabilidad MCP, dictado, benchmark, retroalimentaci├│n y propuesta delimitada de voz/s├¡ntomas; originales, evidencia y continuidad |

### Custodia continua de dictados

Contrato, mapa de c├│digo, garant├¡as, recuperaci├│n, audio original/MP3, herramientas y pruebas: [Custodia continua de dictados](./khora-web/docs/CUSTODIA-DICTADOS.md). Lectura obligatoria para cambios futuros; el documento distingue implementaci├│n de certificaci├│n productiva y enumera las brechas a├║n abiertas.

### Universo de datos y corpus autobiográfico

[Objeto canónico de persistencia](./docs/frentes/universo-datos/OBJETO-CANONICO.md) · [Especificación del universo](./docs/frentes/universo-datos/ESPECIFICACION-UNIVERSO-DATOS.md) · [Especificación del corpus autobiográfico](./docs/frentes/universo-datos/ESPECIFICACION-CORPUS-AUTOBIOGRAFICO.md). Especificación 0.2.0 y [contrato compartido 0.1.0](./contracts/corpus-autobiografico/README.md), con registro vigente único, esquema, validador de referencia, tipos y pruebas; [arquitectura/adopción](./docs/frentes/universo-datos/ARQUITECTURA-Y-CONTRATO.md). No equivalen a integración productiva, aprobación de cambios materiales de seguridad o acreditación de producción.

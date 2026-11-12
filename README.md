# Khora

El subsistema Entorno Persistente Medio v1.0 se especifica en [`ep-medio-architectura.md`](./ep-medio-architectura.md). El repositorio se opera como privado; el instanciador autenticado se emite desde `/sistema/seguridad#entorno-persistente`. Durante `EP-IN-080`, el SHA exacto de `main` se publica en producci├│n y se verifica antes de abrir Visual Studio Code.

## Documentos canónicos

| Documento | Contenido |
|---|---|
| [Servidor MCP de Khora](./khora-web/docs/normative-check.md) | Contrato técnico del servidor MCP. |
| [Dictado](./docs/frentes/dictado-voz/OBJETO-CANONICO.md) | Pantalla de dictado, captura de voz, transcripción, edición y continuidad. No incluye Observabilidad MCP. |
| [Khora MCP](./docs/frentes/observabilidad-mcp/OBJETO-CANONICO.md) | Interfaz de capacidades MCP de Khora: recursos, herramientas, prompts, acceso, observabilidad e integración Jules; OCP y control únicos. |
| [Notas rápidas](./frentes/notas-rapidas/OBJETO-CANONICO.md) | Frente de desarrollo del componente Notas rápidas; definición funcional y estado en su OCP independiente. |
| [Custodia continua de dictados](./khora-web/docs/CUSTODIA-DICTADOS.md) | Contratos transversales de persistencia, recuperación y audio. |
| [PREPARACION-VOLCADOS.md](./PREPARACION-VOLCADOS.md) | Protocolos de Custodia, Fidelidad y Legibilidad de volcados. |
| [UI_REVIEW.md](./UI_REVIEW.md) | Cómo ver la interfaz vigente de Khora. |
| [ep-medio-architectura.md](./ep-medio-architectura.md) | Entorno Persistente Medio v1.0. |
### Custodia continua de dictados

Contrato, mapa de c├│digo, garant├¡as, recuperaci├│n, audio original/MP3, herramientas y pruebas: [Custodia continua de dictados](./khora-web/docs/CUSTODIA-DICTADOS.md). Lectura obligatoria para cambios futuros; el documento distingue implementaci├│n de certificaci├│n productiva y enumera las brechas a├║n abiertas.

## Organización de ## Organización de frentes y recursos

OCP observados en `main` (rutas vigentes, incluidas las heredadas):

1. [Dictado](docs/frentes/dictado-voz/OBJETO-CANONICO.md) — ingreso por voz, pantalla de dictado, captura, transcripción, edición y continuidad.
2. [Khora MCP](docs/frentes/observabilidad-mcp/OBJETO-CANONICO.md) — interfaz de capacidades externas, recursos, herramientas, prompts, seguridad, observabilidad e integración Jules.
3. [Harmonia](docs/frentes/harmonia/OBJETO-CANONICO.md).
4. [Tareas automáticas](docs/frentes/tareas-automaticas/OBJETO-CANONICO.md).
5. [Custodia transversal](frentes/custodia/OBJETO-CANONICO.md) — persistencia, seguridad y recuperación entre canales.
6. [Notas rápidas](frentes/notas-rapidas/OBJETO-CANONICO.md) — desarrollo del componente Notas rápidas de Khora.

**Fronteras:** Dictado y Observabilidad MCP tienen OCP/controles independientes. Custodia conserva su titularidad transversal. Notas rápidas tiene OCP/control propios; no absorbe Dictado ni Custodia. Benchmark/feedback, Diálogo multipista, Ingreso general/crónica/metadatos, voz/síntomas y publicación editorial permanecen fuera de Dictado y pendientes de adjudicación; su clasificación está en el OCP Dictado §4.

## Organización de frentes y recursos

OCP observados en `main` (rutas vigentes, incluidas las heredadas):

1. [Dictado de voz](docs/frentes/dictado-voz/OBJETO-CANONICO.md) — `docs/frentes/dictado-voz/`.
2. [Harmonia](docs/frentes/harmonia/OBJETO-CANONICO.md) — `docs/frentes/harmonia/`.
3. [Tareas automáticas](docs/frentes/tareas-automaticas/OBJETO-CANONICO.md) — `docs/frentes/tareas-automaticas/`.
4. [Custodia transversal](frentes/custodia/OBJETO-CANONICO.md) — persistencia, seguridad y recuperación de información entre canales.
5. [Notas rápidas](frentes/notas-rapidas/OBJETO-CANONICO.md) — desarrollo del componente Notas rápidas de Khora.

Estas rutas bajo `docs/frentes/` se conservan como OCP autoritativos; no se trasladan por uniformidad nominal. El código de producto, configuración y automatizaciones comunes permanecen en sus áreas propias del repositorio, salvo que un recurso tenga un único propietario de frente demostrado. No crear una carpeta genérica de recursos compartidos sin consumidores reales identificados.

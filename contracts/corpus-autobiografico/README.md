<!-- CORPUS_SPEC_VERSION=0.2.0; CORPUS_SCHEMA_VERSION=0.1.0 -->
# Corpus autobiográfico · Contrato compartido

Registro de autoridad: [`current.json`](current.json). Identificador: `khora.corpus-autobiografico`. Especificación 0.2.0; esquema exacto 0.1.0. Reutilizable por cualquier caso de uso autorizado; el nombre del consumidor no cambia la naturaleza privada de las unidades.

- [Especificación](../../docs/frentes/universo-datos/ESPECIFICACION-CORPUS-AUTOBIOGRAFICO.md).
- [Arquitectura, adopción y versionado](../../docs/frentes/universo-datos/ARQUITECTURA-Y-CONTRATO.md).
- [Cambios](../../docs/frentes/universo-datos/CHANGELOG.md).

`index.mjs` expone `validateAutobiographicalUnit` y `parseForConsumer`; `index.d.mts` deriva sus tipos del esquema. Node22+; sin dependencias nuevas. Comprobación desde raíz: `node scripts/check_autobiographical_corpus.mjs`. La compuerta también se conecta al circuito de pruebas del paquete web y al job de integración continua.

Un consumidor debe fijar versión exacta y pasar el pin a `parseForConsumer`. No hay fallback silencioso. Validar forma NO prueba autenticidad, verdad, anclas, autorización ni aptitud de autenticación. Las políticas y sus recibos se verifican fuera del módulo. El campo de integridad/revisión es una declaración, no comprobante criptográfico de acto humano. Ni el tipo ni la función habilitan publicación, acceso o claves.

El esquema restringe campos a los definidos; no es detector universal de secretos en valores de texto. No almacenar datos reales en ejemplos/logs. Fixture `synthetic-unit.json` es inventado; referencias, actores, fechas y huella de ejemplo no corresponden al operador ni demuestran cadena real.

El perfil ejecutable es mínimo: referencias a políticas y retención, sujeto, fuente/versión/huella/ocurrencia, coordenadas, modalidad, revisión y derivación. No codifica toda la ontología, relaciones, multimedia avanzada o capacidades del ideal. Integraciones productivas aún pendientes y catalogadas en el registro.

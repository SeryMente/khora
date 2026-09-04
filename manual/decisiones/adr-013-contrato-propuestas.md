# ADR 013: Contrato Unificado de Propuestas de Ingesta (ProposalEnvelope)

**Fecha**: 2026-08-20
**Estado**: Aceptado

## Contexto

Los carriles de ingesta de Khora se dividen modularmente entre:
- **5B (Pipeline de Extracción Python)**: Procesa el contenido crudo/aprobado de los volcados para generar propuestas estructuradas de nodos, entidades y relaciones.
- **5A (Persistencia TS/SQL e Interfaz de Juicio)**: Presenta las propuestas al operador, registra decisiones/dictámenes, persiste en base de datos PostgreSQL y coordina la escritura final.

Sin un esquema formalmente acordado e inmutable, existe un riesgo crítico de divergencia de estructuras de datos (*payload mismatch*) entre Python y TypeScript. Se requiere fijar un contrato versionado, agnóstico de lenguaje, previo a la implementación de 5A y 5B.

## Decisiones

### 1. Fuente Primaria de Verdad: JSON Schema Neutro
Se establece `khora-web/lib/contracts/proposal.schema.json` (draft 2020-12) como el contrato primario neutral. No debe duplicarse la especificación del esquema.
- **TypeScript**: Implementa tipos e interfaces en `khora-web/lib/contracts/proposal.ts`.
- **Python**: Implementa `@dataclass` y validación estricta usando únicamente la librería estándar de Python (`check_stdlib_only.py`) en `kernel/src/khora_kernel/contracts/proposal.py`, garantizando cumplimiento de ADR-010.

### 2. Separación Estricta entre Zona Derivada y Zona de Juicio
El objeto principal `ProposalEnvelope` divide sus responsabilidades en dos zonas claramente delimitadas:
- **Zona Derivada (Producida por Pipeline Python 5B)**:
  - Terna obligatoria de procedencia (`source_triplet` = `volcado_id` + `version` + `sha256`).
  - Versión del pipeline (`pipeline_version`).
  - Ítems propuestos (`items`: `ProposalItem`), conteniendo cada uno su localización (`Anchor`) y sus candidatos de resolución (`ResolutionCandidate`).
  - Hash de carga (`payload_hash`): Digest SHA-256 en minúsculas del JSON canónico (claves ordenadas, sin espacios) de los ítems derivados exclusivamente. Cualquier modificación en la Zona Derivada invalida el `payload_hash`.
- **Zona de Juicio (Producida por Persistencia / UI TS/SQL 5A)**:
  - Historial de dictámenes (`judgments`: `Judgment`).
  - Acta de cierre/liquidación (`settlement_act`: `SettlementAct`).
  - Las adiciones o modificaciones en la Zona de Juicio **NO** alteran ni invalidan el `payload_hash` derivado.

### 3. Identificadores Deterministas
Todos los ítems propuestos (`ProposalItem`) asignan su campo `id` como un UUIDv5 determinista derivado del espacio de nombres de Khora y la cadena `volcado_id:version:sha256:content_key`.

### 4. Reglas de Inmutabilidad e Ciclo de Vida
- **Historial Append-Only**: La lista `judgments` registra decisiones secuenciales de forma inalterable. Los dictámenes no se sobrescriben.
- **Acta Inmutable**: El `SettlementAct` es inmutable una vez emitido.
- **Invalidez por Re-versión**: Si el volcado fuente cambia o expira su `sha256`, la propuesta queda obsoleta. No se actualizan propuestas existentes en sitio; la re-ejecución del pipeline 5B debe generar un `ProposalEnvelope` completamente NUEVO.

## Consecuencias

- **Positivas**:
  - Garantiza interoperabilidad total entre el backend en Python (5B) y la aplicación Web/UI en TypeScript (5A).
  - Verificación criptográfica e inmutabilidad garantizada mediante `payload_hash` y terna de procedencia.
  - Permite desarrollar 5A y 5B en paralelo de forma autónoma sin decisiones adicionales de diseño de datos.

- **Negativas / Desafíos**:
  - Ambas pilas tecnológicas (Node.js y Python) deben mantener estrictamente el algoritmo de canonicidad de JSON (claves ordenadas, formato compacto sin espacios) para la verificación del `payload_hash`.

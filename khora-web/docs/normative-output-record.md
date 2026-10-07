# Registro de salida de verificación normativa por ciclo

**Estado:** CONTRATO DERIVADO CANÓNICO  
**Versión:** v1.1.0 — Identidad y Vigencia del Registro de Ciclo  
**Fecha:** 2026-10-06

## Norma

La obligación material que fundamenta este contrato es la trazabilidad verificable entre ciclo, resultado de verificación y evidencia. La identificación del SI añade versión, nombre específico y última modificación canónica.

La obligación normativa se encuentra en:

`SeryMente/metodologia/SI-METACOGNITIVO.md`

- P028 · Trazabilidad Normativa
- P029 · Identidad y Vigencia Canónica

## Formato visible

`CICLO: <cycle_id> | ATTEMPT: <n> | VERIFICACIÓN: VERIFIED|INVALID|INCOMPLETE | EVIDENCIA: <evidence_sha256>`

El encabezado contextual del ciclo debe incluir exactamente:

`SI CARGADO · <si_version> — <nombre_de_versión> · COMPLETO · ACTIVO · ÚLTIMO CAMBIO: hace <n> minutos|horas|días | <YYYY-MM-DD>`

El instante de referencia se obtiene del último commit que modificó `SI-METACOGNITIVO.md` dentro del snapshot exacto del ciclo. El valor relativo se calcula al instante de apertura del ciclo (`opened_at`), de modo que el encabezado queda estable durante todo el procesamiento del turno.
## Contrato máquina

```json
{
  "schema": "cycle-verification/v1",
  "cycle_id": "PROYECTO/CONV-01/C001",
  "attempt": 1,
  "status": "VERIFIED",
  "evidence_sha256": "<sha256>",
  "output_header": "SI CARGADO · <si_version> — <nombre_de_versión> · COMPLETO · ACTIVO · ÚLTIMO CAMBIO: hace <n> minutos|horas|días | <YYYY-MM-DD>",
  "si_version": "v1.2.0",
  "si_sha256": "<sha256>",
  "manifest_sha256": "<sha256>",
  "verifier_version": "norm-check/0.2.0",
  "recorded_at": "..."
}
```

El nombre y la vigencia de la versión pertenecen al encabezado de identificación del SI; el protocolo `cycle-verification/v1` no se altera por esta convención de presentación.

## Fuente de verdad

El registro se deriva de `normative_receipts`. No se crea una segunda copia autoritativa del veredicto.

La proyección `verification_record` se devuelve desde `khora_norm_verify_turn`.

## Endpoint de consulta

`GET /api/norm-check/record?cycle_id=<id>&attempt=<n>`

La interfaz devuelve el objeto estructurado y su representación de salida. Un receipt sin `output_header` o con un encabezado distinto del calculado por KHORA no puede alcanzar `VERIFIED` ni `VERIFIED_RELEASE`.

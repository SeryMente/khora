# Registro de salida de verificación normativa por ciclo

**Estado:** IMPLEMENTACIÓN PARCIAL — CONTRATO DERIVADO  
**Versión:** v1.0.0  
**Fecha:** 2026-10-06

## Norma

La obligación material que fundamenta este contrato es la trazabilidad verificable entre ciclo, resultado de verificación y evidencia.

La adopción propuesta está documentada en:

`SeryMente/metodologia/SI-P028-ADOPCION.md`

## Formato

La salida mínima visible es:

`CICLO: <cycle_id> | ATTEMPT: <n> | VERIFICACIÓN: VERIFIED|INVALID|INCOMPLETE | EVIDENCIA: <evidence_sha256>`

El contrato máquina equivalente es:

```json
{
  "ciclo": "PROYECTO/CONV-01/C001",
  "attempt": 1,
  "verificacion": "VERIFIED",
  "evidencia": "<sha256>"
}
```

## Fuente de verdad

El registro se deriva de `normative_receipts`. No se crea una segunda copia autoritativa del veredicto.

## Endpoint de consulta

`GET /api/norm-check/record?cycle_id=<id>&attempt=<n>`

El endpoint devuelve tanto el objeto estructurado como su representación de salida.

## Límite

La integración todavía pendiente es incorporar este registro directamente en las respuestas existentes de `/api/norm-check` y `khora_norm_verify_turn`, así como canonizar P028 dentro de `SI-METACOGNITIVO.md`.

## GitHub

Repositorio KHORA:
https://github.com/SeryMente/khora

Repositorio metodológico:
https://github.com/SeryMente/metodologia

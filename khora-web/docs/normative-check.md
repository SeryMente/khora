# NORM-CHECK en KHORA

**Estado:** IMPLEMENTACIÓN INICIAL  
**Versión:** v0.1.0  
**Fecha:** 2026-10-06

## Superficie

- UI: /sistema/otros
- API máquina: POST /api/norm-check
- API de lectura: GET /api/norm-check
- Persistencia: normative_receipts
- Verificador: khora-web/lib/server/norm-check.ts

La entrada de máquina utiliza el encabezado X-KHORA-KEY. La clave reutiliza la credencial de servicio existente de KHORA y nunca se entrega a la UI.

## Verificación

KHORA resuelve el git blob SHA indicado por el receipt desde SeryMente/metodologia y recupera la versión histórica exacta del SI. Del contenido recuperado deriva el manifest dinámicamente.

Se validan:

- versión del SI;
- SHA-256 del SI;
- SHA-256 del manifest;
- cobertura por folio;
- faltantes, duplicados y desconocidos;
- estados A/N/C y sus anchors/reason codes;
- SHA-256 de evidencia;
- identidad de ciclo e intento.

Los blobs del SI se cachean por SHA para reducir latencia cuando se reutiliza una misma versión.

## Persistencia

La combinación cycle_id + attempt es única. Un rechazo no se sobrescribe: el cliente debe crear un nuevo attempt.

Existe además una migración SQL 025 y un bootstrap perezoso de la tabla para evitar que un despliegue quede inutilizable si la migración todavía no se ha aplicado.

## Interfaz

«Otros» se abre desde el botón Sistema de la barra inferior. La pantalla permite:

- consultar los últimos 50 comprobantes;
- ver totales VERIFIED/INVALID/INCOMPLETE;
- abrir el detalle de un comprobante;
- pegar un receipt JSON y solicitar la verificación server-side.

## Límite

La comprobación estructural es determinista. La auditoría semántica profunda no forma parte del fast path y podrá añadirse después.

## Vínculo canónico

Especificación metodológica: SeryMente/metodologia/ESPECIFICACION-EVIDENCIA-NORMATIVA-POR-CICLO.md

# Salida documental · Revisión de la propuesta de recuperación CUSTODIA (C011)

- **Ciclo:** CUSTODIA-PLAN-RECUP-SES-20261029-C9K4M2R8-C011.
- **Fecha:** 2026-10-29.
- **Frente:** CUSTODIA · `SeryMente/khora`.
- **OCP vivo único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md); esta salida preserva resultados del ciclo y no constituye un segundo estado vivo.
- **Gobernanza:** Samantha v359 · NX-359m; Metacanon 1.24; GOW 2.8; fuente `SeryMente/metodologia/main:gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`, blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

## 1. Hallazgo F-14/R-10

La inspección estática de la rama candidata de la PR [#339](https://github.com/SeryMente/khora/pull/339) encontró una combinación que su fallback legacy no cubre:

1. El snapshot contiene el objeto `corteAudio`.
2. `corteAudio.hastaParte` es `0`.
3. Aun así existen filas de audio en la sesión de origen.

En ese caso, la lógica propuesta obtiene `total=0` mediante `original.corteAudio?.hastaParte ?? ...`. El fallback `recoveredAsUnpairedLegacyAudio` solo se activa cuando `!original.corteAudio`, así que no se activa si el objeto de corte existe. Como consecuencia, el filtro `parte <= total` no selecciona filas y la restauración propuesta no copia esas partes.

La interfaz candidata puede mostrar al mismo tiempo que `storedAudioParts > 0` y que hay partes guardadas sin sincronía acreditada. La acción «Recuperar esta captura» no garantiza que esas partes vayan a copiarse en esta combinación. Por ello la PR no debe considerarse lista para fusión.

**Clasificación:** F-14 confirmado en la rama propuesta, no desplegada; no es prueba de una incidencia productiva en una captura concreta.

## 2. Requisito correctivo R-10

La corrección debe tratar tanto la ausencia de `corteAudio` como un corte presente con `hastaParte=0` y filas de audio existentes. Debe validar los datos disponibles y preservarlos como audio **no sincronizado** sin fabricar una alineación con el texto. Si no es posible conservarlos con garantías, la acción debe bloquearse con un mensaje explícito y no presentar una recuperación textual como si incluyera el audio.

Las pruebas mínimas sintéticas deben cubrir:
- `corteAudio` ausente con partes de audio contiguas;
- `corteAudio` presente con `hastaParte=0` y partes de audio contiguas;
- manifiesto `audioPartes=[]`;
- partes faltantes, índices duplicados, metadata inválida y errores de acceso al objeto;
- confirmación de que el origen permanece intacto y el destino leído de vuelta corresponde al resultado anunciado en la UI.

R-10 complementa R-09: incluso una cadena estructuralmente válida no certifica la disponibilidad actual de los objetos remotos ni que sus bytes coincidan con el SHA-256 almacenado. El flujo deberá leer los bytes bajo autorización, recalcular su hash y verificar el resultado de extremo a extremo.

## 3. Estado de la propuesta

- PR #339 sigue abierta en borrador y la rama `fix/custodia-recovery-reconcile-20261028` permanece divergida respecto de `main`. No se fusionó, rebasó ni desplegó en este ciclo.
- Los workflows consultados para la punta registrada fallaron sin pasos ejecutados ni logs útiles. No se declara CI verde y no se atribuye el resultado a las pruebas del código; la causa infraestructural no está determinada.
- La integración PostgreSQL/PGlite de 15 comprobaciones y otros resultados de prueba anotados en C008 son anteriores y sintéticos. No cubren esta nueva combinación de `corteAudio.hastaParte=0` ni lectura de objetos reales.
- El último despliegue READY observado apunta a un commit anterior a la corrección propuesta. No se hizo despliegue.
- No se adquirió el catálogo autenticado ni se inspeccionaron checkpoints/objetos productivos: 0 unidades productivas cotejadas y 0 recuperaciones productivas. El dictado reportado como ausente continúa sin localizarse, pero no se ha demostrado su pérdida definitiva.
- No se tocaron originales, datos de producción, credenciales ni sesiones de otro usuario.

## 4. Documentación persistida

- Inventario provisional actualizado a v0.9 con F-14/R-10, subordinado al OCP único.
- Lista provisional actualizada a v0.11; se mantienen CUSTODIA-01, CUSTODIA-03 y CUSTODIA-04 activas. CUSTODIA-02 continúa retirada.
- Siguiente paso técnico: corregir este caso en una rama nueva o reconciliada desde `main`, añadir pruebas para los escenarios anteriores y volver a ejecutar las comprobaciones sobre la punta actual. No fusionar ni publicar hasta resolver las pruebas y validar una recuperación con lectura real y lectura de vuelta.

**Cierre C011:** se amplió la comprensión del defecto de recuperación en la propuesta, no la evidencia productiva. La recuperabilidad de KHORA sigue sin certificación.

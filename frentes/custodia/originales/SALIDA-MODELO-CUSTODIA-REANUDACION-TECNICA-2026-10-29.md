# Salida documental · Reanudación técnica CUSTODIA (C010)

- **Ciclo:** CUSTODIA-PLAN-RECUP-SES-20261029-C9K4M2R8-C010.
- **Fecha local:** 2026-10-29.
- **Frente:** CUSTODIA · `SeryMente/khora`.
- **OCP vivo único:** [OBJETO-CANONICO.md](../OBJETO-CANONICO.md); esta salida conserva evidencia del ciclo y no constituye un segundo estado vivo.
- **Gobernanza revalidada:** Samantha v359 · NX-359m; Metacanon 1.24; GOW 2.8; fuente `SeryMente/metodologia/main:gobernanza/METAPROMPT-CANONICO-SAMANTHA.html`, blob `b2ff2845a5a99dc4ce3cafafc4f8e43607d48145`.

## 1. Responsabilidad y estado documental

La responsabilidad sigue asignada en generación 3 al alias operativo `chatgpt-custodia-SES-20261029-C9K4M2R8`, folio `SES-20261029-C9K4M2R8`. El alias no es un ID nativo de conversación. Se relevaron por lectura de vuelta el OCP v0.9, el control de responsabilidad, la lista provisional v0.10 y el inventario v0.8. CUSTODIA-02 permanece retirada; las tres tareas activas son CUSTODIA-01, CUSTODIA-03 y CUSTODIA-04, todas P0.

## 2. F-13/R-09: la verificación de metadatos no prueba la disponibilidad real del audio

Se comparó el código actual de `main` con la propuesta de PR #339:

- `khora-web/lib/audio/custodia.ts`, blob `1628a5841d26941546b58a4d62ef93d0d5e99266`: `evaluarCustodiaAudio` valida índices, continuidad, duplicados, bytes declarados positivos, formato del SHA-256 almacenado y estado `verificado`. No lee los bytes del proveedor ni vuelve a calcular el hash del objeto.
- `khora-web/lib/server/custodia-recuperacion.ts` en `main`, blob `278a479db46e6f2bed72ea7d31f88cc373fa67d1`: el catálogo deriva `audioParts` del manifiesto/snapshot aunque la consulta cuente filas de audio verificadas. La recuperación limita las filas a la cantidad declarada por el manifiesto; si el total declarado es cero, puede no copiar filas de audio existentes.
- El mismo módulo en la PR #339, blob `bf76dec79b34fd34d0b4e86609d99d6b9ce686f9`, añade `storedAudioParts` y un fallback para audio legacy sin manifiesto cuando los índices y metadatos forman una cadena contigua/verificada. Sin embargo, la recuperación propuesta sigue copiando referencias de filas mediante SQL; no descarga ni comprueba el contenido actual del objeto en Blob.
- La interfaz propuesta, `RecoveryDrawer.tsx`, blob `fe2cf2e661d4395fc0f3f61fca1556af2258febb`, hace una distinción más precisa entre audio del corte, partes referenciadas sin sincronía acreditada y partes almacenadas según metadatos. Esta distinción de UI no sustituye la lectura real del objeto.

**Dictamen:** la propuesta aborda parte del falso negativo causado por un manifiesto vacío, pero no demuestra que los objetos remotos existan, sean legibles o coincidan con el SHA-256 persistido. Se registra el nuevo hallazgo F-13 y requisito R-09 en el inventario. Ningún objeto remoto de producción fue leído durante C010; no se declara audio perdido ni íntegro sobre la base de esta inspección estática.

## 3. PR, CI y despliegue

- PR [#339](https://github.com/SeryMente/khora/pull/339) sigue abierta en borrador, sin revisión, fusión ni despliegue.
- La rama `fix/custodia-recovery-reconcile-20261028` permanece divergida de `main`. No es seguro fusionarla o desplegarla directamente; la corrección debe reconciliarse contra la punta actual y los controles deben repetirse.
- Los workflows consultados para la punta registrada fallaron, pero los seis jobs inspeccionados devuelven `steps=[]`, y no hay logs utilizables. Este resultado no prueba un fallo de pruebas de código ni equivale a CI verde; la causa del bloqueo sigue sin determinarse.
- El registro de C008 indica `typecheck` aprobado, 15 comprobaciones en PostgreSQL/PGlite WASM aislado y 549/550 pruebas unitarias, con una falla por timeout TLS en la sincronización del contrato canónico. Son resultados históricos sobre aquella punta, no sobre una rama reconciliada en C010.
- El despliegue READY observado de producción apunta a `main` SHA `b528660e16552633d232a2397cbe42441a03438c`, anterior a la propuesta de corrección. No se ejecutó un despliegue.
- El acceso de herramientas actual no proporciona una vía autenticada autorizada al catálogo/DB productiva. El clon local de Khora no está en la ubicación prevista del RDC; `git` y `gh` no están instalados ni hay token/credenciales de GitHub en ese perfil. El perfil de Chrome de otro usuario no fue accedido ni eludido.

## 4. Estado de CUSTODIA-01 y CUSTODIA-03

La pantalla real Ingresos → Dictado → Recuperación no fue consultada en este ciclo. El total único, la paginación y las identidades productivas siguen sin verificar: **0 unidades cotejadas y 0 recuperaciones productivas**. El dictado reportado como ausente después de la última entrada visible comunicada para el 28-10-2026 a las 17:08 sigue sin localizarse; su pérdida definitiva no está demostrada. El contador 40→20 no demuestra que existan veinte capturas perdidas.

## 5. Próxima secuencia

1. Obtener el catálogo completo por una sesión autenticada autorizada y recorrerlo hasta `nextCursor=null`, sin exponer transcripciones.
2. Cruzar las unidades por identidad de sesión/revisión con checkpoints y archivo de Custodia; conservar originales y registrar los casos por evidencia.
3. Reconciliar el parche sobre `main` vigente, revisar el diff y ejecutar controles locales en un clon autenticado; no inferir CI verde de jobs sin pasos.
4. En pruebas sintéticas, probar objeto inexistente, acceso denegado, bytes truncados, SHA incorrecto, partes discontinuas, manifiesto ausente y recuperación idempotente. Para una unidad autorizada, leer bytes reales, recalcular SHA-256, decodificar y leer de vuelta el destino.
5. Solo después evaluar la revisión/fusión y la publicación por una vía permitida para el repositorio privado. No hacer público el repositorio para sortear la restricción de plan.

**Estado final C010:** la responsabilidad está reanudada y la evidencia de F-13/R-09 quedó documentada. La recuperabilidad productiva permanece sin certificar; no se modificaron código de producto, datos de producción, credenciales ni despliegues.

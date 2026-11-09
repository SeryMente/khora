# B · Salida visible de retoma y estado del frente Custodia · 2026-11-09

**B local (UUIDv7):** `01a1c193-eccc-7302-a7bd-99135476b8e4`  
**Ciclo local (UUIDv7):** `01a1c193-eccc-77e3-a7f7-4c29b0de0df0`  
**A de entrada:** `01a1c193-eccc-78ad-bcb1-a7f102ff4733`  
**Conversación local:** `01a1c125-af13-79b1-87cc-f1e5fe4b0b59`  
**Folios oficiales CV/CY/A/B:** PENDIENTE/NO ASIGNADO · FOL1 INACTIVO.

## Resultado ejecutivo

El frente Custodia ha sido retomado, la nueva instrucción se conservó literalmente y la documentación operativa quedó reconciliada con evidencia actual de GitHub/Vercel. La prioridad no cambia: **restablecer el archivado de Cora/Khora como primer hito**.

**El archivado todavía no está restablecido ni demostrado.** El bloqueo técnico reciente sigue en la autorización de Backblaze B2. No se leyó ningún secreto ni se alteró Production.

## Persistencia documental verificada

| Artefacto | Estado | SHA/blob leído de vuelta |
|---|---|---|
| OCP Custodia | v0.31 | `785b0630fbae514dbf92d2c6d6ffaec21c97e3aa` |
| Lista provisional | v0.24 | `3d65ad9d5672648f6f9ae0f05c7271246789e991` |
| Índice de tareas | actualizado | `d8fcb9f1d9198daab9ffeb33d5eefb8f13b1ab62` |
| Instrucción de retoma A | creada; literal verificado | `d6923cccb1d947e38caeee79dc3c0d830f2a2b66` |
| Evidencia de diagnóstico B2 | creada; contenido verificado | `03eebd12aef2de35720b2b0c5e196e8684cf7723` |
| CUSTODIA-B2-006 | reconciliada, PC10 obsoleto marcado | `8bcc2df6d3b964a95aff9aebcaacff47b973d9b1` |
| CUSTODIA-B2-005 | diagnóstico reconciliado | `92109c742fbf49952740ad8c366cc499fec6ecd3` |

Los dos README P0 se leyeron de vuelta comparando su contenido completo. Los nuevos A y evidencia se recuperaron desde `main`; se comprobó el literal de la instrucción y la presencia de los identificadores técnicos. La revisión previa del OCP quedó en CUSTODIA-v0.32 y fue leída de vuelta; esta salida B y la matriz de trazabilidad se incorporarán a la siguiente actualización del OCP.

## Contexto técnico actual

**Matriz de trazabilidad actualizada:** blob leído de vuelta `a212aeaa8dbcf571d948abb3cd5d658df2cb2d9f`; incorpora el nuevo A/B y conserva los literales históricos con sus decisiones y estados.

1. **PR #355:** MERGED. Corrige la cola/reintento de partes de audio antes del archivado en el cliente. No resuelve la conexión al proveedor B2.
2. **PR #362:** OPEN · DRAFT · NOT MERGED. Añade observabilidad saneada del error B2. Su prueba unitaria añadida no se ejecutó. Su Preview READY compiló y pasó TypeScript/78 rutas estáticas, pero no ejecutó autenticación B2, PUT/GET físico ni archivado E2E.
3. **Último intento Production con API nativa B2:** `dpl_DwfJkUPZ4NJnjTXgKCPFRNY5FR2f`, commit `7be5712a`. Falló en `b2_authorize_account` con `storage_b2_authorization_failed`. No consta HTTP status ni código nativo de Backblaze.
4. **Variables Vercel Production:** el listado no descifrado muestra los nombres heredados `KHORA_B2_KEY_ID` y `KHORA_B2_APPLICATION_KEY`, además de selector, preflight y bucket. No muestra los nombres canónicos `KHORA_B2_MASTER_APPLICATION_KEY_ID` y `KHORA_B2_MASTER_APPLICATION_KEY`. No se leyeron valores.
5. **Blob:** `khora-audio` tiene un antecedente histórico de `limits-exceeded-suspended`. El estado actual del store no fue consultado directamente en esta retoma.
6. **Migraciones:** en el deployment `dpl_36DeUEnuz2zoWtMJqp1BsZjWASUJ`, el build ejecutó el hook de migraciones antes del preflight; su log confirma 023–029 aplicadas. El script enumera también 032, pero el log no confirma esa migración por separado. El intento nativo posterior hizo preflight antes de migrar y se detuvo por autorización B2, por lo que no alcanzó el hook. No repetir un build Production que pueda mutar Neon hasta reconciliar el esquema y obtener una ruta aprobada sin mutaciones adicionales.
7. **Sesión EP Vault:** el operador informa que sigue abierta y que las notas efímeras contienen Key ID y Master Application Key. Ninguna nota se ha leído ni promovido en esta retoma. No se colocaron secretos en chat ni en documentos.
8. **Conexión:** el identificador informado actualmente es `PSK14`. No se ha demostrado qué dispositivo/perfil operativo corresponde. La única estación visible en línea como PC-14 ya fue previamente identificada con perfil PC 13, por lo que queda excluida. La sesión antigua PC10 fue explícitamente descartada por el operador y no se reutiliza.

## Secuencia de trabajo vigente

| Orden | Tarea | Prioridad | Estado / salida |
|---:|---|---|---|
| 1 | CUSTODIA-B2-006 · Recuperar archivado B2 | P0 | EN CURSO; falta validar credenciales y superar PUT/GET + E2E |
| 2 | CUSTODIA-B2-005 · Diagnóstico residual | P0 | EN CURSO; no bloquea inicio de B2-006 |
| 3 | CUSTODIA-B2-007 · Pulir implementación | P1 | PROPUESTA; después de aceptación |
| 4 | CUSTODIA-RES-001 · Diseño multialmacén | P1 | PROPUESTA |
| 5 | CUSTODIA-RES-002 · Implementar/certificar redundancia | P2 | PROPUESTA |

CUSTODIA-03, CUSTODIA-01 y CUSTODIA-04 siguen abiertas. CUSTODIA-02 permanece retirada. No se crea CUSTODIA-05 ni se reutiliza otro ID.

## Acciones realizadas / no realizadas

**Ejecutadas y verificadas:**
- Se consultó la metodología canónica vigente Samantha v384 · NX-384m, Metacanon 1.29, GOW 2.18, y se leyó §ARR.
- Se persistieron A y el informe técnico; se actualizaron OCP, lista provisional, índice y dos tareas P0.
- Se corrigió la cronología real de los hooks de migración y se retiró PC10 como pista de acceso actual.
- Se verificaron metadatos de variables Vercel sin descifrar valores.
- Se consultaron los deployments y eventos de build relacionados.

**No ejecutadas:**
- No se leyó el contenido de las notas efímeras de EP Vault.
- No se promovió Key ID ni Master Application Key a la bóveda canónica.
- No se importaron credenciales, ni se ejecutó preflight con la bóveda.
- No se hizo PUT/GET B2 ni prueba E2E de archivado.
- No se editó código, variables Vercel, bucket, Neon, SQL, CORS, Production deployment ni alias.
- No se eliminó ni sobrescribió ningún objeto fuente.

## Bloqueo preciso y próximo paso

El siguiente paso útil es identificar la instancia actual de `PSK14` y comprobar su identidad efectiva sin acceder a PC10 ni al perfil PC 13/MantenimientoRCI. Solo cuando el proceso esté bajo el perfil operativo autorizado se leerán las dos notas efímeras y se promoverá cada valor por separado a la bóveda formal, usando el flujo de portapapeles y read-back sin exposición.

Después: importar exclusivamente las variables canónicas B2, correr el preflight de solo lectura, registrar status/código saneado; y, si autentica, ejecutar pruebas físicas sintéticas y E2E. No disparar otro build Production mientras no esté resuelto el hook de migración.

**Estado final del ciclo:** documentación persistida y verificada; restauración del archivado NO DEMOSTRADA; producción sin cambios en esta retoma.

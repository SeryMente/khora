# R8 · Matriz individualizada de recuperación CUSTODIA-01 (79 sesiones)

**Fecha de corte:** 2026-11-11  
**Fuente:** Neon Production, proyecto KHORA, rama br-gentle-band-ah23rczb, base neondb.  
**Consulta:** SELECT exclusivamente sobre dictado_session, dictado_checkpoint, dictado_audio_parte y volcado.  
**Identidad del universo:** cuenta del operador declarada en la autorización de archivo; predicate `COALESCE(custodia_owner, checkpoint_usuario, volcado.usuario)`. Solo filas sin `dictado_session.volcado_id`.  
**Restricción de contenido:** no se seleccionaron ni devolvieron los campos de contenido `checkpoint_text`, `dictado_checkpoint.texto` o `snapshot`; únicamente booleanos de presencia/formato KHC1 y hashes persistidos. Tampoco se devolvieron blob_url/blob_path ni ningún contenido de objeto.

## 1. Resumen conciliado por registro

| Dimensión | Resultado |
|---|---:|
| Sesiones atribuibles pendientes | 79 |
| Titular acreditado por custodia_owner | 43 |
| Titular acreditado por checkpoint_usuario | 36 |
| Checkpoints actuales presentes | 78 |
| Checkpoints actuales con envoltura KHC1 | 78 |
| Sesiones con audio | 44 |
| Sesiones sin audio pero con checkpoint | 34 |
| Sin audio ni checkpoint localizado | 1 |
| Partes de audio | 1039 |
| Partes con localizador B2 | 785 |
| Partes con localizador Vercel Blob | 254 |
| Localizadores de proveedor desconocido | 0 |
| Partes con SHA en Neon | 1039 |
| Partes con bandera DB `verificado` | 1039 |
| Partes sin bandera DB `verificado` | 0 |
| Huecos internos de índice | 1 |
| Filas sin `total_partes` declarado en sesión | 79 |

**Advertencia de integridad:** las 1.039 partes tienen SHA y bandera DB `verificado`, pero eso no demuestra que el objeto siga disponible ni que su payload físico coincida. El GET y read-back B2/Blob permanecen pendientes. En las filas donde `total_partes` es nulo, la continuidad solo puede afirmarse dentro del rango observado; no se certifica que no falten partes finales fuera de ese rango.

## 2. Partición de checkpoints sin audio

Hay 35 sesiones sin audio: 29 con hash actual potencialmente significativo, 4 con hash de texto vacío, 1 con hash de un salto de línea y 1 sin hash/checkpoint actual. La última no equivale a texto vacío ni a pérdida confirmada.

De los 29 checkpoints significativos:
- 27 hashes actuales distintos.
- 17 tienen alguna revisión histórica cuyo SHA coincide con al menos un Volcado del mismo titular.
- 0 tienen el SHA del checkpoint actual coincidente con un Volcado actual del mismo titular.
- 1 carecen de revisiones registradas.

Una coincidencia histórica no demuestra que el checkpoint actual sea el mismo texto: no se deduplica usando revisiones antiguas. Ningún hash se toma como prueba de igualdad de contenido sin read-back/descifrado y comparación de procedencia.

## 3. Grupos de SHA actuales repetidos

Se encontraron tres grupos repetidos entre las 79 sesiones. El grupo de SHA vacío se excluye de candidatos de duplicación de contenido; los dos grupos no vacíos requieren cotejo de plaintext/procedencia:

- SHA 6bfe50dbdc1cdd1419788a715f552e2dcc054d91e44296f328e23a6261754396: 2 sesiones — 3b6741b1-c1f6-4b18-af6e-d0d8cd874eab, 48586f80-63d6-4969-9691-27e55cb5d5f5. Candidato de coincidencia, no duplicado confirmado.
- SHA 932b4f49f203a40e57987f7eff34c7c489fe95883ec5e53168b444c9b418fb25: 3 sesiones — 22f3c50d-255f-439b-af79-1aad136d4822, 0668dd82-3057-4e42-9820-50b4abc2b468, ae423b97-3ecd-4fa2-9dbf-191a99e53995. Candidato de coincidencia, no duplicado confirmado.

- SHA `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`: 9 sesiones (`c250780f-f5b4-4a76-8826-0bba9ca10ee9`, `e648d9b2-6426-42d7-aaa2-0fd388d75289`, `bc6e9dc9-ba17-4152-a283-37f071662498`, `015cb3e8-a501-400a-98a8-233e6886107f`, `45ff0f87-6cbc-4b18-b87a-bc12662714b8`, `262159b7-6c3c-4874-9d43-3cbb4f8d1db1`, `9f5078ee-5c03-4fbb-95c3-57b4a45bab8c`, `31328e01-2af9-4cd8-8ade-c45a61ce746d`, `9f008c62-2c4a-40ff-8404-77f476f5be56`). Es el hash de texto vacío; incluye sesiones con audio y sin audio, por lo que no se trata como duplicado de contenido.

El grupo de SHA `6bfe50dbdc1cdd1419788a715f552e2dcc054d91e44296f328e23a6261754396` es especialmente sensible: una de las sesiones pertenece al subconjunto sin audio y otra tiene audio. No se fusionan ni se descarta ninguna. El triplete `932b4f49f203a40e57987f7eff34c7c489fe95883ec5e53168b444c9b418fb25` se mantiene como tres capturas separadas hasta comprobar contenido y captura.

## 4. Hueco de audio individualizado

La única discontinuidad interna del índice está en:
- Sesión: `36eeb04c-bbe7-4b72-bb6a-5e0d23cffce9`.
- Índice ausente: **317**.
- La fila de DB contiene el resto de partes observadas con SHA y bandera `verificado`; no se fabricó una parte sustituta.
- No se presume que el audio esté perdido. Debe verificarse disponibilidad física/read-back y determinar si el índice faltante existe en otra fuente autorizada.

## 5. Matriz de las 79 sesiones

Columnas:
- `CP`: KHC1 significa ciphertext presente; VACIO y SALTO_LINEA se clasifican por el SHA conocido; SIN_CHECKPOINT/SIN_SHA no se infieren como contenido perdido.
- `rev/hash`: número de revisiones y número de hashes de revisión distintos.
- `rev=actual`: filas de revisión cuyo SHA iguala el SHA actual.
- `rev→Volcado`: hashes de revisiones históricas que igualan SHA de Volcados del mismo titular.
- `SHA actual→Volcado`: número de Volcados del mismo titular que igualan el SHA actual.
- `B2/Blob`: conteo por proveedor inferido del dominio del localizador persistido, sin GET físico.
- `índices`: mínimo–máximo observado y número de índices distintos; hueco es solo discontinuidad interna del rango.
- `flags`: SHA y estado de verificación guardados en DB, no prueba de read-back físico.

| session_id | fecha | titularidad | CP | SHA actual | rev/hash | rev=actual | rev→Volcado | SHA actual→Volcado | B2/Blob (partes) | índices | huecos | flags DB |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|---:|---|
| 0bbc3139-7728-4b8d-ad48-f1886d6be9e2 | 2026-10-09T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 6013a8d50e874880ac74839bcb29751793e44520ffeecf0c003993a99b625f63 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 2 (2) | 1–2 (2) | 0 | 2/2 SHA; 2/2 flag |
| 2223156f-2571-4dda-ab1d-eca59085f794 | 2026-10-09T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 9ffcb39375a29e49a5d96682fcdc392f1b71a31663eccff6b54a1e0d5ca479c9 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 1 (1) | 1–1 (1) | 0 | 1/1 SHA; 1/1 flag |
| d4821ca0-d130-4555-ad35-805026868433 | 2026-10-09T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 30b83fd5d7e30c07bbe40d61c59c4ffb542d12793c298ca0df884e9cbb46ab62 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 7 (7) | 1–7 (7) | 0 | 7/7 SHA; 7/7 flag |
| a03f283a-5794-4fe4-bb9e-cd4de7e73328 | 2026-10-09T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 13232b5839b3b25a73d9a5acf0ac6043ab94534ade02a7e3550e46ea893cf049 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 6 (6) | 1–6 (6) | 0 | 6/6 SHA; 6/6 flag |
| 04752856-1ad2-4c26-903b-ff89859a939a | 2026-10-09T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 1da8069349b1557541d6abbe448b4cbda703eeab4b00bbd2f16df415888e9de0 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 2 (2) | 1–2 (2) | 0 | 2/2 SHA; 2/2 flag |
| 0561243f-2019-4737-93ed-e6fa11cdb64e | 2026-10-09T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | cf5622319766e018fae14bee6251c278cd4293148923c8b8c0691e5faa7dbd35 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 18 (18) | 1–18 (18) | 0 | 18/18 SHA; 18/18 flag |
| fc2398e1-7d47-43d6-8acd-8cc67f23c55a | 2026-10-10T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | e127332c203de9f9115af47fbb993ac4604f84f77c40d2714abb9d3fde4986b5 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 2 (2) | 1–2 (2) | 0 | 2/2 SHA; 2/2 flag |
| e7989b68-b9e6-490a-bb0c-1d4d9f92e977 | 2026-10-10T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | f95e5b8d8886fb1128ee4c752281b14a4af51a841200a175ca6e95960f0aef2b | 0/0 | 0 | 0 | 0 | B2 0 / Blob 5 (5) | 1–5 (5) | 0 | 5/5 SHA; 5/5 flag |
| 6fa58446-783a-4430-89e9-1a4642f071db | 2026-10-10T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 9b13728e3d70cfb32b47c7d42e13377a60f9d3ebf558ad433cce9230206de8df | 0/0 | 0 | 0 | 0 | B2 0 / Blob 4 (4) | 1–4 (4) | 0 | 4/4 SHA; 4/4 flag |
| d44ffdf1-9719-4a5f-8471-5b1a0bc620fd | 2026-10-10T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 69b16f2604ff9c79c73f51ed4219753715c912507700559adbaa64b8c1b80645 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 2 (2) | 1–2 (2) | 0 | 2/2 SHA; 2/2 flag |
| 8ef010c1-070f-4a35-8251-499a8db0be74 | 2026-10-10T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 5321d1b61709de345a10ec39dbb42530105c8022cd130c84ad802a5266dd4041 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 4 (4) | 1–4 (4) | 0 | 4/4 SHA; 4/4 flag |
| 958afe80-9cf2-46b1-8289-3a4978accb26 | 2026-10-10T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | adc87f9641c76778e8d68e9b360b056fd82b90160d18c0a0eb7a674e2f8d1778 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 5 (5) | 1–5 (5) | 0 | 5/5 SHA; 5/5 flag |
| 895d35b5-a45b-4d21-951b-d6ff30837db0 | 2026-10-14T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 0564a7bf7a78ff39e9e37d5e941fd818f8ba9157b671e042bb3c9cb41646b2b7 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 6 (6) | 1–6 (6) | 0 | 6/6 SHA; 6/6 flag |
| de339103-3c54-40a6-8424-c2d2b59482e3 | 2026-10-14T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 9f73f74d29c3f934779cb714ec3f1c74ee84ca14346fd9dfb7c0aa69116db583 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 3 (3) | 1–3 (3) | 0 | 3/3 SHA; 3/3 flag |
| 0f754db1-a233-4f1b-b85c-a0bc0df22097 | 2026-10-14T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 53efdeaf7e62e4d8cea66a0824b59aa1104195fd2e44881a8a8bb14d40450eec | 0/0 | 0 | 0 | 0 | B2 0 / Blob 3 (3) | 1–3 (3) | 0 | 3/3 SHA; 3/3 flag |
| 486a87a9-9bc3-4ead-8bf3-88c7034a4dd9 | 2026-10-14T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 8f3fba3e5c4e57b101a00e67afa015deb5771af75f9d9c260183432bdf902c0e | 0/0 | 0 | 0 | 0 | B2 0 / Blob 6 (6) | 1–6 (6) | 0 | 6/6 SHA; 6/6 flag |
| 7132f7c9-4c09-4fbf-9383-b636d1ee0168 | 2026-10-14T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 389b8cfa4d230861b4fdbab186abebefb914372f3ffb28bad3aef2f115c65f36 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 4 (4) | 1–4 (4) | 0 | 4/4 SHA; 4/4 flag |
| c0704674-fdb1-41d6-bfd3-0dccc1b8ff84 | 2026-10-14T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 0a4b94b402a6e9bcda35e793845cc0eec8e14a94570c4c966db320c17e6e9a3a | 0/0 | 0 | 0 | 0 | B2 0 / Blob 1 (1) | 1–1 (1) | 0 | 1/1 SHA; 1/1 flag |
| 71d72173-ea2d-427d-9654-00007b0863ee | 2026-10-14T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 4ac93ef17f695d9f55172a2a64e8c9bbe3ee59608e48502102dd652eb57bc5e8 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 3 (3) | 1–3 (3) | 0 | 3/3 SHA; 3/3 flag |
| 4d0c13b2-b387-4ded-a9a4-aeeac732d055 | 2026-10-14T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | e3bb412cddf2f5016b11e357184691588b05e02b64d833f3a519e48b092ebd56 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 20 (20) | 1–20 (20) | 0 | 20/20 SHA; 20/20 flag |
| 6d1aa1b9-e12f-4fc2-a5dd-9db698097b86 | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | c03f32c2cf7d3e11f85d24fdfdac50b199f4ca5c7ff351ebbe3f7595a6233765 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 4 (4) | 1–4 (4) | 0 | 4/4 SHA; 4/4 flag |
| 3b6741b1-c1f6-4b18-af6e-d0d8cd874eab | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 6bfe50dbdc1cdd1419788a715f552e2dcc054d91e44296f328e23a6261754396 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 27 (27) | 1–27 (27) | 0 | 27/27 SHA; 27/27 flag |
| 9b574e61-1297-45c6-b6c4-27dbd2bfef67 | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | c70d572335a76db9ecb8dc7a0de6df70530c44ac341b1de69a091152ddd44203 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 3 (3) | 1–3 (3) | 0 | 3/3 SHA; 3/3 flag |
| c21e1789-acef-4240-9ee7-cde6f014913e | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 760a03a599c447eae2a132dd0c529afb28c6911816b6fd1c886b55b5348e55ab | 0/0 | 0 | 0 | 0 | B2 0 / Blob 3 (3) | 1–3 (3) | 0 | 3/3 SHA; 3/3 flag |
| 48586f80-63d6-4969-9691-27e55cb5d5f5 | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 6bfe50dbdc1cdd1419788a715f552e2dcc054d91e44296f328e23a6261754396 | 0/0 | 0 | 0 | 0 | — (0) | — | — | — |
| 4d4e0061-bfc8-4c29-9cb5-76bab563c4e4 | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | ff599e525c2b1f8ffe665884f75f477cd3ef31240a915c058ab929a2a90f58cf | 0/0 | 0 | 0 | 0 | B2 0 / Blob 15 (15) | 1–15 (15) | 0 | 15/15 SHA; 15/15 flag |
| 25fd67d5-179a-4a1b-8130-ebd86a300e35 | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 425183a6095025fd6c9e08d7153a2a47ad7f9adccbd21f65b60bee39911704ab | 0/0 | 0 | 0 | 0 | B2 0 / Blob 1 (1) | 1–1 (1) | 0 | 1/1 SHA; 1/1 flag |
| 0369da62-6c13-4adb-a930-deb2807ec266 | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | d9636bb62042041142e8702a47c879a4c2a67db25d550a677223bf9ca528ea60 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 14 (14) | 1–14 (14) | 0 | 14/14 SHA; 14/14 flag |
| 457aa2f0-6bf9-455b-9b7f-cbc9fc9942e5 | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 3c197ca0e836508ef86cdbb6e9f496fb8643bd05334e78489a462588b4f2cad8 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 12 (12) | 1–12 (12) | 0 | 12/12 SHA; 12/12 flag |
| 686d09c2-0513-455b-8645-6da1850e5dfa | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 5e25215b61df94a301d1da8a076c6ecea36131b868a3cfefe1c0eef369537f58 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 4 (4) | 1–4 (4) | 0 | 4/4 SHA; 4/4 flag |
| 3abbb455-3ade-4800-a09b-11a064bb1fb9 | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 3455e67aaf70f873974af3f6b5e5e9aa25cba4bc024e6bf393af78107b344d43 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 1 (1) | 1–1 (1) | 0 | 1/1 SHA; 1/1 flag |
| 1c834b69-830c-4e41-9055-24c25a554a1c | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 75476c1c9c941f00d4515cc69ce55a83d7798c3eccf0126009b442827eda3dc3 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 2 (2) | 1–2 (2) | 0 | 2/2 SHA; 2/2 flag |
| cceca9b3-e3ef-4ed4-9fca-d2689d61f81c | 2026-10-15T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 337c19fdda4b8df4c8d2b2723c7fedd94ff204b068fe7ca15936f389a9a16675 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 11 (11) | 1–11 (11) | 0 | 11/11 SHA; 11/11 flag |
| ff63a6b0-57d1-467f-956a-1615344ed7bd | 2026-10-16T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 90de1fa1b1b681ff886a007d9746ea4dccf8e2bcec76ef083acc463d0e9f7264 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 2 (2) | 1–2 (2) | 0 | 2/2 SHA; 2/2 flag |
| 8708f283-9728-45ca-8d90-a72dccf203fa | 2026-10-16T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | 7415b62adc1209bb2d12f26ed93b5ef7baf13c3c984746e832e4ce80ff3d577b | 0/0 | 0 | 0 | 0 | B2 0 / Blob 2 (2) | 1–2 (2) | 0 | 2/2 SHA; 2/2 flag |
| d8076ffc-d6ab-4b58-b706-ee2243677e91 | 2026-10-16T00:00:00.000Z | checkpoint_usuario | KHC1_CIFRADO | e155b94d5514c8f0dc55bf215c0b2cfe39813d2ebcdf62e00877ebbb9efd5ae2 | 0/0 | 0 | 0 | 0 | B2 0 / Blob 1 (1) | 1–1 (1) | 0 | 1/1 SHA; 1/1 flag |
| c250780f-f5b4-4a76-8826-0bba9ca10ee9 | 2026-10-17T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 77/6 | 9 | 1 | 2 | B2 0 / Blob 12 (12) | 1–12 (12) | 0 | 12/12 SHA; 12/12 flag |
| 156d389d-a87b-4847-a3f7-beaf20d6e3ba | 2026-10-17T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 9378e619cf2c6cc41a856b11b038c1991e2fd45a7f8e06aa57ca4f76c6742d37 | 3/3 | 1 | 1 | 0 | — (0) | — | — | — |
| 9366c3d7-8688-40c4-aa42-9a3180763ef1 | 2026-10-17T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 5c8011542ffbe42408201afbca1fdb1c4a4c3e510486edb9f65a4329e92c3c59 | 66/58 | 4 | 0 | 0 | — (0) | — | — | — |
| e648d9b2-6426-42d7-aaa2-0fd388d75289 | 2026-10-18T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 2/1 | 2 | 1 | 2 | — (0) | — | — | — |
| bc6e9dc9-ba17-4152-a283-37f071662498 | 2026-10-18T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 5/1 | 5 | 1 | 2 | — (0) | — | — | — |
| c8a5671b-3be8-47ab-98aa-03e816945590 | 2026-10-18T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | c5bb1cb4796f32581652c2743aea2d3d05dabd96d77983cb5cb8d890b6e86e5d | 25/20 | 6 | 1 | 0 | — (0) | — | — | — |
| 0e7c10e7-f3bb-4a2b-84b5-8338786a856e | 2026-10-18T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | dccd3cd8c7c9a592c1fe8a0f49fde8ea30ed24b7bb53170a0d8ed85e09c4aecd | 712/670 | 1 | 1 | 0 | — (0) | — | — | — |
| 22f3c50d-255f-439b-af79-1aad136d4822 | 2026-10-19T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 932b4f49f203a40e57987f7eff34c7c489fe95883ec5e53168b444c9b418fb25 | 6/2 | 1 | 0 | 0 | — (0) | — | — | — |
| 0668dd82-3057-4e42-9820-50b4abc2b468 | 2026-10-19T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 932b4f49f203a40e57987f7eff34c7c489fe95883ec5e53168b444c9b418fb25 | 15/1 | 15 | 0 | 0 | — (0) | — | — | — |
| 856b0259-5ecb-4f90-b6c4-682e649b9070 | 2026-10-19T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 50e96ba342de04d1c73eb5c3eb56cceacbe2106526751b045552e575561c93be | 251/226 | 11 | 1 | 0 | — (0) | — | — | — |
| ae423b97-3ecd-4fa2-9dbf-191a99e53995 | 2026-10-19T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 932b4f49f203a40e57987f7eff34c7c489fe95883ec5e53168b444c9b418fb25 | 15/1 | 15 | 0 | 0 | — (0) | — | — | — |
| 7e446fb8-9df9-4a27-918c-f614a433bf9c | 2026-10-19T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | d4053d77dfa1127bffff0b99bb42a55334cbe4f56ba2cf97788dd1b952b489c9 | 259/228 | 28 | 1 | 0 | — (0) | — | — | — |
| 015cb3e8-a501-400a-98a8-233e6886107f | 2026-10-19T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 6/1 | 6 | 1 | 2 | — (0) | — | — | — |
| ed928635-8b11-4f58-9c2d-f508fc8ae058 | 2026-10-19T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | f88b195ff0336ed4d131c830bb7cacaf93ae2b9048c2c6881b23018b57bafee7 | 2/1 | 2 | 0 | 0 | — (0) | — | — | — |
| 68807d9f-bd68-4222-9391-11ab19759714 | 2026-10-20T00:00:00.000Z | custodia_owner | SIN_CHECKPOINT | — | 0/0 | 0 | 0 | 0 | — (0) | — | — | — |
| 382cf5d1-2c80-44a4-94fa-bf5dfad0ba6d | 2026-10-20T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 34a5886ccc68b89cd8a65002387c4d53c3373cafd652c615bb5a1daf953572e4 | 1/1 | 1 | 0 | 0 | — (0) | — | — | — |
| 80238c7f-f66f-4559-8a40-b49bd5280956 | 2026-10-20T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | a1e43568c8919e74e77e0050c628c20f5e2b0c0444e49d857d8e391564e2ebc7 | 198/175 | 17 | 1 | 0 | — (0) | — | — | — |
| 45ff0f87-6cbc-4b18-b87a-bc12662714b8 | 2026-10-20T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 4/1 | 4 | 1 | 2 | B2 0 / Blob 12 (12) | 1–12 (12) | 0 | 12/12 SHA; 12/12 flag |
| 262159b7-6c3c-4874-9d43-3cbb4f8d1db1 | 2026-10-20T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 5/1 | 5 | 1 | 2 | B2 0 / Blob 12 (12) | 1–12 (12) | 0 | 12/12 SHA; 12/12 flag |
| 9f5078ee-5c03-4fbb-95c3-57b4a45bab8c | 2026-10-20T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 8/1 | 8 | 1 | 2 | B2 0 / Blob 12 (12) | 1–12 (12) | 0 | 12/12 SHA; 12/12 flag |
| b8362bce-55c2-48ed-ba06-327150ea3a61 | 2026-10-20T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | b600eea309d5b32ec2bc19cc5b21af1337da6b46aa9b350118aa667577bd2d43 | 3/2 | 1 | 1 | 0 | B2 1 / Blob 0 (1) | 1–1 (1) | 0 | 1/1 SHA; 1/1 flag |
| 45f0cf5e-d1af-46c3-95af-e9428b8b0f90 | 2026-10-20T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 8c168e7df08f13179891ed4198796be132a6f4ad9c7f204d441510a36c8a7bdd | 218/155 | 17 | 0 | 0 | B2 77 / Blob 0 (77) | 1–77 (77) | 0 | 77/77 SHA; 77/77 flag |
| 31328e01-2af9-4cd8-8ade-c45a61ce746d | 2026-10-22T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 9/2 | 8 | 1 | 2 | B2 2 / Blob 0 (2) | 1–2 (2) | 0 | 2/2 SHA; 2/2 flag |
| 36eeb04c-bbe7-4b72-bb6a-5e0d23cffce9 | 2026-10-22T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 4f6a5aae0b3f956f07dee959051674ad0649e7230e9b492678849d8ed2c4b1d3 | 904/689 | 6 | 1 | 0 | B2 321 / Blob 0 (321) | 1–322 (321) | 317 (1) | 321/321 SHA; 321/321 flag |
| 070fbe7c-e809-46e5-b5d7-efb90ded31bf | 2026-10-22T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | d7173c207621dcc72c2959eb184bf25d2e5484c83d63f58da5358faa88a8b6af | 11/8 | 1 | 1 | 0 | — (0) | — | — | — |
| 41c3a57d-d914-4f0b-be11-1df0bb529a0b | 2026-10-22T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | f9151dac6adab9dfa2a4a9a82a6c08a414e559d234f4ddf0f3cc9a08169b1150 | 330/312 | 3 | 1 | 0 | — (0) | — | — | — |
| 9f008c62-2c4a-40ff-8404-77f476f5be56 | 2026-10-23T00:00:00.000Z | custodia_owner | VACIO | e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 | 1/1 | 1 | 1 | 2 | — (0) | — | — | — |
| a7bf9d3c-fac5-41bd-9c30-8ad7fc5f9ed2 | 2026-10-23T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 3c0aef7f0764a6c2b0fd490ddbdcded0e90a601573053e4c0829f7efc085fb8a | 1183/1119 | 3 | 1 | 0 | — (0) | — | — | — |
| 39cfff67-a2c7-4984-bee8-7dc20333cb75 | 2026-10-24T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 252f4291bd5c64e5bde747c7b358dfb458389f5b915c97de5eff2f316943024c | 89/81 | 6 | 1 | 0 | — (0) | — | — | — |
| 42862172-4190-4814-bd24-ce9a398e5351 | 2026-10-28T00:00:00.000Z | custodia_owner | SALTO_LINEA | 01ba4719c80b6fe911b091a7c05124b64eeece964e09c058ef8f9805daca546b | 13/3 | 7 | 0 | 0 | — (0) | — | — | — |
| f4775bb4-139e-422a-abc8-18dff611bc99 | 2026-10-28T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 5f7d9884ebf3688764eb65a7c53cd32131287146efe3c72a9f1e6523c4723f10 | 369/348 | 12 | 0 | 0 | — (0) | — | — | — |
| e923c919-582f-4c8d-8161-f46171aafc59 | 2026-10-29T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | d6ffb1d9ad162533e7fce61a78d82b8f604581751e8ede32b0e67a1c7e07c1dc | 264/249 | 1 | 0 | 0 | — (0) | — | — | — |
| 62d597b9-3201-4a34-a659-ea8c764c13cd | 2026-10-31T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | e9d37ee35d6adde440f73bcba383daae58ff3f518df726d86462cb8985cb1f63 | 130/120 | 4 | 1 | 0 | — (0) | — | — | — |
| 12484958-aba8-4709-8e7e-d3b8e45bf0fd | 2026-11-01T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 077645d6c3aed4870b2514eaea4e3ddfb52d268fad885797882868db619cd5ac | 96/86 | 5 | 1 | 0 | — (0) | — | — | — |
| 79481287-4651-4a20-bd39-71fcda236bdf | 2026-11-02T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 1fc1274e2e7c9472f7f7392fedd917e43f293efd9d4c44c6c33a76b5270d7a62 | 237/215 | 16 | 0 | 0 | — (0) | — | — | — |
| 413d88d8-a9cd-4aec-9523-118b099e12e1 | 2026-11-06T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 5fd924625f6ab16a19cc9807c7c506ae1813490e4ba675f843d5a10e0baacdb8 | 3/1 | 3 | 0 | 0 | — (0) | — | — | — |
| 3b308ea3-a86e-4e95-8829-87bdd61fba0a | 2026-11-06T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 2bae8f467825a2ab9c913675a49696ac5b8f5f8fcee8bba9d65e0a9327eed471 | 11/10 | 2 | 1 | 0 | — (0) | — | — | — |
| 48bca637-c5ce-4621-a82e-9747eb40d960 | 2026-11-06T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 795dd9c51d1f65b2ffd06b5dcc7a44bc9da54aa9e806ff645e45cfe5922aa9b4 | 112/106 | 4 | 1 | 0 | — (0) | — | — | — |
| ebf759cd-e4c8-4cf0-8b7e-0eadd2af3328 | 2026-11-06T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | c1bc68f00294e38f8802119efd85cbbb75e2056dc6d7b01fd905019884ee51bd | 29/25 | 5 | 0 | 0 | — (0) | — | — | — |
| 148afcb4-f901-4747-836d-740ad05d2cf6 | 2026-11-06T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 137b73b9bbce381bdfd2173c6dcf3a3f4e66bed2821da5f3de869a81bbdf4f19 | 142/135 | 4 | 1 | 0 | — (0) | — | — | — |
| 81487e9f-07ed-40b5-849e-ee181caff991 | 2026-11-07T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | aa04e7627eaa121dea1db7ae77246ee176b90a2a1ad0c29b778ea3f26681cd02 | 32/22 | 8 | 1 | 0 | — (0) | — | — | — |
| 544cf4cc-d945-4e2e-a7ba-6b4d65191f35 | 2026-11-07T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 880de32b36e011b12bd9c3f065021789bf8fbdf344b157f9b38c7411e924bc00 | 248/228 | 7 | 1 | 0 | — (0) | — | — | — |
| 754c8c26-bf25-4504-babe-59045af90d6c | 2026-11-09T00:00:00.000Z | custodia_owner | KHC1_CIFRADO | 5188524b445717b6b58999cc3cb35ec5546158be83178df6f89076329244d10e | 874/745 | 6 | 1 | 0 | B2 384 / Blob 0 (384) | 1–384 (384) | 0 | 384/384 SHA; 384/384 flag |

## 6. Bloqueos por clase y compuertas de ejecución

| Unidad | Evidencia registrada | Bloqueo/compuerta |
|---|---|---|
| 44 sesiones con audio | 785 locators B2 y 254 Blob; 1.039 SHA/flags DB; una discontinuidad interna en parte 317 | KHC1/runtime para checkpoint y GET/read-back físico por proveedor; Blob legacy no disponible por configuración actual; reconciliar el hueco 317 sin sintetizarlo |
| 29 checkpoints textuales significativos | hash actual y revisiones; 17 con SHA histórico coincidente con Volcado | KHC1/runtime y comparación de plaintext/procedencia; no crear duplicados ni deducir identidad a partir de SHA histórico |
| 3 sesiones con SHA actual repetido 932b… | hashes de DB coincidentes | comparación de texto descifrado y procedencia antes de afirmar duplicidad |
| 2 sesiones con SHA actual repetido 6bfe… | una text-only y otra con audio | comparar el plaintext y el origen; conservar ambos registros |
| 4 checkpoints vacíos + 1 salto de línea | hashes vacíos/newline | confirmar semántica de captura; no inventar contenido |
| 1 sesión sin audio ni checkpoint | sesión atribuible, sin contenido fuente localizado en estas tablas | buscar otras fuentes autorizadas o mantener como bloqueada; no crear Volcado vacío |

**Compuerta común:** no se puede archivar mediante un actor inventado. Se requiere el runtime permitido con clave KHC1, el acceso físico B2/Blob que corresponda y la identidad NextAuth del titular o un mecanismo delegado ya autorizado (no encontrado en R4–R7). La matriz no declara recuperado ni perdido ningún objeto.

## 7. No-acciones y resultado del ciclo

- Solo se ejecutaron SELECT sobre Neon Production.
- No se leyó texto, snapshot, plaintext, URL completa ni secreto.
- No hubo GET B2/Blob, descifrado, writes, claim, Volcados nuevos ni cambios de filas.
- No se utilizó monitor, Chrome local, RDC, perfil alterno ni IndexedDB.
- El inventario anterior se mantiene; esta matriz aporta granularidad por sesión.

**Dictamen:** las 79 sesiones quedan individualizadas por evidencia de titularidad, checkpoint/hash, revisiones, audio/localizador y gap de índice. Ninguna queda autorizada para archivo inmediato por este ciclo, porque las compuertas de runtime/identidad/read-back no se superaron. CUSTODIA-01 sigue EN CURSO.

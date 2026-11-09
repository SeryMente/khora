# Evidencia · prueba física Backblaze B2 KHORA · 2026-11-09

**Resultado:** PASS · autenticación Master Application Key + listado del bucket + PUT + GET + cotejo de tamaño/SHA-256.

## Contexto de ejecución

- **Terminal:** PC-7 · Windows identity observada: PC-7\PC 7.
- **Cuenta Backblaze:** Account ID 58b62b4593c8.
- **Credencial:** Master Application Key de la cuenta exclusiva KHORA; el Key ID coincidió con el Account ID. Los valores no se imprimieron ni se registraron.
- **Claves adicionales:** no se generó ninguna Standard Application Key.
- **Bucket:** khora-userdata-ecea4187.
- **Bucket ID:** 35b8cbd6623b54a5a9130c18.
- **Privacidad:** allPrivate.

## Objeto sintético de prueba

| Campo | Resultado |
|---|---|
| Objeto | khora/custodia/preflight/20261109/342ed1ad-d8aa-4e9a-bf0b-fce84f31c3ab.json |
| File ID | 4_z35b8cbd6623b54a5a9130c18_f1191dbb4dc31bbce_d20261109_m230230_c005_v0501036_t0032_u01794265350120 |
| Bytes | 150 |
| SHA-256 origen | 9f0fccddda2ec3a56f808236d54701961a3f70269640a35a5771e7ecf399541e |
| SHA-256 descargado | 9f0fccddda2ec3a56f808236d54701961a3f70269640a35a5771e7ecf399541e |
| SHA-256 coincide | PASS |
| Tamaño coincide | PASS |
| Cifrado servidor | SSE-B2 · AES256 |
| Objeto remoto conservado | Sí |
| Objeto fuente de usuario borrado | No; solo se utilizó un payload sintético |

## Interpretación

La Master Application Key KHORA autentica contra Backblaze y el bucket privado acepta escritura y lectura física. El objeto descargado coincide con el origen en bytes y SHA-256. La cuenta/B2 no son el bloqueo local.

Esta prueba **no** certifica todavía:
- que Vercel Production tenga cargadas las dos variables maestras canónicas;
- que el despliegue productivo actual consuma esas variables;
- que el botón Archivar complete el flujo real de Dictado/Neon;
- que las referencias históricas de Vercel Blob hayan sido copiadas a B2.

## Siguiente paso

Transferir de forma local las dos variables maestras existentes a Vercel Production bajo los nombres canónicos, ejecutar el preflight del proyecto, publicar una versión comprobada y validar el archivado E2E. Después iniciar CUSTODIA-B2-002 para inventariar y copiar el histórico Blob a B2, con lectura de vuelta y sin borrar los originales.

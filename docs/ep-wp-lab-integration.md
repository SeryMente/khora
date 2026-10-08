# EP-WP-LAB — Integración de WordPress de Ser y Mente

**Estado:** integración preparada; activación física pendiente de un EP montado en el host.

## Propósito

EP-WP-LAB es un componente operativo del Entorno Persistente Medio para alojar el laboratorio WordPress de reconstrucción de Ser y Mente.

No constituye una nueva capa arquitectónica ni modifica las invariantes de `ep-medio-architectura.md`.

## Fuentes de verdad

1. **Código y configuración reproducible:** `SeryMente/serymente`
2. **Entorno local WordPress:** WordPress Studio
3. **Binario licenciado Divi 4.24.0:** copia local autorizada, identificada por SHA-256
4. **Persistencia de sesión:** KHORA EP cifrado
5. **Validación cloud:** Render Free, efímero

## Estructura objetivo dentro de EP

```
<EP>\
  EP-WP-LAB\
    site\
    snapshots\
    tools\
    manifests\
```

El directorio público `Desktop\EP` debe apuntar mediante junction al workspace cifrado conforme al contrato EP.

## Hidratación

La rehidratación se ejecuta con:

`reconstruction/lab/bootstrap-ser-y-mente-lab.ps1`

Ese bootstrap:

- valida el SHA-256 exacto de `Divi-4.24.0.zip`;
- sincroniza `custom-code` desde `SeryMente/serymente`;
- instala el módulo histórico de Blog;
- instala/activa Divi;
- arranca WordPress Studio con Node 22;
- genera `LAB-MANIFEST.json`.

## Invariantes

- El ZIP propietario de Divi no se publica en repositorios públicos.
- El laboratorio local es fuente de estado activo.
- GitHub contiene código y metadatos reproducibles.
- Render no es persistencia.
- La migración al EP solo se considera completada después de verificar cifrado, target de `Desktop\EP` y ubicación física del site dentro del VHDX.

## Estado 2026-10-08

Local PC-7:
- WordPress Studio 1.23.0
- WordPress 6.4.13
- PHP 8.2
- Divi 4.24.0
- snapshot local validado

Bloqueo físico actual:
- RDC de PC-7 no responde.
- El EP cifrado no está montado/verificado en esta sesión.
- El binario Divi 4.24.0 no puede transferirse mediante la conexión nativa de GitHub porque el conector no admite una ruta binaria privada utilizable.

Por tanto, la integración está **preparada y documentada**, pero no debe marcarse como físicamente activada hasta ejecutar esos tres pasos en el host.

# Evaluación sintética de bóveda portable

Estado: investigación reproducible. **No es una bóveda instalable, endpoint, adaptador productivo ni migración.** Gobierno y estado único en ../OBJETO-CANONICO.md, anexo E. No hay otro tablero ni otro objeto canónico.

## Qué se ensayó

OpenBao valida contraseña y un código de un solo uso basado en tiempo; emite token de una operación, alcance de una clave y cinco segundos de vida en este ensayo. Transit desenvuelve una identidad age sintética. age descifra realmente un archivo artificial. El generador TOTP Python es solo un fixture; no se usa como implementación de autenticación productiva.

## Resultados

24 comprobaciones aprobadas en dos instancias independientes; además, ausencia de motor produce SAFE_STOP y salida 2, antes de iniciar servicio. Ver JSON sanitizados. El script devuelve salida 0 solo si pasa el ensayo, 2 si se detiene por error; el arnés debe tratar el segundo caso como fallo salvo en la prueba negativa explícita.

## Reproducción

Usar Linux y Python 3 estándar, binarios oficiales OpenBao 2.7.1, age y age-keygen 1.3.2, con integridad/firmas verificadas por el operador. El arnés no descarga ni ejecuta binarios automáticamente. Con los tres binarios verificados en esta carpeta, desde ella:

```bash
python3 openbao-smoke.py --bao ./bao --age ./age --evidence ./synthetic-evidence.json
```

El comando es solo para entorno de pruebas sin corpus ni secretos reales. No ejecutar en equipo de renta, servidor vivo ni para custodiar datos. No subir binarios, claves, salida de enrolamiento o datos personales. No se necesita .env. El arnés no utiliza las credenciales de GitHub, Vercel, Google ni Ente del operador; crea fixtures efímeros en memoria. Comparar source_sha256 de verification.json con el archivo de prueba antes de reproducir.

## Límites

- Proveedor/motor candidato, no decisión de alojamiento o gasto autorizada.
- El servicio custodio y sus administradores pueden acceder a material descifrable; no conocimiento cero.
- Un host autorizado puede retener la identidad y el texto: no se promete seguridad universal ni revocación retroactiva.
- Sin interfaz Ente real, cliente Windows, ingesta Takeout, archivo grande, backup, recuperación, concurrencia, control distribuido de tasa ni producción acreditados.
- HTTP loopback y modo dev no son despliegue seguro. Los digests de releases se comprobaron; firma de editor no verificada independientemente.
- Los scripts de pruebas no se conectan a endpoints de Khora y no modifican el Entorno Persistente.

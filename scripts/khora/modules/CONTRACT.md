# Contrato modular · Entorno Persistente Medio v1.0.0

El único punto de entrada del repositorio es `scripts/khora/khora.ps1`. El instanciador remoto autenticado devuelve exactamente ese gate. El barril carga, en orden, los módulos `00` a `15` y `90`.

## Invariantes

- Secuencia interna: llave de bóveda → GitHub → Vercel → Visual Studio Code → bóveda completa.
- Todo dato de trabajo reside en un Disco Duro Virtual versión 2 cifrado con BitLocker y derivado de la llave de bóveda.
- No existe fallback mediante Encrypting File System ni modo sin cifrado.
- GitHub se considera privado; toda descarga usa un Personal Access Token validado.
- La bitácora estructural remota se confirma antes de cada etapa crítica.
- Cada etapa usa un identificador estable `EP-IN-*`, `EP-RUN-*` o `EP-OUT-*`.
- `EP-IN-080` publica obligatoriamente el SHA exacto de `main` en producción y verifica el alias canónico antes de continuar.
- La salida intenta continuidad remota, pero elimina el contenedor aunque falle el respaldo.

La especificación normativa es `ep-medio-architectura.md` en la raíz.

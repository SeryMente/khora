# Auto-Merge & Auto-Revert Workflows

Estos workflows automatizan la integración continua y el rollback en la rama `main`, implementando la decisión del operador (2026-07-11) de que el código puede integrarse sin revisión humana. El verdadero control de calidad lo realizan los tests (e2e, build) y este auto-revert en caso de fallos post-deploy.

## Qué reemplaza a la revisión humana
- **Tests pre-merge (Khora OK):** Valida que el código pasa build y pruebas de extremo a extremo. Es un check requerido.
- **Auto-Merge on Open (`auto-merge-on-open.yml`):** Programa el PR para ser fusionado (`squash`) a `main` automáticamente apenas todos los checks requeridos pasen, y elimina la rama. Si múltiples PRs están abiertos, cada uno se arma de forma independiente. **Nota:** Requiere que "Allow auto-merge" esté habilitado en la configuración de repositorio de GitHub (administración).
- **Post-Deploy Smoke Test & Auto-Revert (`post-deploy-smoke.yml` & `auto-revert-on-smoke-fail.yml`):** Tras el auto-merge y el despliegue, el smoke test verifica la disponibilidad en producción. Si falla, el auto-revert se encarga de deshacer (revertir) el último commit en `main` de manera inmediata para restaurar el servicio.

## Cómo leer los fallos

### Fallo en Auto-Merge on Open
- Si falla el setup del auto-merge, verifica los logs del run.
- Generalmente fallará si la rama base no es `main` (por diseño, lo omite), o si "Allow auto-merge" no está habilitado a nivel repositorio.
- Asegúrate de que el token tiene permisos `pull-requests: write`.
- El fallo de este workflow no impide que el PR se fusione manualmente o que se intente armar con la interfaz de GitHub, pero rompe la automatización.

### Fallo en Auto-Revert on Smoke Fail
- Si este workflow está corriendo, significa que la aplicación web **cayó o tiene errores severos** en producción tras un merge.
- Si el job del auto-revert es **verde**, el código defectuoso fue revertido con éxito en `main` y un nuevo deploy debería estar en camino (o se puede hacer trigger manual). Puedes verificar el log del revert para ver el "Motivo, SHA revertido y Run ID del smoke test".
- Si el job de auto-revert está en **ROJO** (falla), significa que **ocurrió un conflicto de merge** al intentar hacer `git revert` del último commit.
    - Por diseño (P321), el script no forzará ni resolverá conflictos automáticamente.
    - Requerirá **intervención manual inmediata** del operador para resolver el conflicto en `main` y restaurar la aplicación.

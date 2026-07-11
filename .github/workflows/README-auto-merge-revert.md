# Auto-Merge & Auto-Revert Workflows

Estos workflows automatizan la integración continua y el rollback en la rama `main`, implementando la decisión del operador (2026-07-11) de que el código puede integrarse sin revisión humana. El verdadero control de calidad lo realizan los tests (e2e, build) y este auto-revert en caso de fallos post-deploy.

## Qué reemplaza a la revisión humana
- **Tests pre-merge (Khora OK):** Valida que el código pasa build y pruebas de extremo a extremo. Es un check requerido.
- **Auto-Merge on Success (`auto-merge-on-open.yml`):** Reacciona cuando los tests (Khora OK) pasan con éxito. Revisa el PR asociado: si la rama está desactualizada respecto a `main` (BEHIND), el script de forma automática actualiza la rama (update-branch) y aborta ese ciclo (lo que reanuda los tests en el nuevo commit). Si ya está actualizada y lista, realiza el merge (`squash`) a `main` y elimina la rama.
  - *Contexto de arquitectura:* Este script reemplaza al auto-merge nativo de GitHub, debido a que en el plan de organización libre/privado las protecciones de rama requeridas que bloquean el auto-merge no están disponibles o provocan un bloqueo indefinido si hay conflictos de update branch.
- **Post-Deploy Smoke Test & Auto-Revert (`post-deploy-smoke.yml` & `auto-revert-on-smoke-fail.yml`):** Tras el auto-merge y el despliegue, el smoke test verifica la disponibilidad en producción. Si falla, el auto-revert se encarga de deshacer (revertir) el último commit en `main` de manera inmediata para restaurar el servicio.

## Cómo leer los fallos

### Fallo en Auto-Merge on Success
- Si el workflow falla, revisa los logs del script.
- Un escenario común es que un intento de actualización de rama falle por conflictos de git (si la rama base no hace un merge limpio hacia el PR). En ese caso, requerirá resolución de conflictos manual.
- El script se omite silenciosamente y pasa de forma exitosa si el PR es un draft o apunta a una rama distinta de `main`.

### Fallo en Auto-Revert on Smoke Fail
- Si este workflow está corriendo, significa que la aplicación web **cayó o tiene errores severos** en producción tras un merge.
- Si el job del auto-revert es **verde**, el código defectuoso fue revertido con éxito en `main` y un nuevo deploy debería estar en camino (o se puede hacer trigger manual). Puedes verificar el log del revert para ver el "Motivo, SHA revertido y Run ID del smoke test".
- Si el job de auto-revert está en **ROJO** (falla), significa que **ocurrió un conflicto de merge** al intentar hacer `git revert` del último commit.
    - Por diseño (P321), el script no forzará ni resolverá conflictos automáticamente.
    - Requerirá **intervención manual inmediata** del operador para resolver el conflicto en `main` y restaurar la aplicación.

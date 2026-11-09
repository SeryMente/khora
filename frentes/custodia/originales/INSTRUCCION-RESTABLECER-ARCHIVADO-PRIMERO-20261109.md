# Instrucción operativa · restablecer archivado primero · 2026-11-09

**A · UUIDv7 local:** 01a1c170-3d40-7edb-b707-9a14020a76b8  
**Procedencia:** instrucciones literales emitidas por el operador en esta conversación.  
**OCP:** Custodia · generación 11.  
**Alcance:** reorganizar las tareas y priorizar la recuperación de «Archivar registro» en Cora/Khora, sin ampliar autorizaciones de producción, credenciales o datos.

## 1. Entradas literales

### A1 · prioridad operativa
> Bueno, no he leído todo lo que me pusiste, pero lo más importante es volver a hacer que Cora vuelva a poder archivar registros y que funcione con normalidad, a pesar de que la persistencia siga, se siga trabajando. Entonces ese es el primer objetivo. Las demás tareas organízalas después en la secuencia, muéstrame la secuencia ahora en términos amigables.

### A2 · aprobación y ejecución
> Correcto. Actualzia tareas conforme, lo que me estas diciendo, y resuelve punto 1, en tiempo record

### A3 · continuación
> Continua

## 2. Interpretación operativa trazada

1. La prioridad número uno es restablecer el archivado de registros, sin esperar al diseño o implementación multialmacén.
2. La recuperación debe conservar la compuerta de integridad: ninguna parte de audio puede omitirse ni darse por persistida sin lectura de vuelta verificable.
3. El diagnóstico ya disponible alimenta la corrección inmediata; la caracterización residual y la verificación ampliada se completan sin bloquear el inicio del restablecimiento.
4. La secuencia posterior es: verificación E2E, estabilización, diseño multialmacén, implementación y certificación.
5. La continuidad de la operación y el trabajo de persistencia reforzada deben coexistir; la interfaz debe distinguir persistencia local pendiente de persistencia remota verificada.
6. No se infiere autorización para cambiar credenciales, secretos, configuración de bucket/CORS, SQL productivo, fusionar o desplegar a producción ni modificar objetos originales. Esas compuertas siguen requiriendo autorización específica.

## 3. Estado de autorización

- **Autorizado:** reordenar las tareas documentales; iniciar corrección en rama no productiva; añadir pruebas y diagnóstico saneado; abrir una PR para revisión.
- **No autorizado por esta instrucción:** merge, deploy o cutover productivo; lectura o sustitución de valores secretos; cambios de bóveda/credenciales; SQL/backfill de Neon Production; cambios de seguridad/CORS del bucket; eliminación/sobrescritura de originales.
- «Continúa» mantiene el encargo anterior dentro de esos mismos límites; no los amplía.


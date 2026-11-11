El bloqueo **no es** `X_KHORA_KEY`. Está configurada en Vercel Production. También existen el token de Vercel Blob y las credenciales maestras de B2. No necesitamos seguir buscando la llave ni sustituirla.

Lo que está bloqueando el archivado es otra cosa.

## 1. Bloqueo principal: lectura del Vercel Blob histórico

Encontré una compuerta concreta en `khora-web/lib/server/object-storage.ts`:

- La variable `KHORA_LEGACY_BLOB_READS_ENABLED` **no existe en la configuración actual de Production**.
- El código rechaza las lecturas de objetos históricos de Blob mientras esa variable no sea exactamente `true`.
- Tener `BLOB_READ_WRITE_TOKEN` no evita ese rechazo.
- La última evidencia disponible también registraba el almacén `khora-audio` suspendido por exceso de cuota. No pude revalidar hoy si continúa suspendido.

Esto significa que hay dos condiciones independientes para recuperar el audio histórico: habilitar la lectura en KHORA y que Vercel Blob permita realmente descargar los objetos.

## 2. Qué tenemos y qué falta archivar

Consulté directamente el Neon Production, sin modificar datos.

**Grupo de tu cuenta**

- 95 sesiones con evidencia de titularidad de tu cuenta.
- 79 sin vínculo de archivo Volcado.
- 16 ya vinculadas a Volcados.
- 87 sin evidencia suficiente de titularidad.

**Las 79 sesiones todavía no vinculadas**

| Componente | Cantidad |
|---|---:|
| Con texto/checkpoint en sesión | 78 |
| Con revisiones | 42 |
| Sin filas de revisión | 37 |
| Con audio remoto | 44 |
| Sin audio remoto | 35 |
| Partes B2 | 785 |
| Partes Vercel Blob | 254 |
| Total de partes remotas | **1.039** |

Las cantidades de partes proceden de las referencias en Neon; todavía requieren comprobación física cuando corresponda.

## 3. Los audios B2 y los audios locales

B2 ya contiene 1.311 referencias de partes en Neon que figuran como verificadas. De ellas, 785 corresponden a las sesiones de tu cuenta todavía no archivadas.

Esto es una buena señal, pero la marca de verificación en Neon no sustituye una descarga física actual con cotejo de longitud y SHA-256.

Sobre los 216 fragmentos locales de las dos sesiones autorizadas:

- He localizado el equipo correcto y la sesión Windows `CENTRAL\\fila4`.
- El perfil Chrome `Profile` autorizado existe.
- Su archivo de preferencias contiene el marcador de la cuenta indicada.
- También existen sus directorios IndexedDB de KHORA.
- Todavía no he extraído ni cotejado los 216 fragmentos; tampoco he confirmado una sesión KHORA autenticada para ejecutar el flujo canónico.

No inspeccioné el perfil alternativo.

## 4. Otros fallos, pero no son el bloqueo principal

Encontré cuatro trabajos de espejo a Notion fallidos con `espejo_no_configurado`. La variable `NOTION_DB_VOLCADOS` no está configurada en Production. También hay un trabajo de título fallido por indisponibilidad de IA.

Eso afecta los espejos y títulos automáticos; **no impide por sí mismo crear los Volcados canónicos en Neon**.

El despliegue de Production está `READY`. No hay un bloqueo de compilación o publicación que explique el problema.

## 5. Qué hay que resolver, en orden

1. **Restablecer la lectura histórica de Blob:** comprobar la cuota y disponibilidad real del almacén y habilitar la compuerta `KHORA_LEGACY_BLOB_READS_ENABLED` cuando el proveedor permita leer. No se ha modificado esa configuración.
2. **Comprobar físicamente B2:** descargar y cotejar las partes elegibles, sin confiar únicamente en sus metadatos.
3. **Procesar el perfil local autorizado:** recuperar los 216 fragmentos, cotejarlos y transferirlos a B2 conservando los originales.
4. **Archivar las 79 sesiones elegibles:** usar el flujo canónico de KHORA, con idempotencia, titularidad, SHA y lectura de vuelta. No sustituirlo por escrituras SQL directas que eviten sus controles.

**Conclusión:** la llave está en Production. El bloqueo principal es que KHORA tiene desactivada la lectura de los objetos históricos de Blob y el estado de cuota del proveedor puede impedirla incluso después de habilitarla. La parte B2 y los registros con titularidad demostrada ya permiten avanzar en paralelo.

No he modificado configuración, código, despliegues ni datos de Production durante este diagnóstico.

---

IPZ: v0.7 · edad de `main`: NO VERIFICADO  
DUG: Samantha v388 · NX-388m · frescura NO VERIFICADA  
CONV / CICLO / A / B: PENDIENTES · NO ASIGNADOS  
OCP: CUSTODIA-v0.54 · FOL1: PENDIENTE · NO ASIGNADO
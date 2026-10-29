# Salida visible del modelo · Inventario provisional de recuperabilidad

**Frente:** CUSTODIA · **Ciclo:** CUSTODIA-INV-RECUP-SES-20261028-R6K2M9Q4 · **Fecha:** 2026-10-28.

## Resultado persistido

Quedó creado y enlazado desde el objeto canónico de persistencia (OCP) el **[Inventario provisional de hallazgos de recuperabilidad](https://github.com/SeryMente/khora/blob/main/frentes/custodia/evidencias/INVENTARIO-RECUPERABILIDAD-INGRESOS.md)**, versión 0.1. El OCP se actualizó a **CUSTODIA-v0.3** y conserva su núcleo de trece bloques; la lista auxiliar provisional de tareas avanzó a la versión 0.3.

- [Objeto canónico de Custodia · CUSTODIA-v0.3](https://github.com/SeryMente/khora/blob/main/frentes/custodia/OBJETO-CANONICO.md)
- [Lista provisional de tareas · versión 0.3](https://github.com/SeryMente/khora/blob/main/frentes/custodia/LISTA-TAREAS-PROVISIONAL.md)
- [Control de responsabilidad del frente](https://github.com/SeryMente/khora/blob/main/frentes/custodia/CONTROL-RESPONSABILIDAD.json)
- [Instrucción literal del operador](https://github.com/SeryMente/khora/blob/main/frentes/custodia/originales/INSTRUCCION-INVENTARIO-RECUPERABILIDAD-INGRESOS-2026-10-28.md)
- [Salida visible previa conservada](https://github.com/SeryMente/khora/blob/main/frentes/custodia/originales/SALIDA-MODELO-CUSTODIA-ANTERIOR-RECUPERABILIDAD-INGRESOS-2026-10-28.md)

El control quedó asignado a esta sesión documental en generación 2, folio SES-20261028-R6K2M9Q4. Es un alias operativo, no un identificador nativo de la plataforma. El control y los archivos modificados se leyeron de vuelta desde main.

## Qué registra el inventario

El documento separa explícitamente hallazgos confirmados en el código, evidencia auxiliar del almacén local, hipótesis/riesgos y hechos aún no verificados. Entre los hallazgos de código destacan:

1. La interfaz muestra «Sin audio en este punto guardado» cuando el campo de partes del snapshot vale cero; no verifica el audio real en ese momento.
2. El catálogo consulta un conteo de partes de audio verificadas, pero construye el indicador visible desde el manifiesto o corte declarado en el snapshot.
3. La recuperación remota limita las partes que copia al número declarado por el manifiesto/corte; con total cero puede crear una recuperación sin las partes asociadas a la sesión original.
4. El validador de metadatos no prueba por sí mismo que el objeto remoto todavía se pueda leer y decodificar.
5. Los fragmentos locales se guardan por separado de los snapshots. El catálogo local también deriva su indicador de audio del manifiesto, por lo que puede ocultar fragmentos existentes.

El inventario también conserva la auditoría de cinco snapshots locales como evidencia auxiliar, separada del listado de la pantalla. No usa esos snapshots para fabricar registros de las unidades que ofrece la interfaz.

## Límite de evidencia

**La investigación sigue abierta.** No se obtuvo el catálogo autenticado real de Ingresos → Dictado → Recuperación, no se cotejó individualmente ninguna unidad de esa pantalla y no se completó ninguna recuperación de producción. Por tanto, el número real de unidades, la proporción afectada y la disponibilidad actual de sus objetos remotos siguen **NO VERIFICADOS**. Cero unidades cotejadas no significa que el catálogo esté vacío.

No se modificó código de producto ni se alteraron capturas, tablas o objetos de producción. La documentación no certifica todavía la recuperabilidad productiva.

## Siguiente paso

Obtener el catálogo real desde la sesión autenticada de Recuperación y formar un inventario unitario anonimizado. Para cada entrada habrá que cotejar el snapshot, las partes registradas, la integridad de cada fragmento, la disponibilidad real de los objetos y el resultado de una recuperación no destructiva. Solo después de leer de vuelta y verificar el destino podrá una unidad clasificarse como «recuperada y verificada».

## Lectura de vuelta y revisiones

- OCP de Custodia, CUSTODIA-v0.3, leído inmediatamente antes de preservar esta salida: blob `4a84f7bd4e568d894a2375f567a4753f2e332581`.
- Lista provisional de tareas, versión 0.3: blob `a7b15e9e95219be949af82544378e6ec723ed501`.
- Inventario provisional, versión 0.1: blob `b7e4f8c6770368e988f6e14d1fca018e72117aeb`.
- Control de responsabilidad, generación 2: blob `2da19e588e30fe3835696d22fe110a7570a8758f`.
- Fuente metodológica adquirida: Samantha v356 · NX-356m, Metacanon 1.22, GOW v2.6; blob `c364e179e8e9b6a3d566a8e690dfa1a7cce91798`.
- Este archivo de salida se creó en el commit `fe21b5b5a367b81f233f5201b5cd6cfcec7dbb2e`; su blob final se registrará después de la lectura de vuelta. No se usa un hash autorreferente.

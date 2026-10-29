# Salida visible del modelo preservada · ciclo previo

- **Frente:** CUSTODIA.
- **Evento de procedencia:** salida visible inmediatamente anterior a la instrucción de inventario en esta conversación.
- **Fecha disponible:** 2026-10-28.
- **Identidad nativa de conversación:** NO DISPONIBLE / NO VERIFICADA.
- **Alcance:** reproducción de las dos partes visibles de la respuesta previa, sin convertir la copia en exportación nativa exhaustiva.

## Fragmento de salida visible 1

Ya avancé la comprobación del código que alimenta **Ingresos → Dictado → Recuperación** y confirmé dos problemas de diseño:

1. **La interfaz confunde el manifiesto con la existencia del audio.** Si el punto guardado indica cero partes, puede mostrar «Sin audio» aunque existan partes independientes asociadas a la sesión.
2. **La recuperación remota usa ese mismo manifiesto como límite.** Si indica cero, el flujo puede crear una recuperación sin copiar las partes de audio que sí están registradas en el servidor.

Por tanto, el defecto ya tiene una explicación concreta en el código. Lo que aún no está demostrado es cuántas de las unidades de Recuperación lo presentan y cuáles tienen anomalías diferentes.

## Fragmento de salida visible 2

## Bloqueo actual y siguiente paso

No he podido leer el catálogo autenticado de esas unidades desde la sesión de mantenimiento. La ventana que contiene la sesión correcta de Cora pertenece a otro usuario de Windows y el sistema denegó el acceso; no voy a eludir esa protección. Por ello, **todavía no puedo afirmar cuántas de las aproximadamente 21 unidades están afectadas**.

Preparé un auditor para ejecutar desde la sesión que sí tiene acceso a Cora:

[**Descargar auditor de Recuperación para Cora (.js)**](sandbox:/mnt/data/cora-recovery-audit.js)

El script obtiene el catálogo paginado, coteja cada punto actual con las partes de audio registradas en el servidor y consulta los registros locales del usuario autenticado. Genera un informe con fechas, cantidades, índices faltantes, partes verificadas, metadatos incompletos y discrepancias entre el manifiesto y las partes reales. No imprime transcripciones, contenido de audio, cookies ni URLs de los objetos.

**Advertencia técnica:** aunque el auditor no escribe ni elimina datos de capturas, las rutas `GET` de la aplicación llaman a una rutina existente que puede ejecutar DDL aditiva e idempotente (`ALTER TABLE` / `CREATE TABLE IF NOT EXISTS`) al inicializar una instancia fría. Esa particularidad del diseño también queda señalada en el script.

Con ese resultado podré clasificar las unidades reales en lugar de extrapolar desde los cinco snapshots locales que examinamos antes. La existencia efectiva de los objetos de audio en el proveedor remoto seguirá pendiente hasta comprobar su lectura o recuperación real.

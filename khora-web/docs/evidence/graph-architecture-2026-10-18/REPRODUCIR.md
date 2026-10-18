# Reproducibilidad de los controles

Código bajo prueba: f820192d02ccc48e294e83ceb38f34df2c287036; el código funcional coincide con a0975ffaef17830471fff3adcdb804c47490ff0b.

Los scripts archivados se ejecutaron en el entorno de auditoría; para portabilidad se normalizaron sus rutas absolutas a rutas relativas. No se afirma una segunda ejecución de esos archivos portables después de publicarlos. Los resultados JSON corresponden a la ejecución local documentada. No son pruebas reales de proveedor o producción.

Directorio de trabajo: este expediente. Preparar `source/` con las rutas del repositorio de ese commit, sin modificar su contenido. Node 24 transforma TypeScript con `stripTypeScriptTypes` sin cambiar comportamiento; preparar `harness/graph-twins.mjs` desde `khora-web/lib/graph-twins.ts`. Resolver las dependencias graphology y @aflsolutions/graphology-communities-leiden de la versión fijada en el lockfile del commit. El contrato TypeScript usa solo node:crypto. Para Python fijar PYTHONPATH a source/kernel/src; sus controles usan biblioteca estándar y numpy ya instalada. metric-regressions.py extrae exactamente tres funciones puras mediante ast, sin ejecutar networkx/Leiden. No instalar ni llamar proveedores para estas pruebas.

Ejecutar new-regressions.mjs, python-regressions.py, preparar literal-envelope.json con el objeto archivado y ejecutar contract-parity.mjs; ejecutar metric-regressions.py. Los programas de auditoría terminan al registrar resultados: un exit code cero del arnés significa que pudo medir, **no que Khora pasó**. Leer `verdict` y valores observados. R03 es una observación de política, no un fallo contado.

R01–R02/R04–R08/R10–R11 son controles funcionales aislados; R09 prueba insuficiencia de contrato de metadatos; no inventar una falla productiva a partir de él. La asignación de fVAL y política en R07/R08 está explícitamente simulada para aislar el cableado. R05 simula el proponente y observa el asentamiento real de la función de orquestación. R06 usa un puerto de escritura espía, no una transacción Neo4j real.

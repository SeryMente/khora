# Endurecimiento operativo del criterio · 1.2

## Resultado y alcance

Se corrige el estándar existente, no se crea otro canon. [GRAPH-QUALITY-DRAFT.md §0](../../GRAPH-QUALITY-DRAFT.md) contiene la regla de aptitud, trece tareas y prueba de sobriedad; [GRAPH-TWINS.md](../../GRAPH-TWINS.md) conserva la continuidad. El grafo sigue **NO APTO en el corte previamente auditado**. Esta entrega no es una nueva medición de producción ni una reparación de sus 22 hallazgos.

Se añade una herramienta de auditoría offline, de solo lectura, sin dependencias externas: [graph_quality_gate.py](../../../scripts/graph_quality_gate.py). Su [perfil técnico](../../graph-quality-profile.json) está fijado por SHA-256 en el programa. Cambiar el perfil exige cambiar deliberadamente su huella y volver a probar; no aporta firma de autoridad ni protección frente a un administrador malicioso.

## Qué hace operante y qué no

El programa transforma restricciones de evidencia en rechazo ejecutable. Comprueba directamente inventario, huellas, coordenadas, referencias, cobertura declarada, conectividad, contratos de índice, revisiones de etapas y resultados estructurados. La forma de exportación es un **contrato de auditoría**, no una ontología nueva ni una migración del producto. El constructor debe adaptar la implementación real a ese contrato sin alterar su significado para obtener verde.

No ejecuta el sistema de Khora, no llama modelos, no ejecuta las cuarenta regresiones N01–N40 ni inyecta fallos distribuidos: exige sus resultados y comprueba su forma. No autentica los recibos ni verifica que un humano los haya emitido. Tampoco determina la fidelidad semántica por coincidencia de citas. Hay pruebas deliberadas que documentan esas limitaciones: un predicado inventado puede pasar el control mecánico; declaraciones de origen y recibos inventados no producen certificación del producto. La autoridad debe verificarse en los sistemas originales y el contenido debe adjudicarse independientemente.

**Faltan:** exportador ligado a los servicios, ejecución real y publicación condicionada por la compuerta, verificación de autoridad de recibos y revisión semántica/de uso. No se instaló un bloqueo en el despliegue ni se cambió la interfaz. No declarar la solución integral implementada por añadir este programa.

## Ejecución reproducible del instrumento

Desde la raíz del repositorio, con Python 3.10 o posterior disponible como `python`, este comando es completo y no toca producción:

```sh
python -m unittest discover -s khora-web/scripts/tests -p test_graph_quality_gate.py -v
```

Los datos de prueba se generan dentro de directorios temporales y se eliminan al terminar; son completamente sintéticos. [tests.txt](tests.txt) conserva la salida ejecutada. [validation.json](validation.json) registra el resultado y las huellas de los componentes. La suite no importa el núcleo de Khora ni prueba sus servicios: valida el comportamiento y los límites de este instrumento.

Para un expediente real, el programa exige `--evidence` y los seis valores esperados `--code`, `--corpus`, `--knowledge`, `--owner`, `--plane`, `--policy`, obtenidos de una autoridad independiente del propio expediente. No extraerlos ciegamente del archivo que se pretende verificar. No se entrega una invocación productiva inventada: no hay todavía expediente exportado ni esos seis valores comprobados para una revisión reparada.

### Estados y códigos de salida

| Salida | Código | Interpretación permitida |
|---|---|---|
| BLOCKED | 2 | Falta evidencia o incumple una restricción; no es prueba automática de un incidente vivo |
| SYNTHETIC_ONLY | 2 | La estructura del caso de prueba puede ser válida; jamás promueve producto |
| EVIDENCE_CHECKS_PASSED_REQUIRES_AUTHORITY_VERIFICATION | 0 | Solo las comprobaciones offline pasan; recibos, semántica y autoridad siguen requiriendo cotejo |

En todas las salidas `product_certified=false` y `production_authorized=false`. **Un código 0 no autoriza desplegar.** No existe una bandera para saltar compuertas, aceptar sintéticos como producción o autoconceder juicio humano.

## Contrato mínimo del expediente

`bundle.json` tiene `schema=khora.graph-evidence/1`, `origin` explícito, `revision` con los seis campos anteriores, `artifacts` y listas explícitas de hallazgos críticos/mayores abiertos. Cada artefacto tiene ruta relativa confinada al paquete y huella SHA-256; su contenido repite la misma revisión y origen. No se siguen rutas externas, incluidos escapes mediante enlaces simbólicos; se rechazan claves JSON duplicadas y números no finitos. Límite técnico actual por archivo: 20 MiB; un expediente mayor bloquea, no se trunca. Exportación segmentada necesita ampliación probada antes de usarla, no borrar datos para encajar.

| Artefacto | Contenido y comprobación directa |
|---|---|
| sources | Fuentes seleccionadas, versión/hash/texto autorizado y unidades de referencia con disposición; selección y representación deben reconciliarse. Declaración `authorized` no verifica por sí sola el permiso real |
| graph | Nodos tipados, relaciones con contexto y anclas UTF-16 semiabiertas exactas; referencias y cobertura de unidades mediante afirmaciones o unidades de sentido ancladas. Una idea aislada puede conservarse sin inventar un triple; una etiqueta de entidad no sustituye su contenido. Juicios curados requieren campos explícitos; sus recibos se verifican externamente |
| partition | Membresía completa no solapada del dominio Entity/Blank/Unit de este perfil, conectividad, etiquetas/resúmenes con soporte en relaciones o unidades ancladas y ámbito de fuentes. Otras proyecciones necesitan perfil explícito, no adaptación silenciosa |
| index | Dominio esperado, filas y vectores de dimensiones finitas, proveedor/modelo/métrica/normalización y recibo de construcción. El dominio esperado se coteja externamente con la política real |
| trace | Recorridos correlacionados capture/extract/resolve/materialize/community/index/retrieve/answer/present; misma revisión y recibos; estado visible fiel. Los nombres de etapa no sustituyen ejecución verificable |
| tasks | Trece casos exactos; unidades esperadas/recuperadas/prohibidas; referencia completa para el alcance; suficiencia/abstención y adjudicación. La completitud de esa referencia se adjudica fuera del validador |
| regressions | N01–N40 sin omisiones, `skip` o `xfail`; observaciones iguales al resultado esperado y referencia al oráculo. El programa valida el expediente, no ejecuta esas pruebas |
| operations | Replay no vacío por aceptación/rechazo/revocación; recuperación tras commit, concurrencia, invalidación, revocación de identidad, aislamiento y borrado/retención. Observaciones estructuradas y traza real; no basta la palabra «pass» |
| review | Constructor/revisor distintos, revisión semántica y acto del operador, todas las tareas revisadas, alcance de piloto finito y límites. Identidad y autoridad no se autentican por cadenas de texto |

Las estructuras exactas y un ejemplo **solo sintético** viven en la función `fixture()` de [las pruebas](../../../scripts/tests/test_graph_quality_gate.py), no en un archivo que pueda confundirse con evidencia productiva. Es deliberadamente insuficiente para adjudicar tareas cognitivas reales, aunque permita probar la mecánica del validador.

No exportar corpus personal o secretos al repositorio para satisfacer este contrato. El expediente real vive en una ubicación autorizada con acceso adecuado; en Git se conservan solo programas, referencias y evidencias saneadas. La herramienta no autoriza leer una fuente ni salir del ámbito de la cuenta.

## Próxima intervención de producto

1. Revisar con el operador la integración material y las decisiones de interfaz/seguridad; preparar sin pedir aprobación para cada detalle técnico decidible.
2. Cerrar auto-ratificación, identidad contextual, replay y generación compartida; conservar custodia y separación EpisTwin.
3. Preparar referencia independiente y ejecutar las tareas reales, incluida orientación por comunidades; no ajustar una cuadrícula para esconder las omisiones.
4. Implementar exportador y comprobar recibos con la autoridad original; conectar rechazo a publicación; correr pruebas reales de fallos y reconstrucción no vacía.
5. Cotejar mapa, consulta y evidencia con el operador donde corresponda. No emitir aprobación retrospectiva ni declararla heredada de «corrige el criterio».

No se fusionó ni desplegó. Se reutiliza la solicitud de cambios 318 en borrador; el código de producto, las bases y los originales no cambian.

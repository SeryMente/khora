<!-- CORPUS_SPEC_VERSION=0.2.0; CORPUS_SCHEMA_VERSION=0.1.0 -->
# Corpus autobiográfico · Arquitectura del contrato compartido

Especificación 0.2.0 · contrato de intercambio 0.1.0. Modelo lógico y módulo de referencia autorizados por el operador en C-UNIVERSO-002. No se aprueba ni se ejecuta una migración de almacenes, un rediseño de seguridad/interfaz, ingesta productiva o despliegue.

## Ubicación reconocible y autoridad única

El identificador estable es `khora.corpus-autobiografico`. Los nombres canónicos son «corpus de datos autobiográficos» y «corpus autobiográfico»; «corpus ab» es abreviación conversacional, no un tercer contrato. El registro [`current.json`](../../../contracts/corpus-autobiografico/current.json) fija versión de especificación, esquema vigente, huella y rutas. `AGENTS.md` y README conducen aquí; no se añade otra fuente de estado. El [objeto del frente](OBJETO-CANONICO.md) conserva estado y autoridad.

## Encaje arquitectónico y límites

`canal autorizado → custodia existente → adaptador del canal → unidad del corpus validada → vista autorizada para consumidor → resultado derivado`.

El corpus es un dominio lógico, no una nueva base física. Dictado, texto y Takeout son productores o fuentes de adaptadores; grafo, Línea Indexada de Narrativa Autobiográfica (LINA), Blog y autenticación son consumidores posibles, no una cadena obligatoria. El contrato no exige adoptar Neo4j/PostgreSQL de otra manera, no crea otro motor y no toca los puntos de entrada del Entorno Persistente.

El módulo compartido ejecuta solo: forma cerrada, identidad/versión exacta, rangos y coordenadas, coherencia de declaración de revisión/fuente, representación explícita de incertidumbre y retención temporal. No confirma fuente real, ancla literal, sujeto, autenticidad de actor, vigencia del permiso, tiempo real o verdad semántica. Las referencias de políticas se resuelven fuera del módulo. Un resultado válido NO es un permiso ni una ratificación autenticada.

## Mapa código → responsabilidad

| Archivo | Responsabilidad implementada |
|---|---|
| `contracts/corpus-autobiografico/current.json` | Única revisión admitida y catálogo explícito de adopción |
| `schema.v0.1.0.json` | JSON Schema 2020-12 portable; unidad mínima cerrada |
| `index.mjs` | Validador de perfil y `parseForConsumer`; sin red/almacén/secretos |
| `index.d.mts` | Tipos TypeScript derivados del esquema, no mantenidos aparte |
| `generate-types.mjs` | Renderizador determinista de declaraciones |
| `contract.test.mjs` | Regresión sintética positiva y adversaria del perfil |
| `scripts/check_autobiographical_corpus.mjs` | Integridad, versiones, descubrimiento, tipos y ejecución de pruebas |
| `khora-web/package.json` y `.github/workflows/ci.yml` | Compuerta conectada al camino de pruebas/compilación e integración continua |

El validador implementa explícitamente un subconjunto cerrado del vocabulario JSON Schema usado aquí; no es un motor JSON Schema general. Rechaza cargar esquemas con keywords/tipos no soportados. `format:date-time` se restringe en este perfil a UTC `Z`, segundos o milisegundos exactos; las fechas de hechos inciertos se conservan como descripción calificada, no se falsean como timestamps. Otros runtimes pueden usar un validador estándar, pero además deben pasar las mismas invariantes y casos: el esquema solo cubre forma, no todas las condiciones cruzadas.

## Contrato de adopción de cualquier caso de uso

1. Leer registro y declarar `contract_id` y versión exacta; no aceptar por prefijo ni «cualquier 0.x».
2. Mapear desde fuente/version/huella y modalidad existentes. No reconstruir audio inexistente ni inferir sujeto desde Windows.
3. Validar antes de aceptar la unidad; invalidación da error y no se convierte en éxito o dato omitido sin recibo.
4. Resolver autoridad, propietario, sujeto, finalidad y política vigente en la capa responsable; validar forma no concede acceso.
5. Verificar fuente/ancla y contexto semántico según riesgo y consumidor; mantener decisiones humanas auténticas aparte.
6. Registrar dependencias/revisión de resultados y retirarlos cuando cambien fuente, juicio o permiso.
Los campos específicos de un consumidor pertenecen a su artefacto derivado, enlazado por unidad/revisión; no se añaden informalmente al contrato común ni alteran su semántica privada.

7. Ejecutar pruebas propias y actualizar su estado de adopción con evidencia. Ningún caso se marca integrado solo por importar un tipo.

Importación JavaScript/TypeScript: `parseForConsumer` desde la ruta del módulo en el checkout, con pin exacto esperado. El módulo usa importaciones JSON estándar de Node 22+; su empaquetado en otros runtimes necesita prueba propia. Python/servicios externos pueden consumir el esquema portable y ejecutar las condiciones cruzadas; no hay adaptador Python integrado o acreditado en esta revisión.

## Compatibilidad y versionado

- **Especificación 0.2.0:** revisión conceptual/documental actual. No equivale a versión de Khora ni de todos sus consumidores.
- **Esquema 0.1.0:** primera forma ejecutable experimental, exacta y admitida. Versiones anteriores/futuras/desconocidas se rechazan, aunque compartan prefijo.
- Un cambio de forma o significado del intercambio publica nuevo archivo versionado; nunca se modifica un esquema publicado como si fuera el mismo. Registro, tipos, pruebas y migración, si aplica, cambian conjuntamente. Antes de 1.0, un cambio incompatible incrementa minor; desde 1.0 incrementa major. Cambios compatibles también requieren versión nueva y admisión explícita; semver no sustituye la matriz de compatibilidad.
- Migración requiere origen/destino, transformaciones y pérdidas declaradas, prueba de repetición y revisión del propietario aplicable. No se implementa retagging o conversión automática en 0.1.0.
- Para dato histórico no admitido: conservar fuente bajo su política y rechazar promoción/uso nuevo hasta adaptador explícito; no destruirlo ni reclamar conformidad vigente.

## Alcance actual de integración

El registro lista todos los consumidores previstos como `pending_integration`: Dictado, importador Takeout, grafo, LINA, Blog y autenticación. No se altera su comportamiento productivo por este cambio. La compuerta del repositorio impide divergencias internas comprobadas del paquete, pero NO puede garantizar que todo código futuro o externo importe el módulo o satisfaga su semántica. La revisión de cada consumidor debe acreditar eso antes de marcarlo conforme. No se cambia la configuración de ramas protegidas ni se afirma que el check sea requisito administrativo de merge.

## Verificación y límites

Pruebas locales reales del módulo sobre datos exclusivamente sintéticos; recibo en `evidencia/C-UNIVERSO-002-pruebas.json`. Los 32 escenarios de aceptación del sistema anterior siguen sin ejecución productiva salvo las condiciones estructurales expresamente cubiertas por regresiones de este módulo. No se ejecutó la compilación completa de Khora, sus proveedores o bases; tampoco el tipado completo de la aplicación. La ejecución remota de integración continua se confirma aparte, no se deduce de guardar el workflow.

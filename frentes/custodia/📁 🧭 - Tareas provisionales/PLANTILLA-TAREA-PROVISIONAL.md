# PLANTILLA · Tarea provisional de un frente

> **Estado:** PLANTILLA · no es tarea ejecutable ni crea autorización.
> **Regla:** la tarea hereda OCP, titularidad, alcance y exclusiones del único control de responsabilidad del frente. No crear un control, responsable, sesión o folio propios.

## 1. Identidad y posición en la secuencia

- **ID local estable:** [ID existente o nuevo ID local, nunca folio global].
- **Nombre:** [resultado concreto].
- **Estado:** propuesta_pendiente_aprobacion | pendiente | en_curso | bloqueada | completada | cancelada | supersedida.
- **Prioridad:** P0 | P1 | P2.
- **Hito / orden:** [Hito N de M].
- **Depende de:** [IDs; «ninguna» cuando aplique].
- **Desbloquea:** [IDs; «ninguna» cuando aplique].
- **OCP padre:** [ruta al objeto canónico].
- **Control heredado:** [ruta al control único]. No copiar titularidad ni autorización completa.

## 2. Motivo e instrucción de origen

- **Problema observado:** [hecho, no hipótesis].
- **Instrucción / decisión fuente:** [ruta y referencia al original literal].
- **Interpretación operativa:** [qué resultado se pide, separado del literal].

## 3. Objetivo y alcance

**Objetivo verificable:** [un resultado principal y acotado].

**Incluye**
- [resultado o componente 1]
- [resultado o componente 2]

**No incluye**
- [exclusiones y decisiones reservadas]
- [acciones que requieren otra autorización]

## 4. Entradas y precondiciones

- [fuentes, acceso, entorno, datos sintéticos/propietarios y permisos necesarios].
- [dependencias técnicas].
- **Compuerta de inicio:** [prueba que habilita el primer cambio].

## 5. Secuencia mínima de ejecución

1. [acción concreta y observable].
2. [acción concreta y observable].
3. [prueba y verificación].
4. [documentación/read-back].

Mantener la tarea pequeña. Dividirla solo cuando existan entregables, compuertas o riesgos independientes.

## 6. Criterios de aceptación

| Criterio falsable | Evidencia exigida | Resultado |
|---|---|---|
| [qué debe ser cierto] | [prueba, entorno, recibo, lectura de vuelta o hash] | PENDIENTE |

Una compilación, mock, variable presente, HTTP 200 o metadato histórico no sustituye la prueba física del efecto que se afirma.

## 7. Seguridad, reversibilidad y tratamiento de fallos

- **Datos y fuentes:** [qué se preserva; qué no se copia al repositorio].
- **Reversión / recuperación:** [cómo volver atrás o mantener la fuente intacta].
- **Degradación aceptable:** [qué se permite y cómo se comunica].
- **Bloqueos duros:** [condición que impide continuar esa acción].

## 8. Estado, evidencia y límites

- **Último evento comprobado:** [fecha / evento / commit / ejecución].
- **Entorno y versión probados:** [identificación exacta].
- **Resultado:** [OBSERVADO / EJECUTADO / VERIFICADO / ACEPTADO].
- **No comprobado:** [huecos concretos].
- **Siguiente acción:** [una sola acción inmediata].

## 9. Historial de la tarea

Añadir entradas; no sobrescribir resultados anteriores. Cada entrada separa instrucción, acción, evidencia, límite y siguiente paso.

---

### Reglas de uso de esta plantilla

1. El ID pertenece solo a la colección local de tareas; no es folio global, sesión, OCP ni permiso.
2. Prioridad y dependencia ordenan trabajo, pero no amplían la autorización heredada.
3. El estado «propuesta_pendiente_aprobacion» significa documentada, no aprobada para ejecución.
4. Solo marcar «completada» cuando todos los criterios exigidos tengan evidencia recuperable y read-back.
5. Una tarea «supersedida» conserva su historia y enlaza la decisión que la sustituyó; nunca se borra ni se reutiliza su ID.
6. La lista índice resume; este README contiene el detalle de la tarea. El OCP conserva el estado vivo del frente.

# CUSTODIA-RES-001 · Diseño de resiliencia multialmacén

> **Estado:** propuesta_pendiente_aprobacion · **Prioridad:** P1 · **Hito:** 4 de 5.
> **Depende de:** CUSTODIA-B2-007. **Desbloquea:** CUSTODIA-RES-002.
> **OCP padre:** frentes/custodia/OBJETO-CANONICO.md. **Control heredado:** CONTROL-RESPONSABILIDAD.json.

## 1. Objetivo

Diseñar una arquitectura de persistencia redundante que permita seguir capturando y guardando progreso cuando un proveedor, conexión o componente falle, y que repare las réplicas pendientes automáticamente cuando vuelva a estar disponible.

La solución debe satisfacer el dictado del operador: no depender del botón «Archivar», no perder progreso al desconectarse Internet y no detener nuevas capturas por la caída o cuota agotada de un solo proveedor.

## 2. Hipótesis de diseño a evaluar

- **Local-first:** persistir cada checkpoint/fragmento cifrado en IndexedDB antes de depender de la red, con cola durable de reintentos.
- **Enrutamiento por salud y capacidad:** un coordinador selecciona el proveedor disponible mejor posicionado; no hay llamadas recursivas entre proveedores.
- **Primera copia remota verificada:** al menos un proveedor remoto debe confirmar el objeto mediante lectura física y SHA/longitud antes de mostrar «guardado en la nube».
- **Segunda copia deseada:** replicar cada objeto a un segundo proveedor en forma asíncrona; marcarlo como redundante solo tras su read-back.
- **Reparación automática:** reintentos idempotentes, circuit breaker, cola de réplica y reconciliación cuando el proveedor vuelva.
- **Identidad e integridad:** IDs estables por sesión/parte, objetos inmutables, manifiestos, hashes y ledger de estado por proveedor.
- **Estado visible y honesto:** distinguir local-only, sincronización pendiente, una copia remota verificada, réplica completa y degradación.
- **Recuperación probada:** restaurar desde cada proveedor por separado y ejecutar auditorías periódicas de integridad.
- **Protección contra borrado/corrupción:** historia versionada/retención independiente; las réplicas no deben propagar silenciosamente eliminaciones o corrupción.

## 3. Decisiones que el diseño debe resolver

1. Escritura local, write-through al proveedor principal y write-behind a la réplica; comparar con escritura síncrona a ambos y cuantificar disponibilidad/latencia.
2. Quórum mínimo de aceptación: una copia remota verificada como mínimo de nube; segunda copia como objetivo de redundancia. Definir qué ve el usuario cuando todos los proveedores están caídos.
3. Política de proveedor primario/secundario, orden, salud, cuotas, límites, costos y circuitos abiertos.
4. Formato de manifiestos, ledger, claves deterministas, idempotencia y reconciliación de objetos huérfanos.
5. Manejo de claves de cifrado, aislamiento de cuentas/buckets y acceso mínimo.
6. Retención, versionado, protección frente a borrado accidental/ransomware y pruebas de restauración.
7. RPO/RTO medibles y lenguaje exacto de interfaz para cada estado de persistencia.

## 4. Criterios de diseño derivados del operador

| Situación | Comportamiento requerido |
|---|---|
| El usuario no pulsa «Guardar» | Checkpoints automáticos conservan el progreso |
| Se pierde Internet | La copia local durable conserva el avance y la cola sincroniza al volver |
| Vercel Blob excede cuota o falla | Se declara no disponible y se usa otro proveedor sano |
| B2 falla o sus credenciales no autorizan | Se usa otro proveedor sano; no se declara B2 confirmado |
| Un proveedor vuelve | Se repara la réplica pendiente sin duplicar objetos |
| Se cierra o recarga la página | Se recupera la copia local y se reanuda sincronización |
| Se corrompe o borra una copia | La otra copia íntegra permite restaurar; la eliminación no se propaga sin control |

## 5. Límite de honestidad del diseño

No existe garantía matemática de conservación «hasta el final de los tiempos» si se pierden simultáneamente todos los dispositivos, proveedores, credenciales o llaves. El diseño debe minimizar las ventanas de pérdida, aislar dominios de fallo, conservar versiones y demostrar restauraciones. Nunca mostrará «guardado» cuando el único estado sea local o la réplica esté pendiente.

## 6. Criterios de aceptación del diseño

- Diagrama y máquina de estados completos.
- Matriz de fallos, degradaciones, recuperación y datos que podrían quedar pendientes.
- Política de escritura, quórum y réplica con trade-offs explícitos.
- Contratos de proveedor y ledger de réplicas.
- Criterios medibles de RPO/RTO, recuperación y observabilidad.
- Pruebas de aceptación derivadas de los dictados del operador.
- Revisión de que el diseño es mínimo y no agrega componentes sin beneficio demostrado.

La tarea produce diseño y especificación. No implementa ni despliega el diseño.

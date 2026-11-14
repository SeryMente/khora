**Ciclo OMM-01-040: mantenimiento de la especificación general incorporado y cierre documental verificado.**

He completado la normalización documental y de trazabilidad de este ciclo. Los cambios están persistidos en el workspace de KHORA, no publicados.

### 1\. Entregables

**Especificación General Única**

`docs/frentes/harmonia/ESPECIFICACION-GENERAL.md`

(Persistida y verificada)

v1.0.0 · 24.391 bytes · SHA-256 `3C0BE96A...DFC44D0F`

Contiene arquitectura, componentes, contratos, datos, privacidad, pruebas, aceptación, dependencias y protocolo obligatorio de mantenimiento por ciclo.

---

**OCP actualizado**

`docs/frentes/harmonia/OBJETO-CANONICO.md`

(v0.80 · Verificado)

SHA-256 `5972A03A...23018403`

El backlog activo queda organizado en cuatro ejes rectores: OMM-01-035, 036, 037 y 038. Se conservan las tareas técnicas anteriores como descomposición subordinada, sin borrar ni renumerar sus IDs. OMM-01-040 queda incorporada bajo el eje 038.

---

**Continuidad y procedencia**

Se preservó OCP v0.79 byte a byte, se almacenaron A y B, se actualizó el índice de conversaciones/ciclos y se incorporó D-038 a `PROCEDENCIA.md`\.

(Lecturas de vuelta verificadas)

### 2\. Mantenimiento obligatorio desde ahora

OMM-01-040 establece que cada ciclo sustantivo debe\:

1. Adquirir el DUG/GOW vigente y revisar el OCP y el backlog.
2. Contrastar la especificación con el código, contratos, pruebas y estado reales.
3. Actualizar la especificación dentro del mismo ciclo cuando exista un cambio material.
4. Registrar «revisada / sin delta» cuando no exista cambio.
5. Mantener historial de versiones y revisiones.
6. Releer lo escrito y cotejar SHA-256.
7. No declarar completo el cierre documental si falta esa verificación.

El OCP conserva la autoridad sobre estado y backlog. La especificación es la definición técnica integral, no un segundo OCP.

### 3\. Validaciones y límites

(PASS) Puente SPA: 3/3 pruebas unitarias. `node --check` pasó para `content.js`, `history-bridge.js` y `service-worker.js`\.

(PASS) Índice JSON: validador recursivo local, sin errores en las restricciones comprobadas. El histórico continúa marcado como cobertura parcial.

(NO VERIFICADO) Integración Chromium headless. Chrome 157 rechazó el primer intento por soporte de múltiples targets y el segundo terminó con código 13 antes de conectar DevTools. Ambos usaron perfiles temporales aislados, ya retirados.

Persisten tres bloqueos que no deben ocultarse\:

- **Aceptación natural\:** la candidata MV3 0.4.9 no se ha validado en ChatGPT real. BMO-01 sigue NO ALCANZADO.
- **Métricas temporales\:** Metacanon §52 las desactiva. T1/T2 y `duration_ms` quedan NO CONFORMES/BLOQUEADOS. No modifiqué el DUG ni eliminé código sin una decisión expresa.
- **Retroinventario histórico\:** faltan exportaciones/ciclos que no están disponibles o segmentados. No fabriqué registros para aparentar cobertura completa.

### 4\. Estado de integridad y publicación

- Rama: `work/harmonia-front-workspace-20261110`\.
- HEAD: `9fd5c18205e39b6db12c9152b07d8f880f6b256d`\.
- `main`\: sin modificaciones.
- Sin commit, push, PR, merge ni despliegue.
- FOL1: PREPARADO / NO ACTIVO; CV/CY/A/B globales no asignados.
- MCP normativo: DESACTIVADO.

### 5\. Identificación del ciclo

| Registro | Referencia |
|--------|--------|
| IPZ | v0.7 · edad NO VERIFICADA; instalación nativa NO VERIFICADA |
| DUG | Samantha v393 · NX-393m · edad 0.0.36 |
| CONV | UUIDv7 local `01a1d0fd-681e-7243-a8ed-ca8e3dff2e71` |
| CICLO 3 | UUIDv7 local `01a1d1f1-febb-7736-88da-74e3537d2657` |
| A | D-038 · SHA-256 `466570A5...1149D7CA` |
| B | OMM-01-040 · SHA-256 `33BBC382...12CA6A6E` |

**Conclusión\:** el mantenimiento de la especificación ya está integrado en el gobierno operativo del frente y el cierre documental de este ciclo está persistido y verificado. No declaro terminado el producto completo: la aceptación natural, BMO-01 y los bloqueos normativos continúan pendientes.

Como continuidad, ¿quieres que vigile cada jueves los cambios en el DUG/GOW de `main` y te informe únicamente cuando afecten a Harmonia?

Vigilar cambios del DUG para Harmonia


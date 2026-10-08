---
id: KHORA-SPRINT-INGRESO-UNIFICADO-20261007
tipo: sprint
version: v0.1.0
estado: EN_PROGRESO
fecha: 2026-10-07
repositorio_canonico: https://github.com/SeryMente/khora
base_sha: b8ae985da85a0f5eb79fcd6aab5cdb30e8e639d5
ruta_canonica: docs/sprints/SPR-INGRESO-UNIFICADO-20261007.md
owner: KHORA
---

# Sprint KHORA · Unificación del dominio Ingreso

**Propósito:** convertir Capturar, Dictado, Edición e Ingesta en capacidades de una sola interfaz de trabajo de Ingreso, eliminando duplicación de superficie sin eliminar capacidades funcionales.

**Regla de este documento:** este archivo es el objeto canónico de planificación y recuperación del sprint. Describe la decisión y el camino de implementación; no declara capacidades como implementadas hasta que exista evidencia posterior.

## 0. Cápsula de recuperación

**Situación:** la navegación de KHORA fue endurecida y agrupó bajo Ingreso cinco destinos que todavía son aplicaciones separadas.

**Hallazgo principal:** `/sistema/ingreso` y `/sistema/dictado` contienen dos implementaciones grandes del mismo dominio de captura, transcripción y edición. `/capturar` es una implementación simple y antigua; `/sistema/ingesta` es una superficie técnica de entrada a un endpoint; `/sistema/editar` es una estación de revisión que opera sobre los mismos volcados.

**Decisión:** una sola interfaz canónica: `/sistema/ingreso`.

**Límite:** Volcados permanece como superficie independiente de inventario y revisión sincrónica.

**No se modifica inicialmente:** el contrato de backend de `/api/audio`, `/api/dictado`, `/api/ingesta`, `/api/edicion`, `/api/revision/*`, `/api/volcado` y `/api/versiones`, salvo adaptaciones estrictamente necesarias.

**Ruta de reanudación:** leer este documento completo, verificar `main`, comprobar Git y continuar desde la primera fase no cerrada.

## 1. Línea base

- Repositorio: `SeryMente/khora`
- Rama: `main`
- SHA local/remoto observado: `d70b208d42dc0283ccf1d8b5cad6618135148f30`
- Aplicación: `khora-web/`
- Registro de navegación: `khora-web/app/navigation/registry.ts`
- Documento de navegación: `khora-web/docs/system-navigation.md`

Archivos auditados:

| Superficie | Archivo | Líneas observadas |
|---|---|---:|
| Ingreso | `app/sistema/ingreso/page.tsx` | 1050 |
| Dictado | `app/sistema/dictado/page.tsx` | 1077 |
| Capturar | `app/capturar/page.tsx` | 157 |
| Ingesta | `app/sistema/ingesta/page.tsx` | 174 |
| Edición | `app/sistema/editar/page.tsx` | 642 |
| Vista compartida | `app/components/shared/IngresoView.tsx` | 346 |
| Navegación | `app/navigation/registry.ts` | 175 |

`Ingreso` y `Dictado` comparten ensamblado de párrafos, reconciliación, transcripción autoritativa, importación de audio y custodia por partes. La conclusión es funcional y arquitectónica, no una afirmación de identidad textual completa.
## 2. Modelo funcional objetivo

El objeto de producto no es Dictado, Edición o Ingesta por separado. Es una **Entrada** que atraviesa estados:

`captura → transcripción/procesamiento → revisión → aprobación → ingesta`

### 2.1 Una superficie, varios modos internos

Ruta canónica: `/sistema/ingreso`

Modos internos previstos:

- `nuevo`: crear una entrada.
- `dictado`: iniciar o reanudar voz.
- `captura`: compatibilidad con enlaces heredados.
- `archivo`: importar audio o archivo.
- `revision`: seleccionar y revisar un volcado.
- `ingesta`: mostrar y ejecutar la acción final de incorporación.

Los modos no crean dominios de nivel 1 ni páginas de producto distintas.

### 2.2 Workspace objetivo

1. **Entrada:** texto/pega, micrófono, Chrome Live Caption y archivo.
2. **Contenido:** título, transcripción y edición in-situ.
3. **Revisión:** sugerencias, original, diferencias, versiones y aprobación.
4. **Finalización:** guardar, aprobar e ingresar a memoria, según el estado del objeto.

La interfaz debe mostrar solo acciones aplicables al estado actual.

## 3. Decisiones de deprecación y fusión

| Actual | Tratamiento | Resultado |
|---|---|---|
| `/sistema/ingreso` | conservar y ampliar | **interfaz canónica** |
| `/sistema/dictado` | absorber capacidades | alias técnico |
| `/capturar` | retirar de la navegación | alias técnico |
| `/sistema/editar` | absorber estación de revisión | alias técnico |
| `/sistema/ingesta` | absorber acción final | alias técnico |
| `/sistema/volcados` | conservar | superficie independiente |
| APIs de entrada | conservar inicialmente | contrato técnico interno |

### 3.1 Aliases de compatibilidad

- `/capturar` → `/sistema/ingreso?modo=captura`
- `/sistema/dictado` → `/sistema/ingreso?modo=dictado`
- `/sistema/editar` → `/sistema/ingreso?modo=revision`
- `/sistema/ingesta` → `/sistema/ingreso?modo=ingesta`

La compatibilidad de ruta no implica que la ruta siga siendo una superficie independiente.

### 3.2 Regla de eliminación

No borrar una implementación hasta demostrar absorción funcional, pruebas equivalentes, aliases, ausencia de referencias de navegación, build/tests verdes y rollback suficiente.
## 4. Arquitectura técnica prevista

No se deben pegar los 1077 renglones de Dictado dentro de los 1050 de Ingreso. El objetivo es reemplazar cinco superficies por una composición modular, no crear un nuevo monolito.

Composición prevista:

`page.tsx → IngresoWorkspace → captura / transcripción / audio / revisión / persistencia / finalización`

### Componentes previstos

**Shell:** `app/sistema/ingreso/page.tsx`

Resolver modo, cargar estado inicial y componer el workspace.

**Workspace:** `app/components/ingreso/IngresoWorkspace.tsx`

Composición visual del flujo completo.

**Entrada:** componente para texto, micrófono, Chrome Live Caption y archivo.

**Contenido y revisión:** editor unificado, edición in-situ y panel de sugerencias.

**Finalización:** guardar, aprobar e ingresar a memoria.

**Lógica:** extraer funciones de las páginas actuales hacia hooks o módulos de cliente, evitando duplicar estado y refs.

Los nombres exactos de archivos pueden cambiar durante C1; la separación de responsabilidades es lo canónico.

## 5. Pipeline funcional objetivo

### A. Texto / pegar

`texto → entrada → revisión → guardar → aprobar → ingesta`

### B. Micrófono

`micrófono → ASR provisional → audio por partes → checkpoint → Whisper autoritativo → reconciliación → revisión → guardar`

### C. Chrome Live Caption

`Chrome → bridge → señal/transcripción → audio asociado cuando exista → reconciliación → revisión → guardar`

### D. Archivo

`archivo → custodia/transcripción → texto → revisión → guardar`

### E. Revisión de un volcado existente

`lista → seleccionar → cargar versión → editar → sugerencias → nueva versión → aprobar → ingesta`

### F. Recuperación

Toda sesión con checkpoint debe poder reanudarse dentro de Ingreso, sin saltar a `/sistema/dictado`.

**Invariante:** todos los caminos producen el mismo objeto de trabajo y convergen en revisión/finalización.
## 6. Plan de implementación por ciclos

### C0 · Preflight y congelación de contrato

- Fijar baseline SHA.
- Revisar dependencias y referencias de las cinco rutas.
- Inventariar pruebas actuales.
- Confirmar ausencia de trabajo local ajeno.
- Resultado: contrato de migración cerrado.

### C1 · Extracción del motor de Ingreso

- Identificar duplicación entre Ingreso y Dictado.
- Elegir una única implementación autoritativa del pipeline de voz.
- Extraer lógica reutilizable.
- Mantener comportamiento mediante pruebas.

### C2 · Workspace unificado

- Construir `IngresoWorkspace`.
- Integrar texto, micrófono, Chrome y archivo.
- Integrar edición in-situ.
- Jerarquizar estados de audio, transcripción y reconciliación.
- Mostrar solo acciones válidas para el estado actual.

### C3 · Revisión dentro de Ingreso

- Llevar selector de volcados a modo `revision`.
- Integrar sugerencias de `/api/revision/sugerencias`.
- Integrar aceptación/rechazo.
- Integrar historial, delta y aprobación.

### C4 · Ingesta como fase final

- Integrar `/api/ingesta` como acción del objeto.
- Sustituir abrir Ingesta por `Ingresar a memoria`.
- Mostrar resultado en la misma sesión.
- Mantener idempotencia y trazabilidad.

### C5 · Deprecación de superficies

- Retirar entradas secundarias del submenú.
- Convertir rutas secundarias en aliases.
- Actualizar manifest/shortcuts y enlaces históricos.
- Preparar eliminación física solo después de certificación.

### C6 · Certificación

- Typecheck.
- Unitarias.
- Contrato de navegación.
- E2E de flujo completo.
- E2E de aliases.
- Responsive 1440/1024/768/390.
- Build y smoke de producción.
- Comparar SHA servido con commit publicado.
## 7. Contratos que deben permanecer intactos

Salvo evidencia de necesidad, el sprint no rediseña:

- `/api/audio` y `/api/audio/[id]`
- `/api/dictado` y `/api/dictado/checkpoint`
- `/api/transcribir/sesion` y `/api/transcribir/archivo`
- `/api/dictado-archivo/titulo`
- `/api/volcado` y `/api/volcado/[id]`
- `/api/versiones`
- `/api/edicion`
- `/api/revision/sugerencias` y `/api/revision/[id]/aprobar`
- `/api/ingesta`

La regla es **unificar interfaz y orquestación antes que cambiar contratos persistentes**.

Si dos endpoints demuestran realizar la misma obligación sustancial, su fusión será un subciclo separado con migración propia.

## 8. Pruebas y jueces de aceptación

### Navegación

- Ingreso es la única interfaz visible del dominio.
- Capturar, Dictado, Edición e Ingesta no aparecen como módulos.
- Las rutas históricas resuelven el modo equivalente.
- Volcados continúa independiente.

### Funcionalidad mínima

1. escribir/pegar y guardar;
2. dictar por micrófono;
3. captura Chrome;
4. adjuntar audio;
5. transcripción autoritativa;
6. edición manual protegida;
7. sugerencias de revisión;
8. guardar nueva versión;
9. aprobar versión;
10. ejecutar ingesta;
11. recuperar checkpoint;
12. limpiar/reiniciar sin fuga de estado.

### Integridad

- El original permanece recuperable.
- La edición manual no es sobreescrita por reconciliación.
- Audio y sesión permanecen vinculados.
- Las versiones siguen siendo auditables.
- Aprobación e ingesta conservan su secuencia.

### Responsive

1440×900, 1024×768, 768×900 y 390×844; sin overflow horizontal relevante ni paneles recortados.
## 9. Criterios de cierre

- [ ] `/sistema/ingreso` es la única interfaz visible del dominio.
- [ ] Capacidades de las cuatro superficies están absorbidas.
- [ ] No existen dos motores paralelos de dictado/transcripción.
- [ ] No se crea un monolito sustituto de la duplicación.
- [ ] Endpoints persistentes siguen funcionando.
- [ ] Aliases históricos funcionan.
- [ ] Navegación canónica actualizada.
- [ ] Tests unitarios relevantes pasan.
- [ ] Typecheck pasa.
- [ ] E2E completo pasa.
- [ ] E2E responsive pasa.
- [ ] Build de producción pasa.
- [ ] Producción sirve exactamente el SHA publicado.
- [ ] Documentación refleja la arquitectura implementada.
- [ ] Este objeto queda actualizado con evidencia final.

### No son criterios de cierre

- ocultar las rutas antiguas solo con CSS;
- conservar código duplicado detrás de aliases;
- usar un build verde como sustituto de pruebas funcionales;
- declarar `READY` como prueba de comportamiento no probado.

## 10. Riesgos y controles

**Pantalla monstruo:** separación Shell / Workspace / lógica.

**Pérdida de capacidades de Dictado:** C1 certificado antes de C2.

**Enlaces rotos:** aliases explícitos y pruebas.

**Aprobación o ingesta ambiguas:** máquina de estados visible y acciones condicionadas.

**Edición durante ASR:** conservar protección segmentaria y suspensión/reanudación.

**Duplicación backend:** no fusionar APIs por comodidad.

**Pérdida de contexto:** este archivo es el objeto canónico de recuperación.

**Cierre prematuro:** ningún checkbox se marca por intención; solo por evidencia ejecutada.
## 11. Rollback

Cada ciclo debe producir commits pequeños y reversibles.

Rollback de UI:

`restore previous workspace → restore navigation → restore aliases`

Rollback de lógica:

`restore previous client modules → retain backend contracts`

No se permite borrar datos, versiones, audio ni registros persistentes como mecanismo de rollback.

## 12. Estrategia de Git

Rama recomendada: `sprint/ingreso-unificado-20261007`

Commits por ciclo:

- C0 · documentación/preflight
- C1 · consolidación del motor
- C2 · workspace
- C3 · revisión
- C4 · ingesta
- C5 · deprecación/navegación
- C6 · certificación/documentación

La integración a `main` solo después de los jueces obligatorios del repositorio.

## 13. Estado operativo

**Estado:** PUBLICACION_EN_PROGRESO
**Código productivo modificado por este sprint:** SÍ
**Documento canónico creado:** SÍ
**Baseline:** `b8ae985da85a0f5eb79fcd6aab5cdb30e8e639d5`
**Main actualmente validado:** `5dc82b536525c546542509db9694293f6da1885c`
**Producción modificada por este sprint:** EN PUBLICACIÓN
**Vercel canónico:** proyecto `khora-web` · scope `victorhugotorresmendez-8991s-projects`
**Evidencia local:** typecheck 0; 323/323 unitarias; build Next.js 0; build de extensión 0; E2E enfocado 27/29 antes de la corrección final del wrapper global y posteriores correcciones de UI.
**Criterio de cierre:** la publicación solo se considera terminada cuando Vercel acredita el SHA exacto de main y el smoke de producción finaliza correctamente.
**Siguiente ciclo autorizado:** verificación de deployment y smoke de producción

### Evidencia C0 · 2026-10-07

- Rama de trabajo: `sprint/ingreso-unificado-20261007` creada desde `b8ae985da85a0f5eb79fcd6aab5cdb30e8e639d5`.
- Árbol inicial limpio.
- `git show --stat HEAD` confirma que `b8ae985` solo contiene el objeto canónico del sprint.
- `npm run typecheck`: exit code 1, sin mensajes de diagnóstico visibles.
- `npm run test:unit`: exit code 1, sin mensajes de diagnóstico visibles.
- Se confirmó que `package.json` usa Node/tsx instalados localmente y que existen pruebas unitarias; la causa de los dos códigos 1 queda clasificada como **incidencia preexistente de runner/entorno hasta reproducir diagnóstico** y no se atribuye al sprint.
- Se preserva el criterio: ningún fallo silencioso se declara resuelto por el sprint sin causa y evidencia.

## 14. Recuperación en nueva conversación

1. Recuperar este archivo desde `docs/sprints/`.
2. Verificar https://github.com/SeryMente/khora.
3. Verificar `main` y comparar SHA local/remoto.
4. Leer §0, §6, §9 y §13 antes de actuar.
5. Revisar Git antes de modificar.
6. Determinar la primera fase C0–C6 no cerrada.
7. Ejecutar esa fase y actualizar este mismo objeto con evidencia.
8. No reconstruir el objetivo desde memoria si este documento está disponible.

## 15. Decisión arquitectónica resumida

> **Una sola interfaz de Ingreso; múltiples modos internos; un solo objeto de trabajo; un solo pipeline autoritativo; APIs existentes como contratos técnicos; rutas antiguas como compatibilidad temporal; Volcados permanece independiente.**

Esta decisión gobierna el sprint salvo evidencia material en contrario. Toda desviación debe registrarse explícitamente.

## 16. Referencias canónicas

- Repositorio: https://github.com/SeryMente/khora
- Registro: `khora-web/app/navigation/registry.ts`
- Navegación: `khora-web/docs/system-navigation.md`
- Endurecimiento: `khora-web/docs/navigation-hardening-2026-10-07.md`
- Ingreso: `khora-web/app/sistema/ingreso/page.tsx`
- Dictado: `khora-web/app/sistema/dictado/page.tsx`
- Edición: `khora-web/app/sistema/editar/page.tsx`
- Ingesta: `khora-web/app/sistema/ingesta/page.tsx`
- Captura histórica: `khora-web/app/capturar/page.tsx`


### Evidencia de publicación · 2026-10-08

- Main contiene la superficie canónica única de Ingreso y sus modos internos.
- Rutas históricas de Capturar, Dictado, Edición e Ingesta permanecen como compatibilidad temporal.
- KhoraShell ya no anida un `<main>` de página dentro de otro `<main>`, eliminando la causa común del hydration mismatch observado.
- Revisión e Ingesta tienen contención responsive; Ingesta valida MIME en aplicación sin filtro nativo que impida la prueba de tipos inválidos.
- La certificación E2E fue ejecutada hasta 27/29 antes de la corrección final del wrapper; no se declara verde hasta completar el siguiente ciclo.

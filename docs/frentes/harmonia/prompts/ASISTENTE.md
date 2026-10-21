# Instanciación · asistente de Harmonia · traspaso fresco v0.9

## Entrada obligatoria

1. Adquiere desde `SeryMente/metodologia/main` las fuentes vigentes: [INICIO.md](https://github.com/SeryMente/metodologia/blob/main/INICIO.md), [Metaprompt Canónico de Samantha](https://github.com/SeryMente/metodologia/blob/main/gobernanza/METAPROMPT-CANONICO-SAMANTHA.md), [Metacanon](https://github.com/SeryMente/metodologia/blob/main/METACANON-OBJETOS-CANONICOS.md), [GOW](https://github.com/SeryMente/metodologia/blob/main/gobernanza/GLOSARIO-WORKSPACE.md) y gobierno RDC aplicable. No asumir vigencia a partir de esta copia: vuelve a comprobar versiones, sellos, blobs y frescura en `main`.
2. Lee por completo `docs/frentes/harmonia/OBJETO-CANONICO.md`, este prompt, `README.md` y `CONTROL-RESPONSABILIDAD.json`. El OCP §17 contiene el estado de traspaso, la secuencia de continuación y la última salida visible del asistente anterior, persistida literalmente.
3. Aplica el formato obligatorio de ciclo de Metacanon §4 y registra el folio de sesión exigido por las reglas vigentes tras comprobar colisiones en los controles y repositorios accesibles. Declara el alcance de esa comprobación; no inventes que es universal.
4. Al comenzar, cita literalmente el contenido que el OCP conserva como última salida visible del asistente anterior y declara las lagunas de evidencia, sin reconstruir lo que no está persistido.

## Compuerta de responsabilidad

El control vigente leído al preparar este traspaso dice: propietario `400a4187-8241-8023-b3dd-00a96d379015`, instancia `samanthal-harmonia-notion-400a4187`, generación 1. Preparar este OCP **no transfiere titularidad**. Si la instancia fresca no coincide con el control o no puede demostrar su identidad nativa, formula una sola pregunta concreta al operador para obtener autorización explícita para asumir el frente y reemplazar la titularidad. Con respuesta afirmativa, usa compare-and-swap por blob/SHA y generación, incrementa generación, escribe atómicamente y lee de vuelta. Si hubo cambio concurrente, relee y reconcilia; nunca sobrescribas a ciegas. No inventes un ID nativo de conversación.

## Estado de ingeniería

El código fuente se encuentra en `apps/harmonia-observability/` de `SeryMente/khora/main`, en evolución v0.3.0. El OCP §8–§9 enumera las huellas de referencia, discrepancias y criterios de aceptación. Código publicado no significa integración probada, paquete local actualizado o extensión instalada. La aceptación E2E sigue ABIERTA.

Siguiente orden: (a) resolver responsabilidad y adquirir gobierno; (b) corregir y probar en GitHub la integración entre `content.js`, `service-worker.js`, `collector/server.js`, `popup.js`, `popup.html` y el catálogo; (c) añadir/verificar `extension/build-info.json` y sincronización real; (d) ejecutar pruebas automatizadas de contrato, idempotencia, concurrencia, almacenamiento y recuperación; (e) medir CPU/RAM y comparar la calidad de cobertura; (f) reconciliar la identidad RDC antes de usar cualquier equipo remoto; (g) solo después ejecutar, con autorización aplicable, prueba controlada de varias pestañas en Chrome. Actualiza el OCP a cada hito con evidencia y lectura de vuelta.

## Seguridad del entorno

El operador Windows es `CENTRAL\\fila4`. Nunca uses, leas como raíz operativa ni escribas, copies, muevas o borres dentro de `C:\\Users\\MantenimientoRCI\\`. Si se autoriza una operación de escritorio tras resolver gobierno y la identidad RDC, verifica la cadena `Win32_UserAccount → SID → Win32_UserProfile.LocalPath`; el perfil declarado del operador es `C:\\Users\\fila4`, Escritorio `C:\\Users\\fila4\\Desktop`. No uses rutas derivadas del perfil del proceso.

**No declarado:** captura real de ChatGPT, concurrencia multi-pestaña, ausencia de colisiones, consumo reducido, actualización automática del código y sincronización efectiva. Cada afirmación exige su prueba correspondiente.

Este prompt prepara la continuidad; no inicia por sí mismo una sesión RDC, no autoriza acceso de equipo, no carga Chrome y no transfiere control.

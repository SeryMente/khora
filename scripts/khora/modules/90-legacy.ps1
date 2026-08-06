# ================================================================
#  KHORA - Script de sesion agnostico
#  VERSIONADO: $SCRIPT_VERSION es la unica fuente de verdad;
#    el archivo se nombra khora-v<version>.ps1 y cada version
# REGLA PERMANENTE (v7): El único punto de entrada es khora.ps1 (gate). PROHIBIDO crear scripts de entrada paralelos o copias khora-v*.ps1. Un componente = un archivo en modules/; el orden de carga lo define khora.barrel.ps1. Toda modificación sube $SCRIPT_VERSION en el mismo commit.
#    ejecutada se auto-archiva en .\versions\
#  ESTRUCTURA (raiz = carpeta del script, p.ej. persistente en Escritorio):
#    .\logs\ (logging diario) | .\versions\ (historico) | config.json
#  - Portable: cero rutas/usuarios/PC hardcodeados
#  - Seguridad: token en SecureString, sin token en disco
#  - Guardian: dead-man switch por inactividad + deadline + panico
#  - Auto-WIP: respaldo continuo del trabajo al remoto
#  - Limpieza NUCLEAR verificada + auto-diagnostico
#  - Cifrado en reposo (EFS): repo y secrets ilegibles en el disco publico (v6.4.2)
#  - Monitor de exfiltracion/RAT: guardian vigila control remoto y subida de red (v6.4.3)
#  - Elevacion con cuenta distinta: rutas siempre en el perfil del usuario real (v6.4.4)
#  - Endurecimiento: finales de linea unificados a CRLF; mutex de limpieza
#    a prueba de abandono; variable $args renombrada en Start-Guardian (v6.4.8)
#  - EFS fail-fast (sonda 1 archivo); ventana de log con auto-reconexion (v6.4.9)
#  - Autenticacion gh CLI; higiene auto-wip logs; push WIP menu; diag bundle (v6.5.0)
#  - Snapshot tabs de Chrome por CDP (auto-wip/restore); deteccion LastPass (v6.6.0)
#  - Verificacion estricta en limpieza; last-cleanup.json; cipher verificable (v6.6.1)
#  - Boveda centralizada de entorno con sincronizacion automatica Vercel/Render (v6.8.0)
#  - v7.0.0: arquitectura gate+barril+modulos; monolito preservado como 90-legacy.ps1 (F0)
# ================================================================
# --- Encoding agnostico (acentos/codepage) ---
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}
$HOST_WIDTH = try { [Math]::Max(60, $Host.UI.RawUI.WindowSize.Width - 2) } catch { 78 }
# ================================================================
#  RUTAS AGNOSTICAS  (nada fijo a una PC)
# ================================================================
# ================================================================
#  LOGGING (texto legible + jsonl estructurado + repo)
# ================================================================
# ================================================================
#  HELPERS AGNOSTICOS
# ================================================================
# Drena teclas/lineas fantasma que quedaron en el buffer de la consola (residuo
# de pegados grandes o inyeccion de teclado en PCs publicas). Evita que un ENTER
# o caracter viejo se coma un prompt o dispare acciones solas.
#  Test de extensión
# Resolver ejecutable en cascada: registro -> PATH -> rutas conocidas
# ================================================================
#  CABECERA DE ARRANQUE  (se escribe ANTES de abrir la ventana log)
# ================================================================
# ================================================================
#  VENTANA DE LOG EN VIVO (muestra TODO desde la primera linea)
# ================================================================
# ================================================================
#  PREFLIGHT (tablero de compatibilidad, agnostico)
# ================================================================
# ================================================================
#  ASEGURAR GIT (auto-instala si falta -> agnostico)
# ================================================================
# ================================================================
#  AUTENTICACION GH CLI (agnostico)
# ================================================================
# ================================================================
#  ASEGURAR VS CODE (instalado, no portable; verifica SHA256)
# ================================================================
# ================================================================
#  PERSISTENCIA DE CONFIG DE VS CODE (via repo, agnostico de maquina)
#    repo\tools\vscode\extensions.txt     -> un ID de extension por linea
#    repo\tools\vscode\settings.user.json -> settings.json de usuario
# ================================================================
# Exporta la config local de VS Code al repo (viaja con el push final verificado)
# ================================================================
#  GUARDIAN: lanzar proceso vigilante (inactividad + panico)
# ================================================================
# ================================================================
#  DEADLINE: tarea programada que sobrevive todo
# ================================================================


# ================================================================
#  AUTO-WIP: respaldo continuo al remoto (rama wip/auto-*)
# ================================================================
# Ejecuta git en el repo con token efimero, capturando salida y exit code REALES
# Push VERIFICADO (anti-simulacion): reintentos con backoff + cotejo SHA local vs remoto
# Hay trabajo local NO respaldado? Solo lectura local: funciona incluso sin token
# ================================================================
#  ANIMACION TDAH-FRIENDLY (sin pantallas congeladas)
# ================================================================
# ================================================================
#  CIFRADO EN REPOSO (EFS) - v6.4.2
#  El workdir se cifra ANTES del clone: todo lo que nace dentro
#  (repo, .env, secrets, flags) HEREDA el cifrado y es ilegible
#  desde otras cuentas de Windows o por extraccion fisica del disco.
#  Limite honesto: en la MISMA cuenta el contenido se lee transparente
#  (asi trabajan git/VS Code/node sin friccion); por eso la limpieza
#  nuclear [X] sigue siendo la capa final. Windows Home NO trae EFS:
#  en ese caso se avisa y protegen limpieza + DeepFreeze.
# ================================================================
# ================================================================
#  INSTALACION PROACTIVA EN SEGUNDO PLANO (Background Jobs)
# ================================================================

# ================================================================
#  ENTORNO DE DESARROLLO (Python + Node + Docker + Vercel)
# ================================================================










# ================================================================
#  INICIO DE SESION
# ================================================================
# ================================================================
#  LIMPIEZA NUCLEAR (agnostica: todos los perfiles/usuarios)
# ================================================================
# ================================================================
#  ESCANEO DE KEYLOGGERS
# ================================================================
# ================================================================
#  MONITOR DE EXFILTRACION / ACCESO REMOTO (RAT) - v6.4.3
#  Heuristico y read-only. Detecta software de control remoto activo,
#  sesiones RDP entrantes, conexiones externas de esos procesos y picos
#  de subida sostenida (posible robo de datos). El guardian lo corre en
#  segundo plano; los hallazgos se loguean y se marcan con un flag que el
#  menu muestra en rojo. Limite honesto: un RAT en la imagen congelada del
#  cyber puede ocultarse; esto atrapa lo comun, no a un atacante avanzado.
# ================================================================
# ================================================================
#  ESTADO
# ================================================================
# ================================================================
#  GUARDIAN LOOP (proceso separado)
# ================================================================
# ================================================================
#  BANNER + LOOP PRINCIPAL
# ================================================================


# ================================================================

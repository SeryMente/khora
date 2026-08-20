# KHORA EP Medio v1.0 - configuración de sesión
$script:SCRIPT_VERSION = '7.3.0'
$script:EP_VERSION = '1.0.0'
$script:SES_ACTIVE = $false
$script:TokSecure = $null
$script:KhoraTokenSecure = $null
$script:WIP_BRANCH = $null
$script:VSCODE_PID = 0
$script:GUARD_PID = 0
$script:CURRENT_STAGE_ID = $null
$script:SESSION_MANIFEST_PATH = if ($script:SESSION_MANIFEST_ARG) { $script:SESSION_MANIFEST_ARG } elseif ($env:KHORA_SESSION_MANIFEST) { $env:KHORA_SESSION_MANIFEST } else { $null }
if (-not $script:SESSION_MANIFEST_PATH -or -not (Test-Path $script:SESSION_MANIFEST_PATH)) { throw 'Falta session-manifest.json.' }
$script:SESSION = Get-Content -LiteralPath $script:SESSION_MANIFEST_PATH -Raw | ConvertFrom-Json
if ($script:SESSION.schema -ne 'khora-ep-session/v1') { throw 'Manifiesto incompatible.' }
$ROOT_DIR = [string]$script:SESSION.outerDir
$WORK_DIR = [string]$script:SESSION.workDir
$REPO_DIR = [string]$script:SESSION.repoDir
$STATE_DIR = [string]$script:SESSION.stateDir
$LOG_FILE = [string]$script:SESSION.logFile
$JSON_LOG = [string]$script:SESSION.jsonLog
$VHD_PATH = [string]$script:SESSION.vhdPath
$MOUNT_POINT = [string]$script:SESSION.mountPoint
$SESSION_ID = [string]$script:SESSION.sessionId
$TASK_NAME = [string]$script:SESSION.cleanupTask
$KHORA_API_BASE = [string]$script:SESSION.khoraApiBase
$env:TEMP = Join-Path $WORK_DIR 'tmp'
$env:TMP = $env:TEMP
$env:GH_CONFIG_DIR = Join-Path $STATE_DIR 'gh'
$env:GIT_CONFIG_GLOBAL = Join-Path $STATE_DIR 'gitconfig'
$env:NPM_CONFIG_CACHE = Join-Path $WORK_DIR 'cache\npm'
$env:PIP_CACHE_DIR = Join-Path $WORK_DIR 'cache\pip'
$env:XDG_CONFIG_HOME = Join-Path $STATE_DIR 'xdg-config'
$env:XDG_DATA_HOME = Join-Path $STATE_DIR 'xdg-data'
foreach ($path in @($env:TEMP,$env:GH_CONFIG_DIR,(Split-Path -Parent $env:GIT_CONFIG_GLOBAL),$env:NPM_CONFIG_CACHE,$env:PIP_CACHE_DIR,$env:XDG_CONFIG_HOME,$env:XDG_DATA_HOME)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
$CFG = [ordered]@{repoOrg='SeryMente';repoName='khora';branch='main';gitName='Victor Hugo Torres';gitEmail='280919.29061988@proton.me';inactivityMinutes=15;autoWipMinutes=5;vercelScope='victorhugotorresmendez-8991s-projects';vercelProject='khora-web'}

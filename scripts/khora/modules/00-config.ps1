# KHORA EP Medio v1.0 - configuración de sesión
$script:SCRIPT_VERSION = '7.5.5'
$script:EP_VERSION = '1.0.3'
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
$script:EXECUTION_IDENTITY = [Security.Principal.WindowsIdentity]::GetCurrent().Name
$script:DATA_PROFILE_MODE = if ($script:SESSION.dataProfileMode) { [string]$script:SESSION.dataProfileMode } else { 'execution-profile' }
$script:DATA_PROFILE_NAME = if ($script:SESSION.dataProfileName) { [string]$script:SESSION.dataProfileName } else { [Environment]::UserName }
$script:DATA_PROFILE_ROOT = if ($script:SESSION.dataProfileRoot) { [IO.Path]::GetFullPath([string]$script:SESSION.dataProfileRoot).TrimEnd('\') } else { [IO.Path]::GetFullPath([string]$env:USERPROFILE).TrimEnd('\') }
$script:KHORA_HOST_TEMP = if ($script:SESSION.hostTemp) { [IO.Path]::GetFullPath([string]$script:SESSION.hostTemp) } else { [IO.Path]::GetFullPath([IO.Path]::GetTempPath()) }
if ($script:SESSION.executionIdentity -and [string]::Compare([string]$script:SESSION.executionIdentity,$script:EXECUTION_IDENTITY,[StringComparison]::OrdinalIgnoreCase) -ne 0) { throw 'KHORA_EXECUTION_IDENTITY_MISMATCH' }
if ($script:DATA_PROFILE_MODE -eq 'fila4-profile-tree') {
    if ($script:EXECUTION_IDENTITY -notmatch '(?i)(^|\\)mantenimientorci$') { throw 'KHORA_CECEQ_REQUIRES_MANTENIMIENTORCI_EXECUTION_TOKEN' }
    $profilePrefix = $script:DATA_PROFILE_ROOT.TrimEnd('\') + '\'
    $expectedHostTemp = [IO.Path]::GetFullPath((Join-Path $script:DATA_PROFILE_ROOT 'AppData\Local\Temp'))
    if ([string]::Compare($script:KHORA_HOST_TEMP,$expectedHostTemp,[StringComparison]::OrdinalIgnoreCase) -ne 0) { throw 'KHORA_HOST_TEMP_OUTSIDE_FILA4_PROFILE' }
    foreach ($path in @($script:DATA_PROFILE_ROOT,$script:KHORA_HOST_TEMP)) {
        if ($path -ne $script:DATA_PROFILE_ROOT -and -not $path.StartsWith($profilePrefix,[StringComparison]::OrdinalIgnoreCase)) { throw 'KHORA_PATH_OUTSIDE_FILA4_PROFILE' }
        if (Test-Path -LiteralPath $path) {
            $item = Get-Item -LiteralPath $path -Force -ErrorAction Stop
            if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'KHORA_FILA4_REPARSE_POINT_REFUSED' }
        } elseif ($path -eq $script:KHORA_HOST_TEMP) {
            New-Item -ItemType Directory -Path $path -Force -ErrorAction Stop | Out-Null
        }
    }
}
$script:LAUNCH_MODE = 'normal'
$script:HOST_TOOL_POLICY = 'allow-verified-host'
$ROOT_DIR = [string]$script:SESSION.outerDir
$WORK_DIR = [string]$script:SESSION.workDir
$REPO_DIR = [string]$script:SESSION.repoDir
$WORKSPACE_DIR = if ($script:SESSION.workspaceDir) { [string]$script:SESSION.workspaceDir } else { Join-Path $WORK_DIR 'EP' }
$DESKTOP_EP_LINK = if ($script:SESSION.desktopWorkspaceLink) { [string]$script:SESSION.desktopWorkspaceLink } else { Join-Path ([string][Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)) 'EP' }
$STATE_DIR = [string]$script:SESSION.stateDir
$LOG_FILE = [string]$script:SESSION.logFile
$JSON_LOG = [string]$script:SESSION.jsonLog
$VHD_PATH = [string]$script:SESSION.vhdPath
$MOUNT_POINT = [string]$script:SESSION.mountPoint
$SESSION_ID = [string]$script:SESSION.sessionId
$TASK_NAME = [string]$script:SESSION.cleanupTask
$KHORA_API_BASE = [string]$script:SESSION.khoraApiBase
$script:HOST_PROFILE_PATH = if ($script:SESSION.hostProfilePath) { [string]$script:SESSION.hostProfilePath } else { Join-Path $STATE_DIR 'host-profile.v1.json' }
$script:HOST_PROFILE = $null
if (Test-Path -LiteralPath $script:HOST_PROFILE_PATH -PathType Leaf) {
    $script:HOST_PROFILE = Get-Content -LiteralPath $script:HOST_PROFILE_PATH -Raw | ConvertFrom-Json
    if ($script:HOST_PROFILE.schema -ne 'oep-host-profile/v1') { throw 'Perfil de host incompatible.' }
}
$TOOLS_DIR = Join-Path $WORK_DIR 'tools'
$env:KHORA_EP_LAUNCH_MODE = $script:LAUNCH_MODE
$env:TEMP = Join-Path $WORK_DIR 'tmp'
$env:TMP = $env:TEMP
$env:GH_CONFIG_DIR = Join-Path $STATE_DIR 'gh'
$env:GIT_CONFIG_GLOBAL = Join-Path $STATE_DIR 'gitconfig'
$env:NPM_CONFIG_CACHE = Join-Path $WORK_DIR 'cache\npm'
$env:PIP_CACHE_DIR = Join-Path $WORK_DIR 'cache\pip'
$env:XDG_CONFIG_HOME = Join-Path $STATE_DIR 'xdg-config'
$env:XDG_DATA_HOME = Join-Path $STATE_DIR 'xdg-data'
foreach ($path in @($TOOLS_DIR,$env:TEMP,$env:GH_CONFIG_DIR,(Split-Path -Parent $env:GIT_CONFIG_GLOBAL),$env:NPM_CONFIG_CACHE,$env:PIP_CACHE_DIR,$env:XDG_CONFIG_HOME,$env:XDG_DATA_HOME)) { New-Item -ItemType Directory -Path $path -Force | Out-Null }
$CFG = [ordered]@{repoOrg='SeryMente';repoName='khora';branch='main';gitName='Victor Hugo Torres';gitEmail='280919.29061988@proton.me';inactivityMinutes=15;autoWipMinutes=5;vercelScope='victorhugotorresmendez-8991s-projects';vercelProject='khora-web';vercelCanonicalUrl='https://khora-web.vercel.app'}

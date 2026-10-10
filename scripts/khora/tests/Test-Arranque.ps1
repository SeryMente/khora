#requires -Version 5.1
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$errors=New-Object 'System.Collections.Generic.List[string]'
function Assert-Khora{param([bool]$Condition,[string]$Message)if(-not$Condition){$errors.Add($Message)}}
$gate=Get-Content(Join-Path $root 'scripts\khora\khora.ps1')-Raw
$barrel=Get-Content(Join-Path $root 'scripts\khora\khora.barrel.ps1')-Raw
$all=(Get-ChildItem -LiteralPath (Join-Path $root 'scripts\khora') -Filter '*.ps1' -Recurse|Where-Object{$_.FullName -notmatch '\\tests\\'}|ForEach-Object{Get-Content -LiteralPath $_.FullName -Raw})-join"`n"
Assert-Khora($gate-match"EP_VERSION\s*=\s*'1\.0\.3'")'Version EP incorrecta.'
Assert-Khora($gate-match"SCRIPT_VERSION\s*=\s*'7\.5\.5'")'Version host incorrecta.'
$launcher=Get-Content (Join-Path $root 'khora-web\app\api\ep\token\route.ts') -Raw
$config=Get-Content (Join-Path $root 'scripts\khora\modules\00-config.ps1') -Raw
$efs=Get-Content (Join-Path $root 'scripts\khora\modules\05-efs.ps1') -Raw
$deps=Get-Content (Join-Path $root 'scripts\khora\modules\08-deps.ps1') -Raw
$cleanup=Get-Content (Join-Path $root 'scripts\khora\modules\11-cleanup.ps1') -Raw
Assert-Khora($gate-match'Initialize-KhoraDataProfileContext')'Falta resolver de destino de datos CECEQ.'
Assert-Khora($gate-match'KHORA_EXECUTION_IDENTITY_MISMATCH')'No se verifica la identidad efectiva.'
Assert-Khora($gate-match'dataProfileMode=\[string\]\$script:KHORA_DATA_PROFILE_MODE')'El manifiesto no separa identidad efectiva y perfil de datos.'
Assert-Khora($launcher-match'KHORA_FILA4_PROFILE_NOT_UNIQUE')'El launcher no resuelve Fila4.'
Assert-Khora($launcher.IndexOf('KHORA_FILA4_PROFILE_NOT_UNIQUE')-lt$launcher.IndexOf('Get-Clipboard'))'El launcher debe resolver el destino antes del token.'
Assert-Khora($launcher-match'\$p=Join-Path \$targetTemp')'El bootstrap temporal debe residir en el destino seleccionado.'
Assert-Khora($launcher-match'\$tf=Join-Path \$targetTemp')'El archivo DPAPI debe residir en el destino seleccionado.'
Assert-Khora($launcher-match'-KhoraExpectedExecutionIdentity \$execIdentity')'La identidad efectiva no se propaga al gate.'
Assert-Khora($launcher-match'\$oldProfileEnvironment=\[ordered\]')'Falta preservar el entorno del shell llamador.'
Assert-Khora($launcher-match'\[Environment\]::SetEnvironmentVariable')'El entorno del shell llamador no se restaura.'
Assert-Khora($config-match'KHORA_HOST_TEMP_OUTSIDE_FILA4_PROFILE')'No se valida el temporal host de Fila4.'
Assert-Khora($efs-match'KHORA_DISMOUNT_TEMP_OUTSIDE_FILA4_PROFILE')'El temporal de desmontaje no se limita a Fila4.'
Assert-Khora($deps-match'InstallAllUsers=1')'Python debe instalarse sin registro por usuario.'
Assert-Khora($deps-notmatch'InstallAllUsers=0')'Python no debe instalarse en el perfil MantenimientoRCI.'
Assert-Khora($cleanup-match'Remove-KhoraPythonMachineRegistration')'Falta limpiar el registro temporal de Python.'
Assert-Khora($all-notmatch'git\s+add\s+-A')'git add -A prohibido.'
$forbiddenReturnToken='return'+'@';Assert-Khora -Condition ($all -notmatch [regex]::Escape($forbiddenReturnToken)) -Message 'Token return seguido de @ invalido.'
$returnKeyword='return';Assert-Khora -Condition ($all -notmatch ('(?i)\b'+$returnKeyword+'(?=\S)')) -Message 'return debe separarse de su operando.'
Assert-Khora($all-match'vercel\s+deploy\s+--prod')'Falta publicacion automatica del main exacto.'
Assert-Khora($all-match'ep-main-live\.json')'Falta prueba de procedencia live main.'
Assert-Khora($all-notmatch'cipher\.exe|Encrypting File System')'Fallback EFS prohibido.'
Assert-Khora($all-match'Enable-BitLocker')'Falta BitLocker.'
$p70=$all.IndexOf('EP-IN-070');$p80=$all.IndexOf('EP-IN-080');$p90=$all.IndexOf('EP-IN-090');Assert-Khora -Condition ($p70 -ge 0 -and $p70 -lt $p80 -and $p80 -lt $p90) -Message 'Orden GitHub/Vercel/Visual Studio Code ausente.'
Assert-Khora -Condition (Test-Path -LiteralPath (Join-Path $root 'ep-medio-architectura.md')) -Message 'Falta arquitectura canonica.'
if($errors.Count){$errors|ForEach-Object{Write-Error $_};exit 1};Write-Host 'Validacion estatica EP v1.0.3: OK' -ForegroundColor Green

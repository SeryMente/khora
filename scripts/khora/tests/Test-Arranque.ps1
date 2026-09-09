#requires -Version 5.1
$ErrorActionPreference='Stop'
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$errors=New-Object 'System.Collections.Generic.List[string]'
function Assert-Khora{param([bool]$Condition,[string]$Message)if(-not$Condition){$errors.Add($Message)}}
$gate=Get-Content(Join-Path $root 'scripts\khora\khora.ps1')-Raw
$barrel=Get-Content(Join-Path $root 'scripts\khora\khora.barrel.ps1')-Raw
$all=(Get-ChildItem -LiteralPath (Join-Path $root 'scripts\khora') -Filter '*.ps1' -Recurse|Where-Object{$_.FullName -notmatch '\\tests\\'}|ForEach-Object{Get-Content -LiteralPath $_.FullName -Raw})-join"`n"
Assert-Khora($gate-match"EP_VERSION\s*=\s*'1\.0\.0'")'Version EP incorrecta.'
Assert-Khora($gate-match"SCRIPT_VERSION\s*=\s*'7\.5\.0'")'Version host incorrecta.'
Assert-Khora($all-notmatch'git\s+add\s+-A')'git add -A prohibido.'
$forbiddenReturnToken='return'+'@';Assert-Khora -Condition ($all -notmatch [regex]::Escape($forbiddenReturnToken)) -Message 'Token return seguido de @ invalido.'
$returnKeyword='return';Assert-Khora -Condition ($all -notmatch ('(?i)\b'+$returnKeyword+'(?=\S)')) -Message 'return debe separarse de su operando.'
Assert-Khora($all-match'vercel\s+deploy\s+--prod')'Falta publicacion automatica del main exacto.'
Assert-Khora($all-match'ep-main-live\.json')'Falta prueba de procedencia live main.'
Assert-Khora($all-notmatch'cipher\.exe|Encrypting File System')'Fallback EFS prohibido.'
Assert-Khora($all-match'Enable-BitLocker')'Falta BitLocker.'
Assert-Khora($gate-match"ValidateSet\('normal','clean-host'\)")'Falta modo clean-host en el gate.'
Assert-Khora($all-match'FORCE_PORTABLE_TOOLS')'Falta politica de herramientas portatiles.'
Assert-Khora($all-match'force-portable')'Falta trazabilidad del modo de prueba.'
$p70=$all.IndexOf('EP-IN-070');$p80=$all.IndexOf('EP-IN-080');$p90=$all.IndexOf('EP-IN-090');Assert-Khora -Condition ($p70 -ge 0 -and $p70 -lt $p80 -and $p80 -lt $p90) -Message 'Orden GitHub/Vercel/Visual Studio Code ausente.'
Assert-Khora -Condition (Test-Path -LiteralPath (Join-Path $root 'ep-medio-architectura.md')) -Message 'Falta arquitectura canonica.'
if($errors.Count){$errors|ForEach-Object{Write-Error $_};exit 1};Write-Host 'Validacion estatica EP v1.0: OK' -ForegroundColor Green

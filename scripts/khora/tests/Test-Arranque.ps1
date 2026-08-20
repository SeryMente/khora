#requires -Version 5.1
$root=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..\..'))
$errors=New-Object 'System.Collections.Generic.List[string]'
function Assert-Khora{param([bool]$Condition,[string]$Message)if(-not$Condition){$errors.Add($Message)}}
$gate=Get-Content(Join-Path $root 'scripts\khora\khora.ps1')-Raw
$barrel=Get-Content(Join-Path $root 'scripts\khora\khora.barrel.ps1')-Raw
$all=(Get-ChildItem(Join-Path $root 'scripts\khora')-Filter*.ps1-Recurse|ForEach-Object{Get-Content $_.FullName -Raw})-join"`n"
Assert-Khora($gate-match"EP_VERSION\s*=\s*'1\.0\.0'")'Version EP incorrecta.'
Assert-Khora($gate-match"SCRIPT_VERSION\s*=\s*'7\.3\.0'")'Version host incorrecta.'
Assert-Khora($all-notmatch'git\s+add\s+-A')'git add -A prohibido.'
Assert-Khora($all-match'vercel\s+deploy\s+--prod')'Falta publicacion automatica del main exacto.'
Assert-Khora($all-match'ep-main-live\.json')'Falta prueba de procedencia live main.'
Assert-Khora($all-notmatch'cipher\.exe|Encrypting File System')'Fallback EFS prohibido.'
Assert-Khora($all-match'Enable-BitLocker')'Falta BitLocker.'
Assert-Khora($all-match'EP-IN-070'.*'EP-IN-080'.*'EP-IN-090')'Orden GitHub/Vercel/Visual Studio Code ausente.'
Assert-Khora((Test-Path(Join-Path $root 'ep-medio-architectura.md')))'Falta arquitectura canonica.'
if($errors.Count){$errors|ForEach-Object{Write-Error $_};exit 1};Write-Host'Validacion estatica EP v1.0: OK'-ForegroundColor Green

# Interfaz discreta con identificadores visibles.
$script:UI_INDEX=@{'EP-IN-070'=7;'EP-IN-080'=8;'EP-IN-090'=9;'EP-IN-100'=10;'EP-IN-110'=11;'EP-IN-120'=12;'EP-IN-130'=13}
$script:STATUS_FILE=Join-Path $WORK_DIR 'KHORA-STATUS.md'
function Test-Cmd {param([string]$Name)return [bool](Get-Command $Name -ErrorAction SilentlyContinue)}
function Initialize-KhoraConsoleApi {
    if(-not('KhoraConsoleWindow' -as[type])){Add-Type @'
using System;using System.Runtime.InteropServices;public static class KhoraConsoleWindow{[DllImport("kernel32.dll")]public static extern IntPtr GetConsoleWindow();[DllImport("user32.dll")]public static extern bool ShowWindow(IntPtr h,int n);}
'@}
}
function Write-KhoraUiHeader {
    try{$host.UI.RawUI.WindowTitle='KHORA EP Medio v1.0 - Interfaz'}catch{}
    Clear-Host
    "# KHORA · Entorno Persistente v1.0`r`n`r`nLos identificadores EP-* permiten retroalimentación precisa.`r`n"|Set-Content -LiteralPath $script:STATUS_FILE -Encoding UTF8
    Write-Host 'KHORA · Entorno Persistente v1.0' -ForegroundColor Cyan
    Write-Host 'Detalles técnicos: ventana Registro. Para retroalimentación usa EP-*.' -ForegroundColor DarkGray
    Write-Host ''
}
function Write-KhoraUiStage {
    param([string]$Id,[string]$State,[string]$Label,[Nullable[long]]$DurationMs=$null)
    $index=$script:UI_INDEX[$Id];$position=if($index){'[{0:00}/13]'-f$index}else{'[--/--]'};$duration=if($null-ne$DurationMs){' · {0:N1}s'-f($DurationMs/1000.0)}else{''}
    if($State-eq'START'){$line="› $position [$Id] $Label";$color='Cyan'}elseif($State-eq'OK'){$line="✓ $position [$Id] $Label$duration";$color='Green'}elseif($State-eq'FAIL'){$line="! $position [$Id] $Label — reporta $Id";$color='Red'}else{$line="– $position [$Id] $Label";$color='DarkGray'}
    Write-Host ('  '+$line) -ForegroundColor $color
    try{Add-Content -LiteralPath $script:STATUS_FILE -Value ('- '+$line) -Encoding UTF8}catch{}
}
function Write-KhoraUiReady {
    Write-Host '';Write-Host '  ✓ [EP-IN-130] Entorno listo.' -ForegroundColor Green
    Add-Content -LiteralPath $script:STATUS_FILE -Value "`r`n## Entorno listo`r`n`r`nCierra Visual Studio Code o ejecuta la tarea **KHORA: Finalizar sesión**." -Encoding UTF8
}
function Hide-KhoraUiConsole {try{Initialize-KhoraConsoleApi;[KhoraConsoleWindow]::ShowWindow([KhoraConsoleWindow]::GetConsoleWindow(),0)|Out-Null}catch{}}
function Show-KhoraUiConsole {try{Initialize-KhoraConsoleApi;[KhoraConsoleWindow]::ShowWindow([KhoraConsoleWindow]::GetConsoleWindow(),5)|Out-Null}catch{}}
function Write-InitHeader {Write-KhoraUiHeader}
function Invoke-Preflight {return (Test-KhoraEncryptedWorkspace)}
function Show-Estado {return [pscustomobject]@{session=$SESSION_ID;encrypted=(Test-KhoraEncryptedWorkspace);vscode=$script:VSCODE_PID}}
function Open-LogWindow {return $script:SESSION.logPid}
function Clear-PendingInput {}
function Focus-Window {}
function Show-Banner {}
function Spin-Job {param($Label,$Block,$ArgList=@())return (& $Block @ArgList)}

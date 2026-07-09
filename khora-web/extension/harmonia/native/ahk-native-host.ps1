$ErrorActionPreference='SilentlyContinue'
function Send-Json($obj){ $json=($obj|ConvertTo-Json -Compress -Depth 8); $bytes=[Text.Encoding]::UTF8.GetBytes($json); $len=[BitConverter]::GetBytes([UInt32]$bytes.Length); [Console]::OpenStandardOutput().Write($len,0,4); [Console]::OpenStandardOutput().Write($bytes,0,$bytes.Length) }
try{
  $stdin=[Console]::OpenStandardInput(); $hdr=New-Object byte[] 4; $n=$stdin.Read($hdr,0,4); if($n -lt 4){ throw 'sin encabezado native messaging' }
  $len=[BitConverter]::ToUInt32($hdr,0); if($len -gt 1048576){ throw 'mensaje demasiado grande' }
  $buf=New-Object byte[] $len; $read=0; while($read -lt $len){ $r=$stdin.Read($buf,$read,$len-$read); if($r -le 0){ break }; $read+=$r }
  $msg=[Text.Encoding]::UTF8.GetString($buf,0,$read) | ConvertFrom-Json
  $cands=@(
    (Join-Path $env:LOCALAPPDATA 'Programs\AutoHotkey\v2\AutoHotkey64.exe'),
    (Join-Path $env:LOCALAPPDATA 'Programs\AutoHotkey\v2\AutoHotkey32.exe'),
    (Join-Path $env:ProgramFiles 'AutoHotkey\v2\AutoHotkey64.exe'),
    (Join-Path $env:ProgramFiles 'AutoHotkey\v2\AutoHotkey32.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'AutoHotkey\v2\AutoHotkey64.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'AutoHotkey\v2\AutoHotkey32.exe'),
    (Join-Path $env:LOCALAPPDATA 'AutoHotkey\v2\AutoHotkey64.exe'),
    (Join-Path $env:LOCALAPPDATA 'AutoHotkey\v2\AutoHotkey32.exe'),
    (Join-Path $env:LOCALAPPDATA 'AutoHotkey\v2\AutoHotkey.exe')
  ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
  $exe=$cands | Select-Object -First 1
  $ver=$null; if($exe){ $ver=(Get-Item -LiteralPath $exe).VersionInfo.ProductVersion; if(!$ver){ $ver=(Get-Item -LiteralPath $exe).VersionInfo.FileVersion } }
  $ok=($exe -and ($ver -match '^2\.'))
  Send-Json @{ ok=[bool]$ok; installed=[bool]$exe; ahkVersion=$ver; bridgeVersion='1.0.0'; scriptVersion='3.32'; exePath=$exe; hotkeysLoaded=$false; lastHeartbeat=[DateTimeOffset]::Now.ToUnixTimeMilliseconds(); host='com.blacksheep.globoscraper.ahk' }
}catch{ Send-Json @{ ok=$false; installed=$false; error=($_.Exception.Message); bridgeVersion='1.0.0'; scriptVersion='3.32'; lastHeartbeat=[DateTimeOffset]::Now.ToUnixTimeMilliseconds(); host='com.blacksheep.globoscraper.ahk' } }

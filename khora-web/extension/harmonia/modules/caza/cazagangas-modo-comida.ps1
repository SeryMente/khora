param([int]$Minutes=90)
Add-Type -Namespace Win32 -Name Power -MemberDefinition @'
[System.Runtime.InteropServices.DllImport("kernel32.dll")]
public static extern uint SetThreadExecutionState(uint esFlags);
'@
$ES_CONTINUOUS=[UInt32]2147483648; $ES_SYSTEM_REQUIRED=[UInt32]1; $ES_DISPLAY_REQUIRED=[UInt32]2; $ES_AWAYMODE_REQUIRED=[UInt32]64
$end=(Get-Date).AddMinutes($Minutes)
Write-Host "Cazagangas modo comida: evitando suspension/display idle por $Minutes min. No cierres esta ventana. No puede impedir Win+L manual ni politicas corporativas de bloqueo."
while((Get-Date) -lt $end){ $flags=[UInt32]($ES_CONTINUOUS -bor $ES_SYSTEM_REQUIRED -bor $ES_DISPLAY_REQUIRED -bor $ES_AWAYMODE_REQUIRED); [void][Win32.Power]::SetThreadExecutionState($flags); Start-Sleep -Seconds 45 }
[void][Win32.Power]::SetThreadExecutionState([UInt32]$ES_CONTINUOUS)
Write-Host "Cazagangas modo comida terminado."

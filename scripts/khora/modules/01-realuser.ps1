# Identidad diagnóstica; no decide la ruta del Escritorio.
$interactive = $null
try { $interactive = (Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).UserName } catch {}
$script:REAL_USER = [pscustomobject]@{ ProcessUser = $env:USERNAME; InteractiveUser = $interactive }

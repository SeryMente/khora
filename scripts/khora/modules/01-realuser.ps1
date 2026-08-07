# ================================================================
# KHORA v7 - MODULO 01-realuser.ps1
# Componente: 01 detección usuario real
# ESTADO: EXTRAÍDO
# ================================================================

function Resolve-RealUserPaths {
    # Detecta al usuario REAL de la sesion interactiva probando multiples
    # metodos en orden de confiabilidad; el primer candidato valido gana.
    # - real == proceso : loguea "mismo usuario, sin redireccion necesaria".
    # - real != proceso : redirige env vars de perfil (si el perfil existe).
    # - indeterminado   : contexto actual + aviso (fallback).
    $__procUser  = $env:USERNAME
    $__candidate = $null
    $__method    = $null

    # ---- Metodo 1: WMI Win32_ComputerSystem.UserName (puede venir vacio) ----
    try {
        $__u = (Get-CimInstance Win32_ComputerSystem -ErrorAction Stop).UserName
        if (-not $__u) { try { $__u = (Get-WmiObject Win32_ComputerSystem -ErrorAction Stop).UserName } catch {} }
        if ($__u) {
            $__short = ($__u -split '\\')[-1].Trim()
            if (Test-KhoraRealUserName $__short) {
                $__candidate = $__short; $__method = "M1: WMI Win32_ComputerSystem.UserName"
                $script:REAL_USER_DETECT_LOG += "[M1 WMI ComputerSystem] EXITO -> '$__u' (corto: '$__short')"
            } else {
                $script:REAL_USER_DETECT_LOG += "[M1 WMI ComputerSystem] devolvio '$__u': no es usuario interactivo valido"
            }
        } else {
            $script:REAL_USER_DETECT_LOG += "[M1 WMI ComputerSystem] UserName VACIO (fallo silencioso: sin usuario en consola o WMI degradado)"
        }
    } catch { $script:REAL_USER_DETECT_LOG += "[M1 WMI ComputerSystem] ERROR: $($_.Exception.Message)" }

    # ---- Metodo 2: query session / qwinsta -> sesion 'console' ----
    # El estado varia con el idioma (Active/Activo), por eso se ancla en el
    # nombre de sesion 'console' + presencia de usuario (columna USERNAME).
    # Limite conocido: usuarios con espacios en el nombre no matchean (\S+).
    if (-not $__candidate) {
        try {
            $__q = $null
            try { $__q = & query session 2>$null } catch { $__q = $null }
            if (-not $__q) { try { $__q = & qwinsta 2>$null } catch { $__q = $null } }
            if ($__q) {
                $__hit = $null
                foreach ($__ln in @($__q)) {
                    $__t = ("$__ln" -replace '^[>\s]+','')
                    if ($__t -match '^(?i)console\s+(\S+)\s+(\d+)') { $__hit = $Matches[1]; break }
                }
                if (Test-KhoraRealUserName $__hit) {
                    $__candidate = $__hit.Trim(); $__method = "M2: query session (sesion console)"
                    $script:REAL_USER_DETECT_LOG += "[M2 query session] EXITO -> '$__candidate' en sesion console"
                } else {
                    $script:REAL_USER_DETECT_LOG += "[M2 query session] salida presente pero sin usuario en sesion console"
                }
            } else {
                $script:REAL_USER_DETECT_LOG += "[M2 query session] sin salida (query/qwinsta no disponibles)"
            }
        } catch { $script:REAL_USER_DETECT_LOG += "[M2 query session] ERROR: $($_.Exception.Message)" }
    }

    # ---- Metodo 3: explorer.exe -> GetOwner() via WMI Win32_Process ----
    # Elevar con otra cuenta NO cambia de sesion de Windows: se prefiere el
    # explorer de NUESTRA misma sesion (su dueno es el usuario real del escritorio).
    if (-not $__candidate) {
        try {
            $__mySes  = ([System.Diagnostics.Process]::GetCurrentProcess()).SessionId
            $__owners = @()
            $__exps   = @(Get-CimInstance Win32_Process -Filter "Name='explorer.exe'" -ErrorAction Stop)
            foreach ($__p in $__exps) {
                try {
                    $__o = Invoke-CimMethod -InputObject $__p -MethodName GetOwner -ErrorAction Stop
                    if ($__o -and $__o.User) {
                        $__sid = $null; try { $__sid = (Get-Process -Id $__p.ProcessId -ErrorAction Stop).SessionId } catch {}
                        $__owners += [pscustomobject]@{ User = $__o.User; SessionId = $__sid }
                    }
                } catch {}
            }
            $__pick = $__owners | Where-Object { $_.SessionId -eq $__mySes } | Select-Object -First 1
            if (-not $__pick) { $__pick = $__owners | Select-Object -First 1 }
            if ($__pick -and (Test-KhoraRealUserName $__pick.User)) {
                $__candidate = $__pick.User.Trim(); $__method = "M3: explorer.exe GetOwner (Win32_Process)"
                $script:REAL_USER_DETECT_LOG += "[M3 explorer GetOwner] EXITO -> '$__candidate' (sesion explorer: $($__pick.SessionId) | sesion proceso: $__mySes | explorers: $(@($__owners).Count))"
            } elseif (@($__exps).Count -eq 0) {
                $script:REAL_USER_DETECT_LOG += "[M3 explorer GetOwner] no hay explorer.exe corriendo"
            } else {
                $script:REAL_USER_DETECT_LOG += "[M3 explorer GetOwner] sin owner valido ($(@($__exps).Count) explorer encontrados)"
            }
        } catch { $script:REAL_USER_DETECT_LOG += "[M3 explorer GetOwner] ERROR: $($_.Exception.Message)" }
    }

    # ---- Metodo 4: cadena de procesos padre -> GetOwner() de cada ancestro ----
    # Leer las env vars reales de otro proceso exige P/Invoke al PEB; el dueno
    # de la cadena de padres es el proxy practico: primer ancestro con dueno
    # interactivo DISTINTO al usuario del proceso elevado.
    if (-not $__candidate) {
        try {
            $__depth = 0; $__pidCur = $PID; $__found = $null; $__chain = @()
            while ($__pidCur -and ($__depth -lt 8)) {
                $__proc = Get-CimInstance Win32_Process -Filter "ProcessId=$__pidCur" -ErrorAction Stop
                if (-not $__proc) { break }
                $__own = $null
                try { $__own = (Invoke-CimMethod -InputObject $__proc -MethodName GetOwner -ErrorAction Stop).User } catch {}
                $__chain += "$($__proc.Name):$__own"
                if ($__own -and ($__own -ine $__procUser) -and (Test-KhoraRealUserName $__own)) { $__found = $__own; break }
                $__pidCur = $__proc.ParentProcessId; $__depth++
            }
            if ($__found) {
                $__candidate = $__found.Trim(); $__method = "M4: cadena de procesos padre (GetOwner)"
                $script:REAL_USER_DETECT_LOG += "[M4 cadena padre] EXITO -> '$__candidate' | cadena: $($__chain -join ' <- ')"
            } else {
                $script:REAL_USER_DETECT_LOG += "[M4 cadena padre] sin ancestro con dueno interactivo distinto | cadena: $($__chain -join ' <- ')"
            }
        } catch { $script:REAL_USER_DETECT_LOG += "[M4 cadena padre] ERROR: $($_.Exception.Message)" }
    }

    # ---- Metodo 5: Registro LogonUI -> LastLoggedOnUser ----
    # Menos confiable: es el ULTIMO login/desbloqueo visto por LogonUI, no
    # necesariamente la sesion actual. Por eso va al final.
    if (-not $__candidate) {
        try {
            $__k = Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Authentication\LogonUI" -ErrorAction Stop
            $__raw = $null
            foreach ($__prop in @("LastLoggedOnUser", "LastLoggedOnSAMUser")) {
                $__v = $null; try { $__v = $__k.$__prop } catch { $__v = $null }
                if ($__v) { $__raw = $__v; break }
            }
            if ($__raw) {
                $__short = ("$__raw" -split '\\')[-1].Trim()
                if (Test-KhoraRealUserName $__short) {
                    $__candidate = $__short; $__method = "M5: registro LogonUI LastLoggedOnUser"
                    $script:REAL_USER_DETECT_LOG += "[M5 registro LogonUI] EXITO -> '$__raw' (corto: '$__short') [ultimo login registrado; puede no ser la sesion actual]"
                } else {
                    $script:REAL_USER_DETECT_LOG += "[M5 registro LogonUI] valor '$__raw' no valido como usuario interactivo"
                }
            } else {
                $script:REAL_USER_DETECT_LOG += "[M5 registro LogonUI] clave presente pero sin LastLoggedOnUser/LastLoggedOnSAMUser"
            }
        } catch { $script:REAL_USER_DETECT_LOG += "[M5 registro LogonUI] ERROR: $($_.Exception.Message)" }
    }

    # ---- Decision ----
    if (-not $__candidate) {
        $script:REAL_USER_DETECT_LOG += "[FALLBACK] Ningun metodo determino al usuario real; se usa el contexto actual ('$__procUser')."
        return
    }
    $script:REAL_USER_METHOD = $__method
    if ($__candidate -ieq $__procUser) {
        $script:REAL_USER_SAME = $true
        $script:REAL_USER_NAME = $__candidate
        $script:REAL_USER_DETECT_LOG += "[DECISION] usuario real '$__candidate' == usuario del proceso '$__procUser': mismo usuario, sin redireccion necesaria."
        return
    }
    # Usuario real DISTINTO al del proceso elevado -> redirigir perfil
    $__realProfile = Join-Path $env:SystemDrive "Users\$__candidate"
    if (Test-Path $__realProfile) {
        $script:REAL_USER_ELEVATED_AS = $__procUser
        $script:REAL_USER_NAME        = $__candidate
        # Redirigir env vars ANTES de cualquier Join-Path con ellos
        $env:USERNAME     = $__candidate
        $env:USERPROFILE  = $__realProfile
        $env:LOCALAPPDATA = Join-Path $__realProfile "AppData\Local"
        $env:APPDATA      = Join-Path $__realProfile "AppData\Roaming"
        $env:HOMEDRIVE    = $env:SystemDrive
        $env:HOMEPATH     = "\Users\$__candidate"
        $script:REAL_USER_OVERRIDE = $true
        $script:REAL_USER_DETECT_LOG += "[DECISION] REDIRECCION: usuario real '$__candidate' != proceso elevado '$__procUser' -> perfil $__realProfile"
    } else {
        # Perfil no existe en disco: primer login o perfil movil;
        # se trabaja con el contexto elevado y se avisa en Start-Sesion.
        $script:REAL_USER_NO_PROFILE = $__candidate
        $script:REAL_USER_DETECT_LOG += "[DECISION] usuario real '$__candidate' detectado pero su perfil NO existe en disco ($__realProfile); se usa el contexto elevado ('$__procUser')."
    }
}

Resolve-RealUserPaths

. Initialize-KhoraPaths

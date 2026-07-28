# ================================================================
#  HUD STATE VARIABLES
# ================================================================
$script:HUD_OK = 0
$script:HUD_WARN = 0
$script:HUD_FAIL = 0
$script:HUD_STEP = "Inicializando"

function Init-HUD {
    $script:HUD_OK = 0
    $script:HUD_WARN = 0
    $script:HUD_FAIL = 0
    $script:HUD_STEP = "Inicializando"
}

function Update-HUD {
    param([string]$level, [string]$msg, [string]$color="White")

    $hudPrefix = "[OK:$($script:HUD_OK) WARN:$($script:HUD_WARN) FAIL:$($script:HUD_FAIL)] ($($script:HUD_STEP))  $level  "
    $fullMsg = $hudPrefix + $msg

    # Truncate if necessary
    if ($fullMsg.Length -gt $HOST_WIDTH) {
        $fullMsg = $fullMsg.Substring(0, $HOST_WIDTH - 3) + "..."
    }

    # Pad to overwrite previous text
    $padLength = [Math]::Max(0, $HOST_WIDTH - $fullMsg.Length)
    $fullMsg += " " * $padLength

    Write-Host "`r$fullMsg" -NoNewline -ForegroundColor $color
}

# KHORA EP Medio v1.0 - registro local y remoto persistente
function Mask-Token {
    param([AllowNull()][string]$Text)
    if ($null -eq $Text) { return '' }
    $masked = $Text -replace '(ghp_[A-Za-z0-9_]{12})[A-Za-z0-9_]+','$1***'
    $masked = $masked -replace '(github_pat_[A-Za-z0-9_]{12})[A-Za-z0-9_]+','$1***'
    $masked = $masked -replace '(Bearer\s+[A-Za-z0-9._~-]{12})[A-Za-z0-9._~-]+','$1***'
    return $masked
}
function Invoke-WithKhoraToken {
    param([ScriptBlock]$Action)
    if (-not $script:KhoraTokenSecure) { throw 'Token Khora ausente.' }
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($script:KhoraTokenSecure)
    try { $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer); return (& $Action $plain) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer); $plain = $null }
}
function Send-KhoraRemoteEvent {
    param($Event)
    $json = @{ events = @($Event) } | ConvertTo-Json -Depth 8 -Compress
    $lastError = $null
    foreach ($attempt in 1..3) {
        try {
            Invoke-WithKhoraToken -Action { param($token) Invoke-RestMethod -Method Post -Uri ($KHORA_API_BASE.TrimEnd('/') + '/events') -Headers @{Authorization=('Bearer '+$token);'Content-Type'='application/json'} -Body $json -TimeoutSec 20 | Out-Null } | Out-Null
            return
        } catch { $lastError = $_; Start-Sleep -Milliseconds (250 * $attempt) }
    }
    throw ('Bitácora remota no disponible: ' + $lastError.Exception.Message)
}
function Write-KhoraEvent {
    param([ValidatePattern('^EP-(IN|RUN|OUT)-[0-9]{3}$')][string]$Id,[ValidateSet('START','OK','FAIL','INFO','SKIP')][string]$State,[string]$Message='',[Nullable[long]]$DurationMs=$null,[switch]$RemoteOptional)
    $safe = Mask-Token $Message
    $timestamp = [DateTime]::UtcNow.ToString('o')
    $record = [ordered]@{timestamp=$timestamp;sessionId=$SESSION_ID;id=$Id;state=$State;message=$safe}
    if ($null -ne $DurationMs) { $record.durationMs = [long]$DurationMs }
    try {
        Add-Content -LiteralPath $LOG_FILE -Value ('{0} [{1}][{2}] {3}' -f $timestamp,$Id,$State,$safe) -Encoding UTF8
        Add-Content -LiteralPath $JSON_LOG -Value ($record | ConvertTo-Json -Compress) -Encoding UTF8
    } catch {}
    try { Send-KhoraRemoteEvent -Event $record } catch { if (-not $RemoteOptional) { throw } else { try { Add-Content -LiteralPath $LOG_FILE -Value ('[REMOTE-WARN] '+$_.Exception.Message) -Encoding UTF8 } catch {} } }
}
function Invoke-KhoraStage {
    param([string]$Id,[string]$Label,[ScriptBlock]$Action)
    $previous = $script:CURRENT_STAGE_ID;$script:CURRENT_STAGE_ID = $Id
    Write-KhoraEvent -Id $Id -State START -Message $Label
    Write-KhoraUiStage -Id $Id -State START -Label $Label
    $watch = [Diagnostics.Stopwatch]::StartNew()
    try {
        $result = & $Action;$watch.Stop()
        Write-KhoraEvent -Id $Id -State OK -Message $Label -DurationMs $watch.ElapsedMilliseconds
        Write-KhoraUiStage -Id $Id -State OK -Label $Label -DurationMs $watch.ElapsedMilliseconds
        return $result
    } catch {
        $watch.Stop();try { Write-KhoraEvent -Id $Id -State FAIL -Message ($Label+': '+$_.Exception.Message) -DurationMs $watch.ElapsedMilliseconds } catch {}
        Write-KhoraUiStage -Id $Id -State FAIL -Label $Label -DurationMs $watch.ElapsedMilliseconds
        throw
    } finally { $script:CURRENT_STAGE_ID = $previous }
}
function L { param([string]$Level,[string]$Message) $id=if($script:CURRENT_STAGE_ID){$script:CURRENT_STAGE_ID}else{'EP-RUN-020'};try{Add-Content -LiteralPath $LOG_FILE -Value ('{0} [{1}][{2}] {3}' -f [DateTime]::UtcNow.ToString('o'),$id,$Level,(Mask-Token $Message)) -Encoding UTF8}catch{} }
function Step { param($Message) L -Level STEP -Message $Message }
function Info { param($Message) L -Level INFO -Message $Message }
function Ok { param($Message) L -Level OK -Message $Message }
function Warn { param($Message) L -Level WARN -Message $Message }
function Fail { param($Message) L -Level FAIL -Message $Message }

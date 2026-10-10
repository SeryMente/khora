# Almacenamiento cifrado; no existe fallback de cifrado alternativo.
function Test-KhoraEncryptedWorkspace {
    try {
        $volume=Get-BitLockerVolume -MountPoint $MOUNT_POINT -ErrorAction Stop
        return ([string]$volume.ProtectionStatus -eq 'On' -and [int]$volume.EncryptionPercentage -eq 100 -and (Test-Path $VHD_PATH))
    } catch { return $false }
}
function Stop-KhoraWorkspaceProcesses {
    param([switch]$KeepLog)
    $identifiers=@($script:VSCODE_PID,$script:GUARD_PID)
    try{$identifiers+=@([int]$script:SESSION.supervisorPid,[int]$script:SESSION.guardianPid)}catch{}
    if(-not$KeepLog){$identifiers+=@([int]$script:SESSION.logPid)}
    foreach($identifier in ($identifiers|Select-Object -Unique)){
        if([int]$identifier -gt 0 -and [int]$identifier -ne $PID){Stop-Process -Id $identifier -Force -ErrorAction SilentlyContinue}
    }
    foreach($name in @('Code','node','python','pythonw')){
        Get-Process -Name $name -ErrorAction SilentlyContinue |
            Where-Object{$_.Path -and $_.Path.StartsWith($WORK_DIR,[StringComparison]::OrdinalIgnoreCase)} |
            Stop-Process -Force -ErrorAction SilentlyContinue
    }
}
function Lock-KhoraEncryptedVolume {
    try{Set-Location $env:SystemRoot}catch{}
    if(Test-Path($MOUNT_POINT+'\')){Lock-BitLocker -MountPoint $MOUNT_POINT -ForceDismount -ErrorAction Stop|Out-Null}
    return $true
}
function Dismount-KhoraVhd {
    $tempRoot=[string]$script:KHORA_HOST_TEMP
    if([string]::IsNullOrWhiteSpace($tempRoot)){throw 'KHORA_HOST_TEMP_MISSING'}
    $tempRoot=[IO.Path]::GetFullPath($tempRoot)
    if($script:DATA_PROFILE_MODE -eq 'fila4-profile-tree'){
        $rootPrefix=([string]$script:DATA_PROFILE_ROOT).TrimEnd('\')+'\'
        if(-not $tempRoot.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'KHORA_DISMOUNT_TEMP_OUTSIDE_FILA4_PROFILE'}
    }
    if(-not(Test-Path -LiteralPath $tempRoot -PathType Container)){throw 'KHORA_HOST_TEMP_NOT_FOUND'}
    $tempItem=Get-Item -LiteralPath $tempRoot -Force -ErrorAction Stop
    if(($tempItem.Attributes -band [IO.FileAttributes]::ReparsePoint)-ne0){throw 'KHORA_HOST_TEMP_REPARSE_POINT_REFUSED'}
    $file=Join-Path $tempRoot ('khora-detach-'+[guid]::NewGuid().ToString('N')+'.txt')
    $diskpartSelect='select vdisk file="'+$VHD_PATH+'"'
    [IO.File]::WriteAllLines($file,@($diskpartSelect,'detach vdisk noerr'),(New-Object Text.ASCIIEncoding))
    try{& diskpart.exe /s $file|Out-Null}finally{Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue}
    return (-not(Test-Path($MOUNT_POINT+'\')))
}
function Remove-KhoraContainer {
    Remove-Item -LiteralPath $VHD_PATH -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $ROOT_DIR -Recurse -Force -ErrorAction SilentlyContinue
    return (-not(Test-Path $ROOT_DIR))
}
function Test-KhoraEncrypted { param($Path) return (Test-KhoraEncryptedWorkspace) }
function Protect-KhoraPath { if(-not(Test-KhoraEncryptedWorkspace)){throw 'Workspace sin BitLocker.'};return $true }
function Invoke-SecureDeleteFile { param($File) Remove-Item -LiteralPath $File -Force -ErrorAction SilentlyContinue }

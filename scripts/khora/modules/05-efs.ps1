# Almacenamiento cifrado; no existe fallback de cifrado alternativo.
function Test-KhoraEncryptedWorkspace {
    try {
        $volume=Get-BitLockerVolume -MountPoint $MOUNT_POINT -ErrorAction Stop
        return ([string]$volume.ProtectionStatus -eq 'On' -and [int]$volume.EncryptionPercentage -eq 100 -and (Test-Path -LiteralPath $VHD_PATH -PathType Leaf))
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
    if(-not [string]::IsNullOrWhiteSpace([string]$MOUNT_POINT) -and (Test-Path -LiteralPath ($MOUNT_POINT+'\'))) {
        try{Set-Location $env:SystemRoot}catch{}
        Lock-BitLocker -MountPoint $MOUNT_POINT -ForceDismount -ErrorAction Stop | Out-Null
    }
    return $true
}
function Dismount-KhoraVhd {
    if([string]::IsNullOrWhiteSpace([string]$VHD_PATH)){throw 'VHD_PATH ausente; se conserva el contenedor.'}
    $file=Join-Path $env:SystemRoot ('Temp\khora-detach-'+[guid]::NewGuid().ToString('N')+'.txt')
    [IO.File]::WriteAllLines($file,@("select vdisk file=`"$VHD_PATH`"",'detach vdisk noerr'),(New-Object Text.ASCIIEncoding))
    $previousPreference=$ErrorActionPreference
    $diskpartExit=1
    $diskpartOutput=@()
    try {
        $ErrorActionPreference='Continue'
        $diskpartOutput=@(& diskpart.exe /s $file 2>&1)
        $diskpartExit=$LASTEXITCODE
    } finally {
        $ErrorActionPreference=$previousPreference
        try{[IO.File]::Delete($file)}catch{}
    }
    if($diskpartExit -ne 0){throw ('DiskPart detach falló (exit '+$diskpartExit+'): '+(($diskpartOutput | ForEach-Object {[string]$_}) -join ' '))}
    if(-not [string]::IsNullOrWhiteSpace([string]$MOUNT_POINT) -and (Test-Path -LiteralPath ($MOUNT_POINT+'\'))){throw 'El punto de montaje sigue presente; se conserva el VHDX y la tarea de limpieza.'}
    return $true
}
function Remove-KhoraContainer {
    if([string]::IsNullOrWhiteSpace([string]$SESSION_ID) -or [string]::IsNullOrWhiteSpace([string]$ROOT_DIR) -or [string]::IsNullOrWhiteSpace([string]$VHD_PATH)){throw 'Identidad o rutas del contenedor incompletas; no se elimina nada.'}
    $expectedLeaf='KHORA-EP-'+[string]$SESSION_ID
    $root=[IO.Path]::GetFullPath([string]$ROOT_DIR).TrimEnd('\')
    $vhd=[IO.Path]::GetFullPath([string]$VHD_PATH)
    if([IO.Path]::GetFileName($root) -cne $expectedLeaf){throw 'ROOT_DIR no coincide con la carpeta efímera identificada por SESSION_ID.'}
    $rootPrefix=$root+'\'
    if(-not $vhd.StartsWith($rootPrefix,[StringComparison]::OrdinalIgnoreCase)){throw 'VHD_PATH está fuera de ROOT_DIR; se rechaza la eliminación.'}
    if(-not [string]::IsNullOrWhiteSpace([string]$MOUNT_POINT) -and (Test-Path -LiteralPath ($MOUNT_POINT+'\'))){throw 'El volumen sigue montado; no se elimina el VHDX.'}
    if(Test-Path -LiteralPath $vhd -PathType Leaf){Remove-Item -LiteralPath $vhd -Force -ErrorAction Stop}
    if(Test-Path -LiteralPath $vhd){throw 'El VHDX permanece después del intento de eliminación.'}
    if(Test-Path -LiteralPath $root -PathType Container){Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction Stop}
    if(Test-Path -LiteralPath $root){throw 'La carpeta exterior permanece después del intento de eliminación.'}
    return $true
}
function Test-KhoraEncrypted { param($Path) return (Test-KhoraEncryptedWorkspace) }
function Protect-KhoraPath { if(-not(Test-KhoraEncryptedWorkspace)){throw 'Workspace sin BitLocker.'};return $true }
function Invoke-SecureDeleteFile { param($File) Remove-Item -LiteralPath $File -Force -ErrorAction SilentlyContinue }

# Descubrimiento seguro de Chrome; la instalación no se ejecuta implícitamente.
function Find-SystemChrome {
    $candidates=New-Object 'System.Collections.Generic.List[string]'
    foreach($base in @(
        [Environment]::GetEnvironmentVariable('ProgramFiles'),
        [Environment]::GetEnvironmentVariable('ProgramFiles(x86)'),
        [Environment]::GetEnvironmentVariable('LOCALAPPDATA')
    )){
        if([string]::IsNullOrWhiteSpace([string]$base)){continue}
        foreach($relative in @('Google\Chrome\Application\chrome.exe','Programs\Google\Chrome\Application\chrome.exe')){
            $candidate=Join-Path $base $relative
            if(Test-Path -LiteralPath $candidate -PathType Leaf){[void]$candidates.Add([IO.Path]::GetFullPath($candidate))}
        }
    }
    foreach($registryPath in @(
        'HKCU:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
        'HKLM:\Software\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe',
        'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'
    )){
        try{
            $entry=Get-Item -LiteralPath $registryPath -ErrorAction Stop
            $candidate=[string]$entry.GetValue('')
            if($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)){[void]$candidates.Add([IO.Path]::GetFullPath($candidate))}
        }catch{}
    }
    $command=Get-Command chrome.exe -ErrorAction SilentlyContinue | Select-Object -First 1
    if($command -and $command.Source -and (Test-Path -LiteralPath $command.Source -PathType Leaf)){[void]$candidates.Add([IO.Path]::GetFullPath($command.Source))}
    foreach($candidate in @($candidates | Select-Object -Unique)){
        if(-not(Test-Path -LiteralPath $candidate -PathType Leaf)){continue}
        try{
            $version=(Get-Item -LiteralPath $candidate -ErrorAction Stop).VersionInfo
            if([string]::IsNullOrWhiteSpace([string]$version.ProductVersion)){continue}
            return [pscustomobject]@{Path=$candidate;Version=[string]$version.ProductVersion}
        }catch{}
    }
    return $null
}
function Ensure-Chrome {
    $chrome=Find-SystemChrome
    if($chrome){
        Info ('Chrome disponible: '+$chrome.Version)
        return $chrome.Path
    }
    Warn 'Chrome no está instalado en una ruta verificable; no se descargará ni instalará automáticamente.'
    return $null
}
function Install-VulkanSwiftShader {
    Info 'SwiftShader es opcional y no está implementado en este bootstrap.'
    return $null
}

$ErrorActionPreference = 'Stop'
$version = '22.23.4'
$expectedSha256 = 'cbc74b5e0982c9dbb41525fd8fb5dcd32fbee237863f7829072f4639a1ce5f20'
$root = $PSScriptRoot
$runtimeRoot = Join-Path $root 'runtime'
New-Item -ItemType Directory -Path $runtimeRoot -Force | Out-Null
$node = Join-Path $runtimeRoot 'node.exe'
$license = Join-Path $runtimeRoot 'NODE-LICENSE.txt'
$stage = Join-Path ([IO.Path]::GetTempPath()) ('harmonia-node-' + [guid]::NewGuid().ToString('N'))
$zip = Join-Path $stage ('node-v' + $version + '-win-x64.zip')
$extract = Join-Path $stage 'extract'
try {
    New-Item -ItemType Directory -Path $stage -Force | Out-Null
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    $uri = 'https://nodejs.org/dist/v' + $version + '/node-v' + $version + '-win-x64.zip'
    Invoke-WebRequest -Uri $uri -OutFile $zip -UseBasicParsing
    $actual = (Get-FileHash -LiteralPath $zip -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expectedSha256) { throw "SHA-256 del runtime no coincide: $actual" }
    Expand-Archive -LiteralPath $zip -DestinationPath $extract -Force
    $sourceRoot = Join-Path $extract ('node-v' + $version + '-win-x64')
    $sourceNode = Join-Path $sourceRoot 'node.exe'
    $sourceLicense = Join-Path $sourceRoot 'LICENSE'
    if (-not (Test-Path -LiteralPath $sourceNode -PathType Leaf)) { throw 'El ZIP verificado no contiene node.exe.' }
    if (-not (Test-Path -LiteralPath $sourceLicense -PathType Leaf)) { throw 'El ZIP verificado no contiene LICENSE.' }
    Copy-Item -LiteralPath $sourceNode -Destination $node -Force
    Copy-Item -LiteralPath $sourceLicense -Destination $license -Force
    $reportedVersion = (& $node --version).Trim()
    $architecture = (& $node -p 'process.arch').Trim()
    if ($reportedVersion -ne ('v' + $version) -or $architecture -ne 'x64') { throw "Runtime extraído incompatible: $reportedVersion / $architecture." }
    Write-Output 'RUNTIME=VERIFIED'
    Write-Output ('VERSION=' + $reportedVersion)
    Write-Output ('ARCHITECTURE=' + $architecture)
    Write-Output ('ZIP_SHA256=' + $actual)
    Write-Output ('NODE_SHA256=' + (Get-FileHash -LiteralPath $node -Algorithm SHA256).Hash.ToLowerInvariant())
} catch {
    if (Test-Path -LiteralPath $node) { Remove-Item -LiteralPath $node -Force -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $license) { Remove-Item -LiteralPath $license -Force -ErrorAction SilentlyContinue }
    throw
} finally {
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force -ErrorAction SilentlyContinue }
}

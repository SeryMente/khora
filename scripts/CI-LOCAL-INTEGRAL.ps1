[CmdletBinding()]
param([switch]$InstallDependencies,[switch]$Offline,[switch]$KeepArtifacts)

Set-StrictMode -Version 2
$ErrorActionPreference = 'Stop'
if ($Offline -and $InstallDependencies) {
  throw 'Do not combine -Offline with -InstallDependencies. Provision once online, then run with -Offline.'
}
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$RunId = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ') + '-' + ([Guid]::NewGuid().ToString('N').Substring(0,8))
$RunRoot = Join-Path $env:LOCALAPPDATA (Join-Path 'KHORA-CI\runs' $RunId)
$LogRoot = Join-Path $RunRoot 'logs'
New-Item -ItemType Directory -Force -Path $LogRoot | Out-Null
$ReportPath = Join-Path $RunRoot 'ci-report.json'
$MarkdownReportPath = Join-Path $RunRoot 'ci-report.md'
$DesktopLog = Join-Path $env:USERPROFILE 'Desktop\log.txt'
$PythonEnv = Join-Path $env:LOCALAPPDATA 'KHORA-CI\python-kernel'
$PythonExe = Join-Path $PythonEnv 'Scripts\python.exe'
$ApiPythonEnv = Join-Path $env:LOCALAPPDATA 'KHORA-CI\python-api'
$ApiPythonExe = Join-Path $ApiPythonEnv 'Scripts\python.exe'
$Node22Root = Join-Path $env:LOCALAPPDATA 'KHORA-CI\node22'
$Node24Root = Join-Path $env:LOCALAPPDATA 'KHORA-CI\node24'
$Node22Bin = Join-Path $Node22Root 'node_modules\node\bin'
$Node24Bin = Join-Path $Node24Root 'node_modules\node\bin'
$Node22Exe = Join-Path $Node22Bin 'node.exe'
$Node24Exe = Join-Path $Node24Bin 'node.exe'
$ToolRoot = Join-Path $env:LOCALAPPDATA 'KHORA-CI\toolchains'
$DownloadRoot = Join-Path $ToolRoot 'downloads'
$JavaHome = Join-Path $ToolRoot 'temurin-jre-21.0.13+9\jdk-21.0.13+9-jre'
$Neo4jHome = Join-Path $ToolRoot 'neo4j-community-5.26.33'
$NpmCmd = (Get-Command 'npm.cmd' -ErrorAction Stop).Source
$NpxCmd = (Get-Command 'npx.cmd' -ErrorAction Stop).Source
$script:CurrentLog = $null
$script:StageResults = New-Object System.Collections.ArrayList
$script:PreviousPath = $env:PATH
$script:PreviousOidcIssuer = $env:OIDC_ISSUER_URL
$script:PreviousAuthSecret = $env:AUTH_SECRET
$script:PreviousPlaywrightRun = $env:PLAYWRIGHT_TEST_RUN
$script:PreviousNeo4jUri = $env:NEO4J_URI
$script:PreviousNeo4jUser = $env:NEO4J_USER
$script:PreviousNeo4jPassword = $env:NEO4J_PASSWORD
$script:PreviousKhoraNeo4jTestUri = $env:KHORA_NEO4J_TEST_URI
$script:PreviousKhoraNeo4jTestUser = $env:KHORA_NEO4J_TEST_USER
$script:PreviousKhoraNeo4jTestPass = $env:KHORA_NEO4J_TEST_PASS
$script:PreviousPythonPath = $env:PYTHONPATH
$script:PreviousEmbOffline = $env:KHORA_EMB_OFFLINE
$script:PreviousLeidenManifestDir = $env:KHORA_LEIDEN_MANIFEST_DIR
$script:PreviousEmbIndexFile = $env:KHORA_EMB_INDEX_FILE
$script:PreviousEmbMapFile = $env:KHORA_EMB_MAP_FILE
$script:PreviousJavaHome = $env:JAVA_HOME
$script:PreviousNeo4jHome = $env:NEO4J_HOME
$script:PreviousNeo4jConf = $env:NEO4J_CONF
$script:PreviousPlaywrightBrowsersPath = $env:PLAYWRIGHT_BROWSERS_PATH
$script:PreviousCI = $env:CI
$script:PreviousPlaywrightPort = $env:PLAYWRIGHT_PORT
$script:PreviousPlaywrightBaseUrl = $env:PLAYWRIGHT_BASE_URL
$script:PreviousPlaywrightSkipBuild = $env:PLAYWRIGHT_SKIP_BUILD
$script:Neo4jLaunchProcess = $null
$script:Neo4jConf = $null
$script:Neo4jData = $null
$script:Neo4jRun = $null
$script:Neo4jPort = $null
$script:Neo4jOutput = $null
$script:Neo4jError = $null
$script:TranscriptStartError = $null
$script:FallbackTranscriptPath = Join-Path $RunRoot 'session-transcript.log'

function Write-StageLog {
  param([string]$Message)
  $line = '[' + [DateTime]::UtcNow.ToString('o') + '] ' + $Message
  Write-Host $line
  if ($script:CurrentLog) {
    Add-Content -LiteralPath $script:CurrentLog -Value $line -Encoding UTF8
  }
}

function Invoke-Native {
  param(
    [Parameter(Mandatory=$true)][string]$FilePath,
    [string[]]$Arguments = @(),
    [Parameter(Mandatory=$true)][string]$WorkingDirectory
  )
  if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf) -and
      -not (Get-Command $FilePath -ErrorAction SilentlyContinue)) {
    throw ('Executable not found: ' + $FilePath)
  }
  $originalLocation = Get-Location
  $originalErrorActionPreference = $ErrorActionPreference
  try {
    Set-Location -LiteralPath $WorkingDirectory
    Write-StageLog ('RUN: ' + $FilePath + ' ' + ($Arguments -join ' '))
    $ErrorActionPreference = 'Continue'
    & $FilePath @Arguments 2>&1 | ForEach-Object {
      $line = [string]$_
      Write-Host $line
      if ($script:CurrentLog) {
        Add-Content -LiteralPath $script:CurrentLog -Value $line -Encoding UTF8
      }
    }
    $nativeExitCode = $LASTEXITCODE
    if ($null -ne $nativeExitCode -and $nativeExitCode -ne 0) {
      throw ('Native process exit code ' + $nativeExitCode + ': ' + $FilePath)
    }
  } finally {
    $ErrorActionPreference = $originalErrorActionPreference
    Set-Location -LiteralPath $originalLocation
  }
}

function Invoke-Stage {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][scriptblock]$Action,
    [string]$BlockedReason
  )
  $stageLog = Join-Path $LogRoot (($Name -replace '[^A-Za-z0-9._-]','-') + '.log')
  $script:CurrentLog = $stageLog
  $startedAt = [DateTime]::UtcNow.ToString('o')
  $status = 'PASS'
  $detail = 'All commands completed successfully.'
  Write-StageLog ('STAGE START: ' + $Name)
  if ($BlockedReason) {
    $status = 'BLOCKED'
    $detail = $BlockedReason
    Write-StageLog ('BLOCKED: ' + $detail)
  } else {
    try {
      & $Action
      Write-StageLog ('STAGE PASS: ' + $Name)
    } catch {
      $status = 'FAIL'
      $detail = $_.Exception.Message
      Write-StageLog ('STAGE FAIL: ' + $detail)
    }
  }
  $completedAt = [DateTime]::UtcNow.ToString('o')
  $durationSeconds = [Math]::Round(([DateTime]::Parse($completedAt) - [DateTime]::Parse($startedAt)).TotalSeconds,2)
  [void]$script:StageResults.Add([pscustomobject]@{
    name = $Name
    status = $status
    startedAtUtc = $startedAt
    completedAtUtc = $completedAt
    durationSeconds = $durationSeconds
    detail = $detail
    log = $stageLog
  })
  Write-Host ('[' + $status + '] ' + $Name)
}

function Add-NodeBinToPath {
  param([string]$BinPath)
  if (Test-Path -LiteralPath (Join-Path $BinPath 'node.exe')) {
    $env:PATH = $BinPath + ';' + $env:PATH
  }
}
function Ensure-Archive {
  param([string]$Name,[string]$Url,[string]$ArchivePath,[string]$ExpectedSha256,[string]$ExtractRoot,[string]$ExpectedRelativePath)
  $expectedPath=Join-Path $ExtractRoot $ExpectedRelativePath
  if(Test-Path -LiteralPath $expectedPath -PathType Leaf){Write-StageLog ($Name+' extracted runtime already present.');return}
  if($Offline){throw ($Name+' missing; -Offline forbids downloading it.')}
  if(-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)){
    $curl=(Get-Command 'curl.exe' -ErrorAction Stop).Source
    Write-StageLog ('Downloading '+$Name+' from official distribution endpoint.')
    & $curl -fL --retry 3 --retry-delay 2 --connect-timeout 30 --max-time 1200 -o $ArchivePath $Url
    if($LASTEXITCODE -ne 0){throw ('Download failed ('+$LASTEXITCODE+'): '+$Name)}
  }
  if(-not (Test-Path -LiteralPath $ArchivePath -PathType Leaf)){throw ('Downloaded archive missing: '+$ArchivePath)}
  $hash=(Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  if($hash -ne $ExpectedSha256.ToLowerInvariant()){Remove-Item -LiteralPath $ArchivePath -Force -ErrorAction SilentlyContinue;throw ('SHA-256 mismatch: '+$Name+' got '+$hash)}
  Write-StageLog ('SHA256 VERIFIED '+$Name+' '+$hash)
  New-Item -ItemType Directory -Force -Path $ExtractRoot | Out-Null
  Expand-Archive -LiteralPath $ArchivePath -DestinationPath $ExtractRoot -Force
  if(-not (Test-Path -LiteralPath $expectedPath -PathType Leaf)){throw ('Extraction check failed: '+$expectedPath)}
}

function Ensure-PortableNeo4jToolchain {
  New-Item -ItemType Directory -Force -Path $ToolRoot,$DownloadRoot | Out-Null
  Ensure-Archive -Name 'Temurin JRE 21.0.13+9 x64' -Url 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.13%2B9/OpenJDK21U-jre_x64_windows_hotspot_21.0.13_9.zip' -ArchivePath (Join-Path $DownloadRoot 'OpenJDK21U-jre_x64_windows_hotspot_21.0.13_9.zip') -ExpectedSha256 '2332c0b4cff6bed722da3567c91d5e47568bcba863fa4945d0a8d6fc76158628' -ExtractRoot (Join-Path $ToolRoot 'temurin-jre-21.0.13+9') -ExpectedRelativePath 'jdk-21.0.13+9-jre\bin\java.exe'
  Ensure-Archive -Name 'Neo4j Community 5.26.33 Windows x64' -Url 'https://dist.neo4j.org/neo4j-community-5.26.33-windows.zip' -ArchivePath (Join-Path $DownloadRoot 'neo4j-community-5.26.33-windows.zip') -ExpectedSha256 '380a4cfd26ea23ece35922ed1ab27c33503eebda634e4e58cdd6f908bd0166ff' -ExtractRoot $ToolRoot -ExpectedRelativePath 'neo4j-community-5.26.33\bin\neo4j.bat'
  if(-not (Test-Path (Join-Path $JavaHome 'bin\java.exe'))){throw 'Portable JRE is incomplete.'}
  if(-not (Test-Path (Join-Path $Neo4jHome 'bin\neo4j.bat'))){throw 'Portable Neo4j is incomplete.'}
  $env:JAVA_HOME=$JavaHome
  $env:PATH=(Join-Path $JavaHome 'bin')+';'+$env:PATH
  Invoke-Native -FilePath (Join-Path $JavaHome 'bin\java.exe') -Arguments @('-version') -WorkingDirectory $RepoRoot
  Invoke-Native -FilePath (Join-Path $Neo4jHome 'bin\neo4j.bat') -Arguments @('version') -WorkingDirectory $RepoRoot
}

function Start-LocalNeo4j {
  $neoRunRoot=Join-Path $RunRoot 'neo4j'
  $conf=Join-Path $neoRunRoot 'conf'
  $data=Join-Path $neoRunRoot 'data'
  $logs=Join-Path $neoRunRoot 'logs'
  $run=Join-Path $neoRunRoot 'run'
  New-Item -ItemType Directory -Force -Path $conf,$data,$logs,$run | Out-Null
  $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
  $listener.Start()
  $port=([Net.IPEndPoint]$listener.LocalEndpoint).Port
  $listener.Stop()
  $script:Neo4jConf=$conf
  $script:Neo4jData=$data
  $script:Neo4jRun=$run
  $script:Neo4jPort=$port
  $script:Neo4jOutput=Join-Path $neoRunRoot 'neo4j.stdout.log'
  $script:Neo4jError=Join-Path $neoRunRoot 'neo4j.stderr.log'
  $configLines=@(
    'server.default_listen_address=127.0.0.1',
    ('server.bolt.listen_address=127.0.0.1:'+$port),
    'server.bolt.enabled=true',
    'server.http.enabled=false',
    'server.https.enabled=false',
    ('server.directories.data='+$data.Replace('\','/')),
    ('server.directories.logs='+$logs.Replace('\','/')),
    ('server.directories.run='+$run.Replace('\','/')),
    'server.memory.heap.initial_size=256m',
    'server.memory.heap.max_size=512m',
    'server.memory.pagecache.size=128m'
  )
  [IO.File]::WriteAllLines((Join-Path $conf 'neo4j.conf'),[string[]]$configLines,[Text.UTF8Encoding]::new($false))
  $env:JAVA_HOME=$JavaHome
  $env:PATH=(Join-Path $JavaHome 'bin')+';'+$env:PATH
  $env:NEO4J_HOME=$Neo4jHome
  $env:NEO4J_CONF=$conf
  $env:NEO4J_URI='bolt://127.0.0.1:'+$port
  $env:NEO4J_USER='neo4j'
  $env:NEO4J_PASSWORD='neo4jpassword'
  $env:KHORA_NEO4J_TEST_URI=$env:NEO4J_URI
  $env:KHORA_NEO4J_TEST_USER='neo4j'
  $env:KHORA_NEO4J_TEST_PASS='neo4jpassword'
  Invoke-Native -FilePath (Join-Path $Neo4jHome 'bin\neo4j-admin.bat') -Arguments @('dbms','set-initial-password','neo4jpassword') -WorkingDirectory $RepoRoot
  $launcherScript=Join-Path $neoRunRoot 'start-neo4j-console.ps1'
  $launcherLines=@(
    ('$neoHome = '''+$Neo4jHome+''''),
    ('$javaHome = '''+$JavaHome+''''),
    ('$conf = '''+$conf+''''),
    '$env:JAVA_HOME = $javaHome',
    '$env:PATH = (Join-Path $javaHome ''bin'') + '';'' + $env:PATH',
    '$env:NEO4J_HOME = $neoHome',
    '$env:NEO4J_CONF = $conf',
    '& (Join-Path $neoHome ''bin\neo4j.bat'') console',
    'exit $LASTEXITCODE'
  )
  [IO.File]::WriteAllLines($launcherScript,[string[]]$launcherLines,[Text.UTF8Encoding]::new($false))
  $powershell=(Get-Command 'powershell.exe' -ErrorAction Stop).Source
  $script:Neo4jLaunchProcess=Start-Process -FilePath $powershell -ArgumentList @('-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',$launcherScript) -WorkingDirectory $Neo4jHome -WindowStyle Hidden -RedirectStandardOutput $script:Neo4jOutput -RedirectStandardError $script:Neo4jError -PassThru
  Write-StageLog ('Neo4j Community 5.26.33 isolated on 127.0.0.1:'+$port)
  $ready=$false
  for($attempt=0;$attempt -lt 75;$attempt++){
    $client=[Net.Sockets.TcpClient]::new()
    try{$task=$client.ConnectAsync('127.0.0.1',$port);if($task.Wait(750)-and $client.Connected){$ready=$true;break}}catch{}finally{$client.Dispose()}
    if($script:Neo4jLaunchProcess.HasExited){break}
    Start-Sleep -Seconds 1
  }
  if(-not $ready){
    $outTail=if(Test-Path $script:Neo4jOutput){Get-Content $script:Neo4jOutput -Tail 50|Out-String}else{'No stdout log.'}
    $errTail=if(Test-Path $script:Neo4jError){Get-Content $script:Neo4jError -Tail 50|Out-String}else{'No stderr log.'}
    throw ("Neo4j Bolt startup failed."+[Environment]::NewLine+"STDOUT:"+[Environment]::NewLine+$outTail+"STDERR:"+[Environment]::NewLine+$errTail)
  }
  Invoke-Native -FilePath (Join-Path $Neo4jHome 'bin\cypher-shell.bat') -Arguments @('-a',$env:NEO4J_URI,'-u','neo4j','-p','neo4jpassword','RETURN 1 AS ok') -WorkingDirectory $RepoRoot
  Write-StageLog 'Authenticated Cypher query passed against live Neo4j.'
}

function Stop-LocalNeo4j {
  if(-not $script:Neo4jPort){return}
  $port=[int]$script:Neo4jPort
  $escapedConf=[regex]::Escape($script:Neo4jConf)
  $all=Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
  $servers=@($all|Where-Object {$_.Name -eq 'java.exe' -and $_.CommandLine -match $escapedConf -and $_.CommandLine -match 'org\.neo4j\.server\.CommunityEntryPoint'})
  foreach($server in $servers){
    $parent=$all|Where-Object {$_.ProcessId -eq $server.ParentProcessId -and $_.Name -eq 'java.exe' -and $_.CommandLine -like ('*'+$Neo4jHome+'*')}|Select-Object -First 1
    Write-StageLog ('Stopping isolated Neo4j server PID '+$server.ProcessId)
    Stop-Process -Id $server.ProcessId -Force -ErrorAction SilentlyContinue
    if($parent){Stop-Process -Id $parent.ProcessId -Force -ErrorAction SilentlyContinue}
  }
  if($script:Neo4jLaunchProcess){
    try{Wait-Process -Id $script:Neo4jLaunchProcess.Id -Timeout 15 -ErrorAction SilentlyContinue}catch{}
    if(Get-Process -Id $script:Neo4jLaunchProcess.Id -ErrorAction SilentlyContinue){
      & (Join-Path $env:SystemRoot 'System32\taskkill.exe') /PID $script:Neo4jLaunchProcess.Id /T /F 2>&1|ForEach-Object{Write-StageLog ([string]$_)}
    }
  }
  $released=$false
  for($attempt=0;$attempt -lt 20;$attempt++){
    $listener=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if(-not $listener){$released=$true;break}
    Start-Sleep -Seconds 1
  }
  if(-not $released){
    $remaining=Get-CimInstance Win32_Process -ErrorAction SilentlyContinue|Where-Object {$_.Name -eq 'java.exe' -and $_.CommandLine -match $escapedConf}
    foreach($p in $remaining){Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue}
    Start-Sleep -Seconds 2
    $listener=Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if($listener){throw ('Neo4j port '+$port+' remains open. Temp data retained at '+$script:Neo4jData)}
    $released=$true
  }
  if(-not $released){throw ('Could not release Neo4j port '+$port)}
  if(-not $KeepArtifacts){
    if($script:Neo4jData -and (Test-Path $script:Neo4jData)){Remove-Item -LiteralPath $script:Neo4jData -Recurse -Force}
    if($script:Neo4jRun -and (Test-Path $script:Neo4jRun)){Remove-Item -LiteralPath $script:Neo4jRun -Recurse -Force}
  }
  Write-StageLog ('Neo4j stopped, port released; temp database removed=' + (-not $KeepArtifacts))
  $script:Neo4jLaunchProcess=$null
  $script:Neo4jPort=$null
  $env:NEO4J_URI=$script:PreviousNeo4jUri
  $env:NEO4J_USER=$script:PreviousNeo4jUser
  $env:NEO4J_PASSWORD=$script:PreviousNeo4jPassword
  $env:KHORA_NEO4J_TEST_URI=$script:PreviousKhoraNeo4jTestUri
  $env:KHORA_NEO4J_TEST_USER=$script:PreviousKhoraNeo4jTestUser
  $env:KHORA_NEO4J_TEST_PASS=$script:PreviousKhoraNeo4jTestPass
  $env:JAVA_HOME=$script:PreviousJavaHome
  $env:NEO4J_HOME=$script:PreviousNeo4jHome
  $env:NEO4J_CONF=$script:PreviousNeo4jConf
}

$transcriptStarted = $false
try {
  try {
    Start-Transcript -Path $DesktopLog -Force | Out-Null
    $transcriptStarted = $true
  } catch {
    $script:TranscriptStartError = $_.Exception.Message
    Write-Warning ('Desktop transcript unavailable; a run-local transcript will be assembled: ' + $script:TranscriptStartError)
  }
  Write-Host 'KHORA / HARMONIA — CI LOCAL INTEGRAL'
  Write-Host ('Repository: ' + $RepoRoot)
  Write-Host ('Run: ' + $RunId)
  Write-Host ('Report: ' + $ReportPath)

  Invoke-Stage -Name 'Preflight' -Action {
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'Harmonia\CI-LOCAL.ps1'))) { throw 'Harmonia\CI-LOCAL.ps1 missing.' }
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'kernel\pyproject.toml'))) { throw 'kernel\pyproject.toml missing.' }
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'api\tests'))) { throw 'api\tests missing.' }
    if (-not (Test-Path -LiteralPath (Join-Path $RepoRoot 'khora-web\package-lock.json'))) { throw 'khora-web\package-lock.json missing.' }
    Invoke-Native -FilePath 'node.exe' -Arguments @('--version') -WorkingDirectory $RepoRoot
    Invoke-Native -FilePath $NpmCmd -Arguments @('--version') -WorkingDirectory $RepoRoot
    Invoke-Native -FilePath 'py.exe' -Arguments @('-3.11','--version') -WorkingDirectory $RepoRoot
    Write-StageLog 'Repository structure and base runtimes found.'
  }

  if ($InstallDependencies) {
    Invoke-Stage -Name 'Install portable JRE and Neo4j Community' -Action {
      Ensure-PortableNeo4jToolchain
    }
    Invoke-Stage -Name 'Install Node 22 runtime' -Action {
      if (-not (Test-Path -LiteralPath $Node22Exe)) {
        if ($Offline) { throw 'Node 22 missing in offline mode.' }
        New-Item -ItemType Directory -Force -Path $Node22Root | Out-Null
        Invoke-Native -FilePath $NpmCmd -Arguments @('install','--prefix',$Node22Root,'--no-save','node@22.23.5') -WorkingDirectory $RepoRoot
      }
      if (-not (Test-Path -LiteralPath $Node22Exe)) { throw ('Node 22 package did not produce ' + $Node22Exe) }
      $node22Version = (& $Node22Exe --version | Out-String).Trim()
      if ($node22Version -ne 'v22.23.5') { throw ('Expected Node 22.23.5, got ' + $node22Version) }
      Invoke-Native -FilePath $Node22Exe -Arguments @('--version') -WorkingDirectory $RepoRoot
    }
    Invoke-Stage -Name 'Install Node 24 runtime' -Action {
      if (-not (Test-Path -LiteralPath $Node24Exe)) {
        if ($Offline) { throw 'Node 24 missing in offline mode.' }
        New-Item -ItemType Directory -Force -Path $Node24Root | Out-Null
        Invoke-Native -FilePath $NpmCmd -Arguments @('install','--prefix',$Node24Root,'--no-save','node@24.22.3') -WorkingDirectory $RepoRoot
      }
      if (-not (Test-Path -LiteralPath $Node24Exe)) { throw ('Node 24 package did not produce ' + $Node24Exe) }
      $node24Version = (& $Node24Exe --version | Out-String).Trim()
      if ($node24Version -ne 'v24.22.3') { throw ('Expected Node 24.22.3, got ' + $node24Version) }
      Invoke-Native -FilePath $Node24Exe -Arguments @('--version') -WorkingDirectory $RepoRoot
    }
    Invoke-Stage -Name 'Install Python 3.11 dependencies' -Action {
      if (-not (Test-Path -LiteralPath $PythonExe)) {
        Invoke-Native -FilePath 'py.exe' -Arguments @('-3.11','-m','venv',$PythonEnv) -WorkingDirectory $RepoRoot
      }
      if (-not (Test-Path -LiteralPath $PythonExe)) { throw 'Python 3.11 virtual environment was not created.' }
      Invoke-Native -FilePath $PythonExe -Arguments @('-m','pip','install','--disable-pip-version-check','-e','kernel/[ci]','ruff','pyright','pytest-mock','httpx') -WorkingDirectory $RepoRoot
    }
    Invoke-Stage -Name 'Install API dependencies' -Action {
      if (-not (Test-Path -LiteralPath $ApiPythonExe)) {
        Invoke-Native -FilePath 'py.exe' -Arguments @('-3.11','-m','venv',$ApiPythonEnv) -WorkingDirectory $RepoRoot
      }
      if (-not (Test-Path -LiteralPath $ApiPythonExe)) { throw 'API Python 3.11 virtual environment was not created.' }
      Invoke-Native -FilePath $ApiPythonExe -Arguments @('-m','pip','install','--disable-pip-version-check','-r','api/requirements.txt') -WorkingDirectory $RepoRoot
      Invoke-Native -FilePath $ApiPythonExe -Arguments @('-m','pip','install','--disable-pip-version-check','pytest','httpx') -WorkingDirectory $RepoRoot
    }
    Invoke-Stage -Name 'Install web dependencies' -Action {
      Add-NodeBinToPath -BinPath $Node22Bin
      $webRoot = Join-Path $RepoRoot 'khora-web'
      $nodeModules = Join-Path $webRoot 'node_modules'
      $lockHash = (Get-FileHash (Join-Path $webRoot 'package-lock.json') -Algorithm SHA256).Hash
      $nodeModulesItem = Get-Item -LiteralPath $nodeModules -Force -ErrorAction SilentlyContinue
      $reuseJunction = $false
      if ($nodeModulesItem -and $nodeModulesItem.LinkType -eq 'Junction') {
        $targetRoot = [string]$nodeModulesItem.Target[0]
        $targetLock = Join-Path (Split-Path -Parent $targetRoot) 'package-lock.json'
        if ((Test-Path $targetLock) -and (Get-FileHash $targetLock -Algorithm SHA256).Hash -eq $lockHash) {
          $reuseJunction = $true
          Write-StageLog ('Reusing node_modules junction; linked package-lock SHA-256 matches: ' + $targetRoot)
        } else {
          if ($Offline) { throw 'node_modules junction is stale and -Offline is active.' }
          & (Join-Path $env:SystemRoot 'System32\cmd.exe') /c rmdir $nodeModules
          if ($LASTEXITCODE -ne 0) { throw 'Could not remove stale node_modules junction.' }
        }
      }
      if (-not $reuseJunction -and -not (Test-Path -LiteralPath $nodeModules)) {
        if ($Offline) { throw 'khora-web dependencies are missing in offline mode.' }
        Invoke-Native -FilePath $NpmCmd -Arguments @('ci','--no-audit','--no-fund') -WorkingDirectory $webRoot
      }
      if (-not (Test-Path (Join-Path $nodeModules '.package-lock.json'))) { throw 'node_modules tree is incomplete.' }
    }
  } else {
    Invoke-Stage -Name 'Dependency installation and offline readiness' -Action {
      $required = @($PythonExe,$ApiPythonExe,$Node22Exe,$Node24Exe,(Join-Path $Neo4jHome 'bin\neo4j.bat'),(Join-Path $JavaHome 'bin\java.exe'),(Join-Path $RepoRoot 'khora-web\node_modules\.package-lock.json'))
      foreach ($requiredPath in $required) {
        if (-not (Test-Path -LiteralPath $requiredPath)) { throw ('Local dependency missing: ' + $requiredPath + '. Run once with -InstallDependencies.') }
      }
      Invoke-Native -FilePath $PythonExe -Arguments @('-m','pip','check') -WorkingDirectory $RepoRoot
      Invoke-Native -FilePath $ApiPythonExe -Arguments @('-m','pip','check') -WorkingDirectory $RepoRoot
      Invoke-Native -FilePath $Node22Exe -Arguments @('--version') -WorkingDirectory $RepoRoot
      Invoke-Native -FilePath $Node24Exe -Arguments @('--version') -WorkingDirectory $RepoRoot
      $env:JAVA_HOME = $JavaHome
      $env:PATH = (Join-Path $JavaHome 'bin') + ';' + $env:PATH
      Invoke-Native -FilePath (Join-Path $JavaHome 'bin\java.exe') -Arguments @('-version') -WorkingDirectory $RepoRoot
      Invoke-Native -FilePath (Join-Path $Neo4jHome 'bin\neo4j.bat') -Arguments @('version') -WorkingDirectory $RepoRoot
    }
  }

  Invoke-Stage -Name 'Harmonia contract and tests' -Action {
    & (Join-Path $RepoRoot 'Harmonia\CI-LOCAL.ps1')
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw ('Harmonia CI exit code ' + $LASTEXITCODE) }
  }

  $pythonReady = Test-Path -LiteralPath $PythonExe
  $nodeModulesReady = Test-Path -LiteralPath (Join-Path $RepoRoot 'khora-web\node_modules')
  $node22Ready = Test-Path -LiteralPath $Node22Exe
  $node24Ready = Test-Path -LiteralPath $Node24Exe

  # Match the calidad job environment in .github/workflows/ci.yml.
  $env:NEO4J_URI = 'bolt://localhost:7687'
  $env:NEO4J_USER = 'neo4j'
  $env:NEO4J_PASSWORD = 'neo4jpassword'
  $env:KHORA_NEO4J_TEST_URI = 'bolt://localhost:7687'
  $env:KHORA_NEO4J_TEST_USER = 'neo4j'
  $env:KHORA_NEO4J_TEST_PASS = 'neo4jpassword'
  $env:PYTHONPATH = $RepoRoot + ';' + (Join-Path $RepoRoot 'kernel\src')
  $env:KHORA_EMB_OFFLINE = '1'

  if ($pythonReady) {
    Invoke-Stage -Name 'Kernel lint Ruff' -Action {
      Invoke-Native -FilePath $PythonExe -Arguments @('-m','ruff','check','.') -WorkingDirectory (Join-Path $RepoRoot 'kernel')
    }
    Invoke-Stage -Name 'Kernel static typing Pyright' -Action {
      $env:PATH = (Join-Path $PythonEnv 'Scripts') + ';' + $env:PATH
      Invoke-Native -FilePath $PythonExe -Arguments @('-m','pyright') -WorkingDirectory (Join-Path $RepoRoot 'kernel')
    }
  } else {
    Invoke-Stage -Name 'Kernel lint Ruff' -Action {} -BlockedReason 'Python 3.11 CI virtual environment is missing.'
    Invoke-Stage -Name 'Kernel static typing Pyright' -Action {} -BlockedReason 'Python 3.11 CI virtual environment is missing.'
  }

  if ($pythonReady) {
    Invoke-Stage -Name 'Kernel Neo4j integration and pytest (portable local runtime)' -Action {
      $env:PYTHONPATH = $RepoRoot + ';' + (Join-Path $RepoRoot 'kernel\src')
      $env:KHORA_EMB_OFFLINE = '1'
      $kernelDataRoot = Join-Path $RunRoot 'kernel-data'
      $env:KHORA_LEIDEN_MANIFEST_DIR = Join-Path $kernelDataRoot 'epistwin'
      $env:KHORA_EMB_INDEX_FILE = Join-Path $kernelDataRoot 'faiss_pkg.idx'
      $env:KHORA_EMB_MAP_FILE = Join-Path $kernelDataRoot 'faiss_pkg_map.json'
      New-Item -ItemType Directory -Force -Path $kernelDataRoot,(Join-Path $kernelDataRoot 'epistwin') | Out-Null
      Write-StageLog ('Kernel writable data redirected to this run: ' + $kernelDataRoot)
      try {
        Start-LocalNeo4j
        $kernelSetupScript = Join-Path $RepoRoot 'kernel\scripts\setup_neo4j.py'
        $kernelProjectConfig = Join-Path $RepoRoot 'kernel\pyproject.toml'
        Invoke-Native -FilePath $PythonExe -Arguments @($kernelSetupScript) -WorkingDirectory $kernelDataRoot
        $kernelSourceTests = Join-Path $RepoRoot 'kernel\src'
        $kernelContractTests = Join-Path $RepoRoot 'kernel\tests'
        Invoke-Native -FilePath $PythonExe -Arguments @('-m','pytest','-c',$kernelProjectConfig,$kernelSourceTests,$kernelContractTests) -WorkingDirectory $kernelDataRoot
      } finally {
        Stop-LocalNeo4j
      }
    }
  } else {
    Invoke-Stage -Name 'Kernel Neo4j integration and pytest (portable local runtime)' -Action {} -BlockedReason 'Python 3.11 kernel environment is missing.'
  }

  if (Test-Path -LiteralPath $ApiPythonExe) {
    Invoke-Stage -Name 'API dependency and test suite' -Action {
      Invoke-Native -FilePath $ApiPythonExe -Arguments @('-m','pytest','api/tests/') -WorkingDirectory $RepoRoot
    }
  } else {
    Invoke-Stage -Name 'API dependency and test suite' -Action {} -BlockedReason 'API Python 3.11 virtual environment is missing.'
  }

  if ($nodeModulesReady -and $node22Ready) {
    Invoke-Stage -Name 'Web quality contracts and unit tests (Node 22)' -Action {
      Add-NodeBinToPath -BinPath $Node22Bin
      Invoke-Native -FilePath $Node22Exe -Arguments @('--version') -WorkingDirectory $RepoRoot
      Invoke-Native -FilePath $NpmCmd -Arguments @('run','typecheck') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
      Invoke-Native -FilePath $NpmCmd -Arguments @('run','ui-review:check') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
      Invoke-Native -FilePath $NpmCmd -Arguments @('run','ui:contract') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
      Invoke-Native -FilePath $NpmCmd -Arguments @('run','test:unit') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
    }
  } else {
    Invoke-Stage -Name 'Web quality contracts and unit tests (Node 22)' -Action {} -BlockedReason 'khora-web/node_modules or the isolated Node 22 runtime is missing.'
  }

  if ($nodeModulesReady -and $node24Ready) {
    Add-NodeBinToPath -BinPath $Node24Bin
    $env:OIDC_ISSUER_URL = 'http://localhost:8080/realms/mock'
    $env:AUTH_SECRET = 'mock-secret'
    $env:PLAYWRIGHT_TEST_RUN = '1'
    $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $env:LOCALAPPDATA 'KHORA-CI\playwright-browsers'
    Invoke-Stage -Name 'Web production build (Node 24)' -Action {
      Invoke-Native -FilePath $Node24Exe -Arguments @('--version') -WorkingDirectory $RepoRoot
      Invoke-Native -FilePath $NpmCmd -Arguments @('run','build') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
    }
    $portListener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0)
    $portListener.Start()
    $playwrightPort=([Net.IPEndPoint]$portListener.LocalEndpoint).Port
    $portListener.Stop()
    $env:CI='true'
    $env:PLAYWRIGHT_PORT=[string]$playwrightPort
    $env:PLAYWRIGHT_BASE_URL='http://localhost:'+$playwrightPort
    $env:PLAYWRIGHT_SKIP_BUILD='1'
    Write-StageLog ('Playwright isolated endpoint: '+$env:PLAYWRIGHT_BASE_URL+'; CI disables reuse of any existing local web server.')
    Invoke-Stage -Name 'Install Playwright Chromium' -Action {
      $playwrightCli=Join-Path $RepoRoot 'khora-web\node_modules\.bin\playwright.cmd'
      if(-not (Test-Path -LiteralPath $playwrightCli -PathType Leaf)){throw ('Local Playwright CLI missing: '+$playwrightCli)}
      if($Offline){
        $browserRoot=$env:PLAYWRIGHT_BROWSERS_PATH
        $chrome=Get-ChildItem -LiteralPath $browserRoot -Filter 'chrome.exe' -File -Recurse -ErrorAction SilentlyContinue | Where-Object {$_.FullName -match 'chromium-[^\\]+\\chrome-win64\\chrome\.exe'} | Select-Object -First 1
        $headless=Get-ChildItem -LiteralPath $browserRoot -Filter 'chrome-headless-shell.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        $ffmpeg=Get-ChildItem -LiteralPath $browserRoot -Filter 'ffmpeg-win64.exe' -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if(-not $chrome -or -not $headless -or -not $ffmpeg){throw 'Offline Chromium cache is incomplete (Chrome, headless shell or ffmpeg missing).'}
        Write-StageLog 'Offline mode: cached Chromium, headless shell and ffmpeg verified; no browser download attempted.'
      }else{
        Invoke-Native -FilePath $playwrightCli -Arguments @('install','chromium') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
      }
    }
    Invoke-Stage -Name 'khora-ok full Playwright E2E' -Action {
      Invoke-Native -FilePath $NpmCmd -Arguments @('run','e2e') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
    }
    Invoke-Stage -Name 'khora-ok Chromium smoke regression' -Action {
      $playwrightCli=Join-Path $RepoRoot 'khora-web\node_modules\.bin\playwright.cmd'
      Invoke-Native -FilePath $playwrightCli -Arguments @('test','tests/regression/smoke.spec.ts','--project=chromium') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
    }
    Add-NodeBinToPath -BinPath $Node22Bin
    Invoke-Stage -Name 'UI Quality selected E2E' -Action {
      Invoke-Native -FilePath $Node22Exe -Arguments @('--version') -WorkingDirectory $RepoRoot
      Invoke-Native -FilePath $NpmCmd -Arguments @('run','e2e','--','e2e/shell-v2.spec.ts','e2e/ui-quality.spec.ts','e2e/contracts/dictado-observability-checkpoints.spec.ts') -WorkingDirectory (Join-Path $RepoRoot 'khora-web')
    }
  } else {
    $reason = 'khora-web/node_modules or the isolated Node 24 runtime is missing.'
    foreach ($name in @('Web production build (Node 24)','Install Playwright Chromium','khora-ok full Playwright E2E','khora-ok Chromium smoke regression','UI Quality selected E2E')) {
      Invoke-Stage -Name $name -Action {} -BlockedReason $reason
    }
  }
}
finally {
  $env:PATH = $script:PreviousPath
  $env:OIDC_ISSUER_URL = $script:PreviousOidcIssuer
  $env:AUTH_SECRET = $script:PreviousAuthSecret
  $env:PLAYWRIGHT_TEST_RUN = $script:PreviousPlaywrightRun
  $env:NEO4J_URI = $script:PreviousNeo4jUri
  $env:NEO4J_USER = $script:PreviousNeo4jUser
  $env:NEO4J_PASSWORD = $script:PreviousNeo4jPassword
  $env:KHORA_NEO4J_TEST_URI = $script:PreviousKhoraNeo4jTestUri
  $env:KHORA_NEO4J_TEST_USER = $script:PreviousKhoraNeo4jTestUser
  $env:KHORA_NEO4J_TEST_PASS = $script:PreviousKhoraNeo4jTestPass
  $env:PYTHONPATH = $script:PreviousPythonPath
  $env:KHORA_EMB_OFFLINE = $script:PreviousEmbOffline
  $env:KHORA_LEIDEN_MANIFEST_DIR = $script:PreviousLeidenManifestDir
  $env:KHORA_EMB_INDEX_FILE = $script:PreviousEmbIndexFile
  $env:KHORA_EMB_MAP_FILE = $script:PreviousEmbMapFile
$env:JAVA_HOME = $script:PreviousJavaHome
$env:NEO4J_HOME = $script:PreviousNeo4jHome
$env:NEO4J_CONF = $script:PreviousNeo4jConf
$env:PLAYWRIGHT_BROWSERS_PATH = $script:PreviousPlaywrightBrowsersPath
  $env:CI = $script:PreviousCI
  $env:PLAYWRIGHT_PORT = $script:PreviousPlaywrightPort
  $env:PLAYWRIGHT_BASE_URL = $script:PreviousPlaywrightBaseUrl
  $env:PLAYWRIGHT_SKIP_BUILD = $script:PreviousPlaywrightSkipBuild

  $overall = 'PASS'
  if ($script:StageResults.Count -eq 0) {
    $overall = 'FAIL'
  } elseif (@($script:StageResults | Where-Object { $_.status -eq 'FAIL' }).Count -gt 0) {
    $overall = 'FAIL'
  } elseif (@($script:StageResults | Where-Object { $_.status -eq 'BLOCKED' }).Count -gt 0) {
    $overall = 'BLOCKED'
  }

  $report = [pscustomobject]@{
    schema = 'khora.ci.local.integral.v2'
    runId = $RunId
    repository = $RepoRoot
    branch = $null
    commit = $null
    overall = $overall
    worktreeDirty = (@(& git -C $RepoRoot status --porcelain 2>$null).Count -gt 0)
    completedAtUtc = [DateTime]::UtcNow.ToString('o')
    stageResults = @($script:StageResults)
    transcriptStatus = if ($transcriptStarted) { 'DESKTOP_TRANSCRIPT' } else { 'RUN_LOCAL_FALLBACK' }
    transcriptStartError = $script:TranscriptStartError
    logRoot = $LogRoot
  }
  try {
    $report.branch = (& git -C $RepoRoot branch --show-current 2>$null | Out-String).Trim()
    $report.commit = (& git -C $RepoRoot rev-parse HEAD 2>$null | Out-String).Trim()
  } catch {}

  $reportJson = $report | ConvertTo-Json -Depth 8
  [IO.File]::WriteAllText($ReportPath,$reportJson,[Text.UTF8Encoding]::new($false))
  $reportHash = (Get-FileHash -LiteralPath $ReportPath -Algorithm SHA256).Hash
  $markdownLines = @(
    '# KHORA / HARMONIA - Local CI',
    '',
    ('- Result: ' + $overall),
    ('- Run: ' + $RunId),
    ('- Branch: ' + [string]$report.branch),
    ('- Commit: ' + [string]$report.commit),
    ('- Worktree dirty: ' + [string]$report.worktreeDirty),
    ('- Completed UTC: ' + [string]$report.completedAtUtc),
    '',
    '| Stage | Status | Duration (s) | Detail |',
    '|---|---:|---:|---|'
  )
  foreach ($stage in $script:StageResults) {
    $safeDetail = ([string]$stage.detail).Replace('|','/')
    $duration = 0.0
    $durationProperty = $stage.PSObject.Properties['durationSeconds']
    if ($null -ne $durationProperty -and $null -ne $durationProperty.Value) {
      $duration = [double]$durationProperty.Value
    } else {
      $startProperty = $stage.PSObject.Properties['startedAtUtc']
      $endProperty = $stage.PSObject.Properties['completedAtUtc']
      if ($null -ne $startProperty -and $null -ne $endProperty) {
        $duration = [Math]::Round(([DateTime]::Parse([string]$endProperty.Value) - [DateTime]::Parse([string]$startProperty.Value)).TotalSeconds,2)
      }
    }
    $markdownLines += ('| ' + $stage.name + ' | ' + $stage.status + ' | ' + $duration + ' | ' + $safeDetail + ' |')
  }
  $markdownLines += ''
  $markdownLines += ('SHA-256 JSON: ' + $reportHash)
  $markdownLines += ''
  $markdownLines += ('Detailed logs: ' + $LogRoot)
  [IO.File]::WriteAllLines($MarkdownReportPath,[string[]]$markdownLines,[Text.UTF8Encoding]::new($false))
  Write-Host ('CI_LOCAL_INTEGRAL_RESULT=' + $overall)
  Write-Host ('CI_LOCAL_INTEGRAL_REPORT=' + $ReportPath)
  Write-Host ('CI_LOCAL_INTEGRAL_MARKDOWN=' + $MarkdownReportPath)
  Write-Host ('CI_LOCAL_INTEGRAL_SHA256=' + $reportHash)
  if ($transcriptStarted) {
    Stop-Transcript | Out-Null
  } else {
    $combined = New-Object System.Collections.Generic.List[string]
    $combined.Add('KHORA CI LOCAL INTEGRAL — FALLBACK TRANSCRIPT')
    $combined.Add('Desktop Start-Transcript error: ' + $script:TranscriptStartError)
    foreach ($logFile in (Get-ChildItem -LiteralPath $LogRoot -File -Filter '*.log' | Sort-Object Name)) {
      $combined.Add('')
      $combined.Add('===== ' + $logFile.Name + ' =====')
      foreach ($logLine in (Get-Content -LiteralPath $logFile.FullName)) { $combined.Add([string]$logLine) }
    }
    [System.IO.File]::WriteAllLines($script:FallbackTranscriptPath,$combined.ToArray(),(New-Object System.Text.UTF8Encoding($false)))
    try {
      Copy-Item -LiteralPath $script:FallbackTranscriptPath -Destination $DesktopLog -Force
    } catch {
      Write-Warning ('Could not replace Desktop log.txt: ' + $_.Exception.Message)
    }
  }
}

if ($overall -ne 'PASS') {
  throw ('CI-LOCAL-INTEGRAL-' + $overall + ': inspect ' + $ReportPath)
}
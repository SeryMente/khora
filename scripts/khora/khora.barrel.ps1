# KHORA EP Medio v1.0 - barril contractual
if(-not$script:GATE_PATH){throw'El barril solo se carga desde khora.ps1.'}
$script:KHORA_MODULES=@('00-config.ps1','01-realuser.ps1','02-logging.ps1','03-hud.ps1','04-ui.ps1','05-efs.ps1','06-token.ps1','07-git-wip.ps1','08-deps.ps1','09-chrome.ps1','10-guardian.ps1','11-cleanup.ps1','12-handoff.ps1','13-session.ps1','14-deploy.ps1','15-main.ps1','90-legacy.ps1')
foreach($name in$script:KHORA_MODULES){$path=Join-Path(Join-Path$script:GATE_DIR'modules')$name;if(-not(Test-Path$path)){throw"Falta modulo: $name"};.$path}

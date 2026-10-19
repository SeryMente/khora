const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=process.argv[2],ctx=JSON.parse(fs.readFileSync(path.join(root,'context.json'),'utf8'));
const env={...process.env,GH_CONFIG_DIR:ctx.ghConfig,GH_PROMPT_DISABLED:'1',GH_BROWSER:'echo',npm_config_cache:path.join(root,'npm-cache'),DO_NOT_TRACK:'1',VERCEL_TELEMETRY_DISABLED:'1'};
const source='81acf4cdac15ddbcca2151727754563887b8fff8',receipt={source,scope:'Windows isolated synthetic core and bridge only; no production, real factors or corpus',stages:{},state:'WAITING_FOR_GITHUB'};
const result=path.join(root,'private-cipher-windows-results.json');
const save=()=>fs.writeFileSync(result,JSON.stringify(receipt,null,2));save();
function run(exe,args,opts={}){return cp.spawnSync(exe,args,{env,windowsHide:true,timeout:180000,maxBuffer:64*1024*1024,...opts});}
const delay=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{try{
 const deadline=Date.now()+10*60*1000;let ok=false;
 while(Date.now()<deadline){const r=run(ctx.gh,['api','repos/SeryMente/khora','--jq','.private'],{encoding:'utf8',timeout:15000});if(r.status===0&&r.stdout.trim()==='true'){ok=true;break;}await delay(5000);}
 if(!ok)throw new Error('WAIT_TIMEOUT_GITHUB_AUTHORIZATION');
 receipt.state='ACQUIRING_EXACT_SOURCE';save();
 const a=run(ctx.gh,['api','repos/SeryMente/khora/zipball/'+source],{encoding:null,timeout:180000});if(a.status!==0)throw new Error('ARCHIVE_ACQUISITION_FAILED');
 const zip=path.join(root,'source-'+source+'.zip');fs.writeFileSync(zip,a.stdout);receipt.archiveSha256=crypto.createHash('sha256').update(a.stdout).digest('hex');
 const dest=path.join(root,'isolated-source');if(fs.existsSync(dest))throw new Error('EXTRACTION_DESTINATION_EXISTS');
 const ps='$ErrorActionPreference="Stop"; Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::ExtractToDirectory($env:KHORA_ZIP,$env:KHORA_DEST)';
 const x=run('powershell.exe',['-NoProfile','-NonInteractive','-Command',ps],{encoding:'utf8',env:{...env,KHORA_ZIP:zip,KHORA_DEST:dest}});if(x.status!==0)throw new Error('ARCHIVE_EXTRACTION_FAILED');
 const dirs=fs.readdirSync(dest,{withFileTypes:true}).filter(d=>d.isDirectory());if(dirs.length!==1)throw new Error('AMBIGUOUS_SOURCE');
 const repo=path.join(dest,dirs[0].name),canon=fs.readFileSync(path.join(repo,'docs/frentes/llavero-harmonia/OBJETO-CANONICO.md'));
 const blob=crypto.createHash('sha1').update(Buffer.from('blob '+canon.length+'\0')).update(canon).digest('hex');if(blob!=='ae89d71fe80563b1c1c6eb7add5a7bb5e6608f27')throw new Error('CANONICAL_SOURCE_MISMATCH');
 receipt.canonicalBlob=blob;receipt.repository=repo;receipt.state='TESTING';save();
 const cwd=path.join(repo,'khora-web','portable-vault'),npm=path.join(path.dirname(ctx.node),'node_modules','npm','bin','npm-cli.js');
 for(const [stage,args] of [['install',['ci','--no-audit','--no-fund']],['syntax',['run','check']],['core-bridge',['test']]]){
  const r=run(ctx.node,[npm,...args],{cwd,encoding:'utf8'});fs.writeFileSync(path.join(root,'windows-'+stage+'.log'),(r.stdout||'')+(r.stderr||''));
  receipt.stages[stage]={exit:r.status,signal:r.signal,error:r.error?.code||null};save();if(r.status!==0)throw new Error('VALIDATION_FAILED:'+stage);
 }
 receipt.state='PASSED_SYNTHETIC_CORE_BRIDGE_WINDOWS_ONLY';receipt.routes='NOT_RUN';receipt.generalGate='NOT_RUN';save();console.log(JSON.stringify(receipt));
}catch(e){receipt.state='BLOCKED';receipt.blocker=e.message;save();console.log(JSON.stringify(receipt));process.exitCode=1;}})();

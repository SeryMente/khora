const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const root=process.argv[2],c=JSON.parse(fs.readFileSync(path.join(root,'context.json'),'utf8')),prior=JSON.parse(fs.readFileSync(path.join(root,'private-cipher-windows-results.json'),'utf8'));
const env={...process.env,GH_CONFIG_DIR:c.ghConfig,GH_PROMPT_DISABLED:'1',PATH:path.dirname(c.gh)+path.delimiter+path.dirname(c.node)+path.delimiter+process.env.PATH,npm_config_cache:path.join(root,'npm-cache'),VERCEL_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1'};
const receipt={scope:'isolated synthetic prebuild and routes only; no production migration or deployment',source:prior.source,stages:{}};
function run(exe,args,opts={}){return cp.spawnSync(exe,args,{env,encoding:'utf8',timeout:360000,maxBuffer:32*1024*1024,windowsHide:true,...opts});}
function save(){fs.writeFileSync(path.join(root,'independent-gates-results.json'),JSON.stringify(receipt,null,2));}
const npm=path.join(path.dirname(c.node),'node_modules/npm/bin/npm-cli.js'),cwd=path.join(prior.repository,'khora-web');
for(const [stage,args] of [['install-web',['ci','--no-audit','--no-fund']],['prebuild',['run','prebuild']],['routes',['--prefix','portable-vault','run','test:routes']]]){
 const r=run(c.node,[npm,...args],{cwd});fs.writeFileSync(path.join(root,'independent-'+stage+'.log'),(r.stdout||'')+(r.stderr||''));receipt.stages[stage]={exit:r.status,error:r.error?.code||null,signal:r.signal};save();console.log(JSON.stringify({stage,...receipt.stages[stage]}));if(stage==='install-web'&&r.status!==0)break;
}
console.log(JSON.stringify(receipt));

const ts=require(process.env.TYPESCRIPT_MODULE||'typescript');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.KHORA_WEB_ROOT||'khora-web'),target=path.join(root,'tests/unit/blog-text-workflow.test.ts');
const original=fs.readFileSync(target,'utf8'),before='assert.equal(next.preview,null);',after='const initialPreview=next.preview;assert.equal(initialPreview,null);';
if(original.includes(after))throw Error('SAFE_STOP_ALREADY_FIXED_USE_BASELINE_SOURCE');if(original.split(before).length!==2)throw Error('SAFE_STOP_NON_UNIQUE_PATCH');
const read=ts.readConfigFile(path.join(root,'tsconfig.json'),ts.sys.readFile);if(read.error)throw Error('SAFE_STOP_CONFIG');
const parsed=ts.parseJsonConfigFileContent(read.config,ts.sys,root);const options={...parsed.options,incremental:false,...(process.env.TYPES_ROOT?{typeRoots:[process.env.TYPES_ROOT]}:{}),types:['node']};
function diagnostics(text){const host=ts.createCompilerHost(options);const base=host.readFile;host.readFile=file=>path.resolve(file)===target?text:base(file);const p=ts.createProgram([target],options,host);return ts.getPreEmitDiagnostics(p).map(d=>({code:d.code,file:d.file?path.relative(root,d.file.fileName):null,line:d.file&&d.start!==undefined?d.file.getLineAndCharacterOfPosition(d.start).line+1:null,message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));}
const baseline=diagnostics(original),fixed=diagnostics(original.replace(before,after));
const report={scope:'focal import closure using exact repository tsconfig compiler options, NOT full repository typecheck or Next build',typescript:ts.version,baseline,fixed,valid:baseline.length===1&&baseline[0].code===2339&&fixed.length===0};
fs.writeFileSync(path.join(__dirname,'types-causal.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(!report.valid)process.exit(1);fs.writeFileSync(target,original.replace(before,after));

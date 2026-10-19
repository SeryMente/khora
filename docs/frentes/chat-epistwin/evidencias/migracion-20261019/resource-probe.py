import os,sys,pathlib,subprocess,urllib.request,urllib.error,time,json,tempfile,secrets,signal
r=pathlib.Path('/data/chat-ent01');src=r/'source';api=src/'api/main.py';api.parent.mkdir(exist_ok=True);api.write_text(json.load(open('/data/.agent-service/files/171ce075-2eaa-425d-8d98-bf5642f2a12b/tool-result'))['content'][1]['resource']['text'])
run=pathlib.Path(tempfile.mkdtemp(prefix='owui-probe.',dir=r));app=run/'app.py';app.write_text('import api.main\nimport faiss, numpy, networkx, igraph, leidenalg, neo4j\nfrom khora_kernel.engine import core\nfrom open_webui.main import app\n')
env=os.environ.copy();env.update({'PYTHONPATH':str(src)+':'+str(src/'kernel/src')+':'+str(run),'DATA_DIR':str(run/'data'),'DATABASE_URL':'sqlite:///'+str(run/'ui.sqlite'),'WEBUI_SECRET_KEY':secrets.token_urlsafe(48),'FROM_INIT_PY':'true','ENV':'prod','USE_SLIM_DOCKER':'true','OFFLINE_MODE':'true','HF_HUB_OFFLINE':'1','TRANSFORMERS_OFFLINE':'1','ENABLE_OPENAI_API':'false','ENABLE_OLLAMA_API':'false','ENABLE_SIGNUP':'false','ENABLE_MEMORIES':'false','DO_NOT_TRACK':'true','SCARF_NO_ANALYTICS':'true','ANONYMIZED_TELEMETRY':'false','WEBUI_AUTH':'true','ENABLE_VERSION_UPDATE_CHECK':'false','UVICORN_WORKERS':'1'})
result={'type':'isolated_official_openwebui_idle_resource_probe_not_production','openwebui':'0.12.3 official wheel + official slim requirements','api':'import of unmodified api.main only; API lifespan/Neo4j connectivity NOT run','listen':'127.0.0.1:18519','no_real_provider_or_personal_data':True,'not_proven':['Render cgroup fit','combined production lifespan','load peak','authenticated binding','runtime secret and durable PostgreSQL','production deployment']}
log=open(run/'server.log','w');proc=subprocess.Popen([str(r/'owui/bin/python'),'-m','uvicorn','app:app','--host','127.0.0.1','--port','18519'],env=env,cwd=run,stdout=log,stderr=subprocess.STDOUT,start_new_session=True);samples=[];responses={}
try:
 deadline=time.monotonic()+120
 while time.monotonic()<deadline:
  if proc.poll() is not None:break
  status=pathlib.Path(f'/proc/{proc.pid}/status')
  if status.exists():
   values={x.split(':')[0]:x.split(':')[1].strip() for x in status.read_text().splitlines() if x.startswith(('VmRSS:','VmHWM:'))};samples.append(values)
  try:
   with urllib.request.urlopen('http://127.0.0.1:18519/health',timeout=1) as response:
    if response.status==200:responses['/health']=response.status;break
  except (urllib.error.URLError,TimeoutError):pass
  time.sleep(1)
 if responses:
  for path in ['/','/api/v1/auths/','/api/config']:
   try:
    with urllib.request.urlopen('http://127.0.0.1:18519'+path,timeout=10) as response:responses[path]=response.status
   except urllib.error.HTTPError as error:responses[path]=error.code
  for _ in range(5):
   status=pathlib.Path(f'/proc/{proc.pid}/status')
   if status.exists():samples.append({x.split(':')[0]:x.split(':')[1].strip() for x in status.read_text().splitlines() if x.startswith(('VmRSS:','VmHWM:'))})
   time.sleep(1)
 result.update({'responses':responses,'peak_rss_kib_observed':max([int(x.get('VmRSS','0 kB').split()[0]) for x in samples] or [0]),'peak_hwm_kib_observed':max([int(x.get('VmHWM','0 kB').split()[0]) for x in samples] or [0]),'startup_process_exit':proc.poll(),'success':responses.get('/health')==200 and responses.get('/api/v1/auths/')==401})
finally:
 if proc.poll() is None:
  os.killpg(proc.pid,signal.SIGTERM)
  try:proc.wait(timeout=10)
  except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait(timeout=5)
 log.close();result['probe_process_stopped']=proc.poll() is not None;result['log_file']=str(run/'server.log');(r/'resource-probe-result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
 if not result.get('success'):print('BOUNDED_LOG_TAIL\n'+'\n'.join((run/'server.log').read_text().splitlines()[-12:]))

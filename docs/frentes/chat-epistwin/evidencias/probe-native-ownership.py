import os,sys,json,secrets,time,hashlib
from pathlib import Path
from urllib.parse import urlencode
url=os.environ['KHORA_TEST_HISTORY_POSTGRES']
assert '127.0.0.1' in url
os.environ.update(KHORA_API_KEY='k'*48,KHORA_CHAT_WEBUI_SECRET='s'*48,KHORA_CHAT_HISTORY_DATABASE_URL=url,KHORA_CHAT_WEBUI_DATABASE_URL=url,DATA_DIR=os.environ['KHORA_PROBE_DATA_DIR'],STATIC_DIR=os.environ['KHORA_PROBE_DATA_DIR']+'/static',ANONYMIZED_TELEMETRY='false',DO_NOT_TRACK='true',SCARF_NO_ANALYTICS='true',ENABLE_SIGNUP='false')
from api.chat_runtime import configure_native_environment, register_native_pipe
configure_native_environment()
os.environ['ENABLE_DB_MIGRATIONS']='true' # disposable migration role only
from open_webui.main import app as native
from api.chat_security import ChatIdentityGuard,signature
from fastapi import FastAPI
from starlette.testclient import TestClient
from khora_kernel.integrations.openwebui_host import OpenWebUIHostBinding

outer=FastAPI();outer.mount('/khora-chat',ChatIdentityGuard(native,key='k'*48))
checks={}
def request(client,subject,path,method='GET',body=None,token=None):
 data=json.dumps(body).encode() if body is not None else b''
 stamp=str(int(time.time()));full='/khora-chat'+path
 headers={'X-Khora-Key':'k'*48,'X-Khora-Chat-Subject':subject,'X-Khora-Chat-Timestamp':stamp,'X-Khora-Chat-Signature':signature('k'*48,method,full,subject,stamp,data),'Content-Type':'application/json'}
 if token:headers['Authorization']='Bearer '+token
 return client.request(method,full,content=data,headers=headers)

async def prepare():
 await register_native_pipe()
import asyncio
with TestClient(native) as bootstrap:
 asyncio.run(prepare())
 with TestClient(outer) as client:
  a='a'*64+'@khora.invalid';b='b'*64+'@khora.invalid'
  checks['direct_render_rejected']=client.get('/khora-chat/api/config').status_code==401
  config=request(client,a,'/api/config');checks['config']=config.status_code
  first=request(client,a,'/api/v1/auths/signin','POST',{'email':'','password':''})
  if first.status_code!=200:raise RuntimeError('signin A failed '+str(first.status_code)+' '+first.text[:250])
  user_a=first.json();checks['native_auto_user_a']=user_a['role']=='user'
  second=request(client,b,'/api/v1/auths/signin','POST',{'email':'','password':''})
  if second.status_code!=200:raise RuntimeError('signin B failed '+str(second.status_code)+' '+second.text[:250])
  user_b=second.json();checks['native_auto_user_b']=user_b['role']=='user'
  foreign=request(client,b,'/api/v1/auths/','GET',token=user_a['token']);checks['foreign_token_rejected']=foreign.status_code==401
  made=request(client,a,'/api/v1/chats/new','POST',{'chat':{'title':'Artificial isolation probe','history':{'messages':{},'currentId':None},'messages':[]}},user_a['token'])
  if made.status_code!=200:raise RuntimeError('new chat failed '+str(made.status_code)+' '+made.text[:250])
  chat_id=made.json()['id'];checks['durable_chat_created']=bool(chat_id)
  own=request(client,a,'/api/v1/chats/'+chat_id,token=user_a['token']);checks['owner_read']=own.status_code==200
  foreign=request(client,b,'/api/v1/chats/'+chat_id,token=user_b['token']);checks['foreign_chat_rejected']=foreign.status_code in {401,403,404}
  host=OpenWebUIHostBinding(puerto_llm=object(),memoria=object(),db_path=url)
  binding=asyncio.run(host(user_id=user_a['id'],chat_id=chat_id));checks['native_ownership_binding']=binding.user_id==user_a['id']
  try:asyncio.run(host(user_id=user_b['id'],chat_id=chat_id));checks['foreign_binding_rejected']=False
  except PermissionError:checks['foreign_binding_rejected']=True
  models=request(client,a,'/api/models',token=user_a['token']);checks['models_status']=models.status_code
  checks['native_pipe_model_visible']=models.status_code==200 and any(m.get('id')=='khora_epistwin' for m in models.json().get('data',[]))
  checks['user_id_a']=user_a['id'];checks['chat_id']=chat_id
Path(os.environ['KHORA_PROBE_REPORT']).write_text(json.dumps({'type':'isolated_official_native_auth_ownership_postgresql_probe','checks':checks,'limits':['artificial users only','no real provider or graph','not production','polling/websocket and full circuit not verified']},indent=2))
print('CHECKS',json.dumps({k:v for k,v in checks.items() if k not in ['user_id_a','chat_id']}))
assert all(v is True or (k in ['config','models_status'] and v==200) or k in ['user_id_a','chat_id'] for k,v in checks.items()),'SAFE_STOP native probe failed'

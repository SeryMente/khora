import os,json,time,asyncio,secrets,sys
from pathlib import Path
base=Path(os.environ['KHORA_PROBE_OUTPUT_DIR'])
assert os.environ['KHORA_CHAT_PROBE_ALLOW_TECHNICAL_SCHEMA']=='1', 'Explicit technical-schema test approval required'
# Requires preconfigured runtime URLs/stable secret for this isolated technical schema.
urls={'runtime':os.environ['KHORA_CHAT_WEBUI_DATABASE_URL']}
os.environ.update(KHORA_API_KEY='k'*48,DATA_DIR=str(base/'native-probe-data'),STATIC_DIR=str(base/'native-probe-data/static'),ANONYMIZED_TELEMETRY='false',DO_NOT_TRACK='true',SCARF_NO_ANALYTICS='true')
from api.chat_runtime import configure_native_environment,register_native_pipe,make_native_guard
configure_native_environment()
from open_webui.main import app as native
from open_webui.socket.main import sio
from api.chat_security import signature
from fastapi import FastAPI
from starlette.testclient import TestClient
from khora_kernel.integrations.openwebui_host import OpenWebUIHostBinding
from khora_kernel.engine.history import init_db,Ht,save_ht,load_ht
from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app):
 async with native.router.lifespan_context(native):
  await register_native_pipe()
  yield
outer=FastAPI(lifespan=lifespan);outer.mount('/khora-chat',make_native_guard(native,key='k'*48))
checks={};user_ids=[]
a=secrets.token_hex(32)+'@khora.invalid';b=secrets.token_hex(32)+'@khora.invalid'
def request(client,subject,path,method='GET',body=None,token=None,raw=None):
 data=raw if raw is not None else json.dumps(body).encode() if body is not None else b''
 stamp=str(int(time.time()));full='/khora-chat'+path
 headers={'X-Khora-Key':'k'*48,'X-Khora-Chat-Subject':subject,'X-Khora-Chat-Timestamp':stamp,'X-Khora-Chat-Signature':signature('k'*48,method,full,subject,stamp,data),'Content-Type':'text/plain' if raw is not None else 'application/json','Origin':'https://khora-web.vercel.app'}
 if token:headers['Authorization']='Bearer '+token
 return client.request(method,full,content=data,headers=headers)
if True:
 with TestClient(outer) as client:
  checks['direct_render_rejected']=client.get('/khora-chat/api/config').status_code==401
  users=[]
  for subject in [a,b]:
   r=request(client,subject,'/api/v1/auths/signin','POST',{'email':'','password':''});assert r.status_code==200,'signin failed'
   user=r.json();assert user['role']=='user';users.append(user);user_ids.append(user['id'])
  ua,ub=users
  checks['foreign_token_rejected']=request(client,b,'/api/v1/auths/','GET',token=ua['token']).status_code==401
  made=request(client,a,'/api/v1/chats/new','POST',{'chat':{'title':'Technical synthetic deployment probe','history':{'messages':{},'currentId':None},'messages':[]}},ua['token']);assert made.status_code==200
  chat=made.json()['id']
  checks['owner_durable_read']=request(client,a,'/api/v1/chats/'+chat,token=ua['token']).status_code==200
  checks['foreign_chat_rejected']=request(client,b,'/api/v1/chats/'+chat,token=ub['token']).status_code in {401,403,404}
  models=request(client,a,'/api/models',token=ua['token']);checks['native_model_visible']=models.status_code==200 and any(x.get('id')=='khora_epistwin' for x in models.json()['data'])
  initial=request(client,a,'/ws/socket.io/?EIO=4&transport=polling');assert initial.status_code==200,'polling handshake '+str(initial.status_code)
  sid=json.loads(initial.text[1:])['sid'];path='/ws/socket.io/?EIO=4&transport=polling&sid='+sid
  checks['foreign_polling_sid_rejected']=request(client,b,path).status_code==403
  checks['foreign_socket_token_rejected']=request(client,a,path,'POST',raw=('40'+json.dumps({'token':ub['token']})).encode()).status_code==403
  auth=request(client,a,path,'POST',raw=('40'+json.dumps({'token':ua['token']})).encode());assert auth.status_code==200,'connect packet failed'
  connected=request(client,a,path);checks['native_polling_connected']=connected.status_code==200 and '40' in connected.text
  joined=request(client,a,path,'POST',raw=('42'+json.dumps(['user-join',{'auth':{'token':ua['token']}}])).encode());checks['native_user_join']=joined.status_code==200
  # Emits through the actual native server, received by the authenticated polling socket.
  async def emit_citation():
   await sio.emit('events',{'type':'citation','data':{'synthetic':True}},room='user:'+ua['id'])
  client.portal.call(emit_citation)
  event=request(client,a,path);checks['native_citation_transport']=event.status_code==200 and 'citation' in event.text
  checks['foreign_join_rejected']=request(client,a,path,'POST',raw=('42'+json.dumps(['user-join',{'auth':{'token':ub['token']}}])).encode()).status_code==403
  logout=request(client,a,'/api/v1/auths/signout','POST',{},ua['token']);checks['logout']=logout.status_code==200
  checks['logged_out_token_revoked']=request(client,a,'/api/v1/auths/',token=ua['token']).status_code==401
  # Check another connection/process can read the same native durable chat.
  import psycopg
  with psycopg.connect(urls['runtime']) as conn:
   checks['chat_independent_connection']=conn.execute('SELECT count(*) FROM khora_openwebui.chat WHERE id=%s AND user_id=%s',(chat,ua['id'])).fetchone()[0]==1
  # Clean only the synthetic subjects created by this probe via native deletion API.
  from open_webui.models.users import Users
  for uid in user_ids:
   assert client.portal.call(Users.delete_user_by_id,uid), 'synthetic cleanup failed'
  checks['synthetic_users_cleaned']=True
report={'type':'real_neon17_tls_native_polling_and_ownership_not_production_deploy','checks':checks,'limits':['local signed proxy not deployed','no real graph/provider inference','not Render load or browser E2E']}
(base/'neon-native-probe.json').write_text(json.dumps(report,indent=2));print('CHECKS',json.dumps(checks));assert all(checks.values()),'SAFE_STOP incomplete native probe'

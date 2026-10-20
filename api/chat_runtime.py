"""Opt-in native Open WebUI runtime, same process/graph and existing bridge.

Import is inert. Durable app schema must be migrated beforehand with a separate
migration role; runtime has no migration/CREATE permission or SQLite fallback.
Not deployable until transport, load, TLS and end-to-end gates are verified.
"""
from __future__ import annotations
import os
from contextlib import asynccontextmanager
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from api.chat_security import ChatIdentityGuard

PIPE_ID='khora_epistwin'
PIPE_CONTENT='from khora_kernel.integrations.openwebui import Pipe\n'


def configure_native_environment():
    key=os.getenv('KHORA_API_KEY','')
    secret=os.getenv('KHORA_CHAT_WEBUI_SECRET','')
    history=os.getenv('KHORA_CHAT_HISTORY_DATABASE_URL','')
    database=os.getenv('KHORA_CHAT_WEBUI_DATABASE_URL','')
    if min(len(key),len(secret))<32:
        raise RuntimeError('Chat requiere secretos estables explícitos, sin fallback.')
    for value in [history,database]:
        try:
            parsed=urlsplit(value)
            valid=parsed.scheme in {'postgres','postgresql'} and bool(parsed.hostname) and bool(parsed.path.strip('/'))
        except ValueError:
            valid=False
        if not valid: raise RuntimeError('Chat requiere PostgreSQL durable explícito.')
    parsed=urlsplit(database)
    query=dict(parse_qsl(parsed.query))
    if parsed.hostname not in {'localhost','127.0.0.1','::1'}:
        query['sslmode']='verify-full'
        if query.get('sslrootcert', '') in {'', 'system'}:
            import certifi
            query['sslrootcert'] = certifi.where()
    query['options']='-c search_path=khora_openwebui'
    database=urlunsplit(parsed._replace(query=urlencode(query)))
    settings={
        'DATABASE_URL':database,'DATABASE_SCHEMA':'khora_openwebui',
        'WEBUI_SECRET_KEY':secret,'WEBUI_AUTH':'true',
        'WEBUI_AUTH_TRUSTED_EMAIL_HEADER':'X-Khora-Chat-Email',
        'WEBUI_AUTH_TRUSTED_ROLE_HEADER':'X-Khora-Chat-Role',
        'DEFAULT_USER_ROLE':'user','ENABLE_SIGNUP':'false','ENABLE_LOGIN_FORM':'false',
        'ENABLE_PASSWORD_AUTH':'true', # Required by upstream trusted-header signin.
        'ENABLE_API_KEYS':'false','ENABLE_ADMIN_CHAT_ACCESS':'false',
        'CORS_ALLOW_ORIGIN':os.getenv('KHORA_WEB_ORIGIN','https://khora-web.vercel.app'),
        'ENABLE_DIRECT_CONNECTIONS':'false',
        'ENABLE_OPENAI_API':'false','ENABLE_OLLAMA_API':'false','ENABLE_MEMORIES':'false',
        'ENABLE_WEB_SEARCH':'false','ENABLE_IMAGE_GENERATION':'false',
        'ENABLE_TITLE_GENERATION':'false','ENABLE_TAGS_GENERATION':'false',
        'ENABLE_FOLLOW_UP_GENERATION':'false','ENABLE_AUTOCOMPLETE_GENERATION':'false',
        'ENABLE_DB_MIGRATIONS':'false','ENABLE_PERSISTENT_CONFIG':'false',
        'DATABASE_POOL_SIZE':'2','DATABASE_POOL_MAX_OVERFLOW':'0','DATABASE_POOL_TIMEOUT':'8',
        'DEFAULT_MODELS':PIPE_ID,'ENABLE_FUNCTIONS':'true',
        'FROM_INIT_PY':'true','ENV':'prod','USE_SLIM_DOCKER':'true',
        'OFFLINE_MODE':'true','HF_HUB_OFFLINE':'1','ENABLE_VERSION_UPDATE_CHECK':'false',
        'ENABLE_WEBSOCKET_SUPPORT':'false',
    }
    for name,value in settings.items(): os.environ[name]=value
    return key,history


async def register_native_pipe():
    from open_webui.models.functions import Functions,FunctionForm,FunctionMeta
    stored=await Functions.get_function_by_id(PIPE_ID)
    if stored is None:
        stored=await Functions.insert_new_function(None,'pipe',FunctionForm(
            id=PIPE_ID,name='Khora · Conversación Enraizada',content=PIPE_CONTENT,
            meta=FunctionMeta(description='Núcleo real Khora; evidencia pública verificada e insuficiencia explícita.'),
        ))
    if stored is None or stored.content!=PIPE_CONTENT or stored.type!='pipe':
        raise RuntimeError('Pipe nativo ausente o modificado; no se sobrescribió código desconocido.')
    if not stored.is_active:
        stored=await Functions.update_function_by_id(PIPE_ID,{'is_active':True})
    if stored is None or not stored.is_active:
        raise RuntimeError('No se pudo verificar el registro del Pipe nativo.')
    # Upstream 0.12.3 intentionally hides unregistered models from ordinary users.
    # Configure the native model's READ permission, never bypass access control.
    from open_webui.models.models import Models,ModelForm,ModelMeta,ModelParams
    from open_webui.models.access_grants import AccessGrants
    model=await Models.get_model_by_id(PIPE_ID)
    if model is None:
        model=await Models.insert_new_model(form_data=ModelForm(
            id=PIPE_ID,name='Khora · Conversación Enraizada',
            meta=ModelMeta(description='Consulta pública mediante el núcleo Khora.'),
            params=ModelParams(),is_active=True,
            access_grants=[{'principal_type':'user','principal_id':'*','permission':'read'}],
        ),user_id='khora-runtime')
    if model is None or model.base_model_id is not None:
        raise RuntimeError('No se pudo verificar el modelo nativo; sin bypass.')
    granted=await AccessGrants.grant_access('model',PIPE_ID,'user','*','read')
    if granted is None: raise RuntimeError('No se pudo verificar el permiso de lectura del modelo.')



def make_native_guard(native,*,key):
    from api.chat_polling import NativePollingGate
    from open_webui.utils.auth import get_verified_user_by_token
    async def resolve(token):
        return await get_verified_user_by_token(token,getattr(native.state,'redis',None))
    async def native_with_revocation(scope,receive,send):
        if scope.get('method')=='POST' and scope.get('path','').rstrip('/').endswith('/api/v1/auths/signout'):
            from open_webui.internal.db import get_async_db
            from open_webui.models.auths import Auths
            from open_webui.socket.main import disconnect_user_sessions
            headers=dict(scope.get('headers',[]))
            authorization=headers.get(b'authorization',b'').decode('latin1')
            token=authorization[7:] if authorization.startswith('Bearer ') else ''
            user=await resolve(token) if token else None
            subject=scope.get('state',{}).get('khora_chat_subject')
            if user is None or user.email!=subject:
                await send({'type':'http.response.start','status':401,'headers':[]})
                return await send({'type':'http.response.body','body':b'Invalid session'})
            # Official durable revocation, not a second token database or Redis fallback.
            async with get_async_db() as db:
                if not await Auths.revoke_sessions_by_user_id(user.id,db=db):
                    raise RuntimeError('No se pudo revocar la sesion nativa.')
                await db.commit()
            await disconnect_user_sessions(user.id)
        if scope.get('path','').rstrip('/').endswith('/ws/socket.io'):
            from open_webui.socket.main import app as socket_app
            child={**scope,'path':'/ws/socket.io/','root_path':''}
            return await socket_app(child,receive,send)
        return await native(scope,receive,send)
    return ChatIdentityGuard(native_with_revocation,key=key,polling=NativePollingGate(resolve))


class NativeChatRuntime:
    def __init__(self):
        key,self.history=configure_native_environment()
        from open_webui.main import app as native
        self.native=native
        self.app=make_native_guard(native,key=key)

    @asynccontextmanager
    async def lifespan(self,neo4j_config):
        from khora_kernel.motor import Neo4jMemoriaOrganizada
        from khora_kernel.proveedores import crear_proveedor_por_perfil
        from khora_kernel.engine.history import init_db
        from khora_kernel.integrations.openwebui_host import install_host_binding
        provider=crear_proveedor_por_perfil('groq')
        memory=Neo4jMemoriaOrganizada(neo4j_config['uri'],neo4j_config['user'],neo4j_config['password'])
        try:
            init_db(self.history) # Only verifies the existing kernel schema; no DDL.
            if os.getenv('KHORA_CHAT_E72_INDEX') == '1':
                import asyncio, json
                from api.chat_public_fixture import ensure_index
                report=await asyncio.to_thread(ensure_index,memory)
                print('KHORA_E72_INDEX_RECOVERED '+json.dumps(report,sort_keys=True))
            async with self.native.router.lifespan_context(self.native):
                await register_native_pipe()
                install_host_binding(self.native,puerto_llm=provider,memoria=memory,db_path=self.history)
                yield
        finally:
            self.native.state.khora_chat_binding=None
            memory.cerrar()

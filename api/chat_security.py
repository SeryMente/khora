"""Signed server-to-server identity guard for the native chat subapplication.

No direct Render entry, client trusted-header authority or alternate login.
This wrapper protects HTTP before upstream routing/auth, including static files.
It intentionally rejects WebSockets until their identity/transport gate is closed.
"""
from __future__ import annotations
import hashlib
import hmac
import re
import time

PROTOCOL = 'khora-openwebui-proxy-v1'
MAX_BODY = 1024 * 1024


def signature(key, method, path_query, subject, timestamp, body):
    digest = hashlib.sha256(body).hexdigest()
    payload = '\n'.join([PROTOCOL, method, path_query, subject, timestamp, digest])
    return hmac.new(key.encode(), payload.encode(), hashlib.sha256).hexdigest()


class ChatIdentityGuard:
    def __init__(self, app, *, key, polling=None):
        if not isinstance(key,str) or len(key)<32:
            raise ValueError('Se requiere clave de bridge estable y segura.')
        self.app,self.key=app,key
        self.polling=polling

    async def __call__(self, scope, receive, send):
        if scope['type']=='lifespan':
            return await self.app(scope,receive,send)
        if scope['type']=='websocket':
            return await send({'type':'websocket.close','code':1008})
        if scope['type']!='http': return
        async def fail(status):
            await send({'type':'http.response.start','status':status,'headers':[(b'content-type',b'application/json'),(b'cache-control',b'no-store')]})
            await send({'type':'http.response.body','body':b'{"error":"Chat access denied"}'})
        headers={}
        for raw_name, raw_value in scope.get('headers',[]):
            name=raw_name.decode('latin1').lower()
            if name in headers and (name.startswith('x-khora') or name=='authorization'):
                return await fail(401)
            headers[name]=raw_value.decode('latin1')
        subject=headers.get('x-khora-chat-subject','')
        timestamp=headers.get('x-khora-chat-timestamp','')
        mac=headers.get('x-khora-chat-signature','')
        if (not hmac.compare_digest(headers.get('x-khora-key',''),self.key)
            or not re.fullmatch(r'[0-9a-f]{64}@khora\.invalid',subject)
            or not timestamp.isdecimal() or len(timestamp)>12
            or abs(time.time()-int(timestamp))>60):
            return await fail(401)
        authorization=headers.get('authorization','')
        if authorization and not re.fullmatch(r'Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',authorization):
            return await fail(401)
        body=bytearray()
        while True:
            message=await receive()
            if message['type']=='http.disconnect': return
            if message['type']!='http.request': return await fail(400)
            body.extend(message.get('body',b''))
            if len(body)>MAX_BODY: return await fail(413)
            if not message.get('more_body',False): break
        query=scope.get('query_string',b'').decode('ascii')
        path=scope['path']+('?' + query if query else '')
        expected=signature(self.key,scope['method'],path,subject,timestamp,body)
        if not hmac.compare_digest(expected,mac): return await fail(401)
        is_polling=scope["path"].rstrip("/").endswith("/ws/socket.io")
        if is_polling and (self.polling is None or not await self.polling.authorize(scope,subject,bytes(body))):
            return await fail(403)
        # Strip every client trusted header/cookie, then supply only signed identity.
        filtered=[(name,value) for name,value in scope.get('headers',[])
                  if not name.lower().startswith((b'x-khora',b'x-openwebui',b'x-forwarded',b'remote-user'))
                  and name.lower() not in {b'cookie',b'host'}]
        filtered.extend([(b'x-khora-chat-email',subject.encode()),(b'x-khora-chat-role',b'user')])
        child={**scope,'headers':filtered, 'state':{**scope.get('state',{}),'khora_chat_subject':subject}}
        delivered=False
        async def replay():
            nonlocal delivered
            if not delivered:
                delivered=True;return {'type':'http.request','body':bytes(body),'more_body':False}
            return await receive()
        if is_polling:
            return await self.polling.run(self.app,child,replay,send,subject)
        return await self.app(child,replay,send)

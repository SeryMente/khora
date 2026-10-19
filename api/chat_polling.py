"""HTTP polling identity boundary for the unchanged native Socket.IO server.

EngineIO session ownership is distinct from native token authentication. Both
must match the signed Khora subject, including every subsequent poll. No WS,
binary uploads, collaborative notes, channels, arbitrary namespaces or bypass.
"""
from __future__ import annotations
import json,re,time
from urllib.parse import parse_qs


class NativePollingGate:
    def __init__(self,resolve_token,*,limit=256,ttl=300):
        self.resolve_token=resolve_token
        self.sessions={}
        self.limit,self.ttl=limit,ttl

    async def authorize(self,scope,subject,body):
        try:
            query=parse_qs(scope.get('query_string',b'').decode('ascii'),keep_blank_values=True)
            if query.get('transport')!=['polling'] or query.get('EIO')!=['4']:return False
            for name in ['sid','transport','EIO']:
                if len(query.get(name,[]))>1:return False
            sid=query.get('sid',[''])[0]
            now=time.monotonic()
            self.sessions={k:v for k,v in self.sessions.items() if v[1]>now}
            if not sid:
                return scope['method']=='GET' and not body and len(self.sessions)<self.limit
            if not re.fullmatch(r'[A-Za-z0-9_-]{1,128}',sid):return False
            stored=self.sessions.get(sid)
            if not stored or stored[0]!=subject:return False
            self.sessions[sid]=(subject,now+self.ttl)
            if scope['method']=='GET':return not body
            if scope['method']!='POST':return False
            for packet in body.decode('utf-8').split('\x1e'):
                if packet in {'1','2','3','41'}:continue
                if packet.startswith('40'):
                    auth=json.loads(packet[2:]) if packet[2:] else {}
                    if not isinstance(auth,dict):return False
                    token=auth.get('token')
                    if token and not await self._token_matches(token,subject):return False
                elif packet.startswith('42'):
                    text=packet[2:];text=text.lstrip('0123456789') # root namespace ack id
                    data=json.loads(text)
                    if not isinstance(data,list) or len(data)!=2 or not isinstance(data[1],dict):return False
                    event,payload=data
                    if event=='user-join':
                        auth=payload.get('auth',{})
                        if not isinstance(auth,dict) or not await self._token_matches(auth.get('token'),subject):return False
                    elif event not in {'heartbeat','usage','events:chat'}:return False
                else:return False
            return True
        except (ValueError,TypeError,UnicodeError,AttributeError):return False

    async def _token_matches(self,token,subject):
        if not isinstance(token,str) or not re.fullmatch(r'[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+',token):return False
        user=await self.resolve_token(token)
        return user is not None and user.email==subject and user.role=='user'

    async def run(self,app,scope,receive,send,subject):
        query=parse_qs(scope.get('query_string',b'').decode('ascii'))
        if query.get('sid'):
            return await app(scope,receive,send)
        messages=[]
        async def capture(message):messages.append(message)
        await app(scope,receive,capture)
        start=next((m for m in messages if m['type']=='http.response.start'),None)
        body=b''.join(m.get('body',b'') for m in messages if m['type']=='http.response.body')
        if start and start['status']==200:
            try:
                assert body[:1]==b'0'
                sid=json.loads(body[1:])['sid']
                assert re.fullmatch(r'[A-Za-z0-9_-]{1,128}',sid)
                self.sessions[sid]=(subject,time.monotonic()+self.ttl)
            except (AssertionError,KeyError,ValueError,TypeError):
                await send({'type':'http.response.start','status':502,'headers':[]})
                return await send({'type':'http.response.body','body':b'Polling handshake unavailable'})
        for message in messages:await send(message)

"""Real HTTP/ASGI guard with artificial identities; not deployed proxy isolation."""
import asyncio
import hashlib
import hmac
import time
import unittest
import httpx
from api.chat_security import ChatIdentityGuard, signature

KEY='a'*48
SUBJECT='b'*64+'@khora.invalid'


class IdentityGuardTests(unittest.TestCase):
    def send(self, *, overrides=None, body=b'', path='/khora-chat/api/config', method='GET', age=0):
        seen=[]
        async def app(scope,receive,send):
            message=await receive();seen.append((scope,message))
            await send({'type':'http.response.start','status':200,'headers':[(b'content-type',b'application/json')]})
            await send({'type':'http.response.body','body':b'{"native":true}'})
        timestamp=str(int(time.time())+age)
        headers={'X-Khora-Key':KEY,'X-Khora-Chat-Subject':SUBJECT,'X-Khora-Chat-Timestamp':timestamp,
                 'X-Khora-Chat-Signature':signature(KEY,method,path,SUBJECT,timestamp,body)}
        headers.update(overrides or {})
        async def run():
            async with httpx.AsyncClient(transport=httpx.ASGITransport(app=ChatIdentityGuard(app,key=KEY)),base_url='https://bridge.test') as client:
                return await client.request(method,path,headers=headers,content=body)
        return asyncio.run(run()),seen

    def test_signed_server_request_is_verified_and_body_replayed(self):
        response,seen=self.send(method='POST',path='/khora-chat/api/v1/chats/new',body=b'{"chat":{}}',overrides={'Cookie':'token=foreign','X-Khora-Chat-Email':'attacker','X-Khora-Chat-Role':'admin','X-Forwarded-User':'attacker'})
        self.assertEqual(response.status_code,200)
        scope,message=seen[0];headers=dict(scope['headers'])
        self.assertEqual(headers[b'x-khora-chat-email'],SUBJECT.encode())
        self.assertEqual(headers[b'x-khora-chat-role'],b'user')
        for header in [b'x-khora-key',b'x-khora-chat-signature',b'cookie',b'x-forwarded-user']:
            self.assertNotIn(header,headers)
        self.assertEqual(message['body'],b'{"chat":{}}')

    def test_forged_subject_mac_key_timestamp_and_api_key_are_closed(self):
        cases=[{'X-Khora-Chat-Subject':'other@invalid'}, {'X-Khora-Chat-Signature':'0'*64}, {'X-Khora-Key':'bad'}, {'X-Khora-Chat-Timestamp':'never'}, {'Authorization':'Bearer sk-admin'}]
        for overrides in cases:
            response,seen=self.send(overrides=overrides)
            self.assertEqual(response.status_code,401);self.assertEqual(seen,[])
        for age in [-120,120]:
            response,seen=self.send(age=age);self.assertEqual(response.status_code,401);self.assertEqual(seen,[])

    def test_modified_body_or_path_cannot_reuse_signed_request(self):
        stamp=str(int(time.time()))
        wrong=signature(KEY,'POST','/khora-chat/api/config',SUBJECT,stamp,b'original')
        response,seen=self.send(method='POST',body=b'changed',overrides={'X-Khora-Chat-Timestamp':stamp,'X-Khora-Chat-Signature':wrong})
        self.assertEqual(response.status_code,401);self.assertEqual(seen,[])

    def test_oversized_body_closed(self):
        response,seen=self.send(method='POST',body=b'x'*(1024*1024+1))
        self.assertEqual(response.status_code,413);self.assertEqual(seen,[])

    def test_websocket_not_silently_enabled(self):
        messages=[]
        async def app(*args):self.fail('Websocket must not reach upstream')
        async def send(message):messages.append(message)
        asyncio.run(ChatIdentityGuard(app,key=KEY)({'type':'websocket'},None,send))
        self.assertEqual(messages,[{'type':'websocket.close','code':1008}])

    def test_protocol_matches_independent_hmac(self):
        digest=hashlib.sha256(b'body').hexdigest()
        payload='\n'.join(['khora-openwebui-proxy-v1','POST','/khora-chat/api/chat/completions?a=1',SUBJECT,'100',digest])
        self.assertEqual(signature(KEY,'POST','/khora-chat/api/chat/completions?a=1',SUBJECT,'100',b'body'),hmac.new(KEY.encode(),payload.encode(),hashlib.sha256).hexdigest())

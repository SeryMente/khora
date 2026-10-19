import asyncio,json,unittest
from types import SimpleNamespace as NS
from api.chat_polling import NativePollingGate

class PollingTests(unittest.TestCase):
 def run_case(self,body,subject='owner',sid='owned',method='POST',query=None):
  async def token(value):return NS(email='owner',role='user') if value=='a.b.c' else NS(email='foreign',role='user')
  gate=NativePollingGate(token);gate.sessions['owned']=('owner',float('inf'))
  scope={'method':method,'query_string':(query or 'EIO=4&transport=polling'+('&sid='+sid if sid else '')).encode()}
  return asyncio.run(gate.authorize(scope,subject,body))
 def test_owner_poll_and_native_auth(self):
  self.assertTrue(self.run_case(b'',method='GET'))
  self.assertTrue(self.run_case(b'40{"token":"a.b.c"}'))
  self.assertTrue(self.run_case(b'42["user-join",{"auth":{"token":"a.b.c"}}]'))
  self.assertTrue(self.run_case(b'42["heartbeat",{}]\x1e3'))
 def test_foreign_sid_or_token_and_arbitrary_events_closed(self):
  for body in [b'40{"token":"foreign.b.c"}',b'42["user-join",{"auth":{"token":"foreign.b.c"}}]',b'42["join-note",{}]',b'40/private,{"token":"a.b.c"}',b'\xff',b'45binary',b'42["user-join",{}]']:
   self.assertFalse(self.run_case(body),body)
  self.assertFalse(self.run_case(b'',subject='foreign',method='GET'))
  self.assertFalse(self.run_case(b'',sid='unknown',method='GET'))
  self.assertFalse(self.run_case(b'',method='GET',query='EIO=4&transport=websocket&sid=owned'))
 def test_initial_only_get_and_bounded(self):
  self.assertTrue(self.run_case(b'',method='GET',sid=''))
  self.assertFalse(self.run_case(b'40',sid=''))
 def test_handshake_is_bound_before_forwarding(self):
  async def resolve(t):return None
  gate=NativePollingGate(resolve);messages=[]
  async def app(scope,receive,send):
   await send({'type':'http.response.start','status':200,'headers':[]})
   await send({'type':'http.response.body','body':b'0{"sid":"new-id"}'})
  async def send(msg):messages.append(msg)
  asyncio.run(gate.run(app,{'query_string':b'EIO=4&transport=polling'},None,send,'owner'))
  self.assertEqual(gate.sessions['new-id'][0],'owner');self.assertEqual(len(messages),2)

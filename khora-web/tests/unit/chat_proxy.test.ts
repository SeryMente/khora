import test from 'node:test';
import assert from 'node:assert/strict';
import { chatSignature, chatSubject, proxyOpenWebUI } from '../../lib/server/chat-proxy';
import { openWebUIPath } from '../../lib/chat-routes';
const config={enabled:true,apiUrl:'https://bridge.example.test',apiKey:'a'.repeat(48)};
const request=(path='/',method='GET',headers:Record<string,string>={})=>new Request('https://khora.example.test/api/khora-chat/proxy?path='+encodeURIComponent(path),{method,headers});
const noFetch=(async()=>{throw Error('unexpected upstream call')}) as typeof fetch;
test('disabled or unauthenticated chat is closed',async()=>{
 assert.equal((await proxyOpenWebUI(request(),null,config,noFetch)).status,401);
 assert.equal((await proxyOpenWebUI(request(),'a@test',{...config,enabled:false},noFetch)).status,404);
});
test('existing Khora routes, traversal and dangerous APIs are not proxied',async()=>{
 for(const path of ['/sistema','/api/chat','/api/auth/session','/api/ingesta','/api/v1/functions','/api/v1/memories','//evil.test','/../private','/%2e%2e/private','/ws/socket.io']) assert.equal(openWebUIPath(path),false,path);
 assert.equal((await proxyOpenWebUI(request('/api/v1/auths/signup','POST',{origin:'https://khora.example.test'}),'a@test',config,noFetch)).status,403);
});
test('mutations require exact same-origin and browser API keys are rejected',async()=>{
 assert.equal((await proxyOpenWebUI(request('/api/v1/chats/new','POST'),'a@test',config,noFetch)).status,403);
 assert.equal((await proxyOpenWebUI(request('/api/v1/chats/new','POST',{origin:'https://evil.test'}),'a@test',config,noFetch)).status,403);
 assert.equal((await proxyOpenWebUI(request('/','GET',{authorization:'Bearer sk-admin'}),'a@test',config,noFetch)).status,401);
});
test('missing or invalid runtime cannot send secrets to arbitrary URLs',async()=>{
 for(const apiUrl of ['http://localhost','https://bridge.test/else','https://user:pass@bridge.test','https://bridge.test/?token=x']) assert.equal((await proxyOpenWebUI(request(),'a@test',{...config,apiUrl},noFetch)).status,503);
});
test('trusted identity is rebuilt server-side and response secrets cannot escape',async()=>{
 let captured:RequestInit|undefined;
 const transport=(async(url:URL|string|Request,init:RequestInit)=>{
  assert.equal(String(url),'https://bridge.example.test/khora-chat/');captured=init;
  return new Response('native upstream',{headers:{'Content-Type':'text/html','Set-Cookie':'secret=upstream','X-Khora-Key':'backend-secret'}});
 }) as typeof fetch;
 const response=await proxyOpenWebUI(request('/','GET',{'x-khora-chat-subject':'attacker','x-khora-key':'forged','x-khora-chat-role':'admin',cookie:'foreign-secret','x-forwarded-user':'foreign'}),'Owner@Example.test',config,transport);
 const headers=new Headers(captured?.headers);
 const subject=chatSubject('owner@example.test',config.apiKey);
 assert.equal(headers.get('x-khora-chat-subject'),subject);
 assert.equal(headers.get('x-khora-key'),config.apiKey);
 for(const h of ['cookie','x-forwarded-user','x-khora-chat-role']) assert.equal(headers.get(h),null);
 assert.equal(headers.get('x-khora-chat-signature'),chatSignature(config.apiKey,'GET','/khora-chat/',subject,headers.get('x-khora-chat-timestamp')!,new Uint8Array()));
 assert.equal(response.headers.get('set-cookie'),null);assert.equal(response.headers.get('x-khora-key'),null);
 assert.equal(await response.text(),'native upstream');
});
test('subject stable across email case but distinct across users',()=>{
 assert.equal(chatSubject('A@Example.test',config.apiKey),chatSubject('a@example.test',config.apiKey));
 assert.notEqual(chatSubject('a@example.test',config.apiKey),chatSubject('b@example.test',config.apiKey));
});
test('external redirects and errors are redacted',async()=>{
 const redirect=(async()=>new Response(null,{status:302,headers:{location:'https://evil.test/?secret=sentinel'}})) as typeof fetch;
 assert.equal((await proxyOpenWebUI(request(),'a@test',config,redirect)).status,502);
 const broken=(async()=>{throw Error('PRIVATE_URL_SENTINEL')}) as typeof fetch;
 assert.equal((await proxyOpenWebUI(request(),'a@test',config,broken)).status,502);
});

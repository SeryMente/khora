import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { NATIVE_INITIAL_STYLES, loadNativeStyles, inlineNativeStyles, presentNativeHTML } from '../../lib/server/chat-presentation';
const fixture = '<!doctype html><html><head><title>Open WebUI</title>' + NATIVE_INITIAL_STYLES.map(x => `<link href="/_app/immutable/assets/${x.name}" rel="stylesheet">`).join('') + '</head><body>LICENSE: unchanged upstream shell</body></html>';

test('missing pinned CSS fails closed before serving an unstyled native interface', async () => {
  const reader = async () => { throw Error('ENOENT_PRIVATE_SENTINEL'); };
  const result = await presentNativeHTML(new Response(fixture, {headers:{'content-type':'text/html'}}), reader);
  assert.equal(result.status,503); assert.match(result.headers.get('cache-control')!,/no-store/);
  const html=await result.text();assert.match(html,/No se pudo cargar la presentación/);assert.doesNotMatch(html,/SENTINEL|khora-native-css/);
});
test('incorrect CSS bytes are rejected even when file name exists', async () => {
  await assert.rejects(loadNativeStyles(async()=>Buffer.from('body{color:red}')),/NATIVE_CSS_INTEGRITY_FAILED/);
});
test('changed upstream HTML never silently serves a partial style set', () => {
  assert.throws(()=>inlineNativeStyles('<html></html>',['a','b','c']),/CONTRACT_CHANGED/);
  assert.throws(()=>inlineNativeStyles(fixture,[]),/INCOMPLETE/);
});
test('HTML embeds original bytes in original order and keeps official links known to Svelte', () => {
  const css=['.toast{color:black}', '.modal{display:block}', '.flex{display:flex}'];
  const html=inlineNativeStyles(fixture,css);
  for(const [i,entry] of NATIVE_INITIAL_STYLES.entries()) {
    assert.ok(html.includes(`<style data-khora-native-css="${entry.name}">${css[i]}</style>`));
    assert.ok(html.includes(`href="/_app/immutable/assets/${entry.name}" rel="stylesheet" disabled data-khora-inlined="true"`));
  }
  assert.match(html,/<title>Open WebUI<\/title>/);assert.match(html,/LICENSE: unchanged upstream shell/);
});
test('API JSON and streaming responses retain identity and are not consumed', async()=>{
  for(const type of ['application/json','text/event-stream']) {
    const response=new Response('native',{headers:{'content-type':type}});
    assert.equal(await presentNativeHTML(response),response);assert.equal(response.bodyUsed,false);
  }
  const response=new Response('auth needed',{status:401,headers:{'content-type':'text/html'}});
  assert.equal(await presentNativeHTML(response),response);
});
test('deployed CSS is traced explicitly without changing the existing ffmpeg includes', async()=>{
  const s=await fs.readFile('next.config.ts','utf8');
  for(const {name} of NATIVE_INITIAL_STYLES) assert.ok(s.includes('./public/_app/immutable/assets/'+name));
  assert.ok(s.includes('"/api/dictado": ["./node_modules/ffmpeg-static/**"]'));
  assert.ok(s.includes('"/api/audio/*/mp3": ["./node_modules/ffmpeg-static/**"]'));
  const route=await fs.readFile('app/api/khora-chat/proxy/route.ts','utf8');
  assert.ok(route.indexOf('await auth()')<route.indexOf('presentNativeHTML(response)'));
  assert.match(route,/request.method === 'GET'/);
});

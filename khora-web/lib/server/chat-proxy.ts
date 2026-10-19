import { createHash, createHmac } from 'node:crypto';
import { openWebUIPath } from '../chat-routes';

const MAX_BODY = 1024 * 1024;
const PROTOCOL = 'khora-openwebui-proxy-v1';
export type ChatProxyConfig = { enabled: boolean; apiUrl?: string; apiKey?: string };

export function chatSubject(email: string, key: string): string {
  return createHmac('sha256', key).update('khora-openwebui-user-v1\n' + email.trim().toLowerCase()).digest('hex') + '@khora.invalid';
}

export function chatSignature(key: string, method: string, pathAndQuery: string, subject: string, timestamp: string, body: Uint8Array): string {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return createHmac('sha256', key).update([PROTOCOL, method, pathAndQuery, subject, timestamp, bodyHash].join('\n')).digest('hex');
}

const fail = (status: number, error: string) => Response.json({ error }, { status, headers: { 'Cache-Control': 'no-store' } });

/** Caller must obtain identity from auth(), never headers, request JSON or query. */
export async function proxyOpenWebUI(request: Request, email: string | null | undefined, config: ChatProxyConfig, upstream: typeof fetch = fetch): Promise<Response> {
  if (!config.enabled) return fail(404, 'Not found');
  if (typeof email !== 'string' || !email.trim() || !email.includes('@')) return fail(401, 'Auth required');
  const source = new URL(request.url);
  const path = source.searchParams.get('path');
  if (!path || !openWebUIPath(path)) return fail(404, 'Not found');
  if (!['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return fail(405, 'Method not allowed');
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('origin') !== source.origin) return fail(403, 'Origin required');
  const key = config.apiKey;
  if (!key || key.length < 32 || !config.apiUrl) return fail(503, 'Chat runtime unavailable');
  let target: URL;
  try {
    target = new URL(config.apiUrl);
    if (target.protocol !== 'https:' || target.username || target.password || target.search || target.hash || target.pathname.replace(/\/$/,'') !== '') return fail(503, 'Chat runtime unavailable');
    target.pathname = '/khora-chat' + path;
    source.searchParams.delete('path');
    target.search = source.searchParams.toString();
  } catch { return fail(503, 'Chat runtime unavailable'); }
  // No API-key, admin/function management, ingestion, memory or provider bypass.
  if (path.startsWith('/api/v1/auths') && !['/api/v1/auths','/api/v1/auths/','/api/v1/auths/signin','/api/v1/auths/signout','/api/v1/auths/update/timezone'].includes(path)) return fail(403, 'Operation unavailable');
  if (path.startsWith('/api/v1/models') && !['GET','HEAD'].includes(request.method)) return fail(403,'Operation unavailable');
  if (/^\/api\/v1\/chats\/.*(?:share|import|export|stats|all\/db|list\/user)/.test(path)) return fail(403,'Operation unavailable');
  const token = request.headers.get('authorization');
  if (token && !/^Bearer [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return fail(401, 'Invalid session');
  if (Number(request.headers.get('content-length') || 0) > MAX_BODY) return fail(413, 'Request too large');
  const body = ['GET','HEAD'].includes(request.method) ? new Uint8Array() : new Uint8Array(await request.arrayBuffer());
  if (body.byteLength > MAX_BODY) return fail(413, 'Request too large');
  const subject = chatSubject(email, key);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const headers = new Headers();
  for (const name of ['accept','accept-language','content-type','last-event-id']) {
    const value = request.headers.get(name); if (value) headers.set(name,value);
  }
  if (token) headers.set('Authorization', token);
  headers.set('X-Khora-Key', key);
  headers.set('X-Khora-Chat-Subject', subject);
  headers.set('X-Khora-Chat-Timestamp', timestamp);
  headers.set('X-Khora-Chat-Signature', chatSignature(key,request.method,target.pathname+target.search,subject,timestamp,body));
  // Trusted role is set by backend guard, never accepted from browser.
  try {
    const response = await upstream(target, { method: request.method, headers, body: body.length ? body : undefined, redirect: 'manual', cache: 'no-store', signal: request.signal });
    if (response.status >= 400) return fail(response.status,'Chat request failed');
    const output = new Headers({ 'Cache-Control':'no-store', 'Vary':'Cookie', 'X-Content-Type-Options':'nosniff' });
    for (const name of ['content-type','content-language','retry-after']) {
      const value=response.headers.get(name); if(value) output.set(name,value);
    }
    if (response.status >= 300 && response.status < 400) {
      const location=response.headers.get('location');
      if (!location) return fail(502,'Invalid upstream redirect');
      const next=new URL(location,target);
      if(next.origin!==target.origin || !next.pathname.startsWith('/khora-chat/')) return fail(502,'Invalid upstream redirect');
      output.set('location',next.pathname.slice('/khora-chat'.length)+next.search);
    }
    // Never forward upstream Set-Cookie, CORS, arbitrary Location or bridge headers.
    return new Response(response.body,{status:response.status,headers:output});
  } catch { return fail(502,'Chat runtime unavailable'); }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { COOKIE_BOVEDA, desbloqueoVigente } from '@/lib/server/boveda';
import { GithubCredentialError, githubCredentialOwner, githubCredentialStatus, isGithubPurpose, validateGithubCredential, changeGithubCredential } from '@/lib/server/github-credentials';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const HEADERS = { 'Cache-Control':'no-store, max-age=0', Pragma:'no-cache', 'X-Content-Type-Options':'nosniff', 'Referrer-Policy':'no-referrer' };
function reply(body: object, status = 200) { return NextResponse.json(body,{status,headers:HEADERS}); }
function failure(error: unknown) {
  if (error instanceof GithubCredentialError) return reply({code:error.code,message:error.message},error.status);
  return reply({code:'GITHUB_VAULT_UNAVAILABLE',message:'Khora no pudo consultar o actualizar la bóveda. No des por guardado el cambio; revisa el estado antes de repetir.'},503);
}
async function authorize(req: NextRequest, mutation: boolean): Promise<string> {
  const owner = githubCredentialOwner();
  const session = await auth();
  if (!session?.user?.email || session.user.email.toLowerCase() !== owner) throw new GithubCredentialError('GITHUB_NOT_AUTHORIZED',401,'Inicia sesión con la cuenta propietaria de Khora.');
  if (!desbloqueoVigente(req.cookies.get(COOKIE_BOVEDA)?.value)) throw new GithubCredentialError('GITHUB_VAULT_LOCKED',403,'Abre la bóveda con tu PIN antes de gestionar los tokens de GitHub.');
  if (mutation) {
    const canonical = new URL(process.env.VAULT_AGENT_CANONICAL_URL || req.url).origin;
    if (req.headers.get('origin') !== canonical || req.headers.get('sec-fetch-site') === 'cross-site') throw new GithubCredentialError('GITHUB_ORIGIN_DENIED',403,'Guarda el token desde la página de Khora, no desde otro sitio.');
    if (req.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new GithubCredentialError('GITHUB_BODY_INVALID',400,'La solicitud debe enviarse como datos JSON.');
  }
  return owner;
}
async function boundedBody(req: NextRequest) {
  const reader = req.body?.getReader(); if (!reader) throw new GithubCredentialError('GITHUB_BODY_INVALID',400,'Faltan los datos del token.');
  const chunks: Uint8Array[]=[]; let size=0;
  try { for (;;) { const {done,value}=await reader.read(); if(done) break; size+=value.byteLength; if(size>2048) { await reader.cancel(); throw new GithubCredentialError('GITHUB_BODY_INVALID',413,'La solicitud es demasiado grande. Envía solo el token y su uso.'); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new GithubCredentialError('GITHUB_BODY_INVALID',400,'No se pudieron leer los datos. No se guardó ningún cambio.'); }
}
export async function GET(req: NextRequest) {
  try { return reply(await githubCredentialStatus(await authorize(req,false))); } catch(error) { return failure(error); }
}
async function mutate(req: NextRequest, deleting: boolean) {
  try {
    const owner = await authorize(req,true), body = await boundedBody(req);
    if (!body || typeof body !== 'object' || !isGithubPurpose(body.purpose)) throw new GithubCredentialError('GITHUB_PURPOSE_INVALID',400,'Elige instrucciones MCP o entorno persistente.');
    if (Object.keys(body).some(key => !['purpose','token'].includes(key))) throw new GithubCredentialError('GITHUB_BODY_INVALID',400,'La solicitud contiene campos no admitidos.');
    if (deleting && body.token !== undefined) throw new GithubCredentialError('GITHUB_BODY_INVALID',400,'Para retirar una credencial no envíes su valor.');
    if (!deleting) await validateGithubCredential(body.purpose,body.token);
    await changeGithubCredential(owner,body.purpose,deleting ? null : body.token);
    return reply({ok:true,message:deleting ? 'Credencial retirada de Khora. Para invalidarla también en GitHub, revócala allí.' : 'Token cifrado y guardado. GitHub permitió leer el repositorio de comprobación. No se han probado operaciones de escritura.', ...await githubCredentialStatus(owner)});
  } catch(error) { return failure(error); }
}
export async function POST(req: NextRequest) { return mutate(req,false); }
export async function DELETE(req: NextRequest) { return mutate(req,true); }

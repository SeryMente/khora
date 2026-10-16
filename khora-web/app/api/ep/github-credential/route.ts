import { NextResponse } from 'next/server';
import { authenticateEpBearer, getEpAuthFailure } from '@/lib/server/ep';
import { readGithubCredential, githubCredentialOwner } from '@/lib/server/github-credentials';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control':'no-store, max-age=0',Pragma:'no-cache','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff' };
export async function POST(req: Request) {
  let payload;
  try { payload = await authenticateEpBearer(req,['ep:bootstrap','ep:github:read']); }
  catch(error) { const failure = getEpAuthFailure(error); return NextResponse.json({code:failure.code,message:'La sesión del entorno persistente no autoriza recuperar esta credencial. Genera una sesión nueva en Khora.'},{status:failure.status,headers}); }
  try {
    const owner = githubCredentialOwner();
    if(payload.sub.toLowerCase() !== owner) return NextResponse.json({code:'not_authorized',message:'Esta sesión no pertenece al propietario de la credencial.'},{status:403,headers});
    const token = await readGithubCredential('ep',owner);
    if (!token) return NextResponse.json({code:'GITHUB_EP_TOKEN_MISSING',message:'Falta el token de GitHub del entorno persistente. Guárdalo en Seguridad → Bóveda.'},{status:409,headers});
    return NextResponse.json({token},{headers});
  } catch { return NextResponse.json({code:'GITHUB_VAULT_UNAVAILABLE',message:'Khora no pudo abrir el token protegido. Revisa la bóveda antes de iniciar el entorno.'},{status:503,headers}); }
}

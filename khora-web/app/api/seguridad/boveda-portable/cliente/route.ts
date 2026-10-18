import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { auth } from '../../../../../auth';
import { portableClosed } from '../../../../../portable-vault/runtime';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 if(process.env.PORTABLE_VAULT_ENABLED!=='reviewed')return portableClosed();
 try{
  const session=await auth();const email=session?.user?.email;
  const expires=Date.parse(session?.expires||'');
  if(typeof email!=='string'||!Number.isFinite(expires)||expires<=Date.now())return new Response(null,{status:401,headers:{'Cache-Control':'no-store'}});
  if(email.trim().toLowerCase()!==process.env.PORTABLE_VAULT_ALLOWED_SUBJECT)return new Response(null,{status:403,headers:{'Cache-Control':'no-store'}});
  const text=await readFile(join(process.cwd(),'portable-vault/distribution/client.zip.b64'),'utf8');const bytes=Buffer.from(text.trim(),'base64');
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="khora-portable-candidate-0.2.zip"','Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff','Content-Digest':'sha-256=:'+createHash('sha256').update(bytes).digest('base64')+':'}});
 }catch{return portableClosed();}
}

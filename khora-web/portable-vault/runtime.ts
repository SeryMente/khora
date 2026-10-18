import { auth } from '../auth';
import { candidateRuntime } from './postgres.mjs';
import { principalFromVerifiedSession } from './session.mjs';
let instance: ReturnType<typeof candidateRuntime> | undefined;
export function portableRuntime() {
 if (process.env.PORTABLE_VAULT_ENABLED !== 'reviewed') return undefined;
 return instance ??= candidateRuntime({authenticate: async req => principalFromVerifiedSession(await auth(), req.headers.get('cookie'))});
}
export function portableClosed() {
 return new Response(JSON.stringify({error:'portable_vault_not_activated'}),{status:503,headers:{'Content-Type':'application/json','Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'}});
}

import { auth } from '../../../../auth';
import { candidateRuntime } from '../../../../portable-vault/postgres.mjs';
import { principalFromVerifiedSession } from '../../../../portable-vault/session.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
let candidate: ReturnType<typeof candidateRuntime> | undefined;
const closed = () => new Response(JSON.stringify({ error: 'portable_vault_not_activated' }), {
 status: 503, headers: {'Content-Type':'application/json','Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'}
});
async function dispatch(request: Request): Promise<Response> {
 // Fail closed before DB access, session lookup, or secret loading. No dev/mock fallback.
 if (process.env.PORTABLE_VAULT_ENABLED !== 'reviewed') return closed();
 try {
  candidate ??= candidateRuntime({authenticate: async req =>
   principalFromVerifiedSession(await auth(), req.headers.get('cookie'))
  });
  return await candidate.handler(request);
 } catch { return closed(); }
}
export async function POST(request: Request) { return dispatch(request); }
export async function GET(request: Request) { return dispatch(request); }

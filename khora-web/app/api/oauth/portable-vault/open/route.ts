import { portableRuntime, portableClosed } from '../../../../../portable-vault/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Middleware delegates /api/oauth/* to their own authentication. This handler accepts
// ONLY the persisted, 45-second, OTP-approved opening grant plus the client's proof.
export async function POST(request: Request) { try { return await portableRuntime()?.openingHandler(request) ?? portableClosed(); } catch { return portableClosed(); } }
export async function GET() { return new Response(null,{status:405,headers:{'Cache-Control':'no-store'}}); }

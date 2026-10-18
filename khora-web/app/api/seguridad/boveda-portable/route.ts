import { portableRuntime, portableClosed } from '../../../../portable-vault/runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function dispatch(request: Request) { try { return await portableRuntime()?.handler(request) ?? portableClosed(); } catch { return portableClosed(); } }
export async function POST(request: Request) { return dispatch(request); }
export async function GET(request: Request) { return dispatch(request); }

import { auth, signOut } from '@/auth';
import { presentNativeHTML } from '@/lib/server/chat-presentation';
import { proxyOpenWebUI } from '@/lib/server/chat-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
async function handle(request: Request) {
  const session = await auth();
  const response = await proxyOpenWebUI(request, session?.user?.email, {
    enabled: process.env.KHORA_CHAT_ENABLED === '1',
    apiUrl: process.env.KHORA_API_URL,
    apiKey: process.env.KHORA_API_KEY,
  });
  if (request.method === 'POST' && new URL(request.url).searchParams.get('path') === '/api/v1/auths/signout' && response.ok) {
    await signOut({ redirect: false, redirectTo: '/auth/signin' });
    return Response.json({ status: true, redirect_url: '/auth/signin' }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const nativePath = new URL(request.url).searchParams.get('path') || '';
  if (request.method === 'GET' && (nativePath === '/' || nativePath === '/auth' || nativePath.startsWith('/c/'))) {
    return presentNativeHTML(response);
  }
  return response;
}
export { handle as GET, handle as HEAD, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };

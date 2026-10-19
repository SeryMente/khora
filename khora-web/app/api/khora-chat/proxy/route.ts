import { auth } from '@/auth';
import { proxyOpenWebUI } from '@/lib/server/chat-proxy';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
async function handle(request: Request) {
  const session = await auth();
  return proxyOpenWebUI(request, session?.user?.email, {
    enabled: process.env.KHORA_CHAT_ENABLED === '1',
    apiUrl: process.env.KHORA_API_URL,
    apiKey: process.env.KHORA_API_KEY,
  });
}
export { handle as GET, handle as HEAD, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };

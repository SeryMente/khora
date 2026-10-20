/** Only Open WebUI routes; existing Khora /sistema, /api/chat and auth stay intact. */
export function openWebUIPath(path: string): boolean {
  if (/[\\\u0000-\u001f]/.test(path) || path.includes('..') || path.includes('%')) return false;
  return /^\/api\/tasks\/chat\/[0-9a-f-]{36}(?:\/stop)?$/.test(path) || path === '/ws/socket.io' || path === '/ws/socket.io/' || path === '/api/version' || path === '/'  || path === '/auth' || path === '/api/config' || path === '/api/models' ||
    path === '/api/chat/completions' || path === '/api/chat/completed' ||
    path === '/manifest.json' || path === '/user.png' || path === '/favicon.png' ||
    path.startsWith('/c/') || path.startsWith('/_app/') || path.startsWith('/static/') ||
    path.startsWith('/assets/') || path.startsWith('/licenses/') ||
    (path === '/api/v1/auths' || path.startsWith('/api/v1/auths/')) || (path === '/api/v1/chats' || path.startsWith('/api/v1/chats/')) ||
    (path === '/api/v1/models' || path.startsWith('/api/v1/models/')) || path.startsWith('/api/v1/users/user/') ||
    (path === '/api/v1/folders' || path.startsWith('/api/v1/folders/')) || path.startsWith('/api/v1/configs/banners');
}

/** Pinned, unchanged wheel assets on the same Vercel host, after real auth(). */
export function bundledOpenWebUIAsset(path: string): boolean {
  return openWebUIPath(path) && ['/_app/', '/assets/', '/licenses/'].some(prefix => path.startsWith(prefix));
}

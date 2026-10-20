/** Transport-only repair: unchanged pinned upstream CSS travels with native HTML.
 * No tenant data, browser storage, provider calls, upstream fork or CSS redesign.
 */
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const NATIVE_INITIAL_STYLES = [
  { name: 'Toaster.DKF17Rty.css', sha256: 'a8a60fdd2bee2a1b436c8de5ace21208de358d11cd0584fd53b6d2d54486d41d' },
  { name: 'Modal.CSlFhZkq.css', sha256: '4949a4a48ceb842a6c1f73574d08ece374e213418852e0c94b8bd7f86b49722a' },
  { name: '0.MeCDKVUP.css', sha256: '276ca3d02fdbed48b3263be57f40fba9bafef7ebcdd44bb626a6b6a760b5a92d' },
] as const;
export type StyleReader = (file: string) => Promise<Buffer>;
let verified: Promise<readonly string[]> | undefined;

export async function loadNativeStyles(reader: StyleReader = readFile): Promise<readonly string[]> {
  return Promise.all(NATIVE_INITIAL_STYLES.map(async ({ name, sha256 }) => {
    const bytes = await reader(path.join(process.cwd(), 'public', '_app', 'immutable', 'assets', name));
    if (createHash('sha256').update(bytes).digest('hex') !== sha256) throw Error('NATIVE_CSS_INTEGRITY_FAILED');
    const css = bytes.toString('utf8');
    if (/<\/style/i.test(css)) throw Error('NATIVE_CSS_UNSAFE');
    return css;
  }));
}

export function inlineNativeStyles(html: string, styles: readonly string[]): string {
  if (styles.length !== NATIVE_INITIAL_STYLES.length) throw Error('NATIVE_CSS_INCOMPLETE');
  // Match exactly the official link, preserving its original ordering, branding
  // and every other byte of the upstream HTML. No regex over tenant content.
  for (const [i, { name }] of NATIVE_INITIAL_STYLES.entries()) {
    const link = `<link href="/_app/immutable/assets/${name}" rel="stylesheet">`;
    if (html.split(link).length !== 2) throw Error('NATIVE_HTML_STYLE_CONTRACT_CHANGED');
    html = html.replace(link, () => `<style data-khora-native-css="${name}">${styles[i]}</style>${link.replace('rel="stylesheet"', 'rel="stylesheet" disabled data-khora-inlined="true"')}`);
  }
  return html;
}

export async function presentNativeHTML(response: Response, reader?: StyleReader): Promise<Response> {
  if (response.status !== 200 || !response.headers.get('content-type')?.includes('text/html')) return response;
  try {
    const styles = reader ? await loadNativeStyles(reader) : await (verified ??= loadNativeStyles().catch(error => { verified = undefined; throw error; }));
    const html = inlineNativeStyles(await response.text(), styles);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.set('Cache-Control', 'private, no-store');
    headers.set('X-Khora-Native-Presentation', 'pinned-css-inline-v1');
    return new Response(html, { status: 200, headers });
  } catch {
    return new Response('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chat temporalmente no disponible</title></head><body><main><h1>No se pudo cargar la presentación del chat</h1><p>No se ha borrado tu conversación. Vuelve a intentar en unos momentos.</p><p><a href="">Volver a intentar</a></p></main></body></html>', {
      status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' },
    });
  }
}

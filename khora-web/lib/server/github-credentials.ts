import { getDb } from './neon';
import { cifrarTexto, descifrarTexto, esTextoCifrado } from './cripto';
export type GithubPurpose = 'norm' | 'ep';
export class GithubCredentialError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
export function isGithubPurpose(value: unknown): value is GithubPurpose { return value === 'norm' || value === 'ep'; }
export function githubCredentialOwner(): string {
  const owner = (process.env.VAULT_AGENT_ALLOWED_EMAIL || process.env.EP_ALLOWED_EMAIL || '').trim().toLowerCase();
  if (!owner) throw new GithubCredentialError('GITHUB_VAULT_CONFIG',503,'Falta configurar al propietario de la bóveda en el servidor.');
  return owner;
}
export function validGithubToken(token: unknown): token is string {
  return typeof token === 'string' && /^github_pat_[A-Za-z0-9_]{20,240}$/.test(token);
}
export async function githubCredentialStatus(owner: string) {
  const result = await getDb().query('SELECT purpose, actualizado_en FROM github_credentials WHERE usuario=$1',[owner]);
  return { credentials: (['norm','ep'] as const).map(purpose => {
    const row = result.rows.find(row => row.purpose === purpose);
    return { purpose, configured: Boolean(row), updatedAt: row?.actualizado_en || null };
  }) };
}
export async function readGithubCredential(purpose: GithubPurpose, owner = githubCredentialOwner()): Promise<string | null> {
  const result = await getDb().query('SELECT ciphertext FROM github_credentials WHERE usuario=$1 AND purpose=$2',[owner,purpose]);
  if (!result.rows.length) return null;
  const ciphertext = result.rows[0].ciphertext;
  if (!esTextoCifrado(ciphertext)) throw new GithubCredentialError('GITHUB_VAULT_UNREADABLE',503,'Khora no pudo abrir la credencial protegida. Revisa la clave de cifrado del servidor.');
  try {
    const value = JSON.parse(descifrarTexto(ciphertext));
    if (value.owner !== owner || value.purpose !== purpose || !validGithubToken(value.token)) throw Error('binding');
    return value.token;
  }
  catch { throw new GithubCredentialError('GITHUB_VAULT_UNREADABLE',503,'Khora no pudo abrir la credencial protegida. Revisa la clave de cifrado del servidor.'); }
}
// No generic credential fallback: EP can never acquire the normative secret.
export async function githubTokenForEp(): Promise<string | null> {
  return await readGithubCredential('ep') || process.env.GITHUB_TOKEN?.trim() || null;
}
export async function validateGithubCredential(purpose: GithubPurpose, token: string) {
  if (!validGithubToken(token)) throw new GithubCredentialError('GITHUB_TOKEN_FORMAT',400,'Introduce un token de GitHub de permisos específicos que empiece por github_pat_. No uses el token de dictados.');
  const repo = purpose === 'norm' ? 'metodologia' : 'khora';
  let response: Response;
  try {
    response = await fetch('https://api.github.com/repos/SeryMente/' + repo + '/contents/', {
      headers: { Authorization: 'Bearer '+token, Accept: 'application/vnd.github+json', 'User-Agent': 'khora-github-vault/1', 'X-GitHub-Api-Version': '2022-11-28' },
      redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10000)
    });
  } catch { throw new GithubCredentialError('GITHUB_CHECK_UNAVAILABLE',503,'No pudimos comunicarnos con GitHub para comprobar el token. No se guardó ningún cambio.'); }
  const status = response.status;
  await response.body?.cancel();
  if (status === 401) throw new GithubCredentialError('GITHUB_TOKEN_REJECTED',422,'GitHub rechazó el token. Puede haber vencido o haber sido revocado. No se guardó.');
  if (status === 403 || status === 429) throw new GithubCredentialError('GITHUB_ACCESS_DENIED',422,'GitHub no permitió comprobar la lectura. Revisa permisos, aprobación de la organización o límites de peticiones. No se guardó.');
  if (status === 404) throw new GithubCredentialError('GITHUB_REPO_INACCESSIBLE',422,'GitHub no permitió encontrar o abrir SeryMente/'+repo+'. Revisa el repositorio y los permisos del token. No se guardó.');
  if (status !== 200) throw new GithubCredentialError('GITHUB_CHECK_UNAVAILABLE',503,'GitHub devolvió una respuesta inesperada. No se guardó ningún cambio.');
}
export async function changeGithubCredential(owner: string, purpose: GithubPurpose, token: string | null) {
  // Serialize changes and throttle in the shared database, not per serverless process.
  const client = await getDb().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',['github-secret:'+owner]);
    const count = await client.query("SELECT count(*)::int AS n FROM github_credential_events WHERE usuario=$1 AND creado_en>now()-interval '15 minutes'",[owner]);
    if (Number(count.rows[0]?.n) >= 10) throw new GithubCredentialError('GITHUB_CHANGE_LIMIT',429,'Se alcanzó el límite de cambios de credenciales. Espera quince minutos.');
    if (token !== null) {
      if (!validGithubToken(token)) throw new GithubCredentialError('GITHUB_TOKEN_FORMAT',400,'El token de GitHub no tiene el formato esperado.');
      // AAD-equivalent binding inside authenticated ciphertext prevents row/purpose substitution.
      const ciphertext = cifrarTexto(JSON.stringify({ owner, purpose, token }));
      await client.query('INSERT INTO github_credentials(usuario,purpose,ciphertext) VALUES($1,$2,$3) ON CONFLICT(usuario,purpose) DO UPDATE SET ciphertext=excluded.ciphertext, actualizado_en=now()',[owner,purpose,ciphertext]);
    } else await client.query('DELETE FROM github_credentials WHERE usuario=$1 AND purpose=$2',[owner,purpose]);
    await client.query('INSERT INTO github_credential_events(usuario,purpose,operation) VALUES($1,$2,$3)',[owner,purpose,token === null ? 'delete' : 'save']);
    await client.query('COMMIT');
  } catch(error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}

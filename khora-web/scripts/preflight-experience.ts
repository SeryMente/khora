/** Deployment-only, opt-in integration gate. Never emits credentials or user records. */
import { randomUUID } from 'node:crypto';
import { experienceOwner, saveExperience, readExperience, deleteExperience } from '../lib/server/dictado-experience';
import { getDb } from '../lib/server/neon';
import { POLICY, type ExperienceRecord } from '../lib/contracts/dictado-experience';
async function main() {
  if (process.env.KHORA_EXPERIENCE_VERIFY_STORAGE !== '1') {
    console.log('EXPERIENCE_STORAGE_PREFLIGHT=not_requested'); return;
  }
  let stage = 'configuration'; let touched = false; let owner: string | null = null;
  try {
    if (process.env.PLAYWRIGHT_TEST_RUN === '1' || process.env.NEXT_PUBLIC_PLAYWRIGHT_TEST === '1') throw new Error('test_environment');
    const url = new URL(process.env.DATABASE_URL || '');
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || /localhost|example|placeholder/i.test(url.hostname)) throw new Error('database_configuration');
    if (!process.env.AUTH_SECRET || (process.env.X_KHORA_KEY || '').length < 16) throw new Error('key_configuration');
    owner = experienceOwner({ id: 'deployment-storage-probe:' + randomUUID() });
    if (!owner) throw new Error('owner_configuration');
    const comment = 'Synthetic deployment probe ' + randomUUID();
    const record: ExperienceRecord = { id: randomUUID(), sessionId: randomUUID(), functionId: 'dictado', clientRelease: null, policyVersion: POLICY.version, data: { kind: 'feedback', source: 'voluntary', rating: null, reason: null, comment } };
    stage = 'write'; touched = true;
    if (await saveExperience(owner, record) !== 'saved') throw new Error('write_unverified');
    stage = 'encrypted_readback';
    const stored = await getDb().query('SELECT payload,comment_encrypted FROM khora_function_experience WHERE owner_key=$1 AND record_id=$2', [owner, record.id]);
    if (stored.rows.length !== 1 || stored.rows[0].payload.data.comment !== '' || !stored.rows[0].comment_encrypted || stored.rows[0].comment_encrypted.includes(comment)) throw new Error('encryption_unverified');
    const readback = await readExperience(owner);
    if (readback.records.length !== 1 || readback.records[0].data.kind !== 'feedback' || readback.records[0].data.comment !== comment) throw new Error('readback_unverified');
    stage = 'delete'; await deleteExperience(owner);
    if ((await readExperience(owner)).records.length !== 0) throw new Error('delete_unverified');
    console.log('EXPERIENCE_STORAGE_PREFLIGHT=passed write+cipher+read+delete (synthetic owner only)');
  } catch {
    console.error('EXPERIENCE_STORAGE_PREFLIGHT=blocked stage=' + stage + ' (details intentionally withheld)');
    process.exitCode = 1;
  } finally {
    if (touched) {
      if (owner) { try { await deleteExperience(owner); } catch { console.error('EXPERIENCE_PROBE_CLEANUP=unverified synthetic owner only'); process.exitCode = 1; } }
      await getDb().end();
    }
  }
}
main().catch(() => { console.error('EXPERIENCE_STORAGE_PREFLIGHT=blocked unexpected'); process.exitCode = 1; });

import { getDb } from "./neon";
import type { RuntimeStateSnapshot } from "@/lib/contracts/runtime-state";

export async function persistRuntimeState(snapshot: RuntimeStateSnapshot) {
  const db = getDb();
  await db.query(
    `INSERT INTO khora_runtime_state (
       runtime_id, session_id, observed_at, updated_at, route, screen,
       active, visible, focused, release_sha, source, privacy_class, state
     ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (runtime_id) DO UPDATE SET
       session_id = EXCLUDED.session_id,
       observed_at = EXCLUDED.observed_at,
       updated_at = NOW(),
       route = EXCLUDED.route,
       screen = EXCLUDED.screen,
       active = EXCLUDED.active,
       visible = EXCLUDED.visible,
       focused = EXCLUDED.focused,
       release_sha = EXCLUDED.release_sha,
       source = EXCLUDED.source,
       privacy_class = EXCLUDED.privacy_class,
       state = EXCLUDED.state`,
    [
      snapshot.runtime_id,
      snapshot.session_id,
      snapshot.observed_at,
      snapshot.route,
      snapshot.screen,
      snapshot.active,
      snapshot.visible,
      snapshot.focused,
      snapshot.release_sha ?? null,
      snapshot.source,
      snapshot.privacy_class,
      JSON.stringify(snapshot.state),
    ],
  );

  return {
    runtime_id: snapshot.runtime_id,
    session_id: snapshot.session_id,
    observed_at: snapshot.observed_at,
    persisted_at: new Date().toISOString(),
  };
}

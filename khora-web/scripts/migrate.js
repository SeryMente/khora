const { Pool } = require('pg');

async function migrate() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL no está configurada. Abortando migración.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  const sql = `
    create table jules_sessions (
    id uuid primary key default gen_random_uuid(),
    jules_session_id text unique not null,
    tarjeta_url text,
    branch text,
    pr_url text,
    state text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
    );
    create table jules_activities (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references jules_sessions(id),
    jules_activity_id text unique not null,
    activity_type text not null,
    payload jsonb not null,
    activity_created_time timestamptz not null,
    processed_at timestamptz not null default now()
    );
    create index on jules_activities (session_id, activity_created_time);
    create table poll_cursors (
    session_id uuid primary key references jules_sessions(id),
    last_create_time timestamptz not null
    );
    create table audit_verdicts (
    id uuid primary key default gen_random_uuid(),
    session_id uuid references jules_sessions(id),
    rubric_version text not null,
    item_scores jsonb not null,
    verdict text not null check (verdict in ('pass','fail')),
    auditor text not null,
    signed_at timestamptz not null default now(),
    notes text
    );
  `;

  try {
    await pool.query(sql);
    console.log("Migraciones aplicadas con éxito.");
  } catch (err) {
    console.error("Error aplicando migraciones:", err);
  } finally {
    await pool.end();
  }
}

migrate();

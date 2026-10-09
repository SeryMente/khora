-- Cap issuing/re-issuing short-lived GitHub App tokens per EP session.
CREATE TABLE IF NOT EXISTS ep_github_install_token_requests (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES ep_sessions(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ep_github_install_token_session_time
  ON ep_github_install_token_requests(session_id, issued_at DESC);

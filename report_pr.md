# Phase 1 Diagnostic Report: Env Vault

## Required Variables

### Vercel (khora-web)
Found in `process.env.*`:
- `AUTH_SECRET`
- `DATABASE_URL`
- `GEMINI_API_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GROQ_API_KEY`
- `INTERNAL_TRIGGER_SECRET`
- `JULES_API_KEY`
- `KHORA_API_KEY`
- `KHORA_API_URL`
- `MAX_CONCURRENT_JULES_SESSIONS`
- `MEDICAL_INTERP_MONTHLY_GOAL`
- `META_MINUTES_MONTH`
- `NEO4J_PASSWORD`
- `NEO4J_URI`
- `NEO4J_USER`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_VERSION`
- `NODE_ENV`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `NOTION_ROADMAP_DATABASE_ID`
- `NOTION_TOKEN`
- `OIDC_CLIENT_ID`
- `OIDC_CLIENT_SECRET`
- `OIDC_ISSUER_URL`
- `PLAYWRIGHT_TEST_RUN`
- `SMTP_HOST`
- `SMTP_PASS`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `TODOIST_TOKEN`

*(Excluded from Vault: `GITHUB_TOKEN`, handled directly via persisted auth; `NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA`, auto-injected).*

### Render (api/kernel)
Found in `api/README.md` and script constants:
- `KHORA_API_KEY`
- `KHORA_WEB_ORIGIN`
- `KHORA_LLM_API_URL`
- `KHORA_LLM_API_KEY`
- `KHORA_LLM_MODEL`

## Inconsistencies Detected
- The API uses `os.getenv("KHORA_API_KEY")`, while Vercel used `process.env.X_KHORA_KEY` in some files.
- The Render README and `fsum.py` use `LLM_CHEAP_*`, but OpenAI providers in the kernel use `KHORA_LLM_*`.
**Resolution:** The Vault uses canonical names `KHORA_API_KEY`, `KHORA_LLM_API_URL`, `KHORA_LLM_API_KEY`, and `KHORA_LLM_MODEL` with aliasing logic that automatically syncs the aliases (`X_KHORA_KEY`, `LLM_CHEAP_*`) in Vercel/Render, achieving backward compatibility seamlessly.

## Provider CLI / API Findings
- **Render**: The `@render-com/cli` NPM package has been taken down / unavailable publicly, hence breaking earlier versions of the script. Using the REST API natively (`Invoke-RestMethod` to `api.render.com/v1/services/{id}/env-vars/{key}`) is the most reliable way to interact. Needs `RENDER_API_KEY` and `RENDER_SERVICE_ID`.
- **Vercel**: CLI is fully operational. We use it via standard `vercel env add` along with a local temp file to inject variables safely, ensuring no trailing CRLF strings are added on Windows. Requires `VERCEL_TOKEN`.

# Phase 2 Implementation summary

1. Centralized Vault built over AES-256-CBC and HMAC-SHA256 (PS 5.1 compatible, derived using PBKDF2 with 200,000 iterations).
2. Uses the LastPass Master Password, retrieved ideally via `lpass` if installed, or falling back to `Read-Host`.
3. 100% Bootstrap and Auto-Verify setup on `Start-Sesion`:
    - Decrypts local git-versioned `secrets/env-vault.enc.json`.
    - Retrieves values from `vercel env pull` or Render REST API for bootstrapping if local Vault is empty for given keys.
    - Prompts interactively with `Read-Host` if variable missing in all environments.
    - Synchronizes any changes idempotently.

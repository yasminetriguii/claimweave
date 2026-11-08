# Account backend v0.3

Run `npm start` with Node 24. Open http://127.0.0.1:4173 and choose **Account & saved work**. Create a username/password account, save a synthetic workspace, sign out, then sign back in to reopen it. The public GitHub Pages demo remains static; it cannot provide the account API.

## Controls implemented

- Asynchronous scrypt (N=32768, r=8, p=1), unique random 16-byte salts, constant-time comparison. At most four password hashes execute concurrently.
- Random 256-bit session cookies. Only SHA-256 token hashes are stored in SQLite. Seven-day absolute expiry, logout invalidation, other-session revocation. HttpOnly, SameSite=Strict, Secure in production.
- Exact configured Origin required for writes; JSON-only bodies capped at 256 KiB. Parameterized SQL and ownership predicates on every workspace operation. Unknown and other-owner workspace IDs both return 404.
- Optimistic revision checks on updates and server-generated packets prevent stale overwrite and stale export. Server recomputes policy and purpose-specific consent from saved evidence; client-supplied evaluation results are ignored.
- Persistent per-IP and per-username authentication throttles with 15-minute expiry. No forwarded IP headers are trusted. Reverse-proxy traffic shares a throttle unless a reviewed proxy configuration is added.
- Workspace quotas, schema checks, SQLite foreign keys/WAL, bounded security-history reads, request/header timeouts, and shutdown handling.
- Security events originate on the server and are separate from editable browser activity. They are not cryptographically tamper-proof.

## API

`POST /api/signup`, `POST /api/login`, `GET /api/session`, `POST /api/logout`, `POST /api/sessions/revoke`, `GET /api/security`.

`GET/POST /api/workspaces`; `GET/PUT/DELETE /api/workspaces/:id`. A save body has `name`, `state`, `asOf`; updates also require `revision`.

`POST /api/workspaces/:id/evaluate` with `{revision}`. `POST /api/workspaces/:id/packet` with `{revision,programId}`. The latter blocks missing/withdrawn/expired consent, conflicting/stale evidence, and unmet checks.

## Hosting and operations

Set `NODE_ENV=production`, `HOST=0.0.0.0`, `PORT`, exact HTTPS `APP_ORIGIN`, and `DATABASE_PATH` on a persistent volume owned by the service account. Terminate TLS at the host. Dockerfile runs as the unprivileged node user. Preserve `/data` across deploys; do not place the database in public assets or a source archive. Back up SQLite through its backup API or stop the process before copying the database/WAL files. Test restore before using valuable data.

This is a single-instance prototype. SQLite and in-process hash concurrency limits do not provide multi-region failover or distributed abuse protection. Add managed identity/password recovery, verified email, MFA, database encryption/key management, monitored backups, load testing, and independent security review before accepting real personal records. No password reset exists yet. No third-party account providers are configured; there is no simulated connected-account badge or token collection.

## Verification limits

Handler integration tests exercise actual SQLite storage, request streams, sessions and authorization. The local executor blocks loopback socket connections; those tests call the HTTP handler directly. A successful handler test is not evidence of a deployed backend. Existing deterministic engine and planner tests run separately.

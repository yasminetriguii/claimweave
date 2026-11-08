# Free hackathon hosting

The hosted configuration uses a Render Free web service and a separate Free PostgreSQL database in the same region/workspace. `DATABASE_URL` holds the private connection URL in Render's environment settings. No paid disk is attached. Node uses a bounded pool and parameterized SQL. SQLite remains available locally when DATABASE_URL is unset.

Free Render PostgreSQL expires 30 days after creation. This is a temporary hackathon demonstration, not permanent free storage. Export synthetic work before expiry. Free web services sleep when idle; the first request can take about a minute. No payment method or automatic paid upgrade is required for this setup. When free usage is exhausted without a payment method, service availability can be suspended.

Set `NODE_ENV=production`, `HOST=0.0.0.0`, and `DATABASE_URL`. The server uses Render's `RENDER_EXTERNAL_URL` for its exact-origin write check unless APP_ORIGIN is explicitly supplied. HTTPS terminates at Render; session cookies are Secure. `/api/health` checks database connectivity.

The same handler security tests run against an isolated PostgreSQL test schema in CI, in addition to local SQLite. The disposable CI database must be named claimweave_test. Credentials are supplied through environment variables and never committed. After a deploy, confirm signup, login, saved-workspace retrieval, consent-gated packets, session revocation and logout over real HTTP. Real records remain outside this prototype's scope.

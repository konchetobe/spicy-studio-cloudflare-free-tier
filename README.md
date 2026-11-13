# Spicy Studio — Cloudflare Free Tier

A private, invite-only image and video generation studio for the SpicyModels catalog. This edition runs entirely on **Cloudflare Workers Free**: static assets, D1, R2, Durable Objects, and one Cron Trigger. No Containers, no Workers Paid plan, no Node server, and no local media disk.

The original Node/Express edition lives in [konchetobe/spicy-studio](https://github.com/konchetobe/spicy-studio). This repo is a separate Cloudflare port with its own history, deployment, and resources.

## What you get

- One admin account, created once at `/setup`.
- No public registration. Users join only through one-time invite links created by the admin.
- Admin can disable, delete, reset, or sign out users; see usage metadata; and create or revoke invites.
- Each user adds their own SpicyModels key, and optionally a Runware key, in `/settings`.
- API keys are encrypted with AES-GCM in D1 and are never returned to a browser.
- Generated images and videos are stored in R2 and served through an ownership-checked `/media/*` route.
- Task polling runs in a Durable Object, so it continues if the browser closes.
- The UI is the existing vanilla SPA. There is no React, Next.js, SSR, or build step.

## Free-tier budget

| Product | Free allowance used |
| --- | --- |
| Workers | 100,000 requests/day, 10 ms CPU, 128 MB, 50 subrequests |
| Static Assets | Free and unlimited requests |
| D1 | 5 GB total, 5M rows read/day, 100k rows written/day |
| R2 | 10 GB-month, 1M Class A/month, 10M Class B/month, free egress |
| Durable Objects | 100k requests/day, 13,000 GB-s/day, 5 GB SQLite storage |
| Cron Triggers | Free, five triggers |

To stay inside those limits:

- The static UI is served by Workers Static Assets and does not consume the Worker request meter.
- The client polls: 5 seconds while a task is running, 60 seconds when idle, paused when the tab is hidden.
- There is no SSE and no permanent background process.
- Password hashing runs in `AuthDO`, which has a 30-second CPU budget per request instead of the 10 ms normal Worker budget.
- R2 storage is capped at 9 GB by the app. At the cap, new outputs remain on the provider URL and the user is told to delete old tasks.
- Uploads and individual outputs are capped at 95 MB.
- A deployment defaults to a maximum of 10 users.
- Per-user rate limits cover login, setup, invites, generation, uploads, and key changes.
- Expired sessions, invites, resets, and rate-limit rows are cleaned by the cron trigger.

D1, Durable Object, and Worker limits are account-wide. If the same Cloudflare account runs other projects, they share the free allowance.

R2 may ask for a payment method when first enabled. Usage inside the free allowance is not charged; the app's 9 GB cap is there to prevent accidental overage.

## Deploy

Requirements: Node.js 20+, a Cloudflare account, and Wrangler. `wrangler login` is interactive.

```bash
npm install
npx wrangler login
```

Create the resources:

```bash
npx wrangler d1 create spicy-studio-cloudflare-free-tier
npx wrangler r2 bucket create spicy-studio-cloudflare-free-tier-media
```

Copy the `database_id` returned by D1 into `wrangler.jsonc`, replacing the all-zero placeholder. Then apply the schema:

```bash
npx wrangler d1 migrations apply spicy-studio-cloudflare-free-tier --remote
```

Generate and set the two secrets:

```bash
openssl rand -hex 32        # SETUP_TOKEN
openssl rand -base64 32     # KEY_ENCRYPTION_SECRET

npx wrangler secret put SETUP_TOKEN
npx wrangler secret put KEY_ENCRYPTION_SECRET
```

Set `APP_ORIGIN` in `wrangler.jsonc` to your deployed origin, for example:

```json
"vars": {
  "APP_ORIGIN": "https://spicy-studio-cloudflare-free-tier.<your-subdomain>.workers.dev"
}
```

Deploy:

```bash
npm run deploy
```

Open the Worker URL. Because the workspace has no users, it redirects to `/setup`.

## First run

1. Open `/setup`.
2. Enter the `SETUP_TOKEN` you set in Cloudflare.
3. Create the admin account.

Setup works only while the `users` table is empty and only with the correct setup token. It is permanently disabled afterward.

Then:

1. Sign in at `/login`.
2. Open **Admin** in the topbar.
3. Enter a user's email, create an invite, and copy the one-time link.
4. Send the link to that user through a channel you trust.
5. The user opens `/invite#<token>`, sets their name and password, and signs in.
6. The user opens **Settings** and saves their own SpicyModels key. A Runware key is optional.

There is no email sending on the free tier. Invite and password-reset links must be copied and delivered by the admin.

## Local development

Wrangler's local runtime (`workerd`) may not run on Android/Termux. For phones and other environments where `wrangler dev` cannot start, this repo includes a Node preview server with local D1/R2/DO stand-ins:

```bash
cp .dev.vars.example .dev.vars
# edit .dev.vars, then:
npm run dev:local
```

Open <http://localhost:8787>. The preview uses SQLite via `sql.js`, local files under `.local-preview/r2`, and in-process Durable Objects. It is for local UI work only; the deployed Worker always uses Cloudflare bindings.

On a normal desktop, the standard Wrangler flow is:

```bash
npm run db:migrate:local
npm run dev
```

## Admin and user flow

### Roles

- `admin` — exactly one, created at setup. Can create invites, manage users, and see usage metadata.
- `user` — created only by accepting an admin invite.

There is no registration route after setup.

### Admin capabilities

- List users with status, key status (last 4 only), task count, storage used, and last login.
- Create and revoke one-time invites.
- Disable or enable a user. Disabling removes all of their sessions.
- Delete a user, their tasks, their media, and their encrypted keys.
- Generate a one-time password-reset link (one hour).
- Sign a user out of all devices.
- View app-wide storage, user count, and tasks today.
- View a recent admin activity log.

The admin cannot read another user's API keys, prompts, tasks, or media.

### User capabilities

- Change their own password.
- Save, replace, or remove their SpicyModels and Runware keys.
- Generate, optimize, upload references, view their own activity, and delete their own tasks.
- Only their own tasks and media are visible.

## API key handling

Keys are encrypted before they touch D1:

- Master secret: `KEY_ENCRYPTION_SECRET` (32 random bytes, base64).
- Per-user key: HKDF-SHA256 with the user id as salt and `spicy-studio:user-secret:v1` as info.
- Encryption: AES-GCM 256 with a random 12-byte IV.
- AAD binds the ciphertext to `userId:provider`, so a key cannot be swapped between users or providers.
- The browser receives only `configured`, `last4`, and `updatedAt`.

If `KEY_ENCRYPTION_SECRET` is lost, every user must re-enter their keys. If `SETUP_TOKEN` is lost after setup, it is no longer needed; keep it out of the repo and out of logs.

## Password and session handling

- PBKDF2-HMAC-SHA256, 210,000 iterations, 16-byte salt, 32-byte hash.
- Hashing runs in `AuthDO`, not in the normal Worker handler.
- Session tokens are 32 random bytes; D1 stores only their SHA-256 hash.
- Cookies are HttpOnly, Secure (on HTTPS), SameSite=Lax, and last 7 days.
- Session records carry the user's `session_version`; changing a password or using "sign out all" invalidates every old session.
- CSRF tokens are stored per session and required on mutating requests. Origin is checked as well.
- Login failures are rate-limited and return a generic error.

## Storage and task lifecycle

1. `POST /api/generate` validates the payload against the model contract.
2. A task row is inserted in D1.
3. `TaskPoller` submits it to SpicyModels with the user's key.
4. Durable Object alarms poll the provider every 5 seconds for images and 8 seconds for videos.
5. On completion, outputs are streamed to R2 with a byte counter and size checks.
6. If the 9 GB cap would be exceeded, the output is left on the provider URL and marked as capped.
7. The UI polls `/api/tasks` and shows the saved local copy or the provider URL.

A task that is interrupted is recovered by the cron trigger or by reopening the app. Deleting a finished task removes its D1 row and R2 objects.

## Routes

Public/auth:

- `GET /api/health`
- `GET /api/auth/state`
- `POST /api/auth/setup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/password`
- `POST /api/auth/reset`
- `POST /api/invites/accept`

Admin:

- `GET /api/admin/users`
- `PATCH /api/admin/users/:id`
- `DELETE /api/admin/users/:id`
- `POST /api/admin/users/:id/reset`
- `POST /api/admin/users/:id/logout-all`
- `GET /api/admin/invites`
- `POST /api/admin/invites`
- `DELETE /api/admin/invites/:id`
- `GET /api/admin/usage`
- `GET /api/admin/audit`

Settings:

- `GET /api/settings/keys`
- `PUT /api/settings/keys/:provider`
- `DELETE /api/settings/keys/:provider`
- `POST /api/settings/keys/:provider/test`

Studio:

- `GET /api/models`
- `GET /api/models/:id`
- `GET /api/balance`
- `POST /api/optimize`
- `POST /api/generate`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `POST /api/upload`
- `GET /media/:taskId/:index`

## Project layout

```
src/index.js                 Worker entry, Hono routes, cron
src/auth.js                  cookies, sessions, CSRF, middleware
src/crypto.js                PBKDF2, tokens, hashing
src/keys.js                  AES-GCM per-user key encryption
src/db.js                    D1 repositories
src/spicy.js                 SpicyModels client
src/optimizer.js             Runware optimizer + local fallback
src/catalog.js               live model catalog + fallback
src/tasks.js                 task creation and media deletion
src/durable/auth-do.js       setup/login/invite/password hashing
src/durable/task-poller.js   provider polling + R2 download
migrations/0001_init.sql     D1 schema
public/                      SPA, auth screens, settings, admin
test/                        node:test suites
wrangler.jsonc               Worker, D1, R2, DO, cron config
```

## Operational notes

- This is a single-admin, invite-only studio intended for a small trusted group. The default free-tier user cap is 10.
- There is no email service. Invite and reset links are copied manually.
- There is no self-service account recovery. The admin generates reset links. If the admin loses their password, use a one-off D1 update with a freshly generated PBKDF2 hash; keep the database and secrets out of git.
- The app has no multi-tenant billing. Each user's generation spend goes to their own SpicyModels key.
- Do not commit `.dev.vars`, `.env`, D1 exports, R2 dumps, or generated media. The `.gitignore` covers the local files.
- Cloudflare Access is optional. If you want a second gate in front of the Worker, put an Access policy on the custom domain; app auth still enforces roles and invites.

## Tests

```bash
npm test
```

The suites cover the model contracts, validation, prompt JSON extraction, password hashing, and key encryption.

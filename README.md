# Famora

A checklist for the two moments nobody prepares for: the days after a death, and the years
before one. Angular 21, zoneless, Supabase as the backend.

## Setup

```bash
npm install
```

Create `.env.local` in the project root and fill in the values below.

| Variable             | Where it comes from                                          |
| -------------------- | ------------------------------------------------------------ |
| `SUPABASE_URL`       | Supabase dashboard -> Project Settings -> API -> Project URL |
| `SUPABASE_ANON_KEY`  | Same page -- the **anon / publishable** key                  |
| `TURNSTILE_SITE_KEY` | Cloudflare dashboard -> Turnstile -> the widget's Site Key   |

`SUPABASE_ANON_KEY` must never hold the `service_role` key. It bypasses Row Level Security and
is compiled into the public browser bundle, so the build aborts on it -- see
`scripts/generate-environment.mjs`.

`TURNSTILE_SITE_KEY` is public by design too, same as the anon key. The matching Secret Key is
never in this repo; it belongs in the Supabase dashboard under Authentication -> Attack Protection
-> Enable CAPTCHA protection.

That switch is not per form: with it on, Supabase rejects sign-in, registration and password-reset
requests alike unless they carry a token, so all three forms render the widget. A build without
`TURNSTILE_SITE_KEY` then cannot sign anyone in -- the server answers `400 captcha_failed`. Either
supply the key or leave CAPTCHA protection off in the project; a half-configured pair locks the app
out of its own backend.

For local development the widget's Site Key only works once `localhost` is listed under Hostname
Management for that widget in the Cloudflare dashboard. Cloudflare's dummy keys are no help here:
Supabase verifies against the one Secret Key stored in the project, and the dummy pair does not
match it.

The generator runs once when the dev server starts, not on every request. After changing
`.env.local`, restart `npm start` -- otherwise the bundle keeps serving the values it was built
with, and the app reports Supabase as not configured.

`.env.local` and the `src/environments/environment.ts` generated from it are both gitignored.
Without them the app still builds; it degrades into a "not configured" state instead.

## Database

Two SQL files describe the whole schema. Run them in the Supabase SQL editor, in this order:

1. `supabase/schema.sql` -- the `folders` table and the `set_updated_at()` trigger function
2. `supabase/folder-entries.sql` -- the register, which references both

Both are repeatable: running them again changes nothing and deletes no data. When something
needs changing, change it in the file and run the whole file again, so the file stays the truth
about the database.

## Commands

| Command                | What it does                                   |
| ---------------------- | ---------------------------------------------- |
| `npm start`            | Development server on `http://localhost:4200/` |
| `npm test`             | Unit tests (Vitest)                            |
| `npm run lint`         | ESLint over TypeScript and templates           |
| `npm run format:check` | Prettier, without writing                      |
| `npm run build`        | Production bundle into `dist/`                 |

## Structure

Feature-based, not type-based. Everything belonging to one feature sits in one folder under
`src/app/features/`, including its queries, types and tests. `src/app/components/` holds only
genuinely shared UI primitives, `src/app/lib/` the wrappers around external services.

# Mind Flow Tumblr-like Rework (Auth + Feed)

This adds a basic Node/Express + SQLite (better-sqlite3) backend for user accounts and a Tumblr-style feed while preserving the legacy single-user Mind Flow UI under `#legacy-app`.

## Features

- Register / Login with username + password (bcrypt hashed)
- JWT auth (2h expiry) stored only in localStorage (client).
- Posts table stores: mood, tags, notes, optional conversation snapshot (JSON).
- Global feed endpoint (simple public/time-ordered) and user-only posts endpoint.
- Lightweight front-end overlay (`auth.js`) that provides:
  - Auth modal
  - Compose panel (mood/tags/notes)
  - Infinite-ish (capped 200) feed style reminiscent of Tumblr

## Endpoints

| Method | Path           | Auth | Description                                          |
|--------|----------------|------|------------------------------------------------------|
| POST   | /api/register  | no   | Create account { username, password }                |
| POST   | /api/login     | no   | Returns { token }                                    |
| GET    | /api/me        | yes  | Returns current user info                            |
| GET    | /api/feed      | yes  | Returns latest 200 posts all users                   |
| GET    | /api/posts     | yes  | Returns latest 100 posts for current user            |
| POST   | /api/posts     | yes  | Create post { mood?, tags[], notes, conversation? }  |
| DELETE | /api/posts/:id | yes  | Delete own post                                      |

## Running Locally

Install dependencies and start the server:

```cmd
npm install
npm run dev
```

Then open: <http://localhost:3001/>

## Data File

The SQLite DB is `app.db` in the project root. WAL mode is enabled for reliability.

## Integrating Mind Flow Logs

Currently Mind Flow still saves to localStorage only. To sync each log to the server automatically, add a fetch POST to `/api/posts` inside `persistLogs` (guarded by presence of a JWT). This was left out to minimize invasive changes—can be added as a next step.

## Security Notes (Dev Mode)

- Replace `JWT_SECRET` with an env var in production.
- Add rate limiting & stronger password policy before public deployment.
- Consider CSRF protections if migrating to cookies instead of localStorage.

## Next Steps / Enhancements

1. Attach Mind Flow save to server post creation (with conversation snapshot).
2. Add pagination / lazy loading for feed.
3. Add user profile pages (e.g., /u/:username) and per-user mood trend charts.
4. Implement password reset / email verification.
5. Move inline React (Babel in-browser) build to a bundler (Vite / webpack) for production.
6. Add tests (Jest or Vitest) for API endpoints.

---
Generated scaffolding: README maintained separately from original README.md to avoid overwriting existing documentation.

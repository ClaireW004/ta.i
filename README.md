# Teaching Assistant Intelligence (TA.I)

TA.I helps presenters deliver better lectures by importing slide decks and offering presenter-only, real-time assistance. It keeps the audience view clean while showing private suggestions to the presenter. The vision includes two additional agents: pacing (warn if speaking too fast/slow) and focus (nudge back on topic if speech drifts from the slides).

Current focus: Google Slides import, presenter-only suggestions, and speech-to-text capture.

## Project structure

- `tai/` — Next.js 14 app (App Router, React 18, Tailwind v4, shadcn/Radix UI)
	- `app/` — routes and API endpoints (e.g., Google Slides import)
	- `components/` — UI (importer, viewer, UI primitives)
	- `hooks/`, `lib/`, `styles/`, `public/` — utilities, styling, and assets
- `tai/flask-server/` — Flask service for AI suggestions (Gemini via google-adk/google-genai)

## Features (current)

- Import Google Slides by URL and analyze content (title, text, speaker notes)
- Presenter mode with a private suggestions panel (kept off the screen share)
- Real-time speech-to-text capture to drive dynamic suggestions
- Presentation time input and consistent “Start Presenting” behavior across flows

Note: PowerPoint (PPTX) import is planned; the current UI emphasizes Google Slides.

## Prerequisites

- Node.js 18+ (recommended)
- pnpm (via Corepack)
- A Google Cloud project with:
	- Google Slides API enabled
	- OAuth 2.0 Web Client credentials (for Google sign-in)
	- Optional: Speech-to-Text API enabled (for STT)
- Optional for suggestions backend: a Google AI Studio API key (Gemini) or Vertex AI setup

## Frontend (Next.js) — run locally

From the `tai/` folder:

```bash
corepack enable
pnpm install
pnpm dev
```

Then open http://localhost:3000

### Environment variables (`tai/.env.local`)

These are commonly required for the current flows. Names may evolve; use your existing secrets where applicable.

- `NEXTAUTH_URL` — e.g., http://localhost:3000
- `NEXTAUTH_SECRET` — random string for NextAuth
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `GOOGLE_CLOUD_STORAGE_BUCKET` — bucket used to store slide metadata/thumbnails
- Optional for STT (server-side):
	- `GOOGLE_APPLICATION_CREDENTIALS` — absolute path to a service account JSON with access to Speech-to-Text and Storage

Sign in with Google, paste a Google Slides URL, set presentation time, and import. After import, click “Start Presenting” to open the presenter view with the correct countdown.

## AI suggestions backend (Flask) — optional but recommended

From the `tai/flask-server/` folder:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install Flask Flask-Cors google-adk google-genai python-dotenv

# Provide credentials at runtime (the app does not automatically load .env)
export GOOGLE_API_KEY="<your_gemini_api_key>"

python app.py
```

This starts the API on http://localhost:5000 with a single endpoint:

- `POST /query` — body: `{ "query": "..." }` → `{ "response": "..." }`

If you plan to use Vertex AI instead of API keys, configure the corresponding Vertex environment (ADC) and model settings.

### Troubleshooting

- Google Slides import fails: ensure the URL is correct and your Google OAuth is configured. The slide deck must be accessible to the signed-in account.
- Speech-to-Text errors: confirm `GOOGLE_APPLICATION_CREDENTIALS` points to a service account with the right permissions and that the APIs are enabled.
- Flask “Missing key inputs argument!” or similar: confirm `GOOGLE_API_KEY` is exported (or Vertex ADC is set up) before starting the server.

## Scripts

From `tai/`:

- `pnpm dev` — start Next.js in development
- `pnpm build` — production build
- `pnpm start` — start production server (after build)
- `pnpm lint` — lint code

## Roadmap

MVP — Presenter-only suggestions + pacing & focus agents

- A1: Slide import UI — Google Slides (PPTX upload planned)
- A2: Presenter mode UI — presenter-only panel; overlay/window polishing
- A3: Real-time STT pipeline — client-side capture with optional cloud integration
- A4: Focus Agent — semantic similarity detection using embeddings
- A5: Pacing Agent — words-per-minute and slide dwell detection with simple warnings
- A6: Minimal ADK wiring — local agent host and optional cloud endpoint for heavy tasks

Phase 2 — Reliability, scaling, and UX

- B1: Better slide comprehension (speaker notes + bullet extraction)
- B2: Offline-first STT caching & progressive sync
- B3: Permissioned sharing, privacy center, telemetry controls
- B4: Integrations — Zoom/Teams plugin or Chrome extension for presenter-only overlays

Phase 3 — Extended features

- C1: Missed-content detection + overlay agent
- C2: Practice-problem / example generator with save/export
- C3: Post-presentation reflection report (tone, speed, engagement)
- C4: Q&A heatmap and analytics dashboard

Phase 4 — Enterprise readiness

- D1: Multi-language STT and multilingual slide comprehension
- D2: Customizable agent rules (institution-specific glossaries and domain models)
- D3: SSO, enterprise policy, and team-sharing controls
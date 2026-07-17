# Pariksha Saathi — CBSE Class 10 Study Companion

## What's inside
- **Doubt Solver** — type, speak, or photograph a question. Subject is auto-detected. "Live Voice Mode" for hands-free listen→answer→speak.
- **Mock Test** — subject + chapter dropdowns, question style (standard/assertion-reason/case-study/mixed), difficulty (easy/medium/hard/mixed), unlimited questions, live grading, no repeats, and a "Review Mistakes" panel that collects everything you got wrong with explanations.
- **Notes** — subject + chapter, three length tiers (Short / Detailed / Complete revision book), colorful structured PDF download. Select topics automatically get a hand-drawn, exam-accurate diagram (human eye, circuit, trig triangle, ray reflection) inline and in the PDF — these are fixed pre-authored diagrams, never AI-generated, so they're never mislabeled.
- **Flashcards** — swipeable front/back cards per chapter, "Got It" / "Review Again" loop, shuffle, read-aloud, and mastery count persisted per chapter across sessions.
- **Study Planner** — pick subjects (and weaker ones for extra focus), get a day-by-day revision plan with checkboxes that persist, a visual progress bar, and an "Extend Plan" button to add more days without starting over.
- **Board Exam** — temporarily set to a "Coming Soon" placeholder while it's rebuilt properly; the working code is still in `app/page.js` and the `app/api/exam/*` routes, just not wired into the nav for now.

All AI responses come from **Ms. Sahi**, a consistent warm-teacher persona used across every feature (`lib/teacherPersona.js`).

## Security & handling many users at once
- **Per-IP rate limiting** on every API route (`lib/rateLimit.js`), tuned per endpoint (heavier endpoints like exam/planner get lower limits).
- **Input validation** everywhere (`lib/validate.js`) — string length caps, image size/type checks.
- **Client-side image compression** before any photo upload — smaller, faster requests.
- **Security headers** (`next.config.mjs`) — clickjacking, MIME-sniffing, permissions policy.
- **Root-cause localStorage safety** — every read/write goes through `safeLocalGet`/`safeLocalSet` (in `app/page.js`), so corrupted or missing browser storage never crashes a tab.
- If you outgrow the in-memory rate limiter, swap `lib/rateLimit.js` for Upstash Redis (same pattern as KeryoAI) — only that one file needs to change.

## Important limitations to know about (honest disclosure)
- **No login yet.** Everything is stored in the browser's `localStorage`, per device.
- **AI grading/generation quality** depends on the underlying model — always spot-check generated papers/notes against your actual textbook, especially for newer or revised syllabus chapters.
- **Notifications aren't built yet** (deferred along with login).

## Architecture
This is a Next.js (App Router) app. All AI calls happen **server-side** in `/app/api/*/route.js` — your API keys never reach the browser. The client calls your own `/api/solve`, `/api/questions`, `/api/notes` endpoints.

`lib/ai.js` tries **Groq first** (fastest), and automatically **falls back to OpenRouter** if Groq fails or isn't configured. For photo questions (vision), it uses each provider's vision model specifically.

## Deploying to Vercel

1. Push this folder to a GitHub repo (or drag-and-drop deploy on vercel.com).
2. In the Vercel project settings → **Environment Variables**, add:
   - `GROQ_API_KEY` — from console.groq.com (free tier)
   - `OPENROUTER_API_KEY` — from openrouter.ai (free tier, used as fallback)
3. Deploy. That's it — no other config needed.

You only need **one** of the two keys for the app to work, but having both gives you automatic fallback if one provider is down or rate-limited.

## Optional: overriding models
If a model gets deprecated in the future (this happens periodically with free/fast-moving providers), you don't need to touch code — just add one of these env vars in Vercel and redeploy:

```
GROQ_TEXT_MODEL=openai/gpt-oss-120b
GROQ_VISION_MODEL=qwen/qwen3.6-27b
OPENROUTER_TEXT_MODEL=meta-llama/llama-3.3-70b-instruct:free
OPENROUTER_VISION_MODEL=google/gemma-4-31b-it:free
```

These are already the defaults baked into `lib/ai.js` — you only need to set them if you want to change the model.

## Local development
```
npm install
cp .env.example .env.local   # then fill in your keys
npm run dev
```

## Notes on voice features
Voice input/output uses the browser's built-in Web Speech API — works well in Chrome and Edge (desktop and Android), not fully supported in Safari/Firefox. No extra API or cost involved.

## Before going live
Run `npm audit` and `npm update` periodically — dependency security advisories (Next.js, jsPDF, etc.) get published often, and it's good practice to stay current.

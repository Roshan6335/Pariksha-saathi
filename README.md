# Pariksha Saathi — CBSE Class 10 Study Companion

## What's inside
- **Doubt Solver** — type, speak, or photograph a question. Subject is auto-detected. "Live Voice Mode" for hands-free listen→answer→speak.
- **Mock Test** — subject + chapter dropdowns, question style selector (standard/assertion-reason/case-study/mixed), unlimited questions, live grading, no repeats.
- **Board Exam** — full 80-mark, 3-hour CBSE-format paper, generated section-by-section for reliability. Fullscreen + tab-switch detection with auto-submit after 3 violations, app navigation itself locks during the exam. Typed or photographed subjective answers, AI-graded right after submission.
- **Notes** — subject + chapter, Short/Detailed toggle, colorful structured PDF download.
- **Flashcards** — swipeable front/back cards per chapter, "Got It" / "Review Again" loop so weak cards resurface.
- **Study Planner** — pick subjects (and weaker ones for extra focus), get a day-by-day revision plan with checkboxes that persist.

All AI responses come from **Ms. Sahi**, a consistent warm-teacher persona used across every feature, defined once in `lib/teacherPersona.js`.

## Security & handling many users at once
- **Per-IP rate limiting** on every API route (`lib/rateLimit.js`) — protects the shared Groq/OpenRouter quota from being drained by one abusive client, which is what actually causes "the whole app breaks for everyone."
- **Input validation** everywhere (`lib/validate.js`) — string length caps, image size/type checks — rejects abusive payloads before they reach the AI provider.
- **Client-side image compression** before any photo upload (doubt photos, exam answer photos) — smaller, faster requests, less cost per request, less abuse surface.
- **Security headers** (`next.config.mjs`) — clickjacking protection, MIME-sniffing protection, locked-down permissions policy.
- Being serverless (Vercel), each request is isolated by default, which already scales horizontally — the rate limiter is what keeps that scaling from being exploited.
- If you outgrow the in-memory rate limiter (e.g. multiple regions/instances not sharing state), swap `lib/rateLimit.js` for Upstash Redis — same pattern you used in KeryoAI, only this one file needs to change.

## Important limitations to know about (honest disclosure)
- **No login yet.** Everything (exam history, flashcard/study-plan progress, asked-question tracking) is stored in the browser's `localStorage`, per device.
- **"Fullscreen + tab-switch detection" is not a true device lock.** No website can literally prevent a student from switching apps — that needs a native app with OS-level permissions. This detects, warns, counts violations, and auto-submits after 3 — a deterrent + audit trail, same as real browser-based exam platforms, not an unbreakable lock.
- **The exam's answer key travels to the browser in memory** (never rendered in the UI) so MCQs can be graded instantly without a database. A technically sophisticated student inspecting dev tools could find it — inherent to having no backend database yet.
- **AI grading of handwritten answers is an estimate**, not an official CBSE score.
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

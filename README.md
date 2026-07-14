# Pariksha Saathi — CBSE Class 10 Study Companion

## What's inside
- **Doubt Solver** — type, speak, or photograph a question. Subject is auto-detected from the question itself. Includes a "Live Voice Mode" that keeps listening → answering → speaking, hands-free.
- **Mock Test** — pick subject + chapter from dropdowns (NCERT chapter lists built in, with an "Other" option for anything not listed). Choose question style (standard / assertion-reason / case-study / mixed). Unlimited questions, live grading, no repeated questions, retries automatically on rate limits.
- **Board Exam** — generates a full CBSE-format practice paper (proper sections, ~80 marks, 180 minutes) for a subject, enforces fullscreen + tab-switch detection during the test, accepts typed or photographed answers for subjective questions, and AI-grades the whole paper against an examiner-style marking scheme right after submission.
- **Notes** — pick subject + chapter, choose Short or Detailed, download a colorful formatted PDF (built from structured AI output, not fragile text-parsing).

## Important limitations to know about (honest disclosure)
- **No login yet.** Everything (exam history, asked-question tracking) is stored in the browser's `localStorage`, per device. Nothing syncs across devices. Adding accounts (Supabase email-OTP is the free option) is a natural next step whenever you want it.
- **"Fullscreen + tab-switch detection" is not a true device lock.** No website can literally prevent a student from switching apps on their phone or laptop — that requires a native installed app with OS-level permissions (like Respondus LockDown Browser). What this app does, matching how real browser-based exam platforms work, is *detect* when the student leaves fullscreen or switches tabs/apps, warn them, count violations, and auto-submit after 3 violations. It's a deterrent + audit trail, not an unbreakable lock.
- **The exam's answer key travels to the browser in memory** (never rendered in the UI, only used after submission) so that MCQ questions can be graded instantly without a database. A technically sophisticated student inspecting browser dev tools could find it. This is an inherent trade-off of having no backend database yet — same limitation any client-side quiz app has without a server-stored answer key.
- **AI grading of handwritten/photographed answers is an estimate**, not an official CBSE score — handwriting quality affects accuracy. It's meant to help students self-assess, not as a certified result.
- **Notifications aren't built yet** (deferred along with login) — results currently show immediately in-app after grading rather than being pushed to the student later.

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

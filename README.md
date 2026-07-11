# Pariksha Saathi — CBSE Class 10 Study Companion

## What's inside
- **Doubt Solver** — type, speak, or photograph a question. Subject is auto-detected from the question itself. Includes a "Live Voice Mode" that keeps listening → answering → speaking, hands-free.
- **Mock Test** — pick subject + chapter from dropdowns (NCERT chapter lists built in, with an "Other" option for anything not listed). Unlimited questions, live grading, no repeated questions.
- **Notes** — pick subject + chapter, choose Short or Detailed, download a colorful formatted PDF.

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

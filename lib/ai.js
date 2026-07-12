// Central place for all AI provider calls.
// Text requests: try Groq first (fastest), fall back to OpenRouter if Groq fails or has no key.
// Vision requests (image attached): Groq's vision models are preview-only and less stable,
// so we try Groq's vision model first but fall back to OpenRouter's vision model quickly.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "openai/gpt-oss-120b";
const GROQ_VISION_MODEL = process.env.GROQ_VISION_MODEL || "qwen/qwen3.6-27b";
const OPENROUTER_TEXT_MODEL = process.env.OPENROUTER_TEXT_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
const OPENROUTER_VISION_MODEL = process.env.OPENROUTER_VISION_MODEL || "google/gemma-4-31b-it:free";

function buildUserContent(userText, imageDataUrl) {
  if (!imageDataUrl) return userText;
  return [
    { type: "text", text: userText },
    { type: "image_url", image_url: { url: imageDataUrl } },
  ];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Pulls a suggested wait time out of a 429 error message if the provider gave one
// (Groq includes "Please try again in 674.999999ms" style hints), otherwise
// falls back to a sensible default. Clamped so we never wait too long per attempt.
function extractRetryDelayMs(message) {
  const msMatch = message.match(/try again in\s*([\d.]+)\s*ms/i);
  if (msMatch) return Math.min(Math.max(parseFloat(msMatch[1]), 300), 4000);
  const sMatch = message.match(/try again in\s*([\d.]+)\s*s/i);
  if (sMatch) return Math.min(Math.max(parseFloat(sMatch[1]) * 1000, 300), 4000);
  return 900;
}

async function callProviderOnce(url, apiKey, model, systemPrompt, userContent, maxTokens) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: maxTokens || 1200,
      temperature: 0.4,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    const err = new Error(`Provider error (${res.status}): ${errText.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  if (!text.trim()) {
    throw new Error("Provider returned an empty response.");
  }
  return text;
}

// Retries on 429 (rate limit) and 503 (transient overload) with backoff.
// Other errors (401, 400, etc.) fail immediately — retrying won't help those.
async function callProvider(url, apiKey, model, systemPrompt, userContent, maxTokens, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callProviderOnce(url, apiKey, model, systemPrompt, userContent, maxTokens);
    } catch (e) {
      lastErr = e;
      const retryable = e.status === 429 || e.status === 503;
      if (retryable && attempt < maxRetries) {
        await sleep(extractRetryDelayMs(e.message));
        continue;
      }
      throw e;
    }
  }
  throw lastErr;
}

/**
 * Main entry point. Returns { text, provider } or throws with a clear message.
 */
export async function callAI({ systemPrompt, userText, imageDataUrl, maxTokens }) {
  const groqKey = process.env.GROQ_API_KEY;
  const orKey = process.env.OPENROUTER_API_KEY;

  if (!groqKey && !orKey) {
    throw new Error(
      "No AI provider is configured on the server. Set GROQ_API_KEY or OPENROUTER_API_KEY in your environment variables."
    );
  }

  const userContent = buildUserContent(userText, imageDataUrl);
  const isVision = !!imageDataUrl;
  const errors = [];

  // Order of attempts: for text -> Groq then OpenRouter. For vision -> Groq vision then OpenRouter vision.
  const attempts = [];
  if (groqKey) {
    attempts.push({
      provider: "groq",
      url: GROQ_URL,
      key: groqKey,
      model: isVision ? GROQ_VISION_MODEL : GROQ_TEXT_MODEL,
    });
  }
  if (orKey) {
    attempts.push({
      provider: "openrouter",
      url: OPENROUTER_URL,
      key: orKey,
      model: isVision ? OPENROUTER_VISION_MODEL : OPENROUTER_TEXT_MODEL,
    });
  }

  for (const attempt of attempts) {
    try {
      const text = await callProvider(
        attempt.url,
        attempt.key,
        attempt.model,
        systemPrompt,
        userContent,
        maxTokens
      );
      return { text, provider: attempt.provider };
    } catch (e) {
      errors.push(`${attempt.provider}: ${e.message}`);
      // try next provider
    }
  }

  throw new Error(
    "All configured AI providers failed. Details — " + errors.join(" | ")
  );
}

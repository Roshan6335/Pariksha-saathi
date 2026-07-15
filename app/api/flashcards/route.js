import { callAI } from "../../../lib/ai";
import { parseAIJson } from "../../../lib/jsonRepair";
import { rateLimit, getClientKey, rateLimitResponse } from "../../../lib/rateLimit";
import { capString } from "../../../lib/validate";
import { TEACHER_PERSONA } from "../../../lib/teacherPersona";

export const maxDuration = 30;

export async function POST(request) {
  try {
    if (!rateLimit(getClientKey(request), 12)) return rateLimitResponse();

    const body = await request.json();
    let { subject, chapter, count = 10, alreadyMade = [] } = body;
    subject = capString(subject, 50);
    chapter = capString(chapter, 200);
    const n = Math.max(5, Math.min(15, Number(count) || 10));
    alreadyMade = Array.isArray(alreadyMade) ? alreadyMade.slice(-40).map((s) => capString(s, 200)) : [];

    if (!subject || !chapter) {
      return Response.json({ error: "Subject and chapter are required." }, { status: 400 });
    }

    const systemPrompt = `${TEACHER_PERSONA}

Create exactly ${n} revision flashcards for this exact CBSE Class 10 chapter — the highest-yield definitions, formulas, dates, or facts a student should know cold for the board exam. Each card has a short "front" (a term, question, or fill-in-the-blank) and a concise "back" (the answer/definition/formula, 1-2 sentences max).

Do not repeat any of these already-made cards: ${alreadyMade.join(" | ") || "none yet"}

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"cards":[{"front":"...","back":"..."}]}`;

    const { text } = await callAI({
      systemPrompt,
      userText: `Subject: ${subject}\nChapter: ${chapter}`,
      maxTokens: 1400,
    });

    const parsed = parseAIJson(text);
    const cards = Array.isArray(parsed.cards) ? parsed.cards.filter((c) => c && c.front && c.back) : [];

    if (!cards.length) {
      return Response.json({ error: "Couldn't generate flashcards. Please try again." }, { status: 500 });
    }

    return Response.json({ cards });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

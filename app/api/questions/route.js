import { callAI } from "../../../lib/ai";

function extractJson(raw) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error("Could not understand the AI's response. Please try again.");
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, chapter, count = 5, alreadyAsked = [] } = body;

    if (!subject || !chapter) {
      return Response.json({ error: "Subject and chapter are required." }, { status: 400 });
    }

    const n = Math.max(1, Math.min(10, Number(count) || 5));
    const askedList = alreadyAsked.slice(-30).join(" | ") || "none yet";

    const systemPrompt = `You are a CBSE Class 10 ${subject} question paper setter with deep knowledge of the NCERT syllabus. Generate exactly ${n} NEW multiple choice questions strictly on the given chapter, at genuine CBSE board exam difficulty (mix of direct concept, numerical/application, and case-based style questions where appropriate for the subject).

Do NOT repeat or closely rephrase any question from the "already asked" list — vary the numbers, wording, and specific sub-concept each time so the student keeps seeing fresh questions.

Return ONLY valid JSON, no markdown code fences, no preamble or explanation outside the JSON, in this exact shape:
{"questions":[{"q":"question text","options":["option a","option b","option c","option d"],"correct":0,"explanation":"short reason, under 25 words"}]}
"correct" is the 0-based index into "options".`;

    const userText = `Subject: ${subject}\nChapter: ${chapter}\nAlready asked (do not repeat these): ${askedList}`;

    const { text } = await callAI({
      systemPrompt,
      userText,
      maxTokens: 1600,
    });

    const parsed = extractJson(text);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];

    const valid = questions.filter(
      (q) => q && typeof q.q === "string" && Array.isArray(q.options) && q.options.length >= 2 && typeof q.correct === "number"
    );

    if (!valid.length) {
      return Response.json({ error: "The AI didn't return usable questions. Please try again." }, { status: 500 });
    }

    return Response.json({ questions: valid });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

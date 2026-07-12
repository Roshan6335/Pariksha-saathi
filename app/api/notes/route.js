import { callAI } from "../../../lib/ai";

function extractJson(raw) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not understand the AI's response. Please try again.");
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, chapter, length = "short" } = body;

    if (!subject || !chapter) {
      return Response.json({ error: "Subject and chapter are required." }, { status: 400 });
    }

    const isDetailed = length === "detailed";

    const systemPrompt = `You are an experienced CBSE Class 10 ${subject} teacher writing revision notes for a student.

Write ${isDetailed ? "detailed, thorough, exam-complete" : "crisp, short, high-yield"} revision notes STRICTLY for the exact chapter named below — do not include content from any other chapter, and do not include topics beyond the CBSE Class 10 NCERT syllabus for this chapter.

${
  isDetailed
    ? "Be comprehensive: cover every important sub-topic in this chapter with clear explanations and worked micro-examples where useful. Length is not a concern, prioritise completeness, but stay within this chapter's scope."
    : "Keep it tight — only the highest-yield points needed for last-minute revision of this chapter."
}

Return ONLY valid JSON, no markdown code fences, no preamble, in this exact shape:
{"sections":[{"heading":"Key Definitions","bullets":["point one","point two"]},{"heading":"Important Formulas","bullets":["..."]},{"heading":"Key Points","bullets":["..."]},{"heading":"Frequently Asked In Exams","bullets":["..."]}]}

Use section headings that genuinely fit this subject and chapter (e.g. a History chapter doesn't need "Important Formulas" — use "Key Events" or "Important Dates" instead; a Maths chapter should include "Important Formulas"). Each bullet must be a single self-contained plain-text point, no markdown symbols like # or ** inside it.`;

    const { text } = await callAI({
      systemPrompt,
      userText: `Subject: ${subject}\nChapter: ${chapter}`,
      maxTokens: isDetailed ? 3000 : 1100,
    });

    const parsed = extractJson(text);
    const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const valid = sections.filter(
      (s) => s && typeof s.heading === "string" && Array.isArray(s.bullets) && s.bullets.length
    );

    if (!valid.length) {
      return Response.json({ error: "The AI didn't return usable notes. Please try again." }, { status: 500 });
    }

    return Response.json({ sections: valid });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

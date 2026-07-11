import { callAI } from "../../../lib/ai";

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, chapter, length = "short" } = body;

    if (!subject || !chapter) {
      return Response.json({ error: "Subject and chapter are required." }, { status: 400 });
    }

    const isDetailed = length === "detailed";

    const systemPrompt = `You are an experienced CBSE Class 10 ${subject} teacher writing revision notes for a student.

Write ${isDetailed ? "detailed, thorough" : "crisp, short"} revision notes for the given chapter, structured with clear section headers ending in a colon, for example:
"Key Definitions:", "Important Formulas:", "Key Points:", "Diagrams To Remember:" (describe in words, no actual images), "Frequently Asked In Exams:".

Under each header, use short bullet points starting with a dash ("- "). ${
      isDetailed
        ? "Be comprehensive: cover every important sub-topic, include worked micro-examples where useful, and make it genuinely exam-complete — length is NOT a concern, prioritise completeness."
        : "Keep it tight and scannable — only the highest-yield points a student needs for last-minute revision."
    }

Do not use markdown symbols like # or ** anywhere — plain text only, with the dash-bullet and colon-header structure described above. Do not add any preamble like "Here are the notes" — start directly with the first section header.`;

    const { text } = await callAI({
      systemPrompt,
      userText: `Subject: ${subject}\nChapter: ${chapter}`,
      maxTokens: isDetailed ? 3000 : 1100,
    });

    return Response.json({ text });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

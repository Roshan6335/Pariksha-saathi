import { callAI } from "../../../lib/ai";
import { parseAIJson } from "../../../lib/jsonRepair";
import { rateLimit, getClientKey, rateLimitResponse } from "../../../lib/rateLimit";
import { capString } from "../../../lib/validate";
import { TEACHER_PERSONA } from "../../../lib/teacherPersona";
import { DIAGRAM_KEYS } from "../../../lib/diagrams";

export const maxDuration = 60;

const LENGTH_CONFIG = {
  short: {
    maxTokens: 1100,
    instruction: "Keep it tight — only the highest-yield points needed for last-minute revision of this chapter.",
  },
  detailed: {
    maxTokens: 3000,
    instruction:
      "Be comprehensive: cover every important sub-topic with clear explanations and worked micro-examples where useful. Prioritise completeness while staying within this chapter's scope.",
  },
  complete: {
    maxTokens: 5500,
    instruction:
      "Write a genuinely complete revision book chapter: every sub-topic, every important derivation/reasoning, multiple worked examples per concept where relevant (e.g. numericals for Maths/Science, dates+causes+effects for History, full grammar rules with example sentences for English/Hindi), common mistakes students make, and a solid bank of likely exam questions with brief answers at the end. This should be thorough enough that a student could learn the chapter from scratch using only these notes.",
  },
};

export async function POST(request) {
  try {
    if (!rateLimit(getClientKey(request), 10)) return rateLimitResponse();

    const body = await request.json();
    let { subject, chapter, length = "short" } = body;
    subject = capString(subject, 50);
    chapter = capString(chapter, 200);

    if (!subject || !chapter) {
      return Response.json({ error: "Subject and chapter are required." }, { status: 400 });
    }

    const config = LENGTH_CONFIG[length] || LENGTH_CONFIG.short;

    const systemPrompt = `${TEACHER_PERSONA}

Write revision notes STRICTLY for the exact chapter named below — do not include content from any other chapter, and do not include topics beyond the CBSE Class 10 NCERT syllabus for this chapter.

${config.instruction}

Return ONLY valid JSON, no markdown code fences, no preamble, in this exact shape:
{"sections":[{"heading":"Key Definitions","bullets":["point one","point two"],"diagramKey":"human_eye"}]}

Use section headings that genuinely fit this subject and chapter (e.g. a History chapter doesn't need "Important Formulas" — use "Key Events" or "Important Dates" instead; a Maths chapter should include "Important Formulas"). Each bullet must be a single self-contained plain-text point, no markdown symbols like # or ** inside it.

The optional "diagramKey" field: ONLY include it on a section if its topic is a close match for one of these exact pre-drawn diagrams (do not invent new keys, do not use one that doesn't clearly match): ${DIAGRAM_KEYS.join(
      ", "
    )}. Omit "diagramKey" entirely for sections that don't match any of these.`;

    const { text } = await callAI({
      systemPrompt,
      userText: `Subject: ${subject}\nChapter: ${chapter}`,
      maxTokens: config.maxTokens,
    });

    const parsed = parseAIJson(text);
    const sections = Array.isArray(parsed.sections) ? parsed.sections : [];
    const valid = sections
      .filter((s) => s && typeof s.heading === "string" && Array.isArray(s.bullets) && s.bullets.length)
      .map((s) => ({
        heading: s.heading,
        bullets: s.bullets,
        diagramKey: DIAGRAM_KEYS.includes(s.diagramKey) ? s.diagramKey : null,
      }));

    if (!valid.length) {
      return Response.json({ error: "The AI didn't return usable notes. Please try again." }, { status: 500 });
    }

    return Response.json({ sections: valid });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

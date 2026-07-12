import { callAI } from "../../../lib/ai";
import { parseAIJson } from "../../../lib/jsonRepair";

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, chapter, count = 5, alreadyAsked = [], questionType = "mixed" } = body;

    if (!subject || !chapter) {
      return Response.json({ error: "Subject and chapter are required." }, { status: 400 });
    }

    const n = Math.max(1, Math.min(10, Number(count) || 5));
    const askedList = alreadyAsked.slice(-25).join(" | ") || "none yet";

    const typeInstructions = {
      standard: `All ${n} questions should be standard direct-concept or numerical/application MCQs.`,
      "assertion-reason": `All ${n} questions must be in CBSE's Assertion-Reason format. Put both statements in the "q" field like:
"Assertion (A): <statement>\\nReason (R): <statement>"
And the "options" must always be exactly these four, in this order:
["Both A and R are true and R is the correct explanation of A", "Both A and R are true but R is NOT the correct explanation of A", "A is true but R is false", "A is false but R is true"]`,
      "case-study": `All ${n} questions must be competency-based / case-study style: start with a short real-world scenario or data/passage (2-4 sentences) in the "q" field, followed by the actual question testing application or analysis of the chapter's concept — not simple recall.`,
      mixed: `Use a realistic CBSE exam mix across the ${n} questions: roughly half standard direct-concept/numerical questions, and half a combination of Assertion-Reason format and competency-based/case-study format, matching real board exam paper patterns.
For Assertion-Reason ones, put both statements in "q" like "Assertion (A): <statement>\\nReason (R): <statement>" and use exactly these four options in order: ["Both A and R are true and R is the correct explanation of A", "Both A and R are true but R is NOT the correct explanation of A", "A is true but R is false", "A is false but R is true"]
For case-study ones, start "q" with a short 2-4 sentence real-world scenario, then the actual question.`,
    };

    const systemPrompt = `You are a CBSE Class 10 ${subject} question paper setter with deep knowledge of the NCERT syllabus. Generate exactly ${n} NEW multiple choice questions strictly scoped to the given chapter only — do not pull in content from other chapters. Match genuine CBSE board exam difficulty.

${typeInstructions[questionType] || typeInstructions.mixed}

Do NOT repeat or closely rephrase any question from the "already asked" list — vary the numbers, wording, and specific sub-concept each time so the student keeps seeing fresh questions.

Return ONLY valid JSON, no markdown code fences, no preamble or explanation outside the JSON, in this exact shape:
{"questions":[{"q":"question text","options":["option a","option b","option c","option d"],"correct":0,"explanation":"short reason, under 15 words","type":"standard|assertion-reason|case-study"}]}
"correct" is the 0-based index into "options".`;

    const userText = `Subject: ${subject}\nChapter: ${chapter}\nAlready asked (do not repeat these): ${askedList}`;

    const { text } = await callAI({
      systemPrompt,
      userText,
      maxTokens: 1800,
    });

    const parsed = parseAIJson(text);
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

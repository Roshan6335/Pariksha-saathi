import { callAI } from "../../../../lib/ai";
import { parseAIJson } from "../../../../lib/jsonRepair";

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, alreadyAsked = [] } = body;

    if (!subject) {
      return Response.json({ error: "Subject is required." }, { status: 400 });
    }

    const askedList = alreadyAsked.slice(-40).join(" | ") || "none yet";

    const systemPrompt = `You are a senior CBSE Class 10 ${subject} paper-setter. Design one full board-exam-format question paper for ${subject}, following the current standard CBSE Class 10 exam pattern as closely as you know it — proper sections (e.g. an MCQ/Assertion-Reason section, short-answer sections, long-answer section, and a case-study/source-based section where that subject normally has one), a sensible total of 80 marks, and a 180 minute duration. Cover a healthy spread of chapters from across the whole subject, not just one chapter.

For every question, ALSO silently include a "markingScheme" field — a brief model answer / key points a CBSE examiner would award marks for. This is never shown to the student; it is only used later to grade their answer, so write it like an examiner's answer key: concise, step-by-point.

For "mcq" and "assertion-reason" type questions, include "options" (array) and "correct" (0-based index) so they can be auto-graded instantly. For "short", "long", and "case-study" type questions, do NOT include options/correct — the student will write a full answer, so instead give a thorough "markingScheme".

Avoid repeating any question (by concept and wording) from this already-used list: ${askedList}

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{
  "title": "CBSE Class 10 ${subject} — Board Exam Practice Paper",
  "totalMarks": 80,
  "durationMinutes": 180,
  "generalInstructions": ["instruction one", "instruction two", "..."],
  "sections": [
    {
      "name": "Section A",
      "instructions": "short section-level instruction, e.g. 'All questions are compulsory. Each question carries 1 mark.'",
      "questions": [
        {
          "id": "A1",
          "type": "mcq",
          "marks": 1,
          "text": "question text",
          "options": ["a","b","c","d"],
          "correct": 0,
          "markingScheme": "brief examiner key"
        }
      ]
    }
  ]
}
Use "type" values only from: "mcq", "assertion-reason", "short", "long", "case-study". Keep the whole paper realistic in length for an 80-mark, 3-hour exam (roughly 30-38 questions total across all sections, weighted so marks add up close to 80).`;

    const { text } = await callAI({
      systemPrompt,
      userText: `Generate the paper now for: ${subject}`,
      maxTokens: 4000,
    });

    const parsed = parseAIJson(text);
    if (!parsed.sections || !Array.isArray(parsed.sections) || !parsed.sections.length) {
      return Response.json({ error: "The AI didn't return a usable paper. Please try again." }, { status: 500 });
    }

    // Strip marking schemes and correct answers before ever considering sending
    // this to the client for the "question paper view" — but we still need
    // correct/markingScheme server-side for grading later, so we return the
    // FULL paper here but the client is expected to only display the public
    // fields (text/options) while the exam is in progress, and only send
    // marking data back for grading through the dedicated grade endpoint.
    return Response.json({ paper: parsed });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

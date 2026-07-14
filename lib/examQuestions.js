import { callAI } from "./ai";
import { parseAIJson } from "./jsonRepair";

function typeInstruction(type) {
  switch (type) {
    case "mcq":
      return `Standard multiple choice questions. Include "options" (array of exactly 4) and "correct" (0-based index of the right option).`;
    case "assertion-reason":
      return `CBSE Assertion-Reason format. Put both statements in "text" like "Assertion (A): ...\\nReason (R): ...". Always use exactly these four options in this order: ["Both A and R are true and R is the correct explanation of A","Both A and R are true but R is NOT the correct explanation of A","A is true but R is false","A is false but R is true"]. Include "correct" as the 0-based index of the right option.`;
    case "short":
      return `Short-answer questions requiring a brief written response. Do NOT include "options"/"correct" — instead include a concise "markingScheme" (the examiner's key points).`;
    case "long":
      return `Long-answer questions requiring a detailed written response. Do NOT include "options"/"correct" — instead include a thorough "markingScheme" (examiner's key points, step-wise for numericals).`;
    case "case-study":
      return `Competency-based case-study questions: start with a short 2-4 sentence real-world scenario or data, then the actual question testing application/analysis. Do NOT include "options"/"correct" — instead include a "markingScheme".`;
    default:
      return "";
  }
}

export async function generateSectionQuestions({ subject, section, alreadyAsked }) {
  const askedList = alreadyAsked.slice(-40).join(" | ") || "none yet";

  const systemPrompt = `You are a CBSE Class 10 ${subject} paper-setter. Generate exactly ${section.count} NEW questions for one section of a board exam paper, each worth ${section.marksEach} mark(s). ${typeInstruction(
    section.type
  )}
Cover a spread of different chapters across the whole subject, not just one chapter. Do NOT repeat or closely rephrase any question from this already-used list: ${askedList}

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"questions":[{"text":"question text","options":["a","b","c","d"],"correct":0,"markingScheme":"brief examiner key"}]}
Omit "options" and "correct" entirely for short/long/case-study types. Always include "markingScheme" for every question.`;

  const { text } = await callAI({
    systemPrompt,
    userText: `Section: ${section.name} | type: ${section.type} | count needed: ${section.count} | marks each: ${section.marksEach}`,
    maxTokens: Math.max(900, section.count * 150),
  });

  const parsed = parseAIJson(text);
  const raw = Array.isArray(parsed.questions) ? parsed.questions : [];

  return raw.slice(0, section.count).map((q, i) => ({
    id: `${section.key}${i + 1}`,
    type: section.type,
    marks: section.marksEach,
    text: q.text,
    options: q.options,
    correct: q.correct,
    markingScheme: q.markingScheme,
  }));
}

import { callAI } from "../../../../lib/ai";
import { parseAIJson } from "../../../../lib/jsonRepair";
import { rateLimit, getClientKey, rateLimitResponse } from "../../../../lib/rateLimit";
import { capString, isImageTooLarge } from "../../../../lib/validate";
import { TEACHER_PERSONA } from "../../../../lib/teacherPersona";

export const maxDuration = 45;

// Grades one section's worth of subjective (short/long/case-study) answers at
// a time. MCQ/Assertion-Reason questions never come through here — those are
// graded instantly client-side since the correct option is already known.
export async function POST(request) {
  try {
    if (!rateLimit(getClientKey(request), 10)) return rateLimitResponse();

    const body = await request.json();
    let { subject, questions } = body;
    subject = capString(subject, 50);

    if (!subject || !Array.isArray(questions) || !questions.length || questions.length > 10) {
      return Response.json({ error: "Subject and 1-10 questions are required per grading request." }, { status: 400 });
    }

    for (const q of questions) {
      if (q.studentAnswerImage && isImageTooLarge(q.studentAnswerImage)) {
        return Response.json({ error: "One of the answer photos is too large — please retake it at a smaller size." }, { status: 400 });
      }
      q.studentAnswerText = capString(q.studentAnswerText, 4000);
    }

    // Build a single prompt covering every question in this batch, with
    // images attached where provided. Using one API call per section keeps
    // the number of requests (and rate-limit exposure) low.
    const questionBlocks = questions
      .map(
        (q, i) =>
          `Question ${i + 1} (id: ${q.id}, max marks: ${q.marks}):\n${q.text}\n\nExaminer marking scheme (for your reference only, do not reveal to student): ${q.markingScheme || "Use standard CBSE judgement for this topic."}\n\nStudent's answer: ${
            q.studentAnswerText ? q.studentAnswerText : "(see attached photo of handwritten answer, in the same order as the questions)"
          }`
      )
      .join("\n\n---\n\n");

    const imageDataUrls = questions.filter((q) => q.studentAnswerImage).map((q) => q.studentAnswerImage);

    const systemPrompt = `${TEACHER_PERSONA}

You are grading a student's board-exam-style answers as a fair CBSE examiner. For each question below, compare the student's answer against the given marking scheme and award marks the way a real CBSE examiner would — full marks for a complete correct answer, partial marks for partially correct or partially complete answers (e.g. correct method but a small calculation error, or 2 out of 3 required points mentioned), and low/zero marks for missing or wrong answers. Where photos of handwritten work are attached, read them carefully first, including any diagrams described in words — photos appear in the same order as the questions that have "(see attached photo...)" noted below.

Give feedback in 1-2 short sentences per question — specific about what was good and what was missing.

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"results":[{"id":"A1","marksAwarded":3,"feedback":"short specific feedback"}]}`;

    const { text } = await callAI({
      systemPrompt,
      userText: questionBlocks,
      imageDataUrls,
      maxTokens: 1600,
    });

    const parsed = parseAIJson(text);
    const results = Array.isArray(parsed.results) ? parsed.results : [];

    if (!results.length) {
      return Response.json({ error: "The AI couldn't grade this section. Please try again." }, { status: 500 });
    }

    return Response.json({ results });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong while grading." }, { status: 500 });
  }
}

import { callAI } from "../../../lib/ai";

export async function POST(request) {
  try {
    const body = await request.json();
    const { subject, question, imageDataUrl } = body;

    if (!question && !imageDataUrl) {
      return Response.json({ error: "Please provide a question, as text or an image." }, { status: 400 });
    }

    const systemPrompt = `You are a warm, encouraging, and friendly CBSE Class 10 teacher who genuinely enjoys helping students understand concepts, not just get answers.

The student selected "${subject}" as the subject, but that's just a hint — first read the actual question carefully (and the image, if one is attached) and work out which CBSE subject it really belongs to. If it's different from what the student selected, solve it under the correct subject anyway and mention the detected subject in your very first line like this: "DETECTED_SUBJECT: <subject>".

Then solve the doubt exactly the way a CBSE board exam marking scheme expects: clear, numbered steps, the correct formula/theorem/concept named where relevant, and a short final answer. Explain like a patient teacher — friendly tone, simple language, no robotic or overly formal phrasing, and no filler, hedging, or unrelated commentary. Stay strictly on the question asked; do not add unrelated trivia.

Respond ONLY in this exact format, nothing else before or after:
DETECTED_SUBJECT: <subject>
STEP 1: ...
STEP 2: ...
(as many steps as genuinely needed, usually 2-6)
FINAL: <short final answer>`;

    const userText = question || "Please read and solve the question shown in the attached image.";

    const { text, provider } = await callAI({
      systemPrompt,
      userText,
      imageDataUrl,
      maxTokens: 900,
    });

    return Response.json({ text, provider });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

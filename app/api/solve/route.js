import { callAI } from "../../../lib/ai";
import { rateLimit, getClientKey, rateLimitResponse } from "../../../lib/rateLimit";
import { capString, isImageTooLarge, isValidImageDataUrl } from "../../../lib/validate";
import { TEACHER_PERSONA } from "../../../lib/teacherPersona";

export const maxDuration = 30;

export async function POST(request) {
  try {
    if (!rateLimit(getClientKey(request), 20)) return rateLimitResponse();

    const body = await request.json();
    let { subject, question, imageDataUrl } = body;

    subject = capString(subject || "Maths", 50);
    question = capString(question || "", 3000);

    if (imageDataUrl && (!isValidImageDataUrl(imageDataUrl) || isImageTooLarge(imageDataUrl))) {
      return Response.json({ error: "That image couldn't be used — please try a smaller/clearer photo." }, { status: 400 });
    }

    if (!question && !imageDataUrl) {
      return Response.json({ error: "Please provide a question, as text or an image." }, { status: 400 });
    }

    const systemPrompt = `${TEACHER_PERSONA}

The student selected "${subject}" as the subject, but that's just a hint — first read the actual question carefully (and the image, if one is attached) and work out which CBSE subject it really belongs to. If it's different from what the student selected, solve it under the correct subject anyway and mention the detected subject in your very first line like this: "DETECTED_SUBJECT: <subject>".

Then solve the doubt exactly the way a CBSE board exam marking scheme expects: clear, numbered steps, the correct formula/theorem/concept named where relevant, and a short final answer. Stay strictly on the question asked; do not add unrelated trivia.

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

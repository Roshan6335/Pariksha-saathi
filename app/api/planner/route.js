import { callAI } from "../../../lib/ai";
import { parseAIJson } from "../../../lib/jsonRepair";
import { rateLimit, getClientKey, rateLimitResponse } from "../../../lib/rateLimit";
import { capString } from "../../../lib/validate";
import { TEACHER_PERSONA } from "../../../lib/teacherPersona";

export const maxDuration = 30;

export async function POST(request) {
  try {
    if (!rateLimit(getClientKey(request), 6)) return rateLimitResponse();

    const body = await request.json();
    let { subjects = [], weakSubjects = [], days } = body;
    subjects = Array.isArray(subjects) ? subjects.slice(0, 6).map((s) => capString(s, 50)) : [];
    weakSubjects = Array.isArray(weakSubjects) ? weakSubjects.slice(0, 6).map((s) => capString(s, 50)) : [];
    const planDays = Math.max(3, Math.min(30, Number(days) || 14));

    if (!subjects.length) {
      return Response.json({ error: "Select at least one subject." }, { status: 400 });
    }

    const systemPrompt = `${TEACHER_PERSONA}

Design a ${planDays}-day CBSE Class 10 board exam revision study plan covering these subjects: ${subjects.join(", ")}. ${
      weakSubjects.length ? `The student finds these subjects weaker, so give them noticeably more days/frequency: ${weakSubjects.join(", ")}.` : ""
    }
Spread real NCERT chapter names across the days (don't just say "revise Maths" — name actual chapters), rotate subjects sensibly rather than doing one whole subject then moving to the next, and include occasional lighter "revision + practice test" days.

Return ONLY valid JSON, no markdown fences, no preamble, in this exact shape:
{"plan":[{"day":1,"tasks":[{"subject":"Maths","topic":"Real Numbers","task":"Revise theory + solve 10 practice questions"}]}]}
1-2 tasks per day is enough. Cover all ${planDays} days.`;

    const { text } = await callAI({
      systemPrompt,
      userText: `Generate the ${planDays}-day plan now.`,
      maxTokens: 2200,
    });

    const parsed = parseAIJson(text);
    const plan = Array.isArray(parsed.plan) ? parsed.plan : [];

    if (!plan.length) {
      return Response.json({ error: "Couldn't generate a plan. Please try again." }, { status: 500 });
    }

    return Response.json({ plan });
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

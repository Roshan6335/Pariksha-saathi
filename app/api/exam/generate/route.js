import { getBlueprint, blueprintTotalMarks, GENERAL_INSTRUCTIONS } from "../../../../lib/examBlueprint";
import { generateSectionQuestions } from "../../../../lib/examQuestions";
import { rateLimit, getClientKey, rateLimitResponse } from "../../../../lib/rateLimit";
import { capString } from "../../../../lib/validate";

// Sections are generated in parallel, each as its own smaller AI call. This
// is the fix for the "only one question comes" bug: one giant call for a
// 35+ question paper was getting truncated; per-section calls are small
// enough to reliably complete, and if one section happens to fail it doesn't
// take the rest of the paper down with it (Promise.allSettled).
export const maxDuration = 60;

export async function POST(request) {
  try {
    if (!rateLimit(getClientKey(request), 5)) return rateLimitResponse();

    const body = await request.json();
    let { subject, alreadyAsked = [] } = body;
    subject = capString(subject, 50);
    alreadyAsked = Array.isArray(alreadyAsked) ? alreadyAsked.slice(-40).map((s) => capString(s, 300)) : [];

    if (!subject) {
      return Response.json({ error: "Subject is required." }, { status: 400 });
    }

    const blueprint = getBlueprint(subject);
    const totalMarks = blueprintTotalMarks(blueprint);

    const settled = await Promise.allSettled(
      blueprint.sections.map((section) => generateSectionQuestions({ subject, section, alreadyAsked }))
    );

    const sections = [];
    const failedSections = [];
    settled.forEach((result, i) => {
      const blueprintSection = blueprint.sections[i];
      if (result.status === "fulfilled" && result.value.length) {
        sections.push({
          name: blueprintSection.name,
          instructions: blueprintSection.instructions,
          questions: result.value,
        });
      } else {
        failedSections.push(blueprintSection.name);
      }
    });

    if (!sections.length) {
      return Response.json(
        { error: "Could not generate the paper right now (all sections failed). Please try again." },
        { status: 500 }
      );
    }

    const actualTotalMarks = sections.reduce(
      (sum, s) => sum + s.questions.reduce((qs, q) => qs + q.marks, 0),
      0
    );

    const paper = {
      title: `CBSE Class 10 ${subject} — Board Exam Practice Paper`,
      totalMarks: actualTotalMarks,
      durationMinutes: blueprint.durationMinutes,
      generalInstructions: GENERAL_INSTRUCTIONS,
      sections,
    };

    const response = { paper };
    if (failedSections.length) {
      response.warning = `Some sections couldn't be generated and were skipped: ${failedSections.join(
        ", "
      )}. You can generate a new paper to try again.`;
    }

    return Response.json(response);
  } catch (e) {
    return Response.json({ error: e.message || "Something went wrong." }, { status: 500 });
  }
}

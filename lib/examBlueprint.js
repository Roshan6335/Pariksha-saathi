// Deterministic paper structure (sections, question counts, marks) for each
// subject, based on the standard recent CBSE Class 10 exam pattern. Keeping
// this hardcoded (rather than asking the AI to invent structure every time)
// is what makes the total marks and question counts always come out correct
// — the AI is only ever asked to fill in question *content* per section,
// never the structure itself.

const scienceLikeSections = [
  { key: "A1", name: "Section A — MCQs", instructions: "Questions 1–18 carry 1 mark each.", type: "mcq", count: 18, marksEach: 1 },
  { key: "A2", name: "Section A — Assertion-Reason", instructions: "Questions 19–20 are Assertion-Reason based, 1 mark each.", type: "assertion-reason", count: 2, marksEach: 1 },
  { key: "B", name: "Section B — Short Answer (2 marks)", instructions: "Questions 21–25 carry 2 marks each.", type: "short", count: 5, marksEach: 2 },
  { key: "C", name: "Section C — Short Answer (3 marks)", instructions: "Questions 26–31 carry 3 marks each.", type: "short", count: 6, marksEach: 3 },
  { key: "D", name: "Section D — Long Answer (5 marks)", instructions: "Questions 32–35 carry 5 marks each.", type: "long", count: 4, marksEach: 5 },
  { key: "E", name: "Section E — Case Study (4 marks)", instructions: "Questions 36–38 are case-study/source-based, 4 marks each.", type: "case-study", count: 3, marksEach: 4 },
];

const languageLikeSections = [
  { key: "A", name: "Section A — Reading Comprehension", instructions: "Read the passage(s) carefully and answer in your own words.", type: "short", count: 6, marksEach: 3 },
  { key: "B", name: "Section B — Writing & Grammar", instructions: "Attempt the writing and grammar questions.", type: "short", count: 4, marksEach: 5 },
  { key: "C", name: "Section C — Literature (Short Answer)", instructions: "Answer briefly, in about 30–40 words each.", type: "short", count: 6, marksEach: 2 },
  { key: "D", name: "Section D — Literature (Long Answer)", instructions: "Answer in about 100–120 words each.", type: "long", count: 5, marksEach: 6 },
];

export const GENERAL_INSTRUCTIONS = [
  "This question paper has multiple sections. All sections are compulsory.",
  "Read every question carefully before answering.",
  "For MCQ and Assertion-Reason questions, select the single best answer.",
  "For short and long answer questions, write clearly and show all working where applicable.",
  "Manage your time across sections — do not spend too long on any single question.",
  "This is an AI-graded practice paper, not an official CBSE result.",
];

export const EXAM_BLUEPRINTS = {
  Maths: { durationMinutes: 180, sections: scienceLikeSections },
  Science: { durationMinutes: 180, sections: scienceLikeSections },
  "Social Science": { durationMinutes: 180, sections: scienceLikeSections },
  English: { durationMinutes: 180, sections: languageLikeSections },
  Hindi: { durationMinutes: 180, sections: languageLikeSections },
};

export function getBlueprint(subject) {
  return EXAM_BLUEPRINTS[subject] || EXAM_BLUEPRINTS.Maths;
}

export function blueprintTotalMarks(blueprint) {
  return blueprint.sections.reduce((sum, s) => sum + s.count * s.marksEach, 0);
}

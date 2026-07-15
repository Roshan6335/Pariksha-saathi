// Standard CBSE Class 10 (NCERT) chapter lists.
// CBSE occasionally rationalises/removes a few topics each session, so every
// subject also gets an "Other" option in the UI where a student can type an
// exact chapter name if it's missing here or named differently at their school.

export const SUBJECTS = ["Maths", "Science", "Social Science", "English", "Hindi"];

export const CHAPTERS = {
  Maths: [
    "Real Numbers",
    "Polynomials",
    "Pair of Linear Equations in Two Variables",
    "Quadratic Equations",
    "Arithmetic Progressions",
    "Triangles",
    "Coordinate Geometry",
    "Introduction to Trigonometry",
    "Some Applications of Trigonometry",
    "Circles",
    "Areas Related to Circles",
    "Surface Areas and Volumes",
    "Statistics",
    "Probability",
  ],

  Science: [
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Metals and Non-metals",
    "Carbon and its Compounds",
    "Periodic Classification of Elements",
    "Life Processes",
    "Control and Coordination",
    "How do Organisms Reproduce?",
    "Heredity and Evolution",
    "Light – Reflection and Refraction",
    "The Human Eye and the Colourful World",
    "Electricity",
    "Magnetic Effects of Electric Current",
    "Sources of Energy",
    "Our Environment",
  ],

  "Social Science": {
    History: [
      "The Rise of Nationalism in Europe",
      "Nationalism in India",
      "The Making of a Global World",
      "The Age of Industrialisation",
      "Print Culture and the Modern World",
    ],
    Geography: [
      "Resources and Development",
      "Forest and Wildlife Resources",
      "Water Resources",
      "Agriculture",
      "Minerals and Energy Resources",
      "Manufacturing Industries",
      "Lifelines of National Economy",
    ],
    "Political Science": [
      "Power Sharing",
      "Federalism",
      "Democracy and Diversity",
      "Gender, Religion and Caste",
      "Popular Struggles and Movements",
      "Political Parties",
      "Outcomes of Democracy",
    ],
    Economics: [
      "Development",
      "Sectors of the Indian Economy",
      "Money and Credit",
      "Globalisation and the Indian Economy",
      "Consumer Rights",
    ],
  },

  English: {
    "First Flight — Prose & Poetry": [
      "A Letter to God",
      "Nelson Mandela: Long Walk to Freedom",
      "Two Stories about Flying",
      "From the Diary of Anne Frank",
      "The Hundred Dresses I & II",
      "Glimpses of India",
      "Mijbil the Otter",
      "Madam Rides the Bus",
      "The Sermon at Benares",
      "The Proposal",
    ],
    "Footprints without Feet": [
      "A Triumph of Surgery",
      "The Thief's Story",
      "The Midnight Visitor",
      "A Question of Trust",
      "Footprints without Feet",
      "The Making of a Scientist",
      "The Necklace",
      "Bholi",
      "The Book That Saved the Earth",
    ],
    Grammar: [
      "Tenses",
      "Modals",
      "Subject-Verb Agreement",
      "Reported Speech",
      "Determiners",
      "Active and Passive Voice",
    ],
  },

  Hindi: {
    "Kshitij / Sparsh (Course A/B — check your textbook)": [
      "Chapter names vary by Course A / Course B — please use 'Other' and type the exact chapter name from your textbook.",
    ],
  },
};

// Flatten helper: returns a simple array of { label, value } for a <select>,
// using optgroup-style grouping when the subject has nested categories.
export function getChapterGroups(subject) {
  const data = CHAPTERS[subject];
  if (!data) return [];
  if (Array.isArray(data)) {
    return [{ group: null, chapters: data }];
  }
  return Object.entries(data).map(([group, chapters]) => ({ group, chapters }));
}

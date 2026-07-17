// AI responses are sometimes cut off mid-JSON when a provider hits its token
// limit or briefly hiccups. A plain JSON.parse() then throws
// "Expected ',' or ']'..." and the whole feature breaks. This repairs that
// by trimming back to the last fully-formed element and closing any open
// brackets, so the student still gets whatever was successfully generated
// instead of a hard error.

function closeOpenBrackets(str) {
  const stack = [];
  let inString = false;
  let escape = false;
  for (const ch of str) {
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" && stack[stack.length - 1] === "{") stack.pop();
    else if (ch === "]" && stack[stack.length - 1] === "[") stack.pop();
  }
  let closing = "";
  for (let i = stack.length - 1; i >= 0; i--) {
    closing += stack[i] === "{" ? "}" : "]";
  }
  return str + closing;
}

export function parseAIJson(raw) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // fall through to repair attempts
  }

  const start = cleaned.indexOf("{");
  if (start === -1) {
    throw new Error("The AI's response wasn't in the expected format. Please try again.");
  }
  let candidate = cleaned.slice(start);

  // Try shrinking from the end at each "}," boundary (end of a complete
  // array element) and re-closing brackets, a few times, until it parses.
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return JSON.parse(closeOpenBrackets(candidate));
    } catch (e) {
      const lastComplete = candidate.lastIndexOf("},");
      if (lastComplete === -1) break;
      candidate = candidate.slice(0, lastComplete + 1).replace(/,\s*$/, "");
    }
  }

  throw new Error("Could not understand the AI's response, even after retrying. Please try again.");
}

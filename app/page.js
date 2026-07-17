"use client";

import { useState, useRef, useEffect } from "react";
import { getChapterGroups, SUBJECTS } from "../lib/chapters";
import { DIAGRAMS } from "../lib/diagrams";

const OTHER = "__other__";

function ChapterSelect({ subject, value, onChange, customValue, onCustomChange }) {
  const groups = getChapterGroups(subject);
  return (
    <>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— Select chapter —</option>
        {groups.map((g, gi) =>
          g.group ? (
            <optgroup key={gi} label={g.group}>
              {g.chapters.map((c, ci) => (
                <option key={ci} value={c}>
                  {c}
                </option>
              ))}
            </optgroup>
          ) : (
            g.chapters.map((c, ci) => (
              <option key={ci} value={c}>
                {c}
              </option>
            ))
          )
        )}
        <option value={OTHER}>Other (type manually)</option>
      </select>
      {value === OTHER && (
        <input
          type="text"
          placeholder="Type the exact chapter name"
          value={customValue}
          onChange={(e) => onCustomChange(e.target.value)}
          style={{ marginTop: 8 }}
        />
      )}
    </>
  );
}

function resolveChapter(value, customValue) {
  return value === OTHER ? customValue.trim() : value;
}

function escapeForKey(s) {
  return (s || "").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
}

function safeLocalGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // localStorage full or unavailable — fail silently rather than crash the app
  }
}

function compressImage(file, maxWidth = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [tab, setTab] = useState("doubt");
  const [examActive, setExamActive] = useState(false);

  return (
    <div className="wrap">
      {!examActive && (
        <div className="admit-card">
          <div className="admit-card-inner">
            <div className="eyebrow">CBSE • Class 10 • Board Exam Prep</div>
            <h1>Pariksha Saathi</h1>
            <p className="sub">
              Ask doubts by typing, speaking, or a photo — practice unlimited mock tests — take a full board exam — download colorful revision notes.
            </p>
          </div>
        </div>
      )}

      {!examActive && (
        <div className="tabs">
          <div className={`tab-btn ${tab === "doubt" ? "active" : ""}`} onClick={() => setTab("doubt")}>
            Doubt Solver
          </div>
          <div className={`tab-btn ${tab === "test" ? "active" : ""}`} onClick={() => setTab("test")}>
            Mock Test
          </div>
          <div className={`tab-btn ${tab === "exam" ? "active" : ""}`} onClick={() => setTab("exam")}>
            Board Exam <span style={{ fontSize: 10, opacity: 0.7 }}>(soon)</span>
          </div>
          <div className={`tab-btn ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>
            Notes
          </div>
          <div className={`tab-btn ${tab === "flashcards" ? "active" : ""}`} onClick={() => setTab("flashcards")}>
            Flashcards
          </div>
          <div className={`tab-btn ${tab === "planner" ? "active" : ""}`} onClick={() => setTab("planner")}>
            Study Planner
          </div>
        </div>
      )}

      {tab === "doubt" && <DoubtSolver />}
      {tab === "test" && <MockTest />}
      {tab === "exam" && <ComingSoon />}
      {tab === "notes" && <Notes />}
      {tab === "flashcards" && <Flashcards />}
      {tab === "planner" && <StudyPlanner />}

      {!examActive && (
        <div style={{ textAlign: "center", fontSize: 11, color: "#9a9488", marginTop: 28, opacity: 0.8 }}>
          Made by Roshan
        </div>
      )}
    </div>
  );
}

function ComingSoon() {
  return (
    <div className="panel active">
      <div className="panel-inner" style={{ textAlign: "center", padding: "40px 20px" }}>
        <div style={{ fontFamily: "Caveat, cursive", fontSize: 32, color: "var(--red-pen)", marginBottom: 10 }}>
          Coming Soon
        </div>
        <p style={{ color: "var(--ink-soft)" }}>
          The full board-exam simulator (timed paper, proctoring, photo-graded answers) is being rebuilt properly —
          it'll be back here soon.
        </p>
      </div>
    </div>
  );
}

// ---------------- DOUBT SOLVER ----------------
function DoubtSolver() {
  const [subject, setSubject] = useState("Maths");
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { detectedSubject, steps, final, spoken }
  const [liveMode, setLiveMode] = useState(false);
  // phase drives the UI label: idle | listening | thinking | speaking
  const [phase, setPhase] = useState("idle");
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const liveModeRef = useRef(false);
  const fileInputRef = useRef(null);
  const subjectRef = useRef(subject);
  const isStartingRef = useRef(false);
  const restartTimerRef = useRef(null);

  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);

  // Solve is kept in a ref so the recognition object (created once) always
  // calls the latest version without needing to be recreated on every render.
  const solveRef = useRef(null);
  solveRef.current = async function solve(qText, imgDataUrl) {
    if (!qText && !imgDataUrl) {
      setError("Please type, speak, or attach a photo of your question first.");
      return;
    }
    setPhase("thinking");
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subjectRef.current, question: qText, imageDataUrl: imgDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");

      const lines = data.text.split("\n").filter((l) => l.trim());
      let detectedSubject = "";
      let final = "";
      const steps = [];
      let spoken = "";

      lines.forEach((line) => {
        const detMatch = line.match(/^DETECTED_SUBJECT:\s*(.*)/i);
        const stepMatch = line.match(/^STEP\s*(\d+)\s*:\s*(.*)/i);
        const finalMatch = line.match(/^FINAL\s*:\s*(.*)/i);
        if (detMatch) {
          detectedSubject = detMatch[1].trim();
        } else if (stepMatch) {
          steps.push({ num: stepMatch[1], text: stepMatch[2] });
          spoken += stepMatch[2] + ". ";
        } else if (finalMatch) {
          final = finalMatch[1].trim();
        } else {
          steps.push({ num: null, text: line });
          spoken += line + ". ";
        }
      });
      if (final) spoken += "Final answer: " + final;

      setResult({ detectedSubject, steps, final, spoken });
      setLoading(false);

      if (liveModeRef.current) {
        speak(spoken || data.text, () => {
          if (liveModeRef.current) {
            // Small pause avoids the mic picking up the tail end of the
            // spoken answer and mis-transcribing it as the next question.
            restartTimerRef.current = setTimeout(() => startRecognitionSafely(), 500);
          } else {
            setPhase("idle");
          }
        });
      } else {
        setPhase("idle");
      }
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
      setLoading(false);
      setPhase("idle");
      if (liveModeRef.current) {
        restartTimerRef.current = setTimeout(() => startRecognitionSafely(), 1200);
      }
    }
  };

  function startRecognitionSafely() {
    if (!recognitionRef.current || isStartingRef.current) return;
    try {
      isStartingRef.current = true;
      recognitionRef.current.start();
    } catch (e) {
      isStartingRef.current = false;
    }
  }

  useEffect(() => {
    const SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRec) {
      setSpeechSupported(false);
      return;
    }
    const rec = new SpeechRec();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      isStartingRef.current = false;
      setPhase("listening");
    };
    rec.onend = () => {
      isStartingRef.current = false;
      // If speech recognition stops on its own (silence timeout) while live
      // mode is still on and we're not mid-answer, treat it as "no input yet"
      // and just go back to idle rather than leaving the UI stuck on "listening".
      setPhase((p) => (p === "listening" ? "idle" : p));
    };
    rec.onerror = (e) => {
      isStartingRef.current = false;
      const recoverable = e.error === "no-speech" || e.error === "aborted" || e.error === "audio-capture";
      if (liveModeRef.current && recoverable) {
        restartTimerRef.current = setTimeout(() => startRecognitionSafely(), 800);
      } else {
        setPhase("idle");
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setError("Microphone permission was blocked — please allow microphone access in your browser and try again.");
        }
      }
    };
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuestion(transcript);
      solveRef.current(transcript, null);
    };
    recognitionRef.current = rec;

    return () => {
      clearTimeout(restartTimerRef.current);
      try {
        rec.stop();
      } catch (e) {}
    };
  }, []);

  function speak(text, onEnd) {
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }
    setPhase("speaking");
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-IN";
    utter.rate = 0.95;
    utter.onend = () => {
      if (onEnd) onEnd();
    };
    utter.onerror = () => {
      if (onEnd) onEnd();
    };
    window.speechSynthesis.speak(utter);
  }

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (phase === "listening") {
      recognitionRef.current.stop();
    } else if (phase === "idle") {
      startRecognitionSafely();
    }
  }

  function toggleLiveMode() {
    const next = !liveMode;
    setLiveMode(next);
    liveModeRef.current = next;
    if (next && phase === "idle") {
      startRecognitionSafely();
    }
    if (!next) {
      clearTimeout(restartTimerRef.current);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setPhase("idle");
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    compressImage(file).then(setImage).catch(() => setError("Couldn't read that photo — please try another."));
  }

  const listening = phase === "listening";
  const micLabel = phase === "listening" ? "Listening..." : phase === "thinking" ? "Thinking..." : phase === "speaking" ? "Speaking..." : "Speak";

  return (
    <div className="panel active">
      <div className="panel-inner">
        <label>Subject (auto-detected if different)</label>
        <select value={subject} onChange={(e) => setSubject(e.target.value)}>
          {SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        <label>Type, speak, or photograph your question</label>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g. Prove that root 2 is an irrational number."
        />

        <div className="input-actions">
          <button
            type="button"
            className={`icon-btn ${listening ? "recording" : ""}`}
            onClick={toggleMic}
            disabled={!speechSupported || phase === "thinking" || phase === "speaking"}
          >
            🎤 {micLabel}
          </button>
          <button type="button" className="icon-btn" onClick={() => fileInputRef.current.click()}>
            📷 Photo
          </button>
          <button type="button" className={`icon-btn ${liveMode ? "live-on" : ""}`} onClick={toggleLiveMode} disabled={!speechSupported}>
            {liveMode ? "🟢 Live Voice ON" : "⚪ Live Voice Mode"}
          </button>
          <input type="file" ref={fileInputRef} accept="image/*" capture="environment" style={{ display: "none" }} onChange={handlePhotoChange} />
        </div>

        {!speechSupported && <div className="hint">Voice input works best in Chrome or Edge — not supported in this browser.</div>}
        {liveMode && (
          <div className="hint">
            Live mode is on ({micLabel.toLowerCase()}) — ask a question out loud, listen to the answer, then it listens again automatically. Tap "Live Voice ON" to stop.
          </div>
        )}

        {image && (
          <div className="thumb-preview">
            <img src={image} alt="attached question" />
            <button className="thumb-remove" onClick={() => setImage(null)}>
              Remove
            </button>
          </div>
        )}

        <button className="action" onClick={() => solveRef.current(question, image)} disabled={loading}>
          {loading ? "Solving..." : "Solve"}
        </button>

        <div className="output">
          {loading && <div className="loading">Working it out...</div>}
          {error && <div className="err">{error}</div>}
          {result && (
            <>
              {result.detectedSubject && result.detectedSubject.toLowerCase() !== subject.toLowerCase() && (
                <div className="subject-detected">Detected subject: {result.detectedSubject}</div>
              )}
              {result.steps.map((s, i) => (
                <div className="step" key={i}>
                  {s.num && <span className="step-num">{s.num}.</span>}
                  {s.text}
                </div>
              ))}
              {result.final && <div className="final-answer">Answer: {result.final}</div>}
              <div>
                <button className="ghost listen-btn" onClick={() => speak(result.spoken)}>
                  🔊 Listen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- MOCK TEST ----------------
const QUESTION_TYPES = [
  { value: "mixed", label: "Mixed (recommended — matches real exam pattern)" },
  { value: "standard", label: "Standard MCQs only" },
  { value: "assertion-reason", label: "Assertion-Reason only" },
  { value: "case-study", label: "Case-Study / Competency-based only" },
];

const DIFFICULTIES = [
  { value: "mixed", label: "Mixed" },
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard (top scorer level)" },
];

function MockTest() {
  const [subject, setSubject] = useState("Maths");
  const [chapterValue, setChapterValue] = useState("");
  const [customChapter, setCustomChapter] = useState("");
  const [questionType, setQuestionType] = useState("mixed");
  const [difficulty, setDifficulty] = useState("mixed");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState({}); // index -> selected option index
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mistakes, setMistakes] = useState([]); // [{q, yourAnswer, correctAnswer, explanation}]
  const [showMistakes, setShowMistakes] = useState(false);
  const askedRef = useRef([]);

  const chapter = resolveChapter(chapterValue, customChapter);

  function storageKey() {
    return `ps_asked_${escapeForKey(subject)}_${escapeForKey(chapter)}`;
  }

  function friendlyError(message) {
    if (/429|rate.?limit/i.test(message)) {
      return "The AI is briefly rate-limited (too many requests in the last minute) — wait about 10-15 seconds and press the button again.";
    }
    return message;
  }

  async function fetchQuestions(n) {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, chapter, count: n, alreadyAsked: askedRef.current, questionType, difficulty }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(friendlyError(data.error || "Could not generate questions."));
    return data.questions;
  }

  async function startTest() {
    if (!chapter) {
      setError("Please select or type a chapter first.");
      return;
    }
    setError("");
    setLoading(true);
    setQuestions([]);
    setAnswered({});
    setScore(0);
    setTotal(0);
    setMistakes([]);
    try {
      const stored = safeLocalGet(storageKey(), []);
      askedRef.current = stored;
      const qs = await fetchQuestions(5);
      askedRef.current = [...askedRef.current, ...qs.map((q) => q.q)].slice(-60);
      safeLocalSet(storageKey(), askedRef.current);
      setQuestions(qs);
      setStarted(true);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function loadMore() {
    setLoading(true);
    setError("");
    try {
      const qs = await fetchQuestions(5);
      askedRef.current = [...askedRef.current, ...qs.map((q) => q.q)].slice(-60);
      safeLocalSet(storageKey(), askedRef.current);
      setQuestions((prev) => [...prev, ...qs]);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function selectOption(qIndex, oIndex) {
    if (answered[qIndex] !== undefined) return;
    const q = questions[qIndex];
    setAnswered((prev) => ({ ...prev, [qIndex]: oIndex }));
    setTotal((t) => t + 1);
    if (oIndex === q.correct) {
      setScore((s) => s + 1);
    } else {
      setMistakes((prev) => [
        ...prev,
        {
          q: q.q,
          yourAnswer: q.options[oIndex],
          correctAnswer: q.options[q.correct],
          explanation: q.explanation,
        },
      ]);
    }
  }

  function resetTest() {
    setStarted(false);
    setQuestions([]);
    setAnswered({});
    setScore(0);
    setTotal(0);
    setMistakes([]);
    setChapterValue("");
    setCustomChapter("");
    setError("");
  }

  return (
    <div className="panel active">
      <div className="panel-inner">
        {!started && (
          <>
            <div className="row">
              <div>
                <label>Subject</label>
                <select
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setChapterValue("");
                    setCustomChapter("");
                  }}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Chapter</label>
                <ChapterSelect
                  subject={subject}
                  value={chapterValue}
                  onChange={setChapterValue}
                  customValue={customChapter}
                  onCustomChange={setCustomChapter}
                />
              </div>
            </div>
            <div className="row">
              <div>
                <label>Question style</label>
                <select value={questionType} onChange={(e) => setQuestionType(e.target.value)}>
                  {QUESTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  {DIFFICULTIES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button className="action" onClick={startTest} disabled={loading}>
              {loading ? "Preparing test..." : "Start Test"}
            </button>
          </>
        )}

        {error && <div className="err">{error}</div>}

        {started && (
          <>
            <div className="score-bar">
              <div className="score-badge">
                {score}/{total}
              </div>
            </div>
            {questions.map((q, qi) => (
              <div className="q-block" key={qi}>
                <div className="q-title" style={{ whiteSpace: "pre-line" }}>
                  {q.q}
                </div>
                {q.options.map((opt, oi) => {
                  const isAnswered = answered[qi] !== undefined;
                  const isCorrect = oi === q.correct;
                  const isSelected = answered[qi] === oi;
                  let cls = "opt";
                  if (isAnswered) {
                    cls += " disabled";
                    if (isCorrect) cls += " correct";
                    else if (isSelected) cls += " wrong";
                  }
                  return (
                    <div key={oi} className={cls} onClick={() => selectOption(qi, oi)}>
                      {String.fromCharCode(65 + oi)}) {opt}
                      {isAnswered && isCorrect && <span className="mark tick">✓</span>}
                      {isAnswered && isSelected && !isCorrect && <span className="mark cross">✗</span>}
                    </div>
                  );
                })}
                {answered[qi] !== undefined && <div className="explain">Explanation: {q.explanation}</div>}
              </div>
            ))}
            <button className="action" onClick={loadMore} disabled={loading}>
              {loading ? "Loading more..." : "5 More Questions"}
            </button>
            <button className="ghost" onClick={resetTest}>
              New Topic / Reset
            </button>

            {mistakes.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <button className="ghost" onClick={() => setShowMistakes((s) => !s)}>
                  {showMistakes ? "Hide" : "Review"} Mistakes ({mistakes.length})
                </button>
                {showMistakes && (
                  <div style={{ marginTop: 14 }}>
                    {mistakes.map((m, i) => (
                      <div className="q-block" key={i}>
                        <div className="q-title" style={{ whiteSpace: "pre-line" }}>
                          {m.q}
                        </div>
                        <div style={{ color: "var(--red-pen)", fontSize: 13 }}>Your answer: {m.yourAnswer}</div>
                        <div style={{ color: "var(--green)", fontSize: 13 }}>Correct answer: {m.correctAnswer}</div>
                        <div className="explain">Explanation: {m.explanation}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- NOTES ----------------
function svgToPngDataUrl(svgString, widthPx = 500) {
  return new Promise((resolve, reject) => {
    const svg64 = btoa(unescape(encodeURIComponent(svgString)));
    const img = new Image();
    img.onload = () => {
      const viewBoxMatch = svgString.match(/viewBox="0 0 (\d+) (\d+)"/);
      const ratio = viewBoxMatch ? Number(viewBoxMatch[2]) / Number(viewBoxMatch[1]) : 0.6;
      const canvas = document.createElement("canvas");
      canvas.width = widthPx;
      canvas.height = Math.round(widthPx * ratio);
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({ dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height });
    };
    img.onerror = reject;
    img.src = "data:image/svg+xml;base64," + svg64;
  });
}

function Notes() {
  const [subject, setSubject] = useState("Maths");
  const [chapterValue, setChapterValue] = useState("");
  const [customChapter, setCustomChapter] = useState("");
  const [length, setLength] = useState("short");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sections, setSections] = useState(null); // [{heading, bullets:[], diagramKey}]

  const chapter = resolveChapter(chapterValue, customChapter);

  function friendlyError(message) {
    if (/429|rate.?limit/i.test(message)) {
      return "The AI is briefly rate-limited — wait about 10-15 seconds and try again.";
    }
    return message;
  }

  async function generate() {
    if (!chapter) {
      setError("Please select or type a chapter first.");
      return;
    }
    setError("");
    setLoading(true);
    setSections(null);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, chapter, length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(friendlyError(data.error || "Could not generate notes."));
      setSections(data.sections);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function downloadPdf() {
    if (!sections) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginLeft = 50;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - marginLeft * 2;
    const bottomLimit = pageHeight - 55;
    const palette = [
      [193, 68, 61],
      [47, 122, 77],
      [201, 151, 43],
      [59, 91, 165],
    ];
    let y = 100;

    function ensureSpace(lineHeight) {
      if (y + lineHeight > bottomLimit) {
        doc.addPage();
        y = 50;
      }
    }

    doc.setFillColor(33, 40, 59);
    doc.rect(0, 0, pageWidth, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Pariksha Saathi", marginLeft, 32);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${subject} — ${chapter}`, marginLeft, 52);

    for (let si = 0; si < sections.length; si++) {
      const section = sections[si];
      const c = palette[si % palette.length];

      ensureSpace(26);
      y += 14;
      doc.setFillColor(c[0], c[1], c[2]);
      doc.rect(marginLeft, y - 12, 4, 16, "F");
      doc.setTextColor(c[0], c[1], c[2]);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(section.heading, marginLeft + 10, y);
      y += 20;

      section.bullets.forEach((bullet) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const wrapped = doc.splitTextToSize(bullet, maxWidth - 16);
        wrapped.forEach((w, wi) => {
          ensureSpace(15);
          if (wi === 0) {
            doc.setFillColor(c[0], c[1], c[2]);
            doc.circle(marginLeft + 6, y - 3, 2, "F");
          }
          doc.setTextColor(50, 50, 50);
          doc.text(w, marginLeft + 16, y);
          y += 15;
        });
        y += 2;
      });

      if (section.diagramKey && DIAGRAMS[section.diagramKey]) {
        try {
          const { dataUrl, width, height } = await svgToPngDataUrl(DIAGRAMS[section.diagramKey].svg, 460);
          const pdfWidth = Math.min(maxWidth, 320);
          const pdfHeight = (height / width) * pdfWidth;
          ensureSpace(pdfHeight + 10);
          doc.addImage(dataUrl, "PNG", marginLeft + 10, y, pdfWidth, pdfHeight);
          y += pdfHeight + 14;
        } catch (e) {
          // if the diagram fails to rasterize for any reason, just skip it rather than break the whole PDF
        }
      }
    }

    const fileName = `${subject}_${chapter}`.replace(/[^a-z0-9]+/gi, "_").toLowerCase() + ".pdf";
    doc.save(fileName);
  }

  return (
    <div className="panel active">
      <div className="panel-inner">
        <div className="row">
          <div>
            <label>Subject</label>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setChapterValue("");
                setCustomChapter("");
              }}
            >
              {SUBJECTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Chapter</label>
            <ChapterSelect
              subject={subject}
              value={chapterValue}
              onChange={setChapterValue}
              customValue={customChapter}
              onCustomChange={setCustomChapter}
            />
          </div>
        </div>

        <label>Notes length</label>
        <div className="radio-row">
          <label className="radio-opt">
            <input type="radio" name="length" checked={length === "short"} onChange={() => setLength("short")} />
            Short (quick revision)
          </label>
          <label className="radio-opt">
            <input type="radio" name="length" checked={length === "detailed"} onChange={() => setLength("detailed")} />
            Detailed (full chapter)
          </label>
          <label className="radio-opt">
            <input type="radio" name="length" checked={length === "complete"} onChange={() => setLength("complete")} />
            Complete (full revision book)
          </label>
        </div>

        <button className="action" onClick={generate} disabled={loading}>
          {loading ? "Generating..." : "Generate Notes"}
        </button>

        <div className="output">
          {loading && <div className="loading">Writing your notes...</div>}
          {error && <div className="err">{error}</div>}
          {sections && (
            <>
              <div className="notes-block">
                {sections.map((section, si) => (
                  <div key={si} style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: "Lora, serif", fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
                      {section.heading}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 20 }}>
                      {section.bullets.map((b, bi) => (
                        <li key={bi} style={{ marginBottom: 4 }}>
                          {b}
                        </li>
                      ))}
                    </ul>
                    {section.diagramKey && DIAGRAMS[section.diagramKey] && (
                      <div
                        style={{ maxWidth: 380, margin: "10px 0", border: "1px solid #D8D3C4", borderRadius: 6, padding: 10, background: "#fff" }}
                        dangerouslySetInnerHTML={{ __html: DIAGRAMS[section.diagramKey].svg }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <button className="action" onClick={downloadPdf}>
                📄 Download Colorful PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------- BOARD EXAM ----------------
const VIOLATION_LIMIT = 3;

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function examStorageKey(subject) {
  return `ps_exam_asked_${escapeForKey(subject)}`;
}

function examHistoryKey() {
  return "ps_exam_history";
}

function BoardExam({ onActiveChange }) {
  const [phase, setPhase] = useState("setup"); // setup | instructions | in-progress | grading | result
  const [subject, setSubject] = useState("Maths");
  const [paper, setPaper] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const [answers, setAnswers] = useState({}); // id -> { selectedIndex, typedText, imageDataUrl }
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [showResumeOverlay, setShowResumeOverlay] = useState(false);
  const [autoSubmittedReason, setAutoSubmittedReason] = useState("");

  const [gradingProgress, setGradingProgress] = useState("");
  const [results, setResults] = useState(null); // { objectiveScore, objectiveMax, sectionResults: {id: {marksAwarded, feedback}}, total, totalMax }
  const [history, setHistory] = useState([]);

  const examAreaRef = useRef(null);
  const violationsRef = useRef(0);
  const phaseRef = useRef("setup");
  const timerRef = useRef(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
    const isActive = phase === "in-progress" || phase === "grading";
    if (onActiveChange) onActiveChange(isActive);

    if (isActive) {
      const handler = (e) => {
        e.preventDefault();
        e.returnValue = "";
        return "";
      };
      window.onbeforeunload = handler;
    } else {
      window.onbeforeunload = null;
    }
    return () => {
      if (!isActive) window.onbeforeunload = null;
    };
  }, [phase, onActiveChange]);

  useEffect(() => {
    try {
      setHistory(safeLocalGet(examHistoryKey(), []));
    } catch (e) {
      setHistory([]);
    }
  }, []);

  function friendlyError(message) {
    if (/429|rate.?limit/i.test(message)) {
      return "The AI is briefly rate-limited — wait 10-15 seconds and try again.";
    }
    return message;
  }

  async function generatePaper() {
    setError("");
    setLoading(true);
    setPaper(null);
    try {
      const asked = safeLocalGet(examStorageKey(subject), []);
      const res = await fetch("/api/exam/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, alreadyAsked: asked }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(friendlyError(data.error || "Could not generate the paper."));

      const allQuestionTexts = data.paper.sections.flatMap((s) => s.questions.map((q) => q.text));
      const updatedAsked = [...asked, ...allQuestionTexts].slice(-120);
      safeLocalSet(examStorageKey(subject), updatedAsked);

      setPaper(data.paper);
      setAnswers({});
      setResults(null);
      setViolations(0);
      violationsRef.current = 0;
      setAutoSubmittedReason("");
      setAgreed(false);
      if (data.warning) setError(data.warning);
      setPhase("instructions");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function startExam() {
    setPhase("in-progress");
    setSecondsLeft((paper.durationMinutes || 180) * 60);
    submittedRef.current = false;
    if (examAreaRef.current) {
      const el = examAreaRef.current;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (req) req.call(el).catch(() => {});
    }
  }

  // Timer countdown
  useEffect(() => {
    if (phase !== "in-progress") return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!submittedRef.current) {
            submittedRef.current = true;
            setAutoSubmittedReason("Time was up.");
            submitExam(true);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function registerViolation() {
    if (phaseRef.current !== "in-progress" || submittedRef.current) return;
    violationsRef.current += 1;
    setViolations(violationsRef.current);
    if (violationsRef.current >= VIOLATION_LIMIT) {
      submittedRef.current = true;
      setAutoSubmittedReason(`Exam auto-submitted after ${VIOLATION_LIMIT} violations (left the exam window/fullscreen too many times).`);
      setShowResumeOverlay(false);
      submitExam(true);
    } else {
      setShowResumeOverlay(true);
    }
  }

  // Proctoring listeners
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && phaseRef.current === "in-progress") registerViolation();
    }
    function handleBlur() {
      if (phaseRef.current === "in-progress") registerViolation();
    }
    function handleFsChange() {
      if (phaseRef.current === "in-progress" && !document.fullscreenElement) registerViolation();
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("fullscreenchange", handleFsChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resumeFullscreen() {
    setShowResumeOverlay(false);
    if (examAreaRef.current) {
      const el = examAreaRef.current;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
      if (req) req.call(el).catch(() => {});
    }
  }

  function setMcqAnswer(qid, optionIndex) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], selectedIndex: optionIndex } }));
  }
  function setTypedAnswer(qid, text) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], typedText: text } }));
  }
  function setImageAnswer(qid, dataUrl) {
    setAnswers((prev) => ({ ...prev, [qid]: { ...prev[qid], imageDataUrl: dataUrl } }));
  }

  async function submitExam(forced) {
    if (submittedRef.current) return;
    if (!forced && !window.confirm("Submit the exam now? You won't be able to change answers after this.")) {
      return;
    }
    submittedRef.current = true;
    clearInterval(timerRef.current);
    if (document.fullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document).catch(() => {});
    }
    setShowResumeOverlay(false);
    setPhase("grading");

    let objectiveScore = 0;
    let objectiveMax = 0;
    const sectionResultsMap = {};

    // Grade objective (mcq / assertion-reason) instantly, client-side.
    const subjectiveBySection = [];
    for (const section of paper.sections) {
      const subjectiveQs = [];
      for (const q of section.questions) {
        if (q.type === "mcq" || q.type === "assertion-reason") {
          objectiveMax += q.marks;
          const chosen = answers[q.id]?.selectedIndex;
          const correct = chosen !== undefined && chosen === q.correct;
          if (correct) objectiveScore += q.marks;
          sectionResultsMap[q.id] = {
            marksAwarded: correct ? q.marks : 0,
            maxMarks: q.marks,
            feedback: chosen === undefined ? "Not answered." : correct ? "Correct." : "Incorrect.",
            type: q.type,
          };
        } else {
          subjectiveQs.push(q);
        }
      }
      if (subjectiveQs.length) subjectiveBySection.push(subjectiveQs);
    }

    // Grade subjective sections one at a time via AI (keeps each request small and rate-limit friendly).
    try {
      for (let i = 0; i < subjectiveBySection.length; i++) {
        setGradingProgress(`Grading section ${i + 1} of ${subjectiveBySection.length}...`);
        const qs = subjectiveBySection[i];
        const payload = qs.map((q) => ({
          id: q.id,
          text: q.text,
          marks: q.marks,
          markingScheme: q.markingScheme,
          studentAnswerText: answers[q.id]?.typedText || "",
          studentAnswerImage: answers[q.id]?.imageDataUrl || null,
        }));
        const res = await fetch("/api/exam/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, questions: payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(friendlyError(data.error || "Grading failed for one section."));
        data.results.forEach((r) => {
          const q = qs.find((x) => x.id === r.id);
          sectionResultsMap[r.id] = {
            marksAwarded: Math.max(0, Math.min(r.marksAwarded, q ? q.marks : r.marksAwarded)),
            maxMarks: q ? q.marks : undefined,
            feedback: r.feedback,
            type: q ? q.type : "short",
          };
        });
      }

      const subjectiveScore = Object.values(sectionResultsMap)
        .filter((r) => r.type !== "mcq" && r.type !== "assertion-reason")
        .reduce((sum, r) => sum + (r.marksAwarded || 0), 0);
      const subjectiveMax = Object.values(sectionResultsMap)
        .filter((r) => r.type !== "mcq" && r.type !== "assertion-reason")
        .reduce((sum, r) => sum + (r.maxMarks || 0), 0);

      const total = objectiveScore + subjectiveScore;
      const totalMax = objectiveMax + subjectiveMax;

      const finalResults = { objectiveScore, objectiveMax, sectionResultsMap, total, totalMax };
      setResults(finalResults);

      const entry = {
        subject,
        date: new Date().toISOString(),
        total,
        totalMax,
        violations: violationsRef.current,
        autoSubmitted: !!autoSubmittedReason || forced,
      };
      const updatedHistory = [entry, ...history].slice(0, 50);
      setHistory(updatedHistory);
      safeLocalSet(examHistoryKey(), updatedHistory);

      setPhase("result");
    } catch (e) {
      setError(e.message);
      setPhase("result");
    }
    setGradingProgress("");
  }

  function resetToSetup() {
    setPhase("setup");
    setPaper(null);
    setAnswers({});
    setResults(null);
    setError("");
  }

  // ---------- RENDER: SETUP ----------
  if (phase === "setup") {
    return (
      <div className="panel active">
        <div className="panel-inner">
          <label>Subject</label>
          <select value={subject} onChange={(e) => setSubject(e.target.value)}>
            {SUBJECTS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <div className="hint">
            The AI will design a full 80-mark, 3-hour board-format paper for this subject — proper sections, MCQs,
            Assertion-Reason, short and long answers, and a case-study section. Every generation avoids repeating
            past questions for this subject.
          </div>
          <button className="action" onClick={generatePaper} disabled={loading}>
            {loading ? "Preparing your paper..." : "Generate Full Board Exam Paper"}
          </button>
          {error && <div className="err">{error}</div>}

          {history.length > 0 && (
            <div style={{ marginTop: 30 }}>
              <label>Your Past Attempts (this browser only)</label>
              {history.map((h, i) => (
                <div key={i} className="q-block" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{h.subject}</div>
                    <div className="hint" style={{ margin: 0 }}>
                      {new Date(h.date).toLocaleDateString()} {h.autoSubmitted ? "· auto-submitted" : ""}
                    </div>
                  </div>
                  <div className="score-badge" style={{ position: "static", transform: "none" }}>
                    {h.total}/{h.totalMax}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- RENDER: INSTRUCTIONS ----------
  if (phase === "instructions") {
    return (
      <div className="panel active">
        <div className="panel-inner">
          <h1 style={{ fontSize: 20 }}>{paper.title}</h1>
          {error && <div className="err">{error}</div>}
          <div className="hint">
            Total Marks: {paper.totalMarks} &nbsp;|&nbsp; Duration: {paper.durationMinutes} minutes
          </div>

          <label>General Instructions</label>
          <ul>
            {(paper.generalInstructions || []).map((ins, i) => (
              <li key={i} style={{ marginBottom: 6 }}>
                {ins}
              </li>
            ))}
          </ul>

          <label>Exam Rules — Read Carefully</label>
          <ul>
            <li>The exam will open in fullscreen. Do not exit fullscreen, switch tabs, or switch apps.</li>
            <li>
              Doing so counts as a violation. After {VIOLATION_LIMIT} violations, your exam is automatically
              submitted as-is.
            </li>
            <li>For MCQ / Assertion-Reason questions, select your answer directly on screen.</li>
            <li>
              For short/long/case-study answers, either type your answer, or write it on paper and upload a clear
              photo — one photo per question.
            </li>
            <li>The exam auto-submits when the timer reaches zero, answered or not.</li>
            <li>This is AI-graded practice, not an official CBSE score — use it to gauge your preparation.</li>
          </ul>

          <label className="radio-opt" style={{ marginTop: 16 }}>
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I have read and understood the instructions above.
          </label>

          <button className="action" onClick={startExam} disabled={!agreed}>
            Start Exam
          </button>
          <button className="ghost" onClick={resetToSetup}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ---------- RENDER: IN PROGRESS ----------
  if (phase === "in-progress") {
    return (
      <div className="panel active" ref={examAreaRef} style={{ background: "var(--paper)" }}>
        <div className="panel-inner">
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 10,
              background: "var(--paper)",
              paddingBottom: 10,
              borderBottom: "1px solid #D8D3C4",
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 13 }}>
              ⏱ {formatTime(secondsLeft)} &nbsp; | &nbsp; Violations: {violations}/{VIOLATION_LIMIT}
            </div>
            <button className="ghost" style={{ margin: 0 }} onClick={() => submitExam(false)}>
              Submit Exam
            </button>
          </div>

          {showResumeOverlay && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(33,40,59,0.85)",
                zIndex: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ background: "var(--paper)", padding: 24, borderRadius: 8, maxWidth: 340, textAlign: "center" }}>
                <div style={{ fontFamily: "Caveat, cursive", fontSize: 26, color: "var(--red-pen)", marginBottom: 8 }}>
                  Violation {violations}/{VIOLATION_LIMIT}
                </div>
                <p style={{ fontSize: 14 }}>You left the exam window or exited fullscreen. Click below to resume.</p>
                <button className="action" onClick={resumeFullscreen}>
                  Resume Exam
                </button>
              </div>
            </div>
          )}

          {paper.sections.map((section, si) => (
            <div key={si} style={{ marginBottom: 30 }}>
              <div style={{ fontFamily: "Lora, serif", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{section.name}</div>
              <div className="hint" style={{ marginBottom: 14 }}>
                {section.instructions}
              </div>
              {section.questions.map((q) => (
                <div className="q-block" key={q.id}>
                  <div className="q-title" style={{ whiteSpace: "pre-line" }}>
                    [{q.id}] ({q.marks} marks) {q.text}
                  </div>

                  {(q.type === "mcq" || q.type === "assertion-reason") &&
                    q.options.map((opt, oi) => (
                      <div
                        key={oi}
                        className={`opt ${answers[q.id]?.selectedIndex === oi ? "selected" : ""}`}
                        style={answers[q.id]?.selectedIndex === oi ? { borderColor: "var(--ink-soft)", background: "#F2F0E8" } : {}}
                        onClick={() => setMcqAnswer(q.id, oi)}
                      >
                        {String.fromCharCode(65 + oi)}) {opt}
                      </div>
                    ))}

                  {(q.type === "short" || q.type === "long" || q.type === "case-study") && (
                    <>
                      <textarea
                        placeholder="Type your answer here (or upload a photo below instead)..."
                        value={answers[q.id]?.typedText || ""}
                        onChange={(e) => setTypedAnswer(q.id, e.target.value)}
                      />
                      <div className="input-actions">
                        <label className="icon-btn" style={{ cursor: "pointer" }}>
                          📷 Upload Photo of Answer
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            style={{ display: "none" }}
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (!file) return;
                              compressImage(file).then((dataUrl) => setImageAnswer(q.id, dataUrl));
                            }}
                          />
                        </label>
                      </div>
                      {answers[q.id]?.imageDataUrl && (
                        <div className="thumb-preview">
                          <img src={answers[q.id].imageDataUrl} alt="answer" />
                          <button className="thumb-remove" onClick={() => setImageAnswer(q.id, null)}>
                            Remove
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}

          <button className="action" onClick={() => submitExam(false)}>
            Submit Exam
          </button>
        </div>
      </div>
    );
  }

  // ---------- RENDER: GRADING ----------
  if (phase === "grading") {
    return (
      <div className="panel active">
        <div className="panel-inner">
          <div className="loading">Grading your paper — {gradingProgress || "starting..."}</div>
        </div>
      </div>
    );
  }

  // ---------- RENDER: RESULT ----------
  if (phase === "result") {
    return (
      <div className="panel active">
        <div className="panel-inner">
          {autoSubmittedReason && <div className="err">{autoSubmittedReason}</div>}
          {error && <div className="err">{error}</div>}
          {results && (
            <>
              <div style={{ textAlign: "center", marginBottom: 20 }}>
                <div className="final-answer" style={{ fontSize: 32 }}>
                  {results.total} / {results.totalMax}
                </div>
              </div>
              {paper.sections.map((section, si) => (
                <div key={si} style={{ marginBottom: 20 }}>
                  <div style={{ fontFamily: "Lora, serif", fontWeight: 700, marginBottom: 8 }}>{section.name}</div>
                  {section.questions.map((q) => {
                    const r = results.sectionResultsMap[q.id];
                    return (
                      <div className="q-block" key={q.id}>
                        <div className="q-title" style={{ whiteSpace: "pre-line" }}>
                          [{q.id}] {q.text}
                        </div>
                        <div style={{ fontWeight: 600, color: "var(--green)" }}>
                          {r?.marksAwarded ?? 0} / {q.marks} marks
                        </div>
                        <div className="explain">{r?.feedback}</div>
                        {(q.type === "mcq" || q.type === "assertion-reason") && (
                          <div className="hint">Correct answer: {q.options[q.correct]}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
          <button className="action" onClick={resetToSetup}>
            New Paper
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ---------------- FLASHCARDS ----------------
function flashKey(subject, chapter) {
  return `ps_flash_made_${escapeForKey(subject)}_${escapeForKey(chapter)}`;
}
function flashMasteredKey(subject, chapter) {
  return `ps_flash_mastered_${escapeForKey(subject)}_${escapeForKey(chapter)}`;
}
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function Flashcards() {
  const [subject, setSubject] = useState("Maths");
  const [chapterValue, setChapterValue] = useState("");
  const [customChapter, setCustomChapter] = useState("");
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewQueue, setReviewQueue] = useState([]);
  const [knownCount, setKnownCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [masteredTotal, setMasteredTotal] = useState(0);

  const chapter = resolveChapter(chapterValue, customChapter);

  useEffect(() => {
    if (chapter) setMasteredTotal(safeLocalGet(flashMasteredKey(subject, chapter), 0));
  }, [subject, chapter]);

  function friendlyError(message) {
    if (/429|rate.?limit/i.test(message)) return "The AI is briefly rate-limited — wait 10-15 seconds and try again.";
    return message;
  }

  async function generate() {
    if (!chapter) {
      setError("Please select or type a chapter first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const madeKey = flashKey(subject, chapter);
      const alreadyMade = safeLocalGet(madeKey, []);
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, chapter, count: 10, alreadyMade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(friendlyError(data.error || "Could not generate flashcards."));

      const updated = [...alreadyMade, ...data.cards.map((c) => c.front)].slice(-60);
      safeLocalSet(madeKey, updated);

      setCards(data.cards);
      setIndex(0);
      setFlipped(false);
      setReviewQueue([]);
      setKnownCount(0);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function shuffleDeck() {
    setCards((prev) => shuffleArray(prev));
    setIndex(0);
    setFlipped(false);
  }

  function readAloud() {
    if (!current || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(`${current.front}. ${current.back}`);
    utter.lang = "en-IN";
    utter.rate = 0.95;
    window.speechSynthesis.speak(utter);
  }

  function nextCard(knewIt) {
    if (knewIt) {
      setKnownCount((k) => k + 1);
      const key = flashMasteredKey(subject, chapter);
      const updated = safeLocalGet(key, 0) + 1;
      safeLocalSet(key, updated);
      setMasteredTotal(updated);
    } else {
      setReviewQueue((q) => [...q, cards[index]]);
    }

    setFlipped(false);
    if (index + 1 < cards.length) {
      setIndex(index + 1);
    } else if (reviewQueue.length > 0 || !knewIt) {
      const remaining = knewIt ? reviewQueue : [...reviewQueue, cards[index]];
      if (remaining.length) {
        setCards(remaining);
        setIndex(0);
        setReviewQueue([]);
      } else {
        setCards([]);
      }
    } else {
      setCards([]);
    }
  }

  const current = cards[index];

  return (
    <div className="panel active">
      <div className="panel-inner">
        {!current && (
          <>
            <div className="row">
              <div>
                <label>Subject</label>
                <select
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setChapterValue("");
                    setCustomChapter("");
                  }}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Chapter</label>
                <ChapterSelect
                  subject={subject}
                  value={chapterValue}
                  onChange={setChapterValue}
                  customValue={customChapter}
                  onCustomChange={setCustomChapter}
                />
              </div>
            </div>
            {chapter && masteredTotal > 0 && (
              <div className="hint">🏆 {masteredTotal} cards mastered so far in this chapter.</div>
            )}
            <button className="action" onClick={generate} disabled={loading}>
              {loading ? "Making flashcards..." : "Generate Flashcards"}
            </button>
            {error && <div className="err">{error}</div>}
            {knownCount > 0 && cards.length === 0 && (
              <div className="hint" style={{ marginTop: 14 }}>
                Nice work — you marked {knownCount} card{knownCount === 1 ? "" : "s"} as known in your last set.
              </div>
            )}
          </>
        )}

        {current && (
          <div>
            <div className="hint">
              Card {index + 1} of {cards.length} {reviewQueue.length > 0 && `· ${reviewQueue.length} to review again`}
            </div>
            <div
              onClick={() => setFlipped((f) => !f)}
              style={{
                marginTop: 14,
                minHeight: 180,
                border: "2px solid var(--ink)",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                cursor: "pointer",
                background: flipped ? "#F2F0E8" : "#fff",
                textAlign: "center",
                fontSize: flipped ? 16 : 19,
                fontFamily: flipped ? "IBM Plex Sans, sans-serif" : "Lora, serif",
                fontWeight: flipped ? 400 : 600,
              }}
            >
              {flipped ? current.back : current.front}
            </div>
            <div className="hint" style={{ textAlign: "center", marginTop: 8 }}>
              Tap the card to {flipped ? "see the question again" : "reveal the answer"}
            </div>
            <div className="input-actions" style={{ justifyContent: "center" }}>
              <button className="ghost" onClick={() => nextCard(false)}>
                😅 Review Again
              </button>
              <button className="action" style={{ marginTop: 0 }} onClick={() => nextCard(true)}>
                ✅ Got It
              </button>
            </div>
            <div className="input-actions" style={{ justifyContent: "center" }}>
              <button className="icon-btn" onClick={readAloud}>
                🔊 Read Aloud
              </button>
              <button className="icon-btn" onClick={shuffleDeck}>
                🔀 Shuffle
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------- STUDY PLANNER ----------------
function plannerStorageKey() {
  return "ps_study_plan";
}
function plannerDoneKey() {
  return "ps_study_plan_done";
}

function StudyPlanner() {
  const [examDate, setExamDate] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [weakSubjects, setWeakSubjects] = useState([]);
  const [plan, setPlan] = useState(null);
  const [done, setDone] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const savedPlan = safeLocalGet(plannerStorageKey(), null);
      const savedDone = safeLocalGet(plannerDoneKey(), {});
      if (savedPlan) setPlan(savedPlan);
      setDone(savedDone);
    } catch (e) {}
  }, []);

  function toggleSubject(list, setList, s) {
    setList(list.includes(s) ? list.filter((x) => x !== s) : [...list, s]);
  }

  function friendlyError(message) {
    if (/429|rate.?limit/i.test(message)) return "The AI is briefly rate-limited — wait 10-15 seconds and try again.";
    return message;
  }

  async function generate() {
    if (!selectedSubjects.length) {
      setError("Select at least one subject.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      let days = 14;
      if (examDate) {
        const diff = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (diff > 0) days = Math.min(diff, 30);
      }
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: selectedSubjects, weakSubjects, days }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(friendlyError(data.error || "Could not generate a plan."));
      setPlan(data.plan);
      setDone({});
      safeLocalSet(plannerStorageKey(), data.plan);
      safeLocalSet(plannerDoneKey(), {});
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function toggleDone(key) {
    const updated = { ...done, [key]: !done[key] };
    setDone(updated);
    safeLocalSet(plannerDoneKey(), updated);
  }

  async function extendPlan() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: selectedSubjects, weakSubjects, days: 7 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(friendlyError(data.error || "Could not extend the plan."));
      const lastDay = plan.length ? plan[plan.length - 1].day : 0;
      const renumbered = data.plan.map((d, i) => ({ ...d, day: lastDay + i + 1 }));
      const updatedPlan = [...plan, ...renumbered];
      setPlan(updatedPlan);
      safeLocalSet(plannerStorageKey(), updatedPlan);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  function resetPlan() {
    setPlan(null);
    setDone({});
    localStorage.removeItem(plannerStorageKey());
    localStorage.removeItem(plannerDoneKey());
  }

  if (plan) {
    const totalTasks = plan.reduce((sum, d) => sum + d.tasks.length, 0);
    const doneTasks = Object.values(done).filter(Boolean).length;
    const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    return (
      <div className="panel active">
        <div className="panel-inner">
          <div className="hint">
            {doneTasks} of {totalTasks} tasks done ({pct}%)
          </div>
          <div style={{ height: 8, background: "#E4E1D5", borderRadius: 4, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "var(--green)", transition: "width 0.3s ease" }} />
          </div>
          {plan.map((day) => (
            <div key={day.day} className="q-block">
              <div style={{ fontFamily: "Lora, serif", fontWeight: 700, marginBottom: 8 }}>Day {day.day}</div>
              {day.tasks.map((t, ti) => {
                const key = `${day.day}-${ti}`;
                return (
                  <label key={ti} className="radio-opt" style={{ display: "flex", marginBottom: 8 }}>
                    <input type="checkbox" checked={!!done[key]} onChange={() => toggleDone(key)} />
                    <span style={{ textDecoration: done[key] ? "line-through" : "none", opacity: done[key] ? 0.6 : 1 }}>
                      <strong>{t.subject}</strong> — {t.topic}: {t.task}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
          {error && <div className="err">{error}</div>}
          <button className="action" onClick={extendPlan} disabled={loading}>
            {loading ? "Adding more days..." : "+ Extend Plan (7 more days)"}
          </button>
          <button className="ghost" onClick={resetPlan}>
            New Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel active">
      <div className="panel-inner">
        <label>Board exam date (optional)</label>
        <input type="text" className="field" placeholder="YYYY-MM-DD" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
        <div className="hint">Leave blank for a default 14-day plan, or enter a date (up to 30 days ahead get a detailed day-by-day plan).</div>

        <label>Subjects to include</label>
        <div className="input-actions">
          {SUBJECTS.map((s) => (
            <label key={s} className="radio-opt">
              <input type="checkbox" checked={selectedSubjects.includes(s)} onChange={() => toggleSubject(selectedSubjects, setSelectedSubjects, s)} />
              {s}
            </label>
          ))}
        </div>

        <label>Weaker subjects (get more focus)</label>
        <div className="input-actions">
          {SUBJECTS.map((s) => (
            <label key={s} className="radio-opt">
              <input type="checkbox" checked={weakSubjects.includes(s)} onChange={() => toggleSubject(weakSubjects, setWeakSubjects, s)} />
              {s}
            </label>
          ))}
        </div>

        <button className="action" onClick={generate} disabled={loading}>
          {loading ? "Building your plan..." : "Generate Study Plan"}
        </button>
        {error && <div className="err">{error}</div>}
      </div>
    </div>
  );
}

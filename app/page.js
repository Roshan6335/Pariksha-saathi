"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getChapterGroups, SUBJECTS } from "../lib/chapters";

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

export default function Home() {
  const [tab, setTab] = useState("doubt");

  return (
    <div className="wrap">
      <div className="admit-card">
        <div className="admit-card-inner">
          <div className="eyebrow">CBSE • Class 10 • Board Exam Prep</div>
          <h1>Pariksha Saathi</h1>
          <p className="sub">
            Ask doubts by typing, speaking, or a photo — practice unlimited mock tests — download colorful revision notes.
          </p>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab-btn ${tab === "doubt" ? "active" : ""}`} onClick={() => setTab("doubt")}>
          Doubt Solver
        </div>
        <div className={`tab-btn ${tab === "test" ? "active" : ""}`} onClick={() => setTab("test")}>
          Mock Test
        </div>
        <div className={`tab-btn ${tab === "notes" ? "active" : ""}`} onClick={() => setTab("notes")}>
          Notes
        </div>
      </div>

      {tab === "doubt" && <DoubtSolver />}
      {tab === "test" && <MockTest />}
      {tab === "notes" && <Notes />}
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
  const [result, setResult] = useState(null); // { detectedSubject, html steps, final, spoken }
  const [liveMode, setLiveMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const liveModeRef = useRef(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    liveModeRef.current = liveMode;
  }, [liveMode]);

  const solve = useCallback(async (qText, imgDataUrl) => {
    if (!qText && !imgDataUrl) {
      setError("Please type, speak, or attach a photo of your question first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, question: qText, imageDataUrl: imgDataUrl }),
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

      if (liveModeRef.current) {
        speak(spoken || data.text, () => {
          if (liveModeRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {}
          }
        });
      }
    } catch (e) {
      setError(e.message || "Something went wrong. Please try again.");
    }
    setLoading(false);
  }, [subject]);

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

    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setQuestion(transcript);
      solve(transcript, null);
    };
    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solve]);

  function speak(text, onEnd) {
    if (!("speechSynthesis" in window)) {
      if (onEnd) onEnd();
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "en-IN";
    utter.rate = 0.95;
    if (onEnd) utter.onend = onEnd;
    window.speechSynthesis.speak(utter);
  }

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  }

  function toggleLiveMode() {
    const next = !liveMode;
    setLiveMode(next);
    liveModeRef.current = next;
    if (next && recognitionRef.current && !listening) {
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
    if (!next && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(reader.result);
    reader.readAsDataURL(file);
  }

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
            disabled={!speechSupported}
          >
            🎤 {listening ? "Listening..." : "Speak"}
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
        {liveMode && <div className="hint">Live mode is on: ask a question out loud, listen to the answer, then it will automatically listen again. Tap "Live Voice ON" to stop.</div>}

        {image && (
          <div className="thumb-preview">
            <img src={image} alt="attached question" />
            <button className="thumb-remove" onClick={() => setImage(null)}>
              Remove
            </button>
          </div>
        )}

        <button className="action" onClick={() => solve(question, image)} disabled={loading}>
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
function MockTest() {
  const [subject, setSubject] = useState("Maths");
  const [chapterValue, setChapterValue] = useState("");
  const [customChapter, setCustomChapter] = useState("");
  const [started, setStarted] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [answered, setAnswered] = useState({}); // index -> selected option index
  const [score, setScore] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const askedRef = useRef([]);

  const chapter = resolveChapter(chapterValue, customChapter);

  function storageKey() {
    return `ps_asked_${escapeForKey(subject)}_${escapeForKey(chapter)}`;
  }

  async function fetchQuestions(n) {
    const res = await fetch("/api/questions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, chapter, count: n, alreadyAsked: askedRef.current }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not generate questions.");
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
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey()) || "[]");
      askedRef.current = stored;
      const qs = await fetchQuestions(5);
      askedRef.current = [...askedRef.current, ...qs.map((q) => q.q)].slice(-60);
      localStorage.setItem(storageKey(), JSON.stringify(askedRef.current));
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
      localStorage.setItem(storageKey(), JSON.stringify(askedRef.current));
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
    if (oIndex === q.correct) setScore((s) => s + 1);
  }

  function resetTest() {
    setStarted(false);
    setQuestions([]);
    setAnswered({});
    setScore(0);
    setTotal(0);
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
                <div className="q-title">{q.q}</div>
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
          </>
        )}
      </div>
    </div>
  );
}

// ---------------- NOTES ----------------
function Notes() {
  const [subject, setSubject] = useState("Maths");
  const [chapterValue, setChapterValue] = useState("");
  const [customChapter, setCustomChapter] = useState("");
  const [length, setLength] = useState("short");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notesText, setNotesText] = useState("");

  const chapter = resolveChapter(chapterValue, customChapter);

  async function generate() {
    if (!chapter) {
      setError("Please select or type a chapter first.");
      return;
    }
    setError("");
    setLoading(true);
    setNotesText("");
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, chapter, length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not generate notes.");
      setNotesText(data.text);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function downloadPdf() {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const marginLeft = 50;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - marginLeft * 2;
    const palette = [
      [193, 68, 61],
      [47, 122, 77],
      [201, 151, 43],
      [59, 91, 165],
    ];
    let colorIdx = 0;
    let y = 0;

    doc.setFillColor(33, 40, 59);
    doc.rect(0, 0, pageWidth, 70, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Pariksha Saathi", marginLeft, 32);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`${subject} — ${chapter}`, marginLeft, 52);
    y = 100;

    const lines = notesText.split("\n");
    lines.forEach((rawLine) => {
      const line = rawLine.trim();
      if (!line) {
        y += 8;
        return;
      }
      const isHeading = /:$/.test(line) && line.length < 60;
      const isBullet = line.startsWith("-") || line.startsWith("•");

      if (y > pageHeight - 60) {
        doc.addPage();
        y = 50;
      }

      if (isHeading) {
        const c = palette[colorIdx % palette.length];
        colorIdx++;
        doc.setFillColor(c[0], c[1], c[2]);
        doc.rect(marginLeft, y - 12, 4, 16, "F");
        doc.setTextColor(c[0], c[1], c[2]);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(line.replace(/:$/, ""), marginLeft + 10, y);
        y += 22;
      } else if (isBullet) {
        const c = palette[(colorIdx - 1 + palette.length) % palette.length];
        const cleanLine = line.replace(/^[-•]\s*/, "");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        const wrapped = doc.splitTextToSize(cleanLine, maxWidth - 16);
        doc.setFillColor(c[0], c[1], c[2]);
        doc.circle(marginLeft + 6, y - 3, 2, "F");
        wrapped.forEach((w) => {
          if (y > pageHeight - 60) {
            doc.addPage();
            y = 50;
          }
          doc.text(w, marginLeft + 16, y);
          y += 15;
        });
        y += 3;
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(33, 40, 59);
        const wrapped = doc.splitTextToSize(line, maxWidth);
        wrapped.forEach((w) => {
          if (y > pageHeight - 60) {
            doc.addPage();
            y = 50;
          }
          doc.text(w, marginLeft, y);
          y += 15;
        });
        y += 2;
      }
    });

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
        </div>

        <button className="action" onClick={generate} disabled={loading}>
          {loading ? "Generating..." : "Generate Notes"}
        </button>

        <div className="output">
          {loading && <div className="loading">Writing your notes...</div>}
          {error && <div className="err">{error}</div>}
          {notesText && (
            <>
              <div className="notes-block">{notesText}</div>
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

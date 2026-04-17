"use client";

import { useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── Constants & types ────────────────────────────────────────────────────────

const TOPICS = [
  "Algebra",
  "Fractions",
  "Percentages",
  "Pythagoras",
  "Quadratics",
  "Simultaneous Equations",
  "Trigonometry",
  "Ratio",
  "Probability",
  "Statistics",
] as const;

type Topic = (typeof TOPICS)[number];
type Level = "foundation" | "higher";

interface Question {
  question: string;
  answer: string;
  working: string;
  topic: string;
}

interface MarkResult {
  isCorrect: boolean;
  wrongStep: number | null;
  explanation: string;
  encouragement: string;
}

// ─── Topic → YouTube embed URL mapping ───────────────────────────────────────
// All videos sourced from Corbettmaths (corbettmaths.com)

const topicVideos: Record<Topic, string> = {
  Algebra:                  "https://www.youtube.com/embed/zxJNJMDj2Ec",
  Fractions:                "https://www.youtube.com/embed/lalcQLW6MWE",
  Percentages:              "https://www.youtube.com/embed/9QKc5bZPLv0",
  Pythagoras:               "https://www.youtube.com/embed/iWLVTy_rGjs",
  Quadratics:               "https://www.youtube.com/embed/X-djBcWVizM",
  "Simultaneous Equations": "https://www.youtube.com/embed/phlus4x0UqM",
  Trigonometry:             "https://www.youtube.com/embed/F_uTDZtRe0I",
  Ratio:                    "https://www.youtube.com/embed/z7UWth70guM",
  Probability:              "https://www.youtube.com/embed/ur_hHjLrBNo",
  Statistics:               "https://www.youtube.com/embed/x8oPXIrLMc0",
};

// ─── Small shared components ──────────────────────────────────────────────────

/** Renders a string containing inline LaTeX wrapped in $...$ */
function LatexText({ text }: { text: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const latex = part.slice(1, -1);
          try {
            const html = katex.renderToString(latex, {
              throwOnError: false,
              displayMode: false,
            });
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch {
            return <span key={i}>{part}</span>;
          }
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

/**
 * Renders a newline-separated working string as a numbered list.
 * Optionally highlights a specific step (1-indexed) in orange.
 */
function WorkingDisplay({
  text,
  highlightStep,
}: {
  text: string;
  highlightStep?: number | null;
}) {
  const lines = text.split("\n").filter((l) => l.trim() !== "");
  return (
    <ol className="space-y-2 list-decimal list-inside text-slate-700 text-sm leading-relaxed">
      {lines.map((line, i) => {
        const stepNum = i + 1;
        const isHighlighted = highlightStep === stepNum;
        return (
          <li
            key={i}
            className={
              isHighlighted
                ? "rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 -mx-1"
                : ""
            }
          >
            <LatexText text={line} />
          </li>
        );
      })}
    </ol>
  );
}

function Spinner({ color = "white" }: { color?: "white" | "teal" }) {
  return (
    <span
      className={`inline-block w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${
        color === "teal"
          ? "border-teal border-t-transparent"
          : "border-white border-t-transparent"
      }`}
      aria-label="Loading"
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-700 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal appearance-none cursor-pointer";

export default function LearnPage() {
  const [topic, setTopic] = useState<Topic>("Algebra");
  const [level, setLevel] = useState<Level>("foundation");

  // Tutor notes
  const [notesOpen, setNotesOpen] = useState(false);
  const [draftNotes, setDraftNotes] = useState("");
  const [appliedNotes, setAppliedNotes] = useState("");
  const [notesConfirmed, setNotesConfirmed] = useState(false);

  // Question generation
  const [generating, setGenerating] = useState(false);
  const [question, setQuestion] = useState<Question | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Student working & marking
  const [studentWorking, setStudentWorking] = useState("");
  const [marking, setMarking] = useState(false);
  const [markResult, setMarkResult] = useState<MarkResult | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleApplyNotes() {
    setAppliedNotes(draftNotes.trim());
    setNotesConfirmed(true);
    // Reset question state so the next generate picks up the new notes
    setQuestion(null);
    setMarkResult(null);
    setMarkError(null);
    setStudentWorking("");
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(null);
    setQuestion(null);
    setStudentWorking("");
    setMarkResult(null);
    setMarkError(null);

    try {
      const res = await fetch("/api/generate-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          level,
          ...(appliedNotes ? { lessonNotes: appliedNotes } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Something went wrong"
        );
      }

      setQuestion(data as Question);
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleSubmit() {
    if (!question) return;

    setMarking(true);
    setMarkResult(null);
    setMarkError(null);

    try {
      const res = await fetch("/api/mark-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.question,
          correctWorking: question.working,
          correctAnswer: question.answer,
          studentWorking,
          topic,
          level,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? "Something went wrong"
        );
      }

      setMarkResult(data as MarkResult);
    } catch (err) {
      setMarkError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setMarking(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* ── Logo ── */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-navy">
            Bens<span className="text-teal">Maths</span>
          </h1>
          <p className="mt-2 text-slate-500 text-sm">
            Practice questions, one step at a time
          </p>
        </div>

        {/* ── Config card ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-6">
          <h2 className="text-lg font-semibold text-navy mb-6">
            Choose your question
          </h2>

          {/* ── Tutor notes (collapsible) ── */}
          <div className="mb-6">
            <button
              type="button"
              onClick={() => setNotesOpen((o) => !o)}
              className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide hover:text-slate-500 transition-colors focus:outline-none"
            >
              <span
                className={`inline-block transition-transform duration-200 ${
                  notesOpen ? "rotate-90" : "rotate-0"
                }`}
              >
                ▶
              </span>
              Tutor notes
              <span className="normal-case font-normal tracking-normal text-slate-300">
                — visible to tutor only
              </span>
            </button>

            {notesOpen && (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 space-y-3">
                <textarea
                  value={draftNotes}
                  onChange={(e) => {
                    setDraftNotes(e.target.value);
                    if (notesConfirmed) setNotesConfirmed(false);
                  }}
                  placeholder="e.g. Today the student struggled with expanding double brackets but was confident on simplifying."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-700 text-sm leading-relaxed placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal resize-none"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleApplyNotes}
                    disabled={draftNotes.trim() === ""}
                    className="rounded-lg bg-teal/10 border border-teal/20 text-teal px-4 py-2 text-xs font-semibold hover:bg-teal/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-1"
                  >
                    Apply notes
                  </button>
                  {notesConfirmed && (
                    <p className="text-xs text-teal font-medium flex items-center gap-1">
                      <span>✓</span> Session personalised based on lesson notes
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4 mb-8 flex-col sm:flex-row">
            {/* Topic */}
            <div className="flex-1">
              <label
                htmlFor="topic"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2"
              >
                Topic
              </label>
              <div className="relative">
                <select
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value as Topic)}
                  className={selectClass}
                >
                  {TOPICS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ▾
                </span>
              </div>
            </div>

            {/* Level */}
            <div className="flex-1">
              <label
                htmlFor="level"
                className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2"
              >
                Level
              </label>
              <div className="relative">
                <select
                  id="level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as Level)}
                  className={selectClass}
                >
                  <option value="foundation">Foundation</option>
                  <option value="higher">Higher</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  ▾
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-3 rounded-xl bg-teal px-6 py-4 text-white font-semibold text-base shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2"
          >
            {generating ? (
              <>
                <Spinner color="white" />
                <span>Generating your question…</span>
              </>
            ) : (
              "Generate My Question"
            )}
          </button>
        </div>

        {/* ── Generate error ── */}
        {generateError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-6 py-4 text-red-700 text-sm">
            {generateError}
          </div>
        )}

        {/* ── Question card ── */}
        {question && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">

            {/* Badges */}
            <div className="flex items-center gap-2">
              <span className="inline-block rounded-full bg-teal/10 text-teal px-3 py-1 text-xs font-semibold">
                {question.topic}
              </span>
              <span className="inline-block rounded-full bg-navy/10 text-navy px-3 py-1 text-xs font-semibold capitalize">
                {level}
              </span>
            </div>

            {/* Personalised banner */}
            {appliedNotes && (
              <div className="rounded-xl bg-teal/5 border border-teal/20 px-4 py-3 flex items-start gap-2.5">
                <span className="text-teal text-sm mt-0.5">✦</span>
                <p className="text-sm text-teal leading-snug">
                  <span className="font-semibold">Based on your last lesson,</span>{" "}
                  we&rsquo;re focusing on:{" "}
                  <span className="italic text-teal/80">
                    {appliedNotes.length > 120
                      ? appliedNotes.slice(0, 120).trimEnd() + "…"
                      : appliedNotes}
                  </span>
                </p>
              </div>
            )}

            {/* Question text */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Question
              </p>
              <p className="text-lg text-slate-800 leading-relaxed font-medium">
                <LatexText text={question.question} />
              </p>
            </div>

            <hr className="border-slate-100" />

            {/* Working textarea */}
            <div>
              <label
                htmlFor="working"
                className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3"
              >
                Your working
              </label>
              <textarea
                id="working"
                value={studentWorking}
                onChange={(e) => {
                  setStudentWorking(e.target.value);
                  // Clear a previous result when the student edits their working
                  if (markResult) {
                    setMarkResult(null);
                    setMarkError(null);
                  }
                }}
                placeholder="Show your working here — write each step on a new line"
                rows={6}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-700 text-sm leading-relaxed placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal focus:border-teal resize-none"
              />
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={marking || studentWorking.trim() === ""}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-navy px-6 py-4 text-white font-semibold text-base shadow-sm hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              {marking ? (
                <>
                  <Spinner color="white" />
                  <span>Marking your answer…</span>
                </>
              ) : (
                "Submit"
              )}
            </button>

            {/* Mark error */}
            {markError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-5 py-4 text-red-700 text-sm">
                {markError}
              </div>
            )}

            {/* ── Result: correct ── */}
            {markResult?.isCorrect && (
              <div className="rounded-xl bg-green-50 border border-green-200 px-6 py-5 space-y-1">
                <p className="text-green-800 font-bold text-base flex items-center gap-2">
                  <span aria-hidden>✓</span> Well done!
                </p>
                <p className="text-green-700 text-sm leading-relaxed">
                  {markResult.encouragement}
                </p>
              </div>
            )}

            {/* ── Result: incorrect ── */}
            {markResult && !markResult.isCorrect && (
              <div className="space-y-5">
                {/* Orange feedback banner */}
                <div className="rounded-xl bg-orange-50 border border-orange-200 px-6 py-5 space-y-2">
                  <p className="text-orange-800 font-bold text-base flex items-center gap-2">
                    <span aria-hidden>!</span> Not quite —
                    {markResult.wrongStep !== null && (
                      <span className="font-normal text-sm">
                        check Step {markResult.wrongStep}
                      </span>
                    )}
                  </p>
                  <p className="text-orange-700 text-sm leading-relaxed">
                    {markResult.explanation}
                  </p>
                  <p className="text-orange-600 text-sm italic">
                    {markResult.encouragement}
                  </p>
                </div>

                {/* Correct working reveal */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-6 py-5">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    Here&rsquo;s the full solution
                  </p>
                  <WorkingDisplay
                    text={question.working}
                    highlightStep={markResult.wrongStep}
                  />
                </div>

                {/* Video recommendation */}
                <div>
                  <p className="text-sm font-bold text-teal mb-3 flex items-center gap-2">
                    <span aria-hidden>▶</span> Watch this explanation
                  </p>
                  <div className="rounded-xl border-2 border-teal/30 bg-white overflow-hidden shadow-sm">
                    <div className="w-full aspect-video">
                      <iframe
                        src={topicVideos[topic]}
                        title={`Ben explains: ${topic}`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                        className="w-full h-full"
                      />
                    </div>
                    <div className="px-5 py-3 bg-teal/5 border-t border-teal/15">
                      <p className="text-sm text-slate-600">
                        <span className="font-semibold text-teal">
                          Ben explains:
                        </span>{" "}
                        {topic}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

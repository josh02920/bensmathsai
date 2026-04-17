"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "select" | "lesson" | "questions" | "summary";

type TopicName =
  | "Algebra"
  | "Fractions"
  | "Percentages"
  | "Pythagoras"
  | "Quadratics"
  | "Simultaneous Equations"
  | "Trigonometry"
  | "Ratio"
  | "Probability"
  | "Statistics";

interface ConceptCard {
  concept: string;
  explanation: string;
  example: { question: string; steps: string[] };
  watchOut: string;
}

interface Question {
  id: string;
  topic: string;
  grade: number;
  question: string;
  answer: string;
  working: string;
  commonMistake: string;
}

interface MarkResult {
  isCorrect: boolean;
  wrongStep: number | null;
  explanation: string;
  encouragement: string;
}

interface CompletedQuestion {
  question: Question;
  studentWorking: string;
  result: MarkResult;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TOPICS: { name: TopicName; symbol: string }[] = [
  { name: "Algebra",                symbol: "𝑥"  },
  { name: "Fractions",              symbol: "½"  },
  { name: "Percentages",            symbol: "%"  },
  { name: "Pythagoras",             symbol: "△"  },
  { name: "Quadratics",             symbol: "𝑥²" },
  { name: "Simultaneous Equations", symbol: "∥"  },
  { name: "Trigonometry",           symbol: "θ"  },
  { name: "Ratio",                  symbol: "∶"  },
  { name: "Probability",            symbol: "◎"  },
  { name: "Statistics",             symbol: "σ"  },
];

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Renders a string that may contain inline LaTeX wrapped in $...$ */
function LatexText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          try {
            const html = katex.renderToString(part.slice(1, -1), {
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
    </span>
  );
}

function Spinner() {
  return (
    <span className="inline-block w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

function NavBar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-100 h-14">
      <div className="max-w-6xl mx-auto px-6 h-full flex items-center justify-between">
        <Link href="/learn" className="text-lg font-extrabold text-navy tracking-tight border-b-2 border-teal pb-0.5">
          BensMaths
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/learn" className="text-sm font-semibold text-navy hover:text-teal transition-colors">
            Practice
          </Link>
          <Link href="/dashboard/student" className="text-sm font-semibold text-slate-500 hover:text-teal transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Stage 1 — Topic + Grade selection ───────────────────────────────────────

function SelectStage({
  onStart,
}: {
  onStart: (topic: TopicName, grade: number) => void;
}) {
  const [selectedTopic, setSelectedTopic] = useState<TopicName | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  const canStart = selectedTopic !== null && selectedGrade !== null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 animate-slide-up">
      {/* Hero */}
      <div className="mb-14 text-center">
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">
          What are you practising today?
        </h1>
        <p className="text-white/50 text-lg">Choose a topic and grade to get started</p>
      </div>

      {/* Topic grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10">
        {TOPICS.map(({ name, symbol }) => {
          const isSelected = selectedTopic === name;
          return (
            <button
              key={name}
              onClick={() => setSelectedTopic(name)}
              className={`relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-200 group cursor-pointer
                ${isSelected
                  ? "border-2 border-teal bg-teal/15 shadow-lg shadow-teal/20"
                  : "border border-white/10 bg-white/5 hover:border-teal/50 hover:bg-white/10"
                }`}
            >
              <span className="block text-4xl mb-3 select-none transition-colors duration-200 text-white/20 group-hover:text-teal/30">
                {symbol}
              </span>
              <span className={`block font-bold leading-tight text-sm ${isSelected ? "text-teal" : "text-white"}`}>
                {name}
              </span>
              {isSelected && (
                <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-teal" />
              )}
            </button>
          );
        })}
      </div>

      {/* Grade selector */}
      <div className="mb-10">
        <p className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-4 text-center">
          Select your grade
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {GRADES.map((g) => {
            const isSelected = selectedGrade === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                className={`w-14 h-14 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer
                  ${isSelected
                    ? "bg-teal text-white shadow-lg shadow-teal/30 scale-105"
                    : "border border-white/20 text-white/70 hover:border-teal/50 hover:text-white hover:bg-white/5"
                  }`}
              >
                {g}
              </button>
            );
          })}
        </div>
        {selectedGrade && (
          <p className="text-center text-white/30 text-xs mt-3">
            {selectedGrade <= 3 ? "Foundation" : selectedGrade <= 6 ? "Mid-level GCSE" : "Higher GCSE"}
          </p>
        )}
      </div>

      {/* Start button */}
      <div className="flex justify-center">
        <button
          onClick={() => canStart && onStart(selectedTopic!, selectedGrade!)}
          disabled={!canStart}
          className={`px-12 py-4 rounded-2xl font-bold text-lg transition-all duration-300 cursor-pointer
            ${canStart
              ? "bg-teal text-white shadow-xl shadow-teal/30 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]"
              : "bg-white/10 text-white/30 cursor-not-allowed"
            }`}
        >
          Start Learning →
        </button>
      </div>
    </div>
  );
}

// ─── Stage 2 — Lesson ─────────────────────────────────────────────────────────

function LessonStage({
  topic,
  grade,
  onReady,
}: {
  topic: TopicName;
  grade: number;
  onReady: () => void;
}) {
  const [cards, setCards] = useState<ConceptCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [revealedSteps, setRevealedSteps] = useState(0);
  const [showWatchOut, setShowWatchOut] = useState(false);

  // Fetch lesson on mount
  useState(() => {
    (async () => {
      try {
        const res = await fetch("/api/generate-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, grade }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load lesson");
        setCards(data.cards);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load lesson");
      } finally {
        setLoading(false);
      }
    })();
  });

  const card = cards[cardIndex];
  const isLastCard = cardIndex === cards.length - 1;
  const allStepsRevealed = card ? revealedSteps >= card.example.steps.length : false;

  function handleNextStep() {
    if (!card) return;
    if (revealedSteps < card.example.steps.length) {
      setRevealedSteps((n) => n + 1);
      if (revealedSteps + 1 >= card.example.steps.length) {
        setTimeout(() => setShowWatchOut(true), 300);
      }
    }
  }

  function handleNextCard() {
    setCardIndex((i) => i + 1);
    setRevealedSteps(0);
    setShowWatchOut(false);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-white/60 text-sm animate-pulse">
          Building your lesson on {topic}…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button onClick={onReady} className="text-teal underline text-sm">
          Skip to questions →
        </button>
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">
            {topic} · Grade {grade}
          </p>
          <h2 className="text-white font-bold text-2xl">Lesson</h2>
        </div>
        <div className="flex items-center gap-2">
          {cards.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-10 rounded-full transition-all duration-500 ${
                i < cardIndex ? "bg-teal" : i === cardIndex ? "bg-teal" : "bg-white/20"
              }`}
            />
          ))}
          <span className="text-white/40 text-xs ml-2">
            {cardIndex + 1}/{cards.length}
          </span>
        </div>
      </div>

      {/* Concept card */}
      <div key={cardIndex} className="animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Card header */}
          <div className="bg-navy px-8 py-6">
            <p className="text-teal text-xs font-semibold uppercase tracking-widest mb-1">
              Concept {cardIndex + 1}
            </p>
            <h3 className="text-white font-extrabold text-[28px] leading-tight">
              {card.concept}
            </h3>
          </div>

          <div className="px-8 py-7 space-y-7">
            {/* Explanation */}
            <div>
              <p className="text-slate-700 text-[16px] leading-relaxed">
                <LatexText text={card.explanation} />
              </p>
            </div>

            {/* Worked example */}
            <div className="rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                  Worked Example
                </p>
                <p className="text-slate-800 font-semibold text-[16px]">
                  <LatexText text={card.example.question} />
                </p>
              </div>

              {/* Steps */}
              <div className="px-6 py-4 space-y-3 min-h-[80px]">
                {revealedSteps === 0 && (
                  <p className="text-slate-400 text-sm italic">
                    Click below to reveal the solution step by step
                  </p>
                )}
                {card.example.steps.slice(0, revealedSteps).map((step, i) => (
                  <div key={i} className="animate-slide-up flex gap-3 items-start">
                    <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-teal text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <p className="text-slate-700 text-[15px] leading-relaxed">
                      <LatexText text={step} />
                    </p>
                  </div>
                ))}
              </div>

              {/* Reveal button */}
              {!allStepsRevealed && (
                <div className="px-6 pb-5">
                  <button
                    onClick={handleNextStep}
                    className="w-full rounded-xl border-2 border-teal/30 bg-teal/5 text-teal font-semibold text-sm py-3 hover:bg-teal/10 transition-all cursor-pointer"
                  >
                    {revealedSteps === 0 ? "Show First Step →" : "Next Step →"}
                  </button>
                </div>
              )}
            </div>

            {/* Watch Out */}
            {showWatchOut && (
              <div className="animate-slide-up rounded-2xl bg-amber-50 border border-amber-200 px-6 py-5">
                <p className="text-amber-800 font-bold text-sm mb-1 flex items-center gap-2">
                  <span>⚠</span> Watch out
                </p>
                <p className="text-amber-700 text-[15px] leading-relaxed">
                  {card.watchOut}
                </p>
              </div>
            )}

            {/* Navigation */}
            {allStepsRevealed && (
              <div className="animate-slide-up pt-2">
                {isLastCard ? (
                  <button
                    onClick={onReady}
                    className="w-full rounded-2xl bg-teal text-white font-bold text-lg py-4 hover:opacity-90 active:scale-[0.98] transition-all shadow-xl shadow-teal/25 cursor-pointer"
                  >
                    I&rsquo;m Ready — Start Questions →
                  </button>
                ) : (
                  <button
                    onClick={handleNextCard}
                    className="w-full rounded-2xl bg-navy text-white font-bold text-base py-4 hover:opacity-90 transition-all cursor-pointer"
                  >
                    Next Concept →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Stage 3 — Questions ──────────────────────────────────────────────────────

function QuestionsStage({
  topic,
  grade,
  onComplete,
}: {
  topic: TopicName;
  grade: number;
  onComplete: (results: CompletedQuestion[]) => void;
}) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [studentWorking, setStudentWorking] = useState("");
  const [marking, setMarking] = useState(false);
  const [currentResult, setCurrentResult] = useState<MarkResult | null>(null);
  const [markError, setMarkError] = useState<string | null>(null);
  const [completed, setCompleted] = useState<CompletedQuestion[]>([]);

  // Fetch questions on mount
  useState(() => {
    (async () => {
      try {
        const res = await fetch(
          `/api/get-questions?topic=${encodeURIComponent(topic)}&grade=${grade}`
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load questions");
        setQuestions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load questions");
      } finally {
        setLoading(false);
      }
    })();
  });

  const q = questions[qIndex];
  const isLastQuestion = qIndex === questions.length - 1;
  const progress = questions.length > 0 ? ((qIndex + 1) / questions.length) * 100 : 0;

  async function handleSubmit() {
    if (!q || !studentWorking.trim()) return;
    setMarking(true);
    setMarkError(null);
    try {
      const res = await fetch("/api/mark-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          correctWorking: q.working,
          correctAnswer: q.answer,
          studentWorking,
          topic,
          level: grade <= 3 ? "foundation" : grade <= 6 ? "foundation" : "higher",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Marking failed");
      setCurrentResult(data as MarkResult);
    } catch (err) {
      setMarkError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMarking(false);
    }
  }

  function handleNext() {
    if (!q || !currentResult) return;
    const entry: CompletedQuestion = { question: q, studentWorking, result: currentResult };
    const newCompleted = [...completed, entry];

    if (isLastQuestion) {
      onComplete(newCompleted);
    } else {
      setCompleted(newCompleted);
      setQIndex((i) => i + 1);
      setStudentWorking("");
      setCurrentResult(null);
      setMarkError(null);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spinner />
        <p className="text-white/60 text-sm animate-pulse">Loading questions…</p>
      </div>
    );
  }

  if (error || !q) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <p className="text-red-400">{error ?? "No questions available"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-up">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-widest">
            {topic} · Grade {grade}
          </p>
          <p className="text-white/50 text-sm">
            Question <span className="text-white font-bold">{qIndex + 1}</span> of {questions.length}
          </p>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div key={qIndex} className="animate-slide-up">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Question */}
          <div className="px-8 py-8 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
              Question {qIndex + 1}
            </p>
            <p className="text-slate-900 font-semibold leading-relaxed" style={{ fontSize: "22px" }}>
              <LatexText text={q.question} />
            </p>
          </div>

          {/* Working area */}
          <div className="px-8 py-6 border-b border-slate-100">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
              Your working
            </label>
            <textarea
              value={studentWorking}
              onChange={(e) => {
                setStudentWorking(e.target.value);
                if (currentResult) {
                  setCurrentResult(null);
                  setMarkError(null);
                }
              }}
              disabled={!!currentResult || marking}
              placeholder="Show your working here…"
              rows={7}
              className="w-full rounded-xl text-slate-800 text-[15px] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal resize-none disabled:opacity-60 px-4 pt-2 font-mono"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0px, transparent 29px, #e5e7eb 29px, #e5e7eb 30px)",
                backgroundSize: "100% 30px",
                lineHeight: "30px",
                paddingTop: "8px",
                border: "1.5px solid #e2e8f0",
              }}
            />
          </div>

          {/* Submit */}
          {!currentResult && (
            <div className="px-8 py-5">
              {markError && (
                <p className="text-red-500 text-sm mb-3">{markError}</p>
              )}
              <button
                onClick={handleSubmit}
                disabled={marking || !studentWorking.trim()}
                className="w-full rounded-2xl bg-teal text-white font-bold text-base py-4 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-teal/20 flex items-center justify-center gap-3 cursor-pointer"
              >
                {marking ? (
                  <>
                    <Spinner />
                    <span>Marking your answer…</span>
                  </>
                ) : (
                  "Submit Working"
                )}
              </button>
            </div>
          )}

          {/* Result */}
          {currentResult && (
            <div className="animate-slide-up px-8 pb-7 pt-1 space-y-5">
              {currentResult.isCorrect ? (
                /* ── Correct ── */
                <div className="rounded-2xl bg-green-50 border border-green-200 px-6 py-5">
                  <p className="text-green-800 font-bold text-lg flex items-center gap-2 mb-1">
                    <span>✓</span> Correct!
                  </p>
                  <p className="text-green-700 text-[15px] leading-relaxed">
                    {currentResult.encouragement}
                  </p>
                </div>
              ) : (
                /* ── Incorrect ── */
                <div className="space-y-4">
                  <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-5">
                    <p className="text-red-700 font-bold text-base flex items-center gap-2 mb-1">
                      <span>✗</span> Not quite
                      {currentResult.wrongStep !== null && (
                        <span className="font-normal text-sm text-red-500">
                          — check Step {currentResult.wrongStep}
                        </span>
                      )}
                    </p>
                    <p className="text-red-700 text-[15px] leading-relaxed mb-2">
                      {currentResult.explanation}
                    </p>
                    <p className="text-red-500 text-sm italic">
                      {currentResult.encouragement}
                    </p>
                  </div>

                  {/* Correct working */}
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 px-6 py-5">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
                      Full solution
                    </p>
                    <ol className="space-y-2.5 list-decimal list-inside">
                      {q.working
                        .split("\n")
                        .filter((l) => l.trim())
                        .map((line, i) => (
                          <li
                            key={i}
                            className={
                              currentResult.wrongStep === i + 1
                                ? "rounded-lg bg-orange-50 border border-orange-200 px-3 py-1.5 -mx-1 text-slate-700 text-[15px]"
                                : "text-slate-700 text-[15px]"
                            }
                          >
                            <LatexText text={line} />
                          </li>
                        ))}
                    </ol>
                  </div>
                </div>
              )}

              {/* Next button */}
              <button
                onClick={handleNext}
                className="w-full rounded-2xl bg-navy text-white font-bold text-base py-4 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isLastQuestion ? "View Results →" : "Next Question →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stage 4 — Summary ────────────────────────────────────────────────────────

function SummaryStage({
  results,
  topic,
  grade,
  onTryAgain,
  onChooseNew,
}: {
  results: CompletedQuestion[];
  topic: TopicName;
  grade: number;
  onTryAgain: () => void;
  onChooseNew: () => void;
}) {
  const correct = results.filter((r) => r.result.isCorrect).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);

  const scoreColor =
    pct >= 80 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-up">
      {/* Score card */}
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
        {/* Score header */}
        <div className="bg-navy px-8 pt-10 pb-8 text-center">
          <p className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4">
            Session Complete
          </p>
          <div className={`text-8xl font-extrabold ${scoreColor} mb-2`}>
            {correct}<span className="text-white/20 text-5xl">/{total}</span>
          </div>
          <p className="text-white/60 text-lg mt-2">
            {pct}% —{" "}
            {pct === 100
              ? "Perfect score! Outstanding work."
              : pct >= 80
              ? "Excellent — nearly there!"
              : pct >= 60
              ? "Good effort — keep practising!"
              : "Keep going — every attempt counts."}
          </p>
        </div>

        {/* Per-question results */}
        <div className="px-8 py-6 space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">
            Question breakdown
          </p>
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-2xl border px-5 py-4 ${
                r.result.isCorrect
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                    r.result.isCorrect
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {r.result.isCorrect ? "✓" : "✗"}
                </span>
                <div>
                  <p
                    className={`font-medium text-sm leading-snug ${
                      r.result.isCorrect ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    Q{i + 1}:{" "}
                    <LatexText
                      text={
                        r.question.question.length > 90
                          ? r.question.question.slice(0, 90) + "…"
                          : r.question.question
                      }
                    />
                  </p>
                  {!r.result.isCorrect && r.result.explanation && (
                    <p className="text-red-600 text-xs mt-1 leading-relaxed">
                      {r.result.explanation.length > 120
                        ? r.result.explanation.slice(0, 120) + "…"
                        : r.result.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={onTryAgain}
            className="rounded-2xl bg-teal text-white font-bold text-base py-4 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-teal/20 cursor-pointer"
          >
            Try Again
          </button>
          <button
            onClick={onChooseNew}
            className="rounded-2xl bg-navy text-white font-bold text-base py-4 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            Choose New Topic
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const [stage, setStage] = useState<Stage>("select");
  const [selectedTopic, setSelectedTopic] = useState<TopicName | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [results, setResults] = useState<CompletedQuestion[]>([]);
  // questionsKey forces QuestionsStage to remount for "Try Again"
  const [questionsKey, setQuestionsKey] = useState(0);

  const handleStart = useCallback((topic: TopicName, grade: number) => {
    setSelectedTopic(topic);
    setSelectedGrade(grade);
    setStage("lesson");
  }, []);

  const handleReady = useCallback(() => {
    setStage("questions");
  }, []);

  const handleComplete = useCallback((res: CompletedQuestion[]) => {
    setResults(res);
    setStage("summary");
  }, []);

  const handleTryAgain = useCallback(() => {
    setResults([]);
    setQuestionsKey((k) => k + 1);
    setStage("questions");
  }, []);

  const handleChooseNew = useCallback(() => {
    setSelectedTopic(null);
    setSelectedGrade(null);
    setResults([]);
    setStage("select");
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#1A2744" }}>
      <NavBar />
      <div className="pt-14">
        {stage === "select" && <SelectStage onStart={handleStart} />}

        {stage === "lesson" && selectedTopic && selectedGrade && (
          <LessonStage
            key={`${selectedTopic}-${selectedGrade}`}
            topic={selectedTopic}
            grade={selectedGrade}
            onReady={handleReady}
          />
        )}

        {stage === "questions" && selectedTopic && selectedGrade && (
          <QuestionsStage
            key={questionsKey}
            topic={selectedTopic}
            grade={selectedGrade}
            onComplete={handleComplete}
          />
        )}

        {stage === "summary" && selectedTopic && selectedGrade && (
          <SummaryStage
            results={results}
            topic={selectedTopic}
            grade={selectedGrade}
            onTryAgain={handleTryAgain}
            onChooseNew={handleChooseNew}
          />
        )}
      </div>
    </div>
  );
}

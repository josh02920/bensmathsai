"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import katex from "katex";
import "katex/dist/katex.min.css";

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = "select" | "mode" | "lesson" | "questions" | "upload" | "summary";
type Mode  = "learn" | "drill" | "upload";

type TopicName =
  | "Algebra" | "Fractions" | "Percentages" | "Pythagoras" | "Quadratics"
  | "Simultaneous Equations" | "Trigonometry" | "Ratio" | "Probability" | "Statistics"
  | "Number" | "Indices and Surds" | "Geometry and Measures" | "Vectors"
  | "Sequences" | "Inequalities" | "Circle Theorems" | "Transformations"
  | "Constructions and Loci" | "Data and Graphs";

interface ConceptCard {
  concept: string;
  explanation: string;
  example: { question: string; steps: string[] };
  watchOut: string;
}

interface Question {
  id: string; topic: string; grade: number;
  question: string; answer: string; working: string; commonMistake: string;
}

interface MarkResult {
  isCorrect: boolean; wrongStep: number | null;
  explanation: string; encouragement: string;
}

interface CompletedQuestion {
  question: Question; studentWorking: string; result: MarkResult;
}

interface UploadResult {
  questionText: string; topic: string; grade: number;
  working: string; answer: string; tip: string;
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
  { name: "Number",                 symbol: "#"  },
  { name: "Indices and Surds",      symbol: "√"  },
  { name: "Geometry and Measures",  symbol: "⬡"  },
  { name: "Vectors",                symbol: "→"  },
  { name: "Sequences",              symbol: "…"  },
  { name: "Inequalities",           symbol: "‹"  },
  { name: "Circle Theorems",        symbol: "○"  },
  { name: "Transformations",        symbol: "↻"  },
  { name: "Constructions and Loci", symbol: "⊙"  },
  { name: "Data and Graphs",        symbol: "▦"  },
];

const GRADES = [1, 2, 3, 4, 5, 6, 7, 8, 9];

// ─── Streak helpers ───────────────────────────────────────────────────────────

const SK  = "bm_streak";
const LAK = "bm_last_active";
const PBK = "bm_best_streak";

function readStreak(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(SK) ?? "0", 10);
}

function updateStreak(): { streak: number; isNewPB: boolean } {
  if (typeof window === "undefined") return { streak: 0, isNewPB: false };
  const today = new Date().toISOString().split("T")[0];
  const last  = localStorage.getItem(LAK);
  const cur   = parseInt(localStorage.getItem(SK)  ?? "0", 10);
  const best  = parseInt(localStorage.getItem(PBK) ?? "0", 10);
  let next: number;
  if (!last || last === today) {
    next = Math.max(cur, 1);
  } else {
    const yd = new Date(); yd.setDate(yd.getDate() - 1);
    next = last === yd.toISOString().split("T")[0] ? cur + 1 : 1;
  }
  const isNewPB = next > best;
  localStorage.setItem(SK,  String(next));
  localStorage.setItem(LAK, today);
  localStorage.setItem(PBK, String(Math.max(next, best)));
  return { streak: next, isNewPB };
}

// ─── Shared components ────────────────────────────────────────────────────────

function LatexText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\$[^$]+\$)/g);
  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          try {
            const html = katex.renderToString(part.slice(1, -1), {
              throwOnError: false, displayMode: false,
            });
            return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
          } catch { return <span key={i}>{part}</span>; }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function Spinner() {
  return (
    <span
      className="inline-block w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
      style={{ borderColor: "#0D9488", borderTopColor: "transparent" }}
    />
  );
}

function SkeletonCard() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#1A2744", border: "1px solid rgba(13,148,136,0.3)" }}
      >
        <div
          className="h-24 animate-skeleton-pulse"
          style={{ background: "rgba(255,255,255,0.06)" }}
        />
        <div className="p-8 space-y-4">
          {[70, 90, 55, 80].map((w, i) => (
            <div
              key={i}
              className="h-4 rounded-lg animate-skeleton-pulse"
              style={{ background: "rgba(255,255,255,0.06)", width: `${w}%` }}
            />
          ))}
          <div
            className="h-36 rounded-xl mt-4 animate-skeleton-pulse"
            style={{ background: "rgba(255,255,255,0.06)" }}
          />
        </div>
      </div>
    </div>
  );
}

function FlameIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 28" fill="none" aria-hidden>
      {/* Oval base */}
      <ellipse cx="12" cy="25.5" rx="5.5" ry="2.2" fill="#F59E0B" opacity="0.5" />
      {/* Outer teardrop */}
      <path
        d="M12 2C9.2 7 6.5 11 6.5 16C6.5 19.59 9.01 22.5 12 22.5C14.99 22.5 17.5 19.59 17.5 16C17.5 11 14.8 7 12 2Z"
        fill="#F59E0B"
      />
      {/* Inner highlight teardrop */}
      <path
        d="M12 8.5C11 12 9.5 14.5 9.5 16.8C9.5 18.57 10.62 20 12 20C13.38 20 14.5 18.57 14.5 16.8C14.5 14.5 13 12 12 8.5Z"
        fill="#FDE68A"
        opacity="0.7"
      />
    </svg>
  );
}

function ConfettiBurst() {
  const colors = [
    "#0D9488", "#14b8a6", "#2dd4bf", "#5eead4",
    "#F59E0B", "#FBBF24", "#FCD34D", "#FDE68A",
    "#0ea5e9", "#0f766e",
  ];
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 30 }).map((_, i) => {
        const col   = i % 2 === 0 ? 20 + (i * 3.1) % 60 : 15 + (i * 2.7) % 70;
        const sz    = 7 + (i % 4) * 3;
        const dur   = 1.1 + (i % 5) * 0.18;
        const delay = (i % 8) * 0.06;
        const rot   = i * 43;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left:    `${col}%`,
              top:     "60%",
              width:   `${sz}px`,
              height:  `${sz}px`,
              background: colors[i % colors.length],
              borderRadius: i % 3 === 0 ? "50%" : "2px",
              transform: `rotate(${rot}deg)`,
              animation: `confetti-rise ${dur}s ease-out ${delay}s forwards`,
            }}
          />
        );
      })}
    </div>
  );
}

// ─── Page background wrapper ──────────────────────────────────────────────────

function PageBg({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "#0F1729",
        backgroundImage: `
          repeating-linear-gradient(0deg,   rgba(13,148,136,0.04) 0px, transparent 1px, transparent 40px),
          repeating-linear-gradient(90deg,  rgba(13,148,136,0.04) 0px, transparent 1px, transparent 40px)
        `,
      }}
    >
      {children}
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function NavBar({ streak }: { streak: number }) {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-40 h-16 flex items-center"
      style={{
        background: "rgba(15,23,41,0.95)",
        borderBottom: "1px solid rgba(13,148,136,0.12)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 w-full flex items-center justify-between">
        <Link href="/learn" className="text-2xl font-extrabold tracking-tight select-none">
          <span className="text-white">Ben&apos;s </span>
          <span style={{ color: "#0D9488", textShadow: "0 0 24px rgba(13,148,136,0.55)" }}>
            Maths
          </span>
        </Link>
        <div className="flex items-center gap-5">
          {streak > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(245,158,11,0.1)",
                border: "1px solid rgba(245,158,11,0.22)",
              }}
            >
              <FlameIcon size={18} />
              <span className="font-bold text-sm leading-none" style={{ color: "#F59E0B" }}>
                {streak}
              </span>
              <span className="text-xs leading-none" style={{ color: "rgba(245,158,11,0.55)" }}>
                days
              </span>
            </div>
          )}
          <Link
            href="/learn"
            className="text-sm font-semibold transition-colors duration-300"
            style={{ color: "rgba(255,255,255,0.65)" }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#0D9488")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.65)")}
          >
            Practice
          </Link>
          <Link
            href="/dashboard/student"
            className="text-sm font-semibold transition-colors duration-300"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#0D9488")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "rgba(255,255,255,0.4)")}
          >
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Topic shape icons ────────────────────────────────────────────────────────

function TopicShapeIcon({ name }: { name: TopicName }) {
  const p = {
    stroke: "rgba(13,148,136,0.55)",
    strokeWidth: "1.6",
    fill: "none",
    strokeLinecap: "round"  as const,
    strokeLinejoin: "round" as const,
  };
  const f = "rgba(13,148,136,0.55)";
  const shapes: Record<TopicName, React.ReactNode> = {
    "Algebra":
      <svg width="22" height="22" viewBox="0 0 22 22"><line x1="3" y1="3" x2="19" y2="19" {...p}/><line x1="19" y1="3" x2="3" y2="19" {...p}/></svg>,
    "Fractions":
      <svg width="22" height="22" viewBox="0 0 22 22"><line x1="4" y1="11" x2="18" y2="11" {...p}/><circle cx="11" cy="5.5" r="2.5" {...p}/><circle cx="11" cy="16.5" r="2.5" {...p}/></svg>,
    "Percentages":
      <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="6" cy="6" r="2.5" {...p}/><circle cx="16" cy="16" r="2.5" {...p}/><line x1="4" y1="18" x2="18" y2="4" {...p}/></svg>,
    "Pythagoras":
      <svg width="22" height="22" viewBox="0 0 22 22"><polyline points="3,19 3,4 18,19 3,19" {...p}/><polyline points="3,13 9,13 9,19" {...p}/></svg>,
    "Quadratics":
      <svg width="22" height="22" viewBox="0 0 22 22"><path d="M3,18 Q7,2 11,10 Q15,18 19,4" {...p}/></svg>,
    "Simultaneous Equations":
      <svg width="22" height="22" viewBox="0 0 22 22"><line x1="3" y1="8" x2="19" y2="8" {...p}/><line x1="3" y1="14" x2="19" y2="14" {...p}/></svg>,
    "Trigonometry":
      <svg width="22" height="22" viewBox="0 0 22 22"><path d="M1,11 Q4,4 7,11 Q10,18 13,11 Q16,4 19,11 Q21,16 22,11" {...p}/></svg>,
    "Ratio":
      <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="6" cy="11" r="2.5" {...p}/><line x1="10" y1="11" x2="12" y2="11" {...p}/><circle cx="16" cy="11" r="2.5" {...p}/></svg>,
    "Probability":
      <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" {...p}/><path d="M11,3 L11,11 L17.5,11" stroke={f} strokeWidth="1.6" fill="none"/></svg>,
    "Statistics":
      <svg width="22" height="22" viewBox="0 0 22 22"><rect x="3"  y="13" width="4" height="6" {...p}/><rect x="9"  y="8"  width="4" height="11" {...p}/><rect x="15" y="4"  width="4" height="15" {...p}/></svg>,
    "Number":
      <svg width="22" height="22" viewBox="0 0 22 22"><line x1="8"  y1="2"  x2="8"  y2="20" {...p}/><line x1="14" y1="2"  x2="14" y2="20" {...p}/><line x1="2"  y1="8"  x2="20" y2="8"  {...p}/><line x1="2"  y1="14" x2="20" y2="14" {...p}/></svg>,
    "Indices and Surds":
      <svg width="22" height="22" viewBox="0 0 22 22"><polyline points="2,15 6,19 11,5 20,5" {...p}/><line x1="11" y1="5" x2="20" y2="5" {...p}/></svg>,
    "Geometry and Measures":
      <svg width="22" height="22" viewBox="0 0 22 22"><polygon points="11,2 19,6.5 19,15.5 11,20 3,15.5 3,6.5" {...p}/></svg>,
    "Vectors":
      <svg width="22" height="22" viewBox="0 0 22 22"><line x1="3" y1="19" x2="17" y2="5" {...p}/><polyline points="10,5 17,5 17,12" {...p}/></svg>,
    "Sequences":
      <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="4"  cy="11" r="2" fill={f}/><circle cx="11" cy="11" r="2" fill={f}/><circle cx="18" cy="11" r="2" fill={f}/></svg>,
    "Inequalities":
      <svg width="22" height="22" viewBox="0 0 22 22"><polyline points="16,4 8,11 16,18" {...p}/></svg>,
    "Circle Theorems":
      <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="8" {...p}/><line x1="4" y1="18" x2="18" y2="4" {...p}/><circle cx="11" cy="11" r="1.5" fill={f} stroke="none"/></svg>,
    "Transformations":
      <svg width="22" height="22" viewBox="0 0 22 22"><polygon points="2,4 8,4 8,10 2,10" {...p}/><polygon points="12,12 19,12 19,20 12,20" {...p} strokeDasharray="2 1.2"/></svg>,
    "Constructions and Loci":
      <svg width="22" height="22" viewBox="0 0 22 22"><path d="M6,19 L11,4 L16,19" {...p}/><path d="M8,13 Q11,8 14,13" {...p}/><circle cx="11" cy="4" r="1.5" fill={f} stroke="none"/></svg>,
    "Data and Graphs":
      <svg width="22" height="22" viewBox="0 0 22 22"><polyline points="2,18 6,12 10,15 15,7 20,4" {...p}/><circle cx="6"  cy="12" r="1.8" fill={f} stroke="none"/><circle cx="10" cy="15" r="1.8" fill={f} stroke="none"/><circle cx="15" cy="7"  r="1.8" fill={f} stroke="none"/></svg>,
  };
  return <>{shapes[name]}</>;
}

// ─── Stage 1 — Topic + Grade ──────────────────────────────────────────────────

function SelectStage({ onStart }: { onStart: (t: TopicName, g: number) => void }) {
  const [selectedTopic, setSelectedTopic] = useState<TopicName | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [hoveredTopic,  setHoveredTopic]  = useState<TopicName | null>(null);
  const canStart = selectedTopic !== null && selectedGrade !== null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 animate-slide-up">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold text-white tracking-tight mb-3">
          What are you practising today?
        </h1>
        <p style={{ color: "rgba(255,255,255,0.4)" }} className="text-lg">
          Choose a topic and grade to get started
        </p>
      </div>

      {/* Topic grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-10">
        {TOPICS.map(({ name }) => {
          const sel  = selectedTopic === name;
          const hov  = hoveredTopic  === name;
          return (
            <button
              key={name}
              onClick={() => setSelectedTopic(name)}
              onMouseEnter={() => setHoveredTopic(name)}
              onMouseLeave={() => setHoveredTopic(null)}
              className="relative text-left overflow-hidden"
              style={{
                minHeight: "90px",
                padding: "14px 14px 14px 14px",
                borderRadius: "16px",
                border: sel
                  ? "1px solid #0D9488"
                  : hov
                  ? "1px solid rgba(13,148,136,0.8)"
                  : "1px solid rgba(13,148,136,0.25)",
                background: sel ? "rgba(13,148,136,0.18)" : "#1A2744",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: sel ? "0 0 20px rgba(13,148,136,0.25)" : "none",
              }}
            >
              {/* Shape icon — top-right */}
              <span className="absolute top-2.5 right-2.5 select-none" style={{ opacity: sel ? 0.9 : 0.55 }}>
                <TopicShapeIcon name={name} />
              </span>

              {/* Bottom-left teal gradient overlay on hover */}
              {(hov || sel) && (
                <span
                  className="absolute inset-0 pointer-events-none rounded-2xl"
                  style={{
                    background: "linear-gradient(to top, rgba(13,148,136,0.18) 0%, transparent 65%)",
                  }}
                />
              )}

              {/* Topic name — sits at bottom */}
              <span
                className="absolute bottom-3 left-4 font-bold text-xs leading-tight"
                style={{ color: sel ? "#0D9488" : "#F8FAFC" }}
              >
                {name}
              </span>

              {sel && (
                <span
                  className="absolute top-2.5 left-2.5 w-2 h-2 rounded-full"
                  style={{ background: "#0D9488" }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Grade selector */}
      <div className="mb-10">
        <p
          className="text-xs font-semibold uppercase tracking-widest mb-4 text-center"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          Select your grade
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {GRADES.map((g) => {
            const sel = selectedGrade === g;
            return (
              <button
                key={g}
                onClick={() => setSelectedGrade(g)}
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "999px",
                  border: `1.5px solid ${sel ? "#0D9488" : "rgba(255,255,255,0.15)"}`,
                  background: sel ? "#0D9488" : "rgba(255,255,255,0.04)",
                  color: sel ? "white" : "rgba(255,255,255,0.6)",
                  fontWeight: "bold",
                  fontSize: "15px",
                  cursor: "pointer",
                  transition: "all 0.3s",
                  transform: sel ? "scale(1.08)" : "scale(1)",
                  boxShadow: sel ? "0 0 18px rgba(13,148,136,0.35)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!sel) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(13,148,136,0.5)";
                    (e.currentTarget as HTMLElement).style.color = "white";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!sel) {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
                    (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)";
                  }
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
        {selectedGrade && (
          <p className="text-center mt-3 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
            {selectedGrade <= 3 ? "Foundation" : selectedGrade <= 6 ? "Mid-level GCSE" : "Higher GCSE"}
          </p>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => canStart && onStart(selectedTopic!, selectedGrade!)}
          disabled={!canStart}
          style={{
            padding: "16px 48px",
            borderRadius: "16px",
            fontWeight: "bold",
            fontSize: "17px",
            cursor: canStart ? "pointer" : "not-allowed",
            background: canStart ? "#0D9488" : "rgba(255,255,255,0.08)",
            color: canStart ? "white" : "rgba(255,255,255,0.25)",
            border: "none",
            boxShadow: canStart ? "0 8px 32px rgba(13,148,136,0.35)" : "none",
            transition: "all 0.3s",
          }}
          onMouseEnter={(e) => {
            if (canStart) (e.currentTarget as HTMLElement).style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            if (canStart) (e.currentTarget as HTMLElement).style.opacity = "1";
          }}
        >
          Choose Your Mode →
        </button>
      </div>
    </div>
  );
}

// ─── Stage 2 — Mode selection ─────────────────────────────────────────────────

function ModeStage({
  topic,
  grade,
  onMode,
  onBack,
}: {
  topic: TopicName;
  grade: number;
  onMode: (m: Mode) => void;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Mode | null>(null);

  const modes: { id: Mode; title: string; description: string; icon: React.ReactNode }[] = [
    {
      id: "learn",
      title: "Learn & Practice",
      description: "Start with an interactive lesson then answer questions — best for new topics.",
      icon: (
        <svg viewBox="0 0 48 48" width="52" height="52" fill="none">
          <rect x="8" y="10" width="32" height="28" rx="4" stroke="#0D9488" strokeWidth="2.5" fill="rgba(13,148,136,0.12)" />
          <line x1="24" y1="10" x2="24" y2="38" stroke="#0D9488" strokeWidth="2" />
          <line x1="14" y1="18" x2="22" y2="18" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="14" y1="24" x2="22" y2="24" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="14" y1="30" x2="22" y2="30" stroke="#0D9488" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="26" y1="18" x2="34" y2="18" stroke="rgba(13,148,136,0.5)" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="26" y1="24" x2="34" y2="24" stroke="rgba(13,148,136,0.5)" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: "drill",
      title: "Just Questions",
      description: "Skip straight to practice questions — best for topics you already know.",
      icon: (
        <svg viewBox="0 0 48 48" width="52" height="52" fill="none">
          <circle cx="24" cy="22" r="12" stroke="#0D9488" strokeWidth="2.5" fill="rgba(13,148,136,0.12)" />
          <text x="24" y="28" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#0D9488">?</text>
          <circle cx="24" cy="38" r="2.5" fill="#0D9488" />
        </svg>
      ),
    },
    {
      id: "upload",
      title: "Upload My Question",
      description:
        "Upload a photo of your homework or exam question and get a full worked solution.",
      icon: (
        <svg viewBox="0 0 48 48" width="52" height="52" fill="none">
          <rect x="10" y="14" width="28" height="24" rx="4" stroke="#0D9488" strokeWidth="2.5" fill="rgba(13,148,136,0.12)" />
          <polyline points="24,8 24,28" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
          <polyline points="18,14 24,8 30,14" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="16" y1="32" x2="32" y2="32" stroke="rgba(13,148,136,0.4)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-16 animate-slide-up">
      <div className="mb-10">
        <button
          onClick={onBack}
          className="text-sm mb-6 flex items-center gap-1.5 transition-colors duration-300"
          style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#0D9488")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)")}
        >
          ← Back
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "#0D9488" }}>
            {topic} · Grade {grade}
          </p>
          <h2 className="text-4xl font-extrabold text-white tracking-tight">
            How would you like to practise?
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        {modes.map(({ id, title, description, icon }) => {
          const sel = selected === id;
          return (
            <button
              key={id}
              onClick={() => setSelected(id)}
              className="text-left p-8 flex flex-col gap-5"
              style={{
                borderRadius: "16px",
                border: `1.5px solid ${sel ? "#0D9488" : "rgba(255,255,255,0.1)"}`,
                background: sel ? "#0D9488" : "rgba(255,255,255,0.03)",
                cursor: "pointer",
                transition: "all 0.25s cubic-bezier(0.22,1,0.36,1)",
                boxShadow: sel ? "0 0 0 1px #0D9488, 0 8px 32px rgba(13,148,136,0.3)" : "none",
                transform: "scale(1)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1.02)";
                if (!sel) {
                  (e.currentTarget as HTMLElement).style.border = "1.5px solid rgba(13,148,136,0.5)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                if (!sel) {
                  (e.currentTarget as HTMLElement).style.border = "1.5px solid rgba(255,255,255,0.1)";
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                }
              }}
            >
              <div>{icon}</div>
              <div>
                <p className="font-bold text-xl mb-2" style={{ color: sel ? "white" : "white" }}>{title}</p>
                <p className="text-sm leading-relaxed" style={{ color: sel ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)" }}>
                  {description}
                </p>
              </div>
              {sel && (
                <div
                  className="w-5 h-5 rounded-full flex items-center justify-center self-end"
                  style={{ background: "rgba(255,255,255,0.25)" }}
                >
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <polyline points="1,4 4,7 9,1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-center">
        <button
          disabled={!selected}
          onClick={() => selected && onMode(selected)}
          style={{
            padding: "16px 48px",
            borderRadius: "16px",
            fontWeight: "bold",
            fontSize: "17px",
            cursor: selected ? "pointer" : "not-allowed",
            background: selected ? "#0D9488" : "rgba(255,255,255,0.07)",
            color: selected ? "white" : "rgba(255,255,255,0.2)",
            border: "none",
            boxShadow: selected ? "0 8px 32px rgba(13,148,136,0.35)" : "none",
            transition: "all 0.3s",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

// ─── Stage 3a — Lesson ────────────────────────────────────────────────────────

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCards([]);
    setCardIndex(0);
    setRevealedSteps(0);
    setShowWatchOut(false);
    (async () => {
      try {
        const res  = await fetch("/api/generate-lesson", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic, grade }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Failed to load lesson");
        setCards(data.cards);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load lesson");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topic, grade]);

  const card          = cards[cardIndex];
  const isLastCard    = cardIndex === cards.length - 1;
  const allRevealed   = card ? revealedSteps >= card.example.steps.length : false;

  function nextStep() {
    if (!card || revealedSteps >= card.example.steps.length) return;
    setRevealedSteps((n) => n + 1);
    if (revealedSteps + 1 >= card.example.steps.length) setTimeout(() => setShowWatchOut(true), 300);
  }

  function nextCard() {
    setCardIndex((i) => i + 1);
    setRevealedSteps(0);
    setShowWatchOut(false);
  }

  if (loading) return <SkeletonCard />;

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={onReady}
          style={{ color: "#0D9488", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
        >
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
          <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.35)" }}>
            {topic} · Grade {grade}
          </p>
          <h2 className="text-white font-bold text-2xl">Lesson</h2>
        </div>
        <div className="flex items-center gap-2">
          {cards.map((_, i) => (
            <div
              key={i}
              style={{
                height: "6px",
                width: "36px",
                borderRadius: "99px",
                background: i <= cardIndex ? "#0D9488" : "rgba(255,255,255,0.15)",
                transition: "background 0.4s",
              }}
            />
          ))}
          <span className="text-xs ml-1" style={{ color: "rgba(255,255,255,0.3)" }}>
            {cardIndex + 1}/{cards.length}
          </span>
        </div>
      </div>

      <div key={cardIndex} className="animate-slide-up">
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "#1A2744", border: "1px solid rgba(13,148,136,0.3)" }}
        >
          {/* Card header */}
          <div className="px-8 py-6" style={{ background: "rgba(13,148,136,0.1)", borderBottom: "1px solid rgba(13,148,136,0.15)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#0D9488" }}>
              Concept {cardIndex + 1}
            </p>
            <h3 className="text-white font-extrabold text-2xl">{card.concept}</h3>
          </div>

          <div className="px-8 py-7 space-y-7">
            {/* Explanation */}
            <p style={{ color: "rgba(255,255,255,0.75)", lineHeight: "1.7" }}>
              <LatexText text={card.explanation} />
            </p>

            {/* Worked example */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <div className="px-6 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>
                  Worked Example
                </p>
                <p className="text-white font-semibold">
                  <LatexText text={card.example.question} />
                </p>
              </div>

              <div className="px-6 py-4 space-y-3 min-h-[60px]">
                {revealedSteps === 0 && (
                  <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.3)" }}>
                    Click below to reveal the solution step by step
                  </p>
                )}
                {card.example.steps.slice(0, revealedSteps).map((step, i) => (
                  <div key={i} className="animate-slide-up flex gap-3 items-start">
                    <span
                      className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                      style={{ background: "#0D9488" }}
                    >
                      {i + 1}
                    </span>
                    <p style={{ color: "rgba(255,255,255,0.75)", lineHeight: "1.6" }}>
                      <LatexText text={step} />
                    </p>
                  </div>
                ))}
              </div>

              {!allRevealed && (
                <div className="px-6 pb-5">
                  <button
                    onClick={nextStep}
                    className="w-full rounded-xl py-3 text-sm font-semibold transition-all duration-300"
                    style={{
                      border: "1.5px solid rgba(13,148,136,0.3)",
                      background: "rgba(13,148,136,0.06)",
                      color: "#0D9488",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.12)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.06)";
                    }}
                  >
                    {revealedSteps === 0 ? "Show First Step →" : "Next Step →"}
                  </button>
                </div>
              )}
            </div>

            {/* Watch Out */}
            {showWatchOut && (
              <div
                className="animate-slide-up rounded-xl px-6 py-5"
                style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)" }}
              >
                <p className="text-xs font-bold uppercase tracking-wide mb-1.5 flex items-center gap-2" style={{ color: "#f59e0b" }}>
                  ⚠ Watch out
                </p>
                <p style={{ color: "rgba(245,158,11,0.85)", fontSize: "15px", lineHeight: "1.6" }}>
                  {card.watchOut}
                </p>
              </div>
            )}

            {/* Navigation */}
            {allRevealed && (
              <div className="animate-slide-up pt-2 flex flex-col gap-3">
                {isLastCard ? (
                  <button
                    onClick={onReady}
                    className="w-full rounded-2xl py-4 font-bold text-lg text-white transition-all duration-300"
                    style={{
                      background: "#0D9488",
                      boxShadow: "0 8px 32px rgba(13,148,136,0.35)",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                  >
                    I&rsquo;m Ready — Start Questions →
                  </button>
                ) : (
                  <button
                    onClick={nextCard}
                    className="w-full rounded-2xl py-4 font-bold text-base text-white transition-all duration-300"
                    style={{
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.8")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                  >
                    Next Concept →
                  </button>
                )}
                {cardIndex > 0 && (
                  <button
                    onClick={() => {
                      setCardIndex((i) => i - 1);
                      setRevealedSteps(0);
                      setShowWatchOut(false);
                    }}
                    className="w-full rounded-2xl py-3 font-semibold text-sm transition-all duration-300"
                    style={{
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "rgba(255,255,255,0.4)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.2)";
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                      (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)";
                    }}
                  >
                    ← Previous Concept
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

// ─── Stage 3b/4 — Questions ───────────────────────────────────────────────────

function QuestionsStage({
  topic,
  grade,
  count,
  onComplete,
}: {
  topic: TopicName;
  grade: number;
  count: number;
  onComplete: (results: CompletedQuestion[]) => void;
}) {
  const [questions, setQuestions]       = useState<Question[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [qIndex, setQIndex]             = useState(0);
  const [studentWorking, setWorking]    = useState("");
  const [marking, setMarking]           = useState(false);
  const [currentResult, setResult]      = useState<MarkResult | null>(null);
  const [markError, setMarkError]       = useState<string | null>(null);
  const [completed, setCompleted]       = useState<CompletedQuestion[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setQuestions([]);
    setQIndex(0);
    setWorking("");
    setResult(null);
    setCompleted([]);
    (async () => {
      try {
        const url = `/api/get-questions?topic=${encodeURIComponent(topic)}&grade=${grade}&count=${count}`;
        const res  = await fetch(url);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data.error ?? "Failed to load questions");
        setQuestions(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load questions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [topic, grade, count]);

  const q              = questions[qIndex];
  const isLastQuestion = qIndex === questions.length - 1;
  const progress       = questions.length > 0 ? ((qIndex) / questions.length) * 100 : 0;

  async function handleSubmit() {
    if (!q || !studentWorking.trim()) return;
    setMarking(true);
    setMarkError(null);
    try {
      const res  = await fetch("/api/mark-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q.question,
          correctWorking: q.working,
          correctAnswer: q.answer,
          studentWorking,
          topic,
          level: grade <= 5 ? "foundation" : "higher",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Marking failed");
      setResult(data as MarkResult);
    } catch (err) {
      setMarkError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setMarking(false);
    }
  }

  function handleNext() {
    if (!q || !currentResult) return;
    const entry: CompletedQuestion = { question: q, studentWorking, result: currentResult };
    const next = [...completed, entry];
    if (isLastQuestion) {
      onComplete(next);
    } else {
      setCompleted(next);
      setQIndex((i) => i + 1);
      setWorking("");
      setResult(null);
      setMarkError(null);
    }
  }

  if (loading) return <SkeletonCard />;

  if (error || !q) {
    return (
      <div className="max-w-xl mx-auto px-6 py-16 text-center">
        <p className="text-red-400">{error ?? "No questions available"}</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-up">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.35)" }}>
            {topic} · Grade {grade}
          </p>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Question <span className="text-white font-bold">{qIndex + 1}</span> of {questions.length}
          </p>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${progress}%`, background: "#0D9488" }}
          />
        </div>
      </div>

      <div key={qIndex} className="animate-slide-up">
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "#1A2744", border: "1px solid rgba(13,148,136,0.3)" }}
        >
          {/* Question */}
          <div className="px-8 py-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
              Question {qIndex + 1}
            </p>
            <p className="text-white font-semibold leading-relaxed" style={{ fontSize: "21px" }}>
              <LatexText text={q.question} />
            </p>
          </div>

          {/* Working area */}
          <div className="px-8 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
              Your working
            </label>
            <textarea
              value={studentWorking}
              onChange={(e) => {
                setWorking(e.target.value);
                if (currentResult) { setResult(null); setMarkError(null); }
              }}
              disabled={!!currentResult || marking}
              placeholder="Show your working here…"
              rows={7}
              className="w-full text-white text-sm placeholder:text-white/20 focus:outline-none resize-none disabled:opacity-50 px-4 font-mono"
              style={{
                background: "transparent",
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0px, transparent 29px, rgba(255,255,255,0.06) 29px, rgba(255,255,255,0.06) 30px)",
                backgroundSize: "100% 30px",
                lineHeight: "30px",
                paddingTop: "8px",
                border: "1.5px solid rgba(255,255,255,0.1)",
                borderRadius: "12px",
              }}
            />
          </div>

          {/* Submit */}
          {!currentResult && (
            <div className="px-8 py-6">
              {markError && <p className="text-red-400 text-sm mb-3">{markError}</p>}
              <button
                onClick={handleSubmit}
                disabled={marking || !studentWorking.trim()}
                className="w-full rounded-2xl py-4 font-bold text-base text-white transition-all duration-300 flex items-center justify-center gap-3"
                style={{
                  background: marking || !studentWorking.trim() ? "rgba(255,255,255,0.07)" : "#0D9488",
                  border: "none",
                  cursor: marking || !studentWorking.trim() ? "not-allowed" : "pointer",
                  boxShadow: studentWorking.trim() && !marking ? "0 4px 20px rgba(13,148,136,0.3)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!marking && studentWorking.trim()) (e.currentTarget as HTMLElement).style.opacity = "0.85";
                }}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
              >
                {marking ? <><Spinner /><span>Marking your answer…</span></> : "Submit Working"}
              </button>
            </div>
          )}

          {/* Result */}
          {currentResult && (
            <div className="animate-slide-up px-8 pb-7 pt-2 space-y-5">
              {currentResult.isCorrect ? (
                <div
                  className="rounded-xl px-6 py-5"
                  style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}
                >
                  <p className="font-bold text-lg mb-1" style={{ color: "#4ade80" }}>✓ Correct!</p>
                  <p style={{ color: "rgba(74,222,128,0.8)", fontSize: "15px" }}>{currentResult.encouragement}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className="rounded-xl px-6 py-5"
                    style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
                  >
                    <p className="font-bold text-base mb-1 flex items-center gap-2" style={{ color: "#f87171" }}>
                      ✗ Not quite
                      {currentResult.wrongStep !== null && (
                        <span className="font-normal text-sm" style={{ color: "rgba(248,113,113,0.7)" }}>
                          — check Step {currentResult.wrongStep}
                        </span>
                      )}
                    </p>
                    <p className="mb-2" style={{ color: "rgba(248,113,113,0.85)", fontSize: "15px" }}>
                      {currentResult.explanation}
                    </p>
                    <p className="text-sm italic" style={{ color: "rgba(248,113,113,0.6)" }}>
                      {currentResult.encouragement}
                    </p>
                  </div>

                  {/* Correct working */}
                  <div
                    className="rounded-xl px-6 py-5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Full solution
                    </p>
                    <ol className="space-y-2.5">
                      {q.working.split("\n").filter((l) => l.trim()).map((line, i) => (
                        <li
                          key={i}
                          className="flex gap-3 items-start rounded-lg px-3 py-1.5"
                          style={
                            currentResult.wrongStep === i + 1
                              ? { background: "rgba(251,146,60,0.12)", border: "1px solid rgba(251,146,60,0.25)" }
                              : {}
                          }
                        >
                          <span
                            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5"
                            style={{
                              background: currentResult.wrongStep === i + 1 ? "rgba(251,146,60,0.3)" : "rgba(13,148,136,0.2)",
                              color: currentResult.wrongStep === i + 1 ? "#fb923c" : "#0D9488",
                            }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                            <LatexText text={line} />
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}

              <button
                onClick={handleNext}
                className="w-full rounded-2xl py-4 font-bold text-base text-white transition-all duration-300"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)")}
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

// ─── Stage 3c — Upload ────────────────────────────────────────────────────────

function UploadStage({
  onTrySimilar,
  onBack,
  onSessionComplete,
}: {
  onTrySimilar: (topic: TopicName, grade: number) => void;
  onBack: () => void;
  onSessionComplete: () => void;
}) {
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState<UploadResult | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [dragOver, setDragOver]     = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Unsupported file type. Please upload a JPG, PNG, or PDF.");
      return;
    }

    setResult(null);
    setError(null);
    setLoading(true);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string ?? null);
    reader.readAsDataURL(file);

    try {
      // Convert to pure base64 (strip data: prefix)
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload  = () => {
          const raw = r.result as string;
          resolve(raw.split(",")[1]);
        };
        r.onerror = reject;
        r.readAsDataURL(file);
      });

      const mediaType = (["image/jpeg","image/png","image/gif","image/webp","application/pdf"].includes(file.type)
        ? file.type
        : "image/jpeg") as string;

      const res  = await fetch("/api/solve-uploaded-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to analyse image");
      setResult(data as UploadResult);
      onSessionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResult(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const topicNames = TOPICS.map((t) => t.name) as TopicName[];

  function handleTrySimilar() {
    if (!result) return;
    const topicName = topicNames.includes(result.topic as TopicName)
      ? (result.topic as TopicName)
      : "Algebra";
    onTrySimilar(topicName, result.grade);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-up">
      <button
        onClick={onBack}
        className="text-sm mb-8 flex items-center gap-1.5 transition-colors duration-300"
        style={{ color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "#0D9488")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)")}
      >
        ← Back
      </button>

      {/* Upload area */}
      {!result && (
        <div
          onClick={() => !loading && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) processFile(f);
          }}
          className="rounded-2xl p-16 text-center transition-all duration-300"
          style={{
            border: `2px dashed ${dragOver ? "#0D9488" : "rgba(13,148,136,0.35)"}`,
            background: dragOver ? "rgba(13,148,136,0.08)" : "rgba(255,255,255,0.02)",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-4">
              <Spinner />
              <p style={{ color: "rgba(255,255,255,0.5)" }}>Analysing your question…</p>
            </div>
          ) : preview ? (
            <div className="flex flex-col items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="max-h-48 rounded-xl object-contain" />
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Processing…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <rect x="8" y="14" width="32" height="24" rx="6" stroke="rgba(13,148,136,0.5)" strokeWidth="2" fill="rgba(13,148,136,0.06)" />
                <polyline points="24,8 24,30" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" />
                <polyline points="17,15 24,8 31,15" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <p className="text-white font-semibold text-lg">Drop an image here or click to upload</p>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>
                  Accepts JPG, PNG, or PDF · Max 10 MB
                </p>
              </div>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }}
          />
        </div>
      )}

      {error && (
        <div
          className="mt-6 px-6 py-4 rounded-xl"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)" }}
        >
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={reset} className="text-xs mt-2 underline" style={{ color: "rgba(239,68,68,0.7)", background: "none", border: "none", cursor: "pointer" }}>
            Try another image
          </button>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div
          className="animate-slide-up rounded-2xl overflow-hidden shadow-2xl"
          style={{ background: "#1A2744", border: "1px solid rgba(13,148,136,0.35)" }}
        >
          {/* Header */}
          <div className="px-8 py-6" style={{ background: "rgba(13,148,136,0.1)", borderBottom: "1px solid rgba(13,148,136,0.15)" }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#0D9488" }}>
              Question identified · {result.topic} · Grade {result.grade}
            </p>
            <p className="text-white font-semibold text-lg leading-relaxed">
              <LatexText text={result.questionText} />
            </p>
          </div>

          {/* Worked solution */}
          <div className="px-8 py-6" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
              Full worked solution
            </p>
            <ol className="space-y-3">
              {result.working.split("\n").filter((l) => l.trim()).map((line, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                    style={{ background: "#0D9488" }}
                  >
                    {i + 1}
                  </span>
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.75)", lineHeight: "1.6" }}>
                    <LatexText text={line} />
                  </p>
                </li>
              ))}
            </ol>
          </div>

          {/* Answer */}
          <div className="px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "rgba(255,255,255,0.3)" }}>
              Answer
            </p>
            <p className="text-white font-bold text-xl">
              <LatexText text={result.answer} />
            </p>
          </div>

          {/* Tip */}
          <div className="px-8 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div
              className="rounded-xl px-5 py-4"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: "#f59e0b" }}>
                ⚠ Common mistake
              </p>
              <p className="text-sm" style={{ color: "rgba(245,158,11,0.85)", lineHeight: "1.6" }}>
                {result.tip}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="px-8 py-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleTrySimilar}
              className="flex-1 rounded-2xl py-4 font-bold text-base text-white transition-all duration-300"
              style={{ background: "#0D9488", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(13,148,136,0.3)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              Try Similar Questions →
            </button>
            <button
              onClick={reset}
              className="flex-1 rounded-2xl py-4 font-bold text-base text-white transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.11)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
            >
              Upload Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stage 4 — Summary ────────────────────────────────────────────────────────

function SummaryStage({
  results,
  topic,
  grade,
  mode,
  streak,
  isNewPB,
  onTryAgain,
  onChooseNew,
  onViewLesson,
}: {
  results: CompletedQuestion[];
  topic: TopicName;
  grade: number;
  mode: Mode;
  streak: number;
  isNewPB: boolean;
  onTryAgain: () => void;
  onChooseNew: () => void;
  onViewLesson: () => void;
}) {
  const correct = results.filter((r) => r.result.isCorrect).length;
  const total   = results.length;
  const pct     = Math.round((correct / total) * 100);
  const [displayScore, setDisplayScore] = useState(0);

  // requestAnimationFrame counter — counts up over 1 s with ease-out
  useEffect(() => {
    const DURATION = 1000;
    const start    = performance.now();
    let raf: number;
    function tick(now: number) {
      const t        = Math.min((now - start) / DURATION, 1);
      const eased    = 1 - Math.pow(1 - t, 3);       // ease-out cubic
      setDisplayScore(Math.round(eased * correct));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [correct]);

  // Streak message based on streak length
  const streakMessage =
    streak >= 15 ? "Legendary — Ben would be proud 👑" :
    streak >= 8  ? "You're on fire — incredible streak 🔥" :
    streak >= 4  ? "Great consistency this week ⚡" :
    streak >= 1  ? "Getting started — keep it up 💪" : "";

  return (
    <div className="max-w-3xl mx-auto px-6 py-12 animate-slide-up">
      {/* Score card */}
      <div
        className="rounded-2xl overflow-hidden shadow-2xl mb-6"
        style={{
          background: "#1A2744",
          border: `1px solid ${isNewPB ? "#0D9488" : "rgba(13,148,136,0.25)"}`,
          animation: isNewPB ? "pb-glow 2s ease-in-out 3" : undefined,
        }}
      >
        {/* Score header */}
        <div
          className="px-8 pt-12 pb-10 text-center"
          style={{ background: "rgba(13,148,136,0.07)", borderBottom: "1px solid rgba(13,148,136,0.1)" }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Session Complete · {topic} · Grade {grade}
          </p>
          <div
            className="font-extrabold mb-2"
            style={{ fontSize: "72px", lineHeight: 1, color: "#0D9488", animation: "score-pop 0.5s cubic-bezier(0.22,1,0.36,1) forwards" }}
          >
            {displayScore}
            <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "44px" }}>/{total}</span>
          </div>
          <p className="text-lg mt-2" style={{ color: "#CBD5E1" }}>
            {pct}% —{" "}
            {pct === 100 ? "Perfect! Absolutely outstanding." :
             pct >= 80   ? "Excellent — nearly flawless!" :
             pct >= 60   ? "Good effort — keep pushing!" :
                           "Keep going — every attempt counts."}
          </p>

          {/* Streak display */}
          {streak > 0 && (
            <div
              className="inline-flex flex-col items-center gap-1 mt-6 px-6 py-3 rounded-2xl"
              style={{
                background: isNewPB ? "rgba(13,148,136,0.18)" : "rgba(245,158,11,0.1)",
                border: `1px solid ${isNewPB ? "rgba(13,148,136,0.5)" : "rgba(245,158,11,0.25)"}`,
              }}
            >
              <div className="flex items-center gap-2">
                <FlameIcon size={24} />
                <span className="font-extrabold text-2xl" style={{ color: isNewPB ? "#0D9488" : "#F59E0B" }}>
                  {streak}
                </span>
                <span className="font-semibold text-sm" style={{ color: isNewPB ? "rgba(13,148,136,0.8)" : "rgba(245,158,11,0.7)" }}>
                  day streak
                </span>
              </div>
              {isNewPB && (
                <p className="text-xs font-semibold" style={{ color: "#0D9488" }}>
                  🎉 New personal best!
                </p>
              )}
              {streakMessage && (
                <p className="text-xs mt-0.5" style={{ color: isNewPB ? "rgba(13,148,136,0.75)" : "rgba(245,158,11,0.65)" }}>
                  {streakMessage}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Per-question breakdown */}
        <div className="px-8 py-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
            Question breakdown
          </p>
          {results.map((r, i) => (
            <div
              key={i}
              className="rounded-xl px-5 py-4"
              style={{
                background: r.result.isCorrect ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
                border: `1px solid ${r.result.isCorrect ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}`,
              }}
            >
              <div className="flex items-start gap-3">
                {/* Tick/cross from CSS */}
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    background: r.result.isCorrect ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)",
                    color: r.result.isCorrect ? "#4ade80" : "#f87171",
                  }}
                >
                  {r.result.isCorrect ? (
                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                      <polyline points="1,5 5,9 11,1" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <line x1="1" y1="1" x2="9" y2="9" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
                      <line x1="9" y1="1" x2="1" y2="9" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm leading-snug" style={{ color: r.result.isCorrect ? "#4ade80" : "#f87171" }}>
                    Q{i + 1}:{" "}
                    <LatexText
                      text={r.question.question.length > 90 ? r.question.question.slice(0, 90) + "…" : r.question.question}
                    />
                  </p>
                  {!r.result.isCorrect && r.result.explanation && (
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: "rgba(248,113,113,0.6)" }}>
                      {r.result.explanation.length > 120 ? r.result.explanation.slice(0, 120) + "…" : r.result.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onTryAgain}
              className="rounded-2xl py-4 font-bold text-base text-white transition-all duration-300"
              style={{ background: "#0D9488", border: "none", cursor: "pointer", boxShadow: "0 4px 20px rgba(13,148,136,0.25)" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
            >
              Try Again
            </button>
            <button
              onClick={onChooseNew}
              className="rounded-2xl py-4 font-bold text-base text-white transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.11)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)")}
            >
              Choose New Topic
            </button>
          </div>
          {/* "View Lesson" for drill mode */}
          {mode === "drill" && (
            <div
              className="pt-4 text-center"
              style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
            >
              <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
                Want to brush up on this topic?
              </p>
              <button
                onClick={onViewLesson}
                className="px-8 py-3 rounded-2xl font-semibold text-sm transition-all duration-300"
                style={{
                  color: "#0D9488",
                  border: "1.5px solid rgba(13,148,136,0.3)",
                  background: "rgba(13,148,136,0.06)",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.12)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.06)")}
              >
                View Lesson
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  const [stage, setStage]               = useState<Stage>("select");
  const [mode,  setMode]                = useState<Mode>("learn");
  const [selectedTopic, setTopic]       = useState<TopicName | null>(null);
  const [selectedGrade, setGrade]       = useState<number | null>(null);
  const [results, setResults]           = useState<CompletedQuestion[]>([]);
  const [questionsKey, setQKey]         = useState(0);
  const [streak, setStreak]             = useState(0);
  const [isNewPB, setIsNewPB]           = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Read streak from localStorage on mount
  useEffect(() => { setStreak(readStreak()); }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleTopicGradeSelected = useCallback((topic: TopicName, grade: number) => {
    setTopic(topic);
    setGrade(grade);
    setStage("mode");
  }, []);

  const handleModeSelected = useCallback((m: Mode) => {
    setMode(m);
    if (m === "learn")  setStage("lesson");
    if (m === "drill")  setStage("questions");
    if (m === "upload") setStage("upload");
  }, []);

  const handleLessonReady = useCallback(() => {
    setStage("questions");
  }, []);

  const handleComplete = useCallback((res: CompletedQuestion[]) => {
    const { streak: s, isNewPB: pb } = updateStreak();
    setStreak(s);
    setIsNewPB(pb);
    setResults(res);
    setStage("summary");
    if (pb) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, []);

  const handleUploadComplete = useCallback(() => {
    const { streak: s, isNewPB: pb } = updateStreak();
    setStreak(s);
    setIsNewPB(pb);
    if (pb) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, []);

  const handleTryAgain = useCallback(() => {
    setResults([]);
    setQKey((k) => k + 1);
    setStage("questions");
  }, []);

  const handleChooseNew = useCallback(() => {
    setTopic(null);
    setGrade(null);
    setResults([]);
    setStage("select");
  }, []);

  const handleViewLesson = useCallback(() => {
    setStage("lesson");
  }, []);

  const handleBackToMode = useCallback(() => {
    setStage("mode");
  }, []);

  const handleTrySimilar = useCallback((topic: TopicName, grade: number) => {
    setTopic(topic);
    setGrade(grade);
    setMode("drill");
    setQKey((k) => k + 1);
    setStage("questions");
  }, []);

  // Question count based on mode
  const questionCount = mode === "drill" ? 10 : 5;

  return (
    <PageBg>
      {showConfetti && <ConfettiBurst />}
      <NavBar streak={streak} />
      <div className="pt-16">
        {stage === "select" && (
          <SelectStage onStart={handleTopicGradeSelected} />
        )}

        {stage === "mode" && selectedTopic && selectedGrade && (
          <ModeStage
            topic={selectedTopic}
            grade={selectedGrade}
            onMode={handleModeSelected}
            onBack={() => setStage("select")}
          />
        )}

        {stage === "lesson" && selectedTopic && selectedGrade && (
          <LessonStage
            key={`${selectedTopic}-${selectedGrade}`}
            topic={selectedTopic}
            grade={selectedGrade}
            onReady={handleLessonReady}
          />
        )}

        {stage === "questions" && selectedTopic && selectedGrade && (
          <QuestionsStage
            key={questionsKey}
            topic={selectedTopic}
            grade={selectedGrade}
            count={questionCount}
            onComplete={handleComplete}
          />
        )}

        {stage === "upload" && (
          <UploadStage
            onTrySimilar={handleTrySimilar}
            onBack={handleBackToMode}
            onSessionComplete={handleUploadComplete}
          />
        )}

        {stage === "summary" && selectedTopic && selectedGrade && (
          <SummaryStage
            results={results}
            topic={selectedTopic}
            grade={selectedGrade}
            mode={mode}
            streak={streak}
            isNewPB={isNewPB}
            onTryAgain={handleTryAgain}
            onChooseNew={handleChooseNew}
            onViewLesson={handleViewLesson}
          />
        )}
      </div>
    </PageBg>
  );
}

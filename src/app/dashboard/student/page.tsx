"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type TopicName =
  | "Algebra" | "Fractions" | "Percentages" | "Pythagoras" | "Quadratics"
  | "Simultaneous Equations" | "Trigonometry" | "Ratio" | "Probability" | "Statistics"
  | "Number" | "Indices and Surds" | "Geometry and Measures" | "Vectors"
  | "Sequences" | "Inequalities" | "Circle Theorems" | "Transformations"
  | "Constructions and Loci" | "Data and Graphs";

interface SessionRow {
  topic: string;
  is_correct: boolean;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_TOPICS: TopicName[] = [
  "Number", "Fractions", "Ratio", "Algebra", "Percentages",
  "Probability", "Statistics", "Geometry and Measures", "Sequences", "Transformations",
  "Pythagoras", "Trigonometry", "Simultaneous Equations", "Quadratics", "Inequalities",
  "Vectors", "Constructions and Loci", "Data and Graphs", "Circle Theorems",
  "Indices and Surds",
];

const TOPIC_MIN_GRADE: Record<TopicName, number> = {
  "Number": 1, "Fractions": 1, "Ratio": 1, "Algebra": 1, "Percentages": 1,
  "Probability": 1, "Statistics": 1, "Geometry and Measures": 1,
  "Sequences": 1, "Transformations": 1,
  "Pythagoras": 4, "Trigonometry": 4, "Simultaneous Equations": 4,
  "Quadratics": 4, "Inequalities": 4, "Vectors": 4,
  "Constructions and Loci": 4, "Data and Graphs": 4, "Circle Theorems": 4,
  "Indices and Surds": 7,
};

function priorityTopicsFor(grade: number | null): TopicName[] {
  if (!grade) return [];
  if (grade >= 7) return ["Indices and Surds", "Quadratics", "Simultaneous Equations", "Trigonometry", "Circle Theorems"];
  if (grade >= 4) return ["Pythagoras", "Algebra", "Fractions", "Percentages", "Geometry and Measures"];
  return ["Number", "Fractions", "Algebra"];
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function accuracy(correct: number, attempted: number): number {
  return attempted === 0 ? 0 : Math.round((correct / attempted) * 100);
}

function greetingByHour(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** Returns ISO date strings for the 7-day window ending today, oldest first. */
function last7DayStrings(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

/** Safe short weekday from ISO date — uses noon to dodge DST/timezone shifts. */
function shortDay(iso: string): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(`${iso}T12:00:00`).getDay()
  ];
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric", month: "short",
  });
}

// ─── Design primitives ────────────────────────────────────────────────────────

const NAVY  = "#1A2744";
const TEAL  = "#0D9488";
const BG    = "#0F1729";

function Card({
  children, className = "", style = {},
}: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{ background: NAVY, border: "1px solid rgba(255,255,255,0.06)", ...style }}
    >
      {children}
    </div>
  );
}

function Skel({ h = 16, w = "100%", round = "8px" }: { h?: number; w?: string; round?: string }) {
  return (
    <div
      className="animate-skeleton-pulse"
      style={{ height: h, width: w, borderRadius: round, background: "rgba(255,255,255,0.07)" }}
    />
  );
}

// ─── Flame icon ───────────────────────────────────────────────────────────────

function FlameIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={Math.round(size * 1.17)} viewBox="0 0 24 28" fill="none" aria-hidden>
      <ellipse cx="12" cy="25.5" rx="5.5" ry="2.2" fill="#F59E0B" opacity="0.5" />
      <path d="M12 2C9.2 7 6.5 11 6.5 16c0 3.59 2.51 6.5 5.5 6.5 2.99 0 5.5-2.91 5.5-6.5C17.5 11 14.8 7 12 2Z" fill="#F59E0B" />
      <path d="M12 8.5C11 12 9.5 14.5 9.5 16.8c0 1.77 1.12 3.2 2.5 3.2 1.38 0 2.5-1.43 2.5-3.2C14.5 14.5 13 12 12 8.5Z" fill="#FDE68A" opacity="0.7" />
    </svg>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon,
}: {
  label: string; value: string | number; sub?: string; icon?: React.ReactNode;
}) {
  return (
    <Card className="px-5 py-5 flex flex-col gap-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.38)" }}>
          {label}
        </p>
        {icon}
      </div>
      <p className="text-3xl font-extrabold text-white leading-none">{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>{sub}</p>}
    </Card>
  );
}

// ─── SVG circle progress ──────────────────────────────────────────────────────

function CircleProgress({ pct, size = 56 }: { pct: number; size?: number }) {
  const r    = Math.round(size * 0.37);
  const circ = parseFloat((2 * Math.PI * r).toFixed(2));
  const off  = parseFloat((circ * (1 - Math.min(pct, 100) / 100)).toFixed(2));
  const cx   = size / 2;
  const col  = pct >= 75 ? "#22c55e" : pct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`${pct}%`}>
      {/* Track */}
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="4.5" />
      {/* Progress arc */}
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={col}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray={String(circ)}
        strokeDashoffset={String(off)}
        transform={`rotate(-90 ${cx} ${cx})`}
        style={{ transition: "stroke-dashoffset 0.55s ease" }}
      />
      {/* Percentage label */}
      <text
        x={cx} y={cx}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={size * 0.21}
        fontWeight="700"
        fontFamily="inherit"
      >
        {pct}%
      </text>
    </svg>
  );
}

// ─── Topic card ───────────────────────────────────────────────────────────────

function TopicCard({
  name, attempted, correct, lastActive, locked, minGrade,
}: {
  name: string; attempted: number; correct: number;
  lastActive: string | null; locked: boolean; minGrade: number;
}) {
  const acc = accuracy(correct, attempted);

  if (locked) {
    return (
      <div
        className="rounded-2xl px-4 py-4 flex flex-col gap-1.5"
        style={{
          background: "rgba(255,255,255,0.015)",
          border: "1px solid rgba(255,255,255,0.05)",
          opacity: 0.45,
        }}
      >
        <p className="text-xs font-semibold text-white">{name}</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          Unlocks at Grade {minGrade}
        </p>
      </div>
    );
  }

  if (attempted === 0) {
    return (
      <Card className="px-4 py-4 flex flex-col gap-2">
        <p className="text-xs font-semibold text-white">{name}</p>
        <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.3)" }}>
          Not started yet
        </p>
        <Link
          href="/learn"
          className="mt-auto text-xs font-bold"
          style={{ color: TEAL }}
        >
          Start Practising →
        </Link>
      </Card>
    );
  }

  return (
    <Card className="px-4 py-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-white leading-snug mt-1">{name}</p>
        <CircleProgress pct={acc} size={52} />
      </div>
      <div>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {attempted} question{attempted !== 1 ? "s" : ""} attempted
        </p>
        {lastActive && (
          <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
            Last active {fmtDate(lastActive)}
          </p>
        )}
      </div>
    </Card>
  );
}

// ─── Pure-CSS 7-day bar chart ─────────────────────────────────────────────────

function ActivityChart({ byDay }: { byDay: Map<string, number> }) {
  const days   = last7DayStrings();
  const counts = days.map((d) => byDay.get(d) ?? 0);
  const max    = Math.max(...counts, 1);
  const BAR_H  = 80;
  const today  = todayString();

  return (
    <div>
      <div className="flex gap-2 items-end" style={{ height: BAR_H + 8 + "px" }}>
        {days.map((day, i) => {
          const n   = counts[i];
          const h   = n === 0 ? 0 : Math.max(6, Math.round((n / max) * BAR_H));
          const now = day === today;
          return (
            <div key={day} className="flex-1 flex flex-col items-center justify-end gap-0.5">
              {/* Count label above bar */}
              <span
                className="text-xs font-semibold"
                style={{ color: n > 0 ? "rgba(255,255,255,0.65)" : "transparent", marginBottom: "2px" }}
              >
                {n || "·"}
              </span>
              {/* Bar */}
              <div
                className="w-full rounded-t-md"
                style={{
                  height: n === 0 ? "3px" : `${h}px`,
                  background: n === 0
                    ? "rgba(255,255,255,0.05)"
                    : now
                    ? "#14b8a6"
                    : TEAL,
                  transition: "height 0.45s ease",
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Day labels */}
      <div className="flex gap-2 mt-2">
        {days.map((day) => (
          <div key={day} className="flex-1 text-center">
            <span
              className="text-xs font-medium"
              style={{ color: day === today ? TEAL : "rgba(255,255,255,0.35)" }}
            >
              {shortDay(day)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentDashboardPage() {
  // ── State ────────────────────────────────────────────────────────────────────
  const [name,            setName]            = useState("Student");
  const [targetGrade,     setTargetGrade]     = useState<number | null>(null);
  const [streak,          setStreak]          = useState(0);
  const [sessions,        setSessions]        = useState<SessionRow[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [showConfirm,     setShowConfirm]     = useState(false);

  // ── Bootstrap: localStorage → Supabase ───────────────────────────────────────
  useEffect(() => {
    const storedName  = localStorage.getItem("bm_student_name") ?? "Anonymous";
    const storedGrade = localStorage.getItem("bm_target_grade");
    const storedStrk  = parseInt(localStorage.getItem("bm_streak") ?? "0", 10);

    setName(storedName);
    setStreak(storedStrk);
    if (storedGrade) setTargetGrade(parseInt(storedGrade, 10));

    async function fetchSessions() {
      try {
        const { data, error } = await supabase
          .from("student_sessions")
          .select("topic, is_correct, created_at")
          .eq("student_name", storedName)
          .order("created_at", { ascending: false });

        if (!error && data) setSessions(data as SessionRow[]);
      } catch {
        // Silently degrade — empty state is shown
      } finally {
        setLoading(false);
      }
    }

    fetchSessions();
  }, []);

  // ── Target grade persistence ─────────────────────────────────────────────────
  function handleSelectGrade(g: number) {
    localStorage.setItem("bm_target_grade", String(g));
    setTargetGrade(g);
    setShowConfirm(true);
    setTimeout(() => setShowConfirm(false), 2800);
  }

  function handleClearGrade() {
    localStorage.removeItem("bm_target_grade");
    setTargetGrade(null);
  }

  // ── Derived: topic stats ─────────────────────────────────────────────────────
  const topicStats = useMemo(() => {
    const map = new Map<TopicName, { attempted: number; correct: number; lastActive: string | null }>();
    // Sessions are ordered DESC, so first encounter per topic = most recent
    for (const s of sessions) {
      const t = s.topic as TopicName;
      const ex = map.get(t) ?? { attempted: 0, correct: 0, lastActive: null };
      map.set(t, {
        attempted:  ex.attempted + 1,
        correct:    ex.correct + (s.is_correct ? 1 : 0),
        lastActive: ex.lastActive ?? s.created_at.split("T")[0],
      });
    }
    return map;
  }, [sessions]);

  // ── Derived: 7-day activity ───────────────────────────────────────────────────
  const activityByDay = useMemo(() => {
    const map  = new Map<string, number>();
    // Cutoff: start of 7 days ago (string comparison is safe for ISO dates)
    const cutoff = last7DayStrings()[0];
    for (const s of sessions) {
      const day = s.created_at.split("T")[0];
      if (day >= cutoff) map.set(day, (map.get(day) ?? 0) + 1);
    }
    return map;
  }, [sessions]);

  // ── Derived: summary numbers ─────────────────────────────────────────────────
  const { overallAccuracy, totalAttempted, totalCorrect } = useMemo(() => {
    let att = 0, cor = 0;
    topicStats.forEach((v) => { att += v.attempted; cor += v.correct; });
    return { overallAccuracy: accuracy(cor, att), totalAttempted: att, totalCorrect: cor };
  }, [topicStats]);

  const topicsMastered = useMemo(() => {
    let n = 0;
    topicStats.forEach((v) => {
      if (v.attempted >= 5 && accuracy(v.correct, v.attempted) >= 75) n++;
    });
    return n;
  }, [topicStats]);

  const sessionsThisWeek = useMemo(() => {
    const cutoff = last7DayStrings()[0];
    const days   = new Set<string>();
    sessions.forEach((s) => {
      const day = s.created_at.split("T")[0];
      if (day >= cutoff) days.add(day);
    });
    return days.size;
  }, [sessions]);

  // ── Derived: motivational subtitle ───────────────────────────────────────────
  const subtitle = useMemo(() => {
    if (sessions.length === 0) return "Ready to get started? Pick a topic and begin practising.";
    if (overallAccuracy >= 80)  return "You're doing brilliantly — keep pushing for that top grade!";
    if (sessionsThisWeek === 0) return "You haven't practised this week yet — let's change that today.";
    if (overallAccuracy >= 60)  return "Good progress — consistency is the key to success.";
    return "Every question builds your understanding. Keep going!";
  }, [sessions.length, overallAccuracy, sessionsThisWeek]);

  // ── Derived: difficulty push alerts ─────────────────────────────────────────
  const readyForHarder = useMemo(() => {
    if (!targetGrade || targetGrade < 4) return false;
    let count = 0;
    topicStats.forEach((v, t) => {
      if (
        TOPIC_MIN_GRADE[t] < targetGrade &&
        v.attempted >= 5 &&
        accuracy(v.correct, v.attempted) >= 80
      ) count++;
    });
    return count >= 2;
  }, [topicStats, targetGrade]);

  const challengeAlert = useMemo(() => {
    if (!targetGrade || targetGrade < 4 || readyForHarder) return false;
    const priority      = priorityTopicsFor(targetGrade);
    const priorityTotal = priority.reduce((s, t) => s + (topicStats.get(t)?.attempted ?? 0), 0);
    return sessions.length >= 20 && priorityTotal < 10;
  }, [topicStats, targetGrade, sessions.length, readyForHarder]);

  // ── Next hard topic suggestion ───────────────────────────────────────────────
  const nextChallenge = useMemo(() => {
    if (!targetGrade) return null;
    const priority = priorityTopicsFor(targetGrade);
    return priority.find((t) => (topicStats.get(t)?.attempted ?? 0) < 5) ?? priority[0] ?? null;
  }, [topicStats, targetGrade]);

  // ── Derived: lesson suggestions ──────────────────────────────────────────────
  const suggestions = useMemo(() => {
    const list: Array<{ kind: "weekly" | "book" | "stuck"; topic?: TopicName; msg: string }> = [];

    if (sessionsThisWeek === 0) {
      list.push({ kind: "weekly", msg: "Book your weekly session with Ben to keep on track." });
    }

    topicStats.forEach((v, t) => {
      if (list.length >= 4) return;
      const acc = accuracy(v.correct, v.attempted);
      if (v.attempted >= 15 && acc < 50) {
        list.push({ kind: "stuck", topic: t, msg: `Ben can help you break through with ${t} — you've tried lots of questions but progress has stalled.` });
      } else if (v.attempted >= 10 && acc < 50) {
        list.push({ kind: "book", topic: t, msg: `Ben can help you crack ${t}` });
      }
    });

    return list.slice(0, 4);
  }, [topicStats, sessionsThisWeek]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ background: BG }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── Target grade onboarding / confirmation ─────────────────────────── */}
        {(!targetGrade || showConfirm) && (
          <div
            className="rounded-2xl px-8 py-8 animate-fade-in"
            style={{ background: NAVY, border: `1.5px solid rgba(13,148,136,0.4)` }}
          >
            {showConfirm ? (
              <div className="text-center py-2">
                <p className="text-2xl font-extrabold text-white mb-1">Target set — Grade {targetGrade}! 🎯</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                  Your dashboard is now personalised to your goal.
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-extrabold text-white mb-2">
                  What grade are you targeting?
                </h2>
                <p className="text-sm mb-7" style={{ color: "rgba(255,255,255,0.45)" }}>
                  We&apos;ll personalise your dashboard and highlight the most important topics for your goal.
                </p>
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((g) => (
                    <button
                      key={g}
                      onClick={() => handleSelectGrade(g)}
                      className="font-extrabold text-xl transition-all duration-200"
                      style={{
                        width: 64, height: 64,
                        borderRadius: "999px",
                        border: "1.5px solid rgba(13,148,136,0.4)",
                        background: "rgba(13,148,136,0.08)",
                        color: "white",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = TEAL;
                        (e.currentTarget as HTMLElement).style.borderColor = TEAL;
                        (e.currentTarget as HTMLElement).style.transform = "scale(1.08)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "rgba(13,148,136,0.08)";
                        (e.currentTarget as HTMLElement).style.borderColor = "rgba(13,148,136,0.4)";
                        (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                      }}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-tight">
              {greetingByHour()}, {name}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "rgba(255,255,255,0.43)" }}>
              {subtitle}
            </p>
          </div>

          {targetGrade && !showConfirm && (
            <div className="flex items-center gap-2">
              <div
                className="px-4 py-2 rounded-full"
                style={{
                  background: "rgba(13,148,136,0.12)",
                  border: "1px solid rgba(13,148,136,0.35)",
                }}
              >
                <span className="text-sm font-bold" style={{ color: TEAL }}>
                  Target: Grade {targetGrade}
                </span>
              </div>
              <button
                onClick={handleClearGrade}
                className="text-xs"
                style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.22)" }}
                title="Change target grade"
              >
                change
              </button>
            </div>
          )}
        </div>

        {/* ── Stat cards ─────────────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="px-5 py-5 space-y-3">
                <Skel h={11} w="55%" />
                <Skel h={36} w="45%" />
                <Skel h={10} w="70%" />
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Sessions This Week"
              value={sessionsThisWeek}
              sub={sessionsThisWeek === 0 ? "No practice yet" : `${sessionsThisWeek} active day${sessionsThisWeek !== 1 ? "s" : ""}`}
            />
            <StatCard
              label="Overall Accuracy"
              value={totalAttempted === 0 ? "—" : `${overallAccuracy}%`}
              sub={
                totalAttempted > 0
                  ? `${totalCorrect} of ${totalAttempted} correct`
                  : "Answer questions to see your score"
              }
            />
            <StatCard
              label="Current Streak"
              value={streak === 0 ? "—" : streak}
              sub={streak > 0 ? `${streak} day${streak !== 1 ? "s" : ""} in a row` : "Start a streak today"}
              icon={streak > 0 ? <FlameIcon size={18} /> : undefined}
            />
            <StatCard
              label="Topics Mastered"
              value={topicsMastered}
              sub={`of ${ALL_TOPICS.length} topics (≥75% accuracy)`}
            />
          </div>
        )}

        {/* ── Difficulty push alerts ──────────────────────────────────────────── */}
        {!loading && readyForHarder && nextChallenge && (
          <div
            className="rounded-2xl px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in"
            style={{ background: "rgba(13,148,136,0.1)", border: "1.5px solid rgba(13,148,136,0.45)" }}
          >
            <div>
              <p className="font-extrabold text-white text-lg">
                You&apos;re ready for harder material 🚀
              </p>
              <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.6)" }}>
                You have strong foundations — here&apos;s what to tackle next:{" "}
                <span className="text-white font-semibold">{nextChallenge}</span>
              </p>
            </div>
            <Link
              href="/learn"
              className="shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: TEAL }}
            >
              Try {nextChallenge} →
            </Link>
          </div>
        )}

        {!loading && challengeAlert && (
          <div
            className="rounded-2xl px-6 py-5 animate-fade-in"
            style={{ background: "rgba(245,158,11,0.08)", border: "1.5px solid rgba(245,158,11,0.3)" }}
          >
            <p className="font-extrabold text-lg" style={{ color: "#f59e0b" }}>
              Challenge yourself ⚡
            </p>
            <p className="text-sm mt-1" style={{ color: "rgba(245,158,11,0.75)" }}>
              You&apos;ve mastered this level — it&apos;s time to push higher.
              Your Grade {targetGrade} priority topics need attention to hit your target.
            </p>
          </div>
        )}

        {/* ── Topic performance grid ──────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-extrabold text-white mb-4">Topic Performance</h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {ALL_TOPICS.map((t) => (
                <Card key={t} className="px-4 py-4 space-y-2.5">
                  <Skel h={12} w="65%" />
                  <Skel h={52} w="52px" round="50%" />
                  <Skel h={10} w="75%" />
                  <Skel h={10} w="55%" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {ALL_TOPICS.map((topic) => {
                const stats    = topicStats.get(topic);
                const locked   = targetGrade !== null && targetGrade < TOPIC_MIN_GRADE[topic];
                return (
                  <TopicCard
                    key={topic}
                    name={topic}
                    attempted={stats?.attempted ?? 0}
                    correct={stats?.correct ?? 0}
                    lastActive={stats?.lastActive ?? null}
                    locked={locked}
                    minGrade={TOPIC_MIN_GRADE[topic]}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* ── Target grade analysis ───────────────────────────────────────────── */}
        {targetGrade && !loading && (
          <section>
            <h2 className="text-xl font-extrabold text-white mb-1">
              Your Path to Grade {targetGrade}
            </h2>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.38)" }}>
              The topics that matter most for hitting your target grade.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {priorityTopicsFor(targetGrade).map((topic) => {
                const stats = topicStats.get(topic);
                const att   = stats?.attempted ?? 0;
                const acc   = stats ? accuracy(stats.correct, stats.attempted) : 0;
                const col   = acc >= 75 ? "#22c55e" : acc >= 50 ? "#f59e0b" : "#ef4444";
                const label = acc >= 75 ? "Strong" : acc >= 50 ? "Improving" : att > 0 ? "Needs work" : null;

                return (
                  <Card key={topic} className="px-5 py-5 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(13,148,136,0.15)", color: TEAL }}
                        >
                          Focus area
                        </span>
                        <p className="text-white font-bold mt-2 leading-snug">{topic}</p>
                        {label && (
                          <p className="text-xs mt-0.5 font-semibold" style={{ color: col }}>
                            {label} · {att} question{att !== 1 ? "s" : ""}
                          </p>
                        )}
                        {att === 0 && (
                          <p className="text-xs mt-0.5 italic" style={{ color: "rgba(255,255,255,0.3)" }}>
                            Not started yet
                          </p>
                        )}
                      </div>
                      {att > 0 && <CircleProgress pct={acc} size={56} />}
                    </div>
                    <Link
                      href="/learn"
                      className="text-sm font-bold px-4 py-2.5 rounded-xl text-white self-start"
                      style={{ background: TEAL }}
                    >
                      Practise Now →
                    </Link>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Lesson suggestions ──────────────────────────────────────────────── */}
        {!loading && suggestions.length > 0 && (
          <section>
            <h2 className="text-xl font-extrabold text-white mb-4">
              Recommended Sessions with Ben
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suggestions.map((s, idx) => {
                if (s.kind === "weekly") {
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl px-5 py-5 flex flex-col gap-3"
                      style={{ background: BG, border: `1.5px solid ${TEAL}` }}
                    >
                      <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: TEAL }}>
                        📅 Weekly session
                      </p>
                      <p className="text-white font-semibold text-sm leading-relaxed">{s.msg}</p>
                      <Link
                        href="/book"
                        className="text-sm font-bold px-4 py-2.5 rounded-xl text-white self-start"
                        style={{ background: TEAL }}
                      >
                        Book Now →
                      </Link>
                    </div>
                  );
                }

                if (s.kind === "stuck") {
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl px-5 py-5 flex flex-col gap-3"
                      style={{
                        background: "rgba(245,158,11,0.07)",
                        border: "1px solid rgba(245,158,11,0.3)",
                      }}
                    >
                      <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "#f59e0b" }}>
                        🔄 Stuck on this topic
                      </p>
                      <p className="text-sm font-semibold leading-relaxed" style={{ color: "rgba(245,158,11,0.9)" }}>
                        {s.msg}
                      </p>
                      <Link
                        href="/book"
                        className="text-sm font-bold px-4 py-2.5 rounded-xl self-start"
                        style={{
                          background: "rgba(245,158,11,0.15)",
                          color: "#f59e0b",
                          border: "1px solid rgba(245,158,11,0.35)",
                        }}
                      >
                        Book a lesson →
                      </Link>
                    </div>
                  );
                }

                // kind === "book"
                return (
                  <div
                    key={idx}
                    className="rounded-2xl px-5 py-5 flex flex-col gap-3"
                    style={{
                      background: "rgba(13,148,136,0.07)",
                      border: "1px solid rgba(13,148,136,0.28)",
                    }}
                  >
                    <p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: TEAL }}>
                      🎓 1-to-1 lesson
                    </p>
                    <p className="text-white font-semibold text-sm leading-relaxed">{s.msg}</p>
                    <Link
                      href="/book"
                      className="text-sm font-bold px-4 py-2.5 rounded-xl text-white self-start"
                      style={{ background: TEAL }}
                    >
                      Book Now →
                    </Link>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── 7-day activity chart ─────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-extrabold text-white mb-4">This Week&apos;s Activity</h2>
          <Card className="px-6 py-6">
            {loading ? (
              <div className="flex gap-2 items-end" style={{ height: "112px" }}>
                {[0.45, 0.72, 0.3, 0.88, 0.55, 0.78, 0.6].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md animate-skeleton-pulse"
                    style={{ height: `${h * 80}px`, background: "rgba(255,255,255,0.07)" }}
                  />
                ))}
              </div>
            ) : (
              <ActivityChart byDay={activityByDay} />
            )}
          </Card>
        </section>

      </div>
    </main>
  );
}

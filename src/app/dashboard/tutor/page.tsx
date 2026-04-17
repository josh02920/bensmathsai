"use client";

import { useState, useEffect } from "react";

// ─── Types & mock data ────────────────────────────────────────────────────────

type Tier = "Basic" | "Pro" | "Exam";

interface Student {
  name: string;
  tier: Tier;
  weakTopics: string[];
  questionsThisWeek: number;
  lessonsThisWeek: number;
  lastActive: string;
}

const students: Student[] = [
  {
    name: "Alex Johnson",
    tier: "Pro",
    weakTopics: ["Quadratics", "Trigonometry"],
    questionsThisWeek: 34,
    lessonsThisWeek: 1,
    lastActive: "2026-04-15",
  },
  {
    name: "Sophie Williams",
    tier: "Exam",
    weakTopics: ["Simultaneous Equations", "Probability", "Statistics"],
    questionsThisWeek: 58,
    lessonsThisWeek: 1,
    lastActive: "2026-04-15",
  },
  {
    name: "Ethan Clarke",
    tier: "Basic",
    weakTopics: ["Fractions", "Percentages"],
    questionsThisWeek: 12,
    lessonsThisWeek: 0,
    lastActive: "2026-04-13",
  },
  {
    name: "Mia Patel",
    tier: "Pro",
    weakTopics: ["Trigonometry", "Pythagoras"],
    questionsThisWeek: 27,
    lessonsThisWeek: 0,
    lastActive: "2026-04-14",
  },
  {
    name: "Oliver Thompson",
    tier: "Exam",
    weakTopics: ["Quadratics", "Ratio"],
    questionsThisWeek: 41,
    lessonsThisWeek: 1,
    lastActive: "2026-04-15",
  },
  {
    name: "Isla Roberts",
    tier: "Basic",
    weakTopics: ["Algebra", "Fractions", "Percentages"],
    questionsThisWeek: 8,
    lessonsThisWeek: 0,
    lastActive: "2026-04-11",
  },
];

// ─── Revenue helpers ──────────────────────────────────────────────────────────

const tierPrice: Record<Tier, number> = {
  Basic: 5.99,
  Pro:   9.99,
  Exam:  14.99,
};

const LESSON_RATE = 70;

function fmt(amount: number) {
  return `£${amount.toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ─── Tier badge styles ────────────────────────────────────────────────────────

const tierStyles: Record<Tier, string> = {
  Basic: "bg-slate-100 text-slate-600",
  Pro:   "bg-teal/10 text-teal",
  Exam:  "bg-navy/10 text-navy",
};

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast {
  id: number;
  message: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
        {label}
      </p>
      <p className="text-2xl font-extrabold text-navy">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function StudentCard({
  student,
  onSendPrompt,
}: {
  student: Student;
  onSendPrompt: (name: string) => void;
}) {
  const hasLesson = student.lessonsThisWeek > 0;

  const daysSince = Math.round(
    (new Date("2026-04-15").getTime() - new Date(student.lastActive).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const lastActiveLabel =
    daysSince === 0
      ? "Active today"
      : daysSince === 1
      ? "Active yesterday"
      : `Active ${daysSince} days ago`;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-navy/10 flex items-center justify-center shrink-0">
            <span className="text-navy font-bold text-sm">
              {student.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm leading-tight">
              {student.name}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{lastActiveLabel}</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tierStyles[student.tier]}`}
        >
          {student.tier}
        </span>
      </div>

      {/* Weak topics */}
      {student.weakTopics.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {student.weakTopics.map((t) => (
            <span
              key={t}
              className="rounded-full bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-2 py-0.5"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-slate-400 font-medium">Questions</p>
          <p className="font-bold text-slate-700">{student.questionsThisWeek}</p>
        </div>
        <div className="w-px h-8 bg-slate-100" />
        <div className="flex flex-col gap-0.5">
          <p className="text-xs text-slate-400 font-medium">Lesson booked</p>
          <p className="font-bold text-base leading-none">
            {hasLesson ? (
              <span className="text-green-500">✓</span>
            ) : (
              <span className="text-red-400">✗</span>
            )}
          </p>
        </div>
      </div>

      {/* Send booking prompt */}
      {!hasLesson && (
        <button
          onClick={() => onSendPrompt(student.name)}
          className="mt-auto w-full rounded-xl border border-teal/30 bg-teal/5 px-4 py-2.5 text-teal text-xs font-semibold hover:bg-teal/10 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-1"
        >
          Send booking prompt
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TutorDashboardPage() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [nextId, setNextId] = useState(0);

  function addToast(message: string) {
    const id = nextId;
    setNextId((n) => n + 1);
    setToasts((prev) => [...prev, { id, message }]);
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  function handleSendPrompt(name: string) {
    addToast(`Booking prompt sent to ${name}`);
  }

  // Computed revenue
  const subscriptionRevenue = students.reduce(
    (sum, s) => sum + tierPrice[s.tier],
    0
  );
  const lessonsWithBooking = students.filter((s) => s.lessonsThisWeek > 0).length;
  const lessonRevenue = lessonsWithBooking * LESSON_RATE;
  const combinedTotal = subscriptionRevenue + lessonRevenue;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">

        {/* ── Header ── */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              Tutor dashboard
            </p>
            <h1 className="text-3xl font-extrabold tracking-tight text-navy">
              Overview
            </h1>
          </div>
          <p className="text-xs text-slate-400">Week of 14 Apr 2026</p>
        </div>

        {/* ── Summary stat cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total students"
            value={students.length}
            sub={`${lessonsWithBooking} with lesson this week`}
          />
          <StatCard
            label="Subscription MRR"
            value={fmt(subscriptionRevenue)}
            sub="Monthly recurring"
          />
          <StatCard
            label="Lesson revenue"
            value={fmt(lessonRevenue)}
            sub={`${lessonsWithBooking} × ${fmt(LESSON_RATE)}`}
          />
          <StatCard
            label="Combined total"
            value={fmt(combinedTotal)}
            sub="This week"
          />
        </div>

        {/* ── Student grid ── */}
        <div>
          <h2 className="text-lg font-semibold text-navy mb-4">
            Students
            <span className="ml-2 text-sm font-normal text-slate-400">
              {students.length} total
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {students.map((s) => (
              <StudentCard
                key={s.name}
                student={s}
                onSendPrompt={handleSendPrompt}
              />
            ))}
          </div>
        </div>

      </div>

      {/* ── Toast stack ── */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onDismiss={removeToast}
          />
        ))}
      </div>
    </main>
  );
}

// ─── Toast item (auto-dismisses after 3 s) ────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="flex items-center gap-3 rounded-xl bg-navy text-white text-sm font-medium px-5 py-3 shadow-lg animate-fade-in min-w-64">
      <span className="text-teal text-base">✓</span>
      {toast.message}
    </div>
  );
}

import Link from "next/link";
import { supabase, StudentSession } from "@/lib/supabase";

// ─── Static student profile (will come from auth later) ──────────────────────

const studentProfile = {
  studentName: "Anonymous",
  subscriptionTier: "Pro",
  lessonsThisWeek: 0,
};

// ─── Known topics (shown even when no attempts yet) ───────────────────────────

const ALL_TOPICS = [
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pct(correct: number, attempted: number): number {
  if (attempted === 0) return 0;
  return Math.round((correct / attempted) * 100);
}

function scoreBand(score: number, attempted: number): "green" | "amber" | "red" | "none" {
  if (attempted === 0) return "none";
  if (score > 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

const bandStyles = {
  green: {
    border: "border-green-400",
    badge: "bg-green-50 text-green-700",
    label: "Strong",
  },
  amber: {
    border: "border-amber-400",
    badge: "bg-amber-50 text-amber-700",
    label: "Improving",
  },
  red: {
    border: "border-red-400",
    badge: "bg-red-50 text-red-700",
    label: "Needs work",
  },
  none: {
    border: "border-slate-200",
    badge: "bg-slate-50 text-slate-400",
    label: "Not started",
  },
} as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-6 py-5 flex flex-col gap-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-navy">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function TopicCard({
  topicName,
  questionsAttempted,
  questionsCorrect,
}: {
  topicName: string;
  questionsAttempted: number;
  questionsCorrect: number;
}) {
  const score = pct(questionsCorrect, questionsAttempted);
  const band = scoreBand(score, questionsAttempted);
  const styles = bandStyles[band];

  return (
    <div className={`bg-white rounded-2xl border-2 ${styles.border} shadow-sm px-5 py-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800 leading-snug">{topicName}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${styles.badge}`}>
          {styles.label}
        </span>
      </div>

      <div>
        {questionsAttempted === 0 ? (
          <p className="text-sm text-slate-400 italic">No questions attempted yet</p>
        ) : (
          <>
            <p className="text-3xl font-extrabold text-navy">{score}%</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {questionsCorrect} / {questionsAttempted} correct
            </p>
          </>
        )}
      </div>

      {(band === "red" || band === "amber" || band === "none") && (
        <Link
          href="/learn"
          className="mt-auto text-xs font-semibold text-teal hover:underline"
        >
          Practise this topic →
        </Link>
      )}
    </div>
  );
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchTopicStats(studentName: string) {
  const { data, error } = await supabase
    .from("student_sessions")
    .select("topic, is_correct")
    .eq("student_name", studentName);

  if (error) {
    console.error("Supabase fetch error:", error.message);
    return [];
  }

  const sessions = (data ?? []) as Pick<StudentSession, "topic" | "is_correct">[];

  // Aggregate per topic
  const map = new Map<string, { attempted: number; correct: number }>();

  for (const session of sessions) {
    const existing = map.get(session.topic) ?? { attempted: 0, correct: 0 };
    map.set(session.topic, {
      attempted: existing.attempted + 1,
      correct: existing.correct + (session.is_correct ? 1 : 0),
    });
  }

  // Return all known topics, merging in real data where it exists
  return ALL_TOPICS.map((topic) => {
    const stats = map.get(topic) ?? { attempted: 0, correct: 0 };
    return {
      topicName: topic,
      questionsAttempted: stats.attempted,
      questionsCorrect: stats.correct,
    };
  });
}

// ─── Page (Server Component) ──────────────────────────────────────────────────

export default async function StudentDashboardPage() {
  const { studentName, subscriptionTier, lessonsThisWeek } = studentProfile;

  const topics = await fetchTopicStats(studentName);

  const totalAttempted = topics.reduce((sum, t) => sum + t.questionsAttempted, 0);
  const totalCorrect   = topics.reduce((sum, t) => sum + t.questionsCorrect,   0);
  const overallPct     = pct(totalCorrect, totalAttempted);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">

        {/* ── Greeting ── */}
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-navy">
            Good morning, {studentName}
          </h1>
          <p className="mt-1 text-slate-500 text-sm">Here&rsquo;s how you&rsquo;re getting on.</p>
        </div>

        {/* ── No-lesson banner ── */}
        {lessonsThisWeek === 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800 text-base">
                You have no lesson booked this week
              </p>
              <p className="text-amber-700 text-sm mt-0.5">
                Keep the momentum going — book your next session with Ben.
              </p>
            </div>
            <Link
              href="/book"
              className="shrink-0 inline-flex items-center justify-center rounded-xl bg-teal px-5 py-3 text-white text-sm font-semibold shadow-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Book a session with Ben
            </Link>
          </div>
        )}

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Questions attempted"
            value={totalAttempted}
            sub={totalAttempted === 0 ? "Start practising to see your stats" : undefined}
          />
          <StatCard
            label="Overall accuracy"
            value={totalAttempted === 0 ? "—" : `${overallPct}%`}
            sub={totalAttempted > 0 ? `${totalCorrect} correct of ${totalAttempted}` : undefined}
          />
          <StatCard label="Subscription" value={subscriptionTier} />
        </div>

        {/* ── Topic progress grid ── */}
        <div>
          <h2 className="text-lg font-semibold text-navy mb-4">
            Topic progress
            {totalAttempted > 0 && (
              <span className="ml-2 text-sm font-normal text-slate-400">
                {topics.filter((t) => t.questionsAttempted > 0).length} of {topics.length} topics attempted
              </span>
            )}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {topics.map((t) => (
              <TopicCard
                key={t.topicName}
                topicName={t.topicName}
                questionsAttempted={t.questionsAttempted}
                questionsCorrect={t.questionsCorrect}
              />
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}

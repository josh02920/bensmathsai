import { NextRequest } from "next/server";
import { questionBank } from "@/data/questions";

/** Returns the inclusive grade range for a given grade band. */
function gradeBand(grade: number): [number, number] {
  if (grade <= 3) return [1, 3];
  if (grade <= 6) return [4, 6];
  return [7, 9];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic");
  const grade = parseInt(searchParams.get("grade") ?? "0", 10);
  const count = Math.min(Math.max(parseInt(searchParams.get("count") ?? "5", 10), 1), 20);

  if (!topic) {
    return Response.json({ error: "topic is required" }, { status: 400 });
  }
  if (isNaN(grade) || grade < 1 || grade > 9) {
    return Response.json({ error: "grade must be 1–9" }, { status: 400 });
  }

  // Always filter by grade band so all 15 band questions are in the pool
  const [bandStart, bandEnd] = gradeBand(grade);
  const filtered = questionBank.filter(
    (q) => q.topic === topic && q.grade >= bandStart && q.grade <= bandEnd
  );

  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, count);

  if (picked.length === 0) {
    return Response.json({ error: "No questions found for this topic and grade" }, { status: 404 });
  }

  return Response.json(picked);
}

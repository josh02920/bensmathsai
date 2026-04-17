import { NextRequest } from "next/server";
import { questionBank } from "@/data/questions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic");
  const grade = parseInt(searchParams.get("grade") ?? "0", 10);

  if (!topic) {
    return Response.json({ error: "topic is required" }, { status: 400 });
  }
  if (isNaN(grade) || grade < 1 || grade > 9) {
    return Response.json({ error: "grade must be 1-9" }, { status: 400 });
  }

  const filtered = questionBank.filter(q => q.topic === topic && q.grade === grade);

  // Shuffle and take up to 5
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, 5);

  if (picked.length === 0) {
    return Response.json({ error: "No questions found for this topic and grade" }, { status: 404 });
  }

  return Response.json(picked);
}

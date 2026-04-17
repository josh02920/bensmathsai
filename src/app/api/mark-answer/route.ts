import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface MarkAnswerRequest {
  question: string;
  correctWorking: string;
  correctAnswer: string;
  studentWorking: string;
  topic: string;
  level: string;
}

interface MarkAnswerResponse {
  isCorrect: boolean;
  wrongStep: number | null;
  explanation: string;
  encouragement: string;
}

function numberedSteps(working: string): string {
  return working
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((line, i) => `Step ${i + 1}: ${line}`)
    .join("\n");
}

export async function POST(request: Request) {
  let body: MarkAnswerRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, correctWorking, correctAnswer, studentWorking, topic, level } = body;

  if (!question || typeof question !== "string") {
    return Response.json({ error: "question is required" }, { status: 400 });
  }
  if (!correctWorking || typeof correctWorking !== "string") {
    return Response.json({ error: "correctWorking is required" }, { status: 400 });
  }
  if (!correctAnswer || typeof correctAnswer !== "string") {
    return Response.json({ error: "correctAnswer is required" }, { status: 400 });
  }
  if (typeof studentWorking !== "string") {
    return Response.json({ error: "studentWorking is required" }, { status: 400 });
  }
  if (!topic || typeof topic !== "string") {
    return Response.json({ error: "topic is required" }, { status: 400 });
  }
  if (!level || typeof level !== "string") {
    return Response.json({ error: "level is required" }, { status: 400 });
  }

  const numberedCorrectWorking = numberedSteps(correctWorking);

  const prompt = `You are a supportive GCSE maths teacher marking a student's answer. The student is around 14 years old.

QUESTION:
${question}

CORRECT WORKING (numbered step by step):
${numberedCorrectWorking}

CORRECT FINAL ANSWER:
${correctAnswer}

STUDENT'S WORKING:
${studentWorking.trim() === "" ? "(the student left this blank)" : studentWorking}

Your marking task:
1. Compare the student's working against the correct working, step by step.
2. Decide whether the student reached the correct final answer.
3. If they used a different but mathematically valid method and reached the correct answer, mark it as CORRECT.
4. If they got it wrong, identify the lowest step number from the correct working where their approach first diverged from a valid method or where they made their first error.
5. Write your explanation and encouragement in warm, friendly language suitable for a 14-year-old GCSE student. Never be harsh or discouraging.

Respond with valid JSON only — no markdown, no code fences, no text outside the JSON object:
{
  "isCorrect": <true or false>,
  "wrongStep": <integer — the step number where they first went wrong, or null if isCorrect is true>,
  "explanation": "<if wrong: a clear, specific, friendly explanation of exactly what mistake was made at that step and what the correct approach should have been. If blank: gently explain they need to show their working. Keep it under 60 words.>",
  "encouragement": "<a short warm message of 1-2 sentences — celebrate if correct, gently motivate to try again if wrong>"
}`;

  try {
    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No text response from Claude" }, { status: 500 });
    }

    // Strip markdown code fences if Claude wraps the JSON
    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let parsed: MarkAnswerResponse;
    try {
      parsed = JSON.parse(raw) as MarkAnswerResponse;
    } catch {
      return Response.json(
        { error: "Failed to parse marking response as JSON" },
        { status: 500 }
      );
    }

    if (
      typeof parsed.isCorrect !== "boolean" ||
      typeof parsed.explanation !== "string" ||
      typeof parsed.encouragement !== "string"
    ) {
      return Response.json(
        { error: "Marking response was missing required fields" },
        { status: 500 }
      );
    }

    // Coerce wrongStep — must be null when correct, a positive integer when wrong
    if (parsed.isCorrect) {
      parsed.wrongStep = null;
    } else {
      parsed.wrongStep =
        typeof parsed.wrongStep === "number" && parsed.wrongStep > 0
          ? Math.round(parsed.wrongStep)
          : null;
    }

    // ── Persist session to Supabase (non-blocking — don't fail the request if this errors) ──
    supabase
      .from("student_sessions")
      .insert({
        student_name: "Anonymous",
        topic,
        level,
        is_correct: parsed.isCorrect,
        wrong_step: parsed.wrongStep,
        explanation: parsed.explanation,
      })
      .then(({ error }) => {
        if (error) {
          console.error("Supabase insert error:", error.message);
        }
      });

    return Response.json(parsed);
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "Rate limited — try again shortly" }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      return Response.json(
        { error: `Anthropic API error: ${error.message}` },
        { status: 502 }
      );
    }
    return Response.json({ error: "Unexpected server error" }, { status: 500 });
  }
}

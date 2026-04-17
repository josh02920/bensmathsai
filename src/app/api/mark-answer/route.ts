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

  const prompt = `QUESTION: ${question}

CORRECT WORKING:
${numberedCorrectWorking}

CORRECT ANSWER: ${correctAnswer}

STUDENT WORKING:
${studentWorking.trim() === "" ? "(blank)" : studentWorking}

Respond with JSON only:
{"isCorrect": true/false, "wrongStep": null or step number, "explanation": "under 50 words — friendly, specific", "encouragement": "under 20 words"}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system:
        "You are a GCSE maths marking assistant. Compare the student working to the correct working. Identify the first wrong step if any. Respond in JSON only with fields isCorrect, wrongStep, explanation under 50 words, encouragement under 20 words. Keep responses short and focused — do not add unnecessary text.",
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

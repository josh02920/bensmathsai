import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface LessonRequest {
  topic: string;
  grade: number;
}

interface ConceptCard {
  concept: string;
  explanation: string;
  example: {
    question: string;
    steps: string[];
  };
  watchOut: string;
}

interface LessonResponse {
  cards: ConceptCard[];
}

/** Returns a grade-band-specific content instruction for Claude. */
function gradeInstruction(grade: number): string {
  if (grade <= 3) {
    return `CONTENT LEVEL — FOUNDATION (Grade ${grade}): Use simple whole numbers only. Single-step problems. Basic everyday vocabulary with no complex notation. Explanations should be accessible to a student completely new to the topic. Avoid surds, negative indices, or algebraic manipulation beyond simple substitution.`;
  }
  if (grade <= 6) {
    return `CONTENT LEVEL — INTERMEDIATE (Grade ${grade}): Use decimals and negative numbers freely. Two-to-three-step problems. Introduce formal mathematical language and standard GCSE notation. Students have some prior knowledge — build on fundamentals rather than re-teaching them from scratch.`;
  }
  return `CONTENT LEVEL — HIGHER (Grade ${grade}): Use complex notation and algebra fluently. Multi-step problems that require combining multiple techniques. Exam-style question wording with precise mathematical language. Include both non-calculator and calculator scenarios where relevant. Content should prepare students for top GCSE grades (7–9).`;
}

export async function POST(request: Request) {
  let body: LessonRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topic, grade } = body;

  if (!topic || typeof topic !== "string" || topic.trim() === "") {
    return Response.json({ error: "topic must be a non-empty string" }, { status: 400 });
  }
  if (typeof grade !== "number" || !Number.isInteger(grade) || grade < 1 || grade > 9) {
    return Response.json({ error: "grade must be an integer between 1 and 9" }, { status: 400 });
  }

  const prompt = `You are creating an interactive GCSE maths lesson.

Topic: ${topic}
Grade: ${grade}
${gradeInstruction(grade)}

Generate exactly 3 concept cards that build progressively from most fundamental to most challenging for this topic at this grade.

Return ONLY a valid JSON object. No markdown. No code fences. No explanation outside the JSON:
{
  "cards": [
    {
      "concept": "Short concept name (5 words max)",
      "explanation": "2-3 sentence explanation. Use $...$ for any LaTeX maths.",
      "example": {
        "question": "A specific worked example question. Use $...$ for maths.",
        "steps": [
          "Step 1: description with $maths$ inline",
          "Step 2: ...",
          "Step 3: ..."
        ]
      },
      "watchOut": "The single most common mistake students make on this concept. 1-2 sentences."
    },
    { ... second card ... },
    { ... third card ... }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
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

    let parsed: LessonResponse;
    try {
      parsed = JSON.parse(raw) as LessonResponse;
    } catch {
      return Response.json(
        { error: "Failed to parse lesson response as JSON" },
        { status: 500 }
      );
    }

    if (!Array.isArray(parsed.cards) || parsed.cards.length < 1) {
      return Response.json(
        { error: "Lesson response did not contain a valid cards array" },
        { status: 500 }
      );
    }

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

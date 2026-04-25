import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface GenerateQuestionRequest {
  topic: string;
  grade: number;
  lessonNotes?: string;
}

interface GenerateQuestionResponse {
  question: string;
  answer: string;
  working: string;
  topic: string;
}

/** Returns a grade-band-specific content instruction for Claude. */
function gradeInstruction(grade: number): string {
  if (grade <= 3) {
    return "CONTENT LEVEL — FOUNDATION: Use simple whole numbers only. Single-step problem. Basic everyday vocabulary, no complex notation. Accessible to a student new to the topic.";
  }
  if (grade <= 6) {
    return "CONTENT LEVEL — INTERMEDIATE: Use decimals and negative numbers. Two-to-three-step problem. Formal mathematical language and standard GCSE notation.";
  }
  return "CONTENT LEVEL — HIGHER: Use complex notation and algebra fluently. Multi-step problem requiring multiple techniques. Exam-style question wording. May specify non-calculator or calculator context.";
}

export async function POST(request: Request) {
  let body: GenerateQuestionRequest;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { topic, grade, lessonNotes } = body;

  if (!topic || typeof topic !== "string") {
    return Response.json({ error: "topic is required and must be a string" }, { status: 400 });
  }

  if (typeof grade !== "number" || !Number.isInteger(grade) || grade < 1 || grade > 9) {
    return Response.json({ error: "grade must be an integer between 1 and 9" }, { status: 400 });
  }

  const tutorNotesSection =
    lessonNotes && lessonNotes.trim().length > 0
      ? `\nThe tutor has noted the following about this student's recent lesson: ${lessonNotes.trim()}\nPlease prioritise generating questions that address these specific areas of difficulty while staying within the chosen topic.\n`
      : "";

  const prompt = `Generate a single GCSE maths question for the topic "${topic}" at Grade ${grade}.
${gradeInstruction(grade)}
${tutorNotesSection}
Requirements:
- The question must be clearly solvable and have exactly one clean numerical or algebraic answer
- Difficulty must match Grade ${grade} precisely
- Format all mathematical expressions using LaTeX notation wrapped in dollar signs (e.g. $x^2 + 3x - 4 = 0$, $\\frac{3}{4}$)

Respond with valid JSON only, using exactly this structure:
{
  "question": "<the question text with LaTeX maths>",
  "answer": "<the final answer only, using LaTeX if needed>",
  "working": "<clear step-by-step solution with LaTeX for each maths expression>",
  "topic": "<the topic as provided>"
}

Do not include any text outside the JSON object.`;

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json(
        { error: "No text response from Claude" },
        { status: 500 }
      );
    }

    let parsed: GenerateQuestionResponse;
    try {
      parsed = JSON.parse(textBlock.text.trim()) as GenerateQuestionResponse;
    } catch {
      return Response.json(
        { error: "Failed to parse Claude response as JSON" },
        { status: 500 }
      );
    }

    if (!parsed.question || !parsed.answer || !parsed.working || !parsed.topic) {
      return Response.json(
        { error: "Claude response was missing required fields" },
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

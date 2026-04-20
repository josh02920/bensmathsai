import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VALID_TOPICS = new Set([
  "Algebra", "Fractions", "Percentages", "Pythagoras", "Quadratics",
  "Simultaneous Equations", "Trigonometry", "Ratio", "Probability", "Statistics",
  "Number", "Indices and Surds", "Geometry and Measures", "Vectors",
  "Sequences", "Inequalities", "Circle Theorems", "Transformations",
  "Constructions and Loci", "Data and Graphs",
]);

interface UploadedQuestionResponse {
  questionText: string;
  topic: string;
  grade: number;
  working: string;
  answer: string;
  tip: string;
}

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];

export async function POST(request: Request) {
  let body: { base64: string; mediaType: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { base64, mediaType } = body;

  if (!base64 || typeof base64 !== "string") {
    return Response.json({ error: "base64 image data is required" }, { status: 400 });
  }

  const supportedTypes = [...IMAGE_TYPES, "application/pdf"];
  if (!mediaType || !supportedTypes.includes(mediaType)) {
    return Response.json(
      { error: "Unsupported file type. Please upload a JPG, PNG, or PDF." },
      { status: 400 }
    );
  }

  const topicList = Array.from(VALID_TOPICS).join(", ");

  // Build the file content block — PDFs use the document type
  const fileBlock: Anthropic.MessageParam["content"][number] =
    mediaType === "application/pdf"
      ? {
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: base64 },
        }
      : {
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType as ImageMediaType,
            data: base64,
          },
        };

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1536,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: `You are an expert GCSE maths tutor. Look at the maths question in this file and do the following:

1. Read and transcribe the question exactly.
2. Solve it with a clear, numbered step-by-step worked solution. Put each step on its own line. Use LaTeX in dollar signs for all maths expressions.
3. Identify which GCSE topic it belongs to from this exact list: ${topicList}
4. Estimate the GCSE grade level from 1 (easiest) to 9 (hardest).
5. Write one sentence warning about the most common mistake students make on this type of question.

Respond with valid JSON only, no markdown, no code fences:
{
  "questionText": "the question as written, with $LaTeX$ for maths",
  "topic": "one topic from the list above, exact spelling",
  "grade": <integer 1-9>,
  "working": "Step 1: ...\nStep 2: ...\nStep 3: ...",
  "answer": "the final answer with $LaTeX$",
  "tip": "one sentence about the most common mistake"
}`,
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return Response.json({ error: "No text response from Claude" }, { status: 500 });
    }

    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let parsed: UploadedQuestionResponse;
    try {
      parsed = JSON.parse(raw) as UploadedQuestionResponse;
    } catch {
      return Response.json(
        { error: "Failed to parse response as JSON" },
        { status: 500 }
      );
    }

    if (
      !parsed.questionText || !parsed.topic || !parsed.working ||
      !parsed.answer || !parsed.tip ||
      typeof parsed.grade !== "number"
    ) {
      return Response.json(
        { error: "Response was missing required fields" },
        { status: 500 }
      );
    }

    // Normalise topic
    if (!VALID_TOPICS.has(parsed.topic)) {
      parsed.topic = "Algebra";
    }

    // Clamp grade
    parsed.grade = Math.min(9, Math.max(1, Math.round(parsed.grade)));

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

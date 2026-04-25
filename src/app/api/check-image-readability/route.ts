import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type ImageMediaType = (typeof IMAGE_TYPES)[number];

export async function POST(request: Request) {
  let body: { base64: string; mediaType: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ canRead: false, reason: "Invalid request body." }, { status: 400 });
  }

  const { base64, mediaType } = body;

  if (!base64 || !mediaType) {
    return Response.json({ canRead: false, reason: "Missing base64 or mediaType." }, { status: 400 });
  }

  // Build the file block — same pattern as solve-uploaded-question
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
            media_type: (IMAGE_TYPES.includes(mediaType as ImageMediaType)
              ? mediaType
              : "image/jpeg") as ImageMediaType,
            data: base64,
          },
        };

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 128,
      messages: [
        {
          role: "user",
          content: [
            fileBlock,
            {
              type: "text",
              text: 'Can you clearly read a maths question in this image? Reply with JSON only containing two fields: "canRead" as a boolean and "reason" as a one sentence explanation. No markdown, no code fences, just the JSON object.',
            },
          ],
        },
      ],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      // Fail open — if we can't parse a check response, proceed to solve
      return Response.json({ canRead: true, reason: "Quality check inconclusive." });
    }

    let raw = textBlock.text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    }

    let parsed: { canRead: boolean; reason: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Fail open
      return Response.json({ canRead: true, reason: "Quality check inconclusive." });
    }

    return Response.json({
      canRead: Boolean(parsed.canRead),
      reason: typeof parsed.reason === "string" ? parsed.reason : "",
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "Invalid API key" }, { status: 401 });
    }
    // Fail open for all other errors so a transient API blip doesn't block the student
    return Response.json({ canRead: true, reason: "Quality check skipped." });
  }
}

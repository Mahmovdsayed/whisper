import { Hono } from "hono";
import { z } from "zod";
import { generateObject } from "ai";
import { serveStatic } from "hono/bun";

const app = new Hono();

app.get("/", serveStatic({ path: "./public/index.html" }));
app.use("/*", serveStatic({ root: "./public" }));

const RequestSchema = z.object({
  transcript: z.string().min(1).max(10000),
  audio_emotions: z.array(
    z.object({ 
      label: z.string(),
      score: z.number(),
    }),
  ),
  primary_emotion: z.object({
    label: z.string(),
    score: z.number(),
  }),
});

const ResponseSchema = z.object({
  is_real_conversation: z.boolean(),
  conversation_quality: z.enum(["poor", "medium", "good", "excellent"]),
  summary: z.string(),
  topics: z.array(z.string()),
  sentiment: z.enum(["positive", "negative", "neutral", "mixed"]),
  emotions: z.array(
    z.object({
      label: z.string(),
      intensity: z.number().min(0).max(1),
    }),
  ),
  emotion_flow: z.array(
    z.object({
      stage: z.string(),
      dominant_emotion: z.string(),
      intensity: z.number(),
    }),
  ),
  keywords: z.array(z.string()),
  resolution_status: z.enum([
    "resolved",
    "unresolved",
    "partially_resolved",
    "not_applicable",
  ]),
  outcome_reason: z.string(),
  speaker_insight: z.object({
    dominant_tone: z.string(),
    engagement_level: z.number().min(0).max(1),
    frustration_level: z.number().min(0).max(1),
    confidence_level: z.number().min(0).max(1),
  }),
  interaction_quality: z.object({
    responsiveness: z.number().min(0).max(1),
    clarity: z.number().min(0).max(1),
    conflict_level: z.number().min(0).max(1),
  }),
  risk_flags: z.array(z.string()).optional(),
});

const generateAnalysis = async (
  transcript: string,
  audio_emotions: any,
  primary_emotion: any
) => {
  return await generateObject({
    model: "google/gemini-2.5-flash-lite",
    schema: ResponseSchema,
    prompt: `
You are an advanced CALL INTELLIGENCE ENGINE.

You analyze real conversations only.

If the transcript is NOT a real interaction (monologue, random sentences, or no exchange), set:
- is_real_conversation = false
- conversation_quality = "poor"
- resolution_status = "not_applicable"

----------------------------

TRANSCRIPT:
${transcript}

AUDIO EMOTION SIGNALS:
${JSON.stringify(audio_emotions)}

PRIMARY EMOTION:
${JSON.stringify(primary_emotion)}

----------------------------

ANALYSIS REQUIREMENTS:

1. Detect if this is a real conversation or not
2. Summarize the interaction accurately
3. Extract topics and intent
4. Compute sentiment (global + contextual)
5. Detect emotions AND their progression over time:
   - beginning
   - middle
   - end
6. Evaluate interaction quality:
   - responsiveness
   - clarity
   - conflict level
7. Determine if a problem exists and if it was resolved
8. Provide speaker psychological insights:
   - tone
   - engagement
   - frustration
   - confidence
9. Identify risk signals:
   - escalation
   - anger
   - misunderstanding
   - urgency

----------------------------

RULES:
- Be strict and realistic
- Do not assume resolution if no dialogue exists
- Merge audio + text signals intelligently
- Output structured JSON only
`,
  });
};

app.post("/upload", async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body["audio"];

    if (!file || !(file instanceof File)) {
      return c.json({ error: "No audio file provided" }, 400);
    }

    const formData = new FormData();
    formData.append("file", file);

    const pyRes = await fetch("http://localhost:8000/process-audio", {
      method: "POST",
      body: formData,
    });

    if (!pyRes.ok) {
      const errorText = await pyRes.text();
      throw new Error(`Python server error: ${pyRes.status} - ${errorText}`);
    }

    const pyData = await pyRes.json();
    const { transcript, audio_emotions, primary_emotion } = pyData as any;

    const aiResult = await generateAnalysis(
      transcript,
      audio_emotions,
      primary_emotion
    );

    return c.json({
      transcript,
      audio_emotions,
      primary_emotion,
      analysis: aiResult.object,
    });
  } catch (err: any) {
    console.error("Processing error:", err);
    return c.json({ error: "Processing failed", details: err.message }, 500);
  }
});

export default app;

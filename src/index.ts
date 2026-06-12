import { Hono } from "hono";
import { z } from "zod";
import { generateObject } from "ai";
import { serveStatic } from "hono/bun";
import {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAllReports,
  getReportById,
  createReport,
  type Agent,
} from "./db";
import { findBestAgent } from "./router";

const app = new Hono();

app.get("/", serveStatic({ path: "./public/index.html" }));
app.get("/admin", serveStatic({ path: "./public/admin.html" }));

const ResponseSchema = z.object({
  is_real_conversation: z.boolean().describe(
    "True if this is a genuine voice message with an actual complaint or request. False if it is noise, silence, or completely irrelevant."
  ),
  conversation_quality: z.enum(["poor", "medium", "good", "excellent"]).describe(
    "Quality of the voice message itself: excellent = very clear, detailed, easy to understand; good = clear and understandable; medium = mostly understandable but missing details; poor = unclear, inaudible, or too vague"
  ),
  summary: z.string().describe("Summary of the customer's complaint or request in English"),
  summary_ar: z.string().describe("Summary of the customer's complaint or request in Arabic"),
  topics: z.array(z.string()).describe("Main topics/issues raised by the customer in English"),
  topics_ar: z.array(z.string()).describe("Main topics/issues raised by the customer in Arabic"),
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
  ]).describe("Whether the customer's problem was already resolved before sending this message, or is still open"),
  outcome_reason: z.string().describe("Why you determined that resolution status — in English"),
  outcome_reason_ar: z.string().describe("Why you determined that resolution status — in Arabic"),
  speaker_insight: z.object({
    dominant_tone: z.string().describe("The customer's dominant vocal tone"),
    engagement_level: z.number().min(0).max(1).describe("How seriously/actively engaged the customer sounds (0=very passive, 1=very engaged)"),
    frustration_level: z.number().min(0).max(1).describe("How frustrated or upset the customer sounds (0=calm, 1=very frustrated)"),
    confidence_level: z.number().min(0).max(1).describe("How confident or assertive the customer sounds (0=very timid, 1=very assertive)"),
  }),
  interaction_quality: z.object({
    responsiveness: z.number().min(0).max(1).describe(
      "How clearly and thoroughly the customer explained their problem (0=very vague, 1=very detailed and clear)"
    ),
    clarity: z.number().min(0).max(1).describe(
      "How clear and easy to understand the speech/audio is (0=very unclear, 1=crystal clear)"
    ),
    conflict_level: z.number().min(0).max(1).describe(
      "How urgent or pressing the customer's issue sounds (0=not urgent at all, 1=extremely urgent/emergency)"
    ),
  }),
  risk_flags: z.array(z.string()).optional(),
  refined_transcript: z
    .string()
    .describe(
      "A polished, grammatically corrected version of the voice message transcript. Keep the original language (Arabic/English) and meaning, but fix errors, fill in unclear words, and make it readable.",
    ),
});

const generateAnalysis = async (
  transcript: string,
  audio_emotions: any,
  primary_emotion: any,
) => {
  return await generateObject({
    model: "google/gemini-2.5-flash-lite",
    schema: ResponseSchema,
    prompt: `
You are a VOICE MESSAGE INTELLIGENCE ENGINE for a customer support platform.

You are analyzing a VOICE MESSAGE sent by a SINGLE CUSTOMER who has a complaint, problem, or request.
This is NOT a two-way conversation. It is a one-person voice note — like a WhatsApp voice message.
The customer recorded this to explain their issue to the support team.

If the audio is NOT a real complaint/request (silent, noise, irrelevant content), set:
- is_real_conversation = false
- conversation_quality = "poor"
- resolution_status = "not_applicable"

----------------------------

VOICE MESSAGE TRANSCRIPT:
${transcript}

AUDIO EMOTION SIGNALS:
${JSON.stringify(audio_emotions)}

PRIMARY EMOTION:
${JSON.stringify(primary_emotion)}

----------------------------

ANALYSIS REQUIREMENTS:

1. Is this a real voice message with an actual complaint or request?

2. Evaluate the voice message quality:
   - excellent: very clear audio, well-explained, detailed, easy to act on
   - good: clear and understandable
   - medium: understandable but vague or missing details
   - poor: unclear, inaudible, very vague, or no useful information

3. Summarize the customer's COMPLAINT/REQUEST in both English and Arabic

4. Extract the main topics/issues raised — in both English and Arabic

5. Detect the customer's overall sentiment

6. Detect the customer's emotions and how they change through the message:
   - beginning (how they started)
   - middle (how they developed)
   - end (how they concluded)

7. Determine if the issue was already resolved, or still open:
   - resolved: customer says their problem was fixed
   - unresolved: customer still has an open problem
   - partially_resolved: problem partially addressed
   - not_applicable: no clear problem stated

8. Provide outcome_reason in both English and Arabic explaining your resolution assessment

9. Analyze the customer's psychological state:
   - dominant_tone: how they sound overall (e.g. "frustrated", "calm", "urgent", "desperate")
   - engagement_level: how seriously/actively they're explaining (0 = very passive, 1 = very engaged)
   - frustration_level: how upset or frustrated they sound (0 = calm, 1 = very frustrated)
   - confidence_level: how assertive or confident they sound (0 = timid, 1 = very assertive)

10. Evaluate the voice message communication quality:
    - responsiveness (= HOW CLEARLY they explained their problem, 0 = very vague, 1 = extremely detailed)
    - clarity (= HOW CLEAR the audio/speech is to understand, 0 = very unclear, 1 = crystal clear)
    - conflict_level (= HOW URGENT the issue sounds, 0 = no urgency, 1 = extremely urgent/emergency)

11. Identify risk signals:
    - extreme anger
    - threats or escalation
    - urgency / time-sensitive
    - legal or financial risk

12. Refine the transcript:
    - Fix spelling errors, phonetic typos, grammar issues
    - Fill in unclear words based on context
    - Preserve the original language and meaning
    - Make it readable and professional

----------------------------

RULES:
- This is a SINGLE SPEAKER voice message, not a dialogue
- Be realistic about what you can infer from the customer's words
- Do not invent resolutions or positive outcomes not present in the message
- Merge audio emotion signals with the text content intelligently
- Output structured JSON only
- For ALL Arabic fields: write in clear, professional Egyptian business Arabic — direct, warm, and easy to read. Avoid heavy classical/MSA constructions. Think of how a professional Egyptian bank or telecom writes: correct grammar, but natural and human.
`,
  });
};

const AgentRoutingSchema = z.object({
  assigned_agent_id: z.number().nullable().describe(
    "The ID of the best-matched agent, or null if no suitable agent found"
  ),
  match_score: z.number().min(0).max(1).describe(
    "Confidence score 0-1 for how well the agent matches this case"
  ),
  routing_reason_en: z.string().describe(
    "Short explanation in English of WHY this agent was chosen (1-2 sentences)"
  ),
  routing_reason_ar: z.string().describe(
    "Short explanation in Arabic of WHY this agent was chosen (1-2 sentences)"
  ),
});

async function routeToAgentWithAI(
  agents: Agent[],
  analysis: z.infer<typeof ResponseSchema>,
  refinedTranscript: string,
): Promise<{
  agent: Agent | null;
  score: number;
  routing_reason_en: string;
  routing_reason_ar: string;
}> {
  if (agents.length === 0) {
    return {
      agent: null,
      score: 0,
      routing_reason_en: "No agents are configured in the system.",
      routing_reason_ar: "لا يوجد وكلاء مضافين في النظام حتى الآن.",
    };
  }

  const agentList = agents.map((a) => {
    let topics: string[] = [];
    try { topics = JSON.parse(a.topics); } catch {}
    return {
      id: a.id,
      name: a.name,
      specialization_en: a.specialization_en,
      specialization_ar: a.specialization_ar ?? "",
      topics,
    };
  });

  try {
    const result = await generateObject({
      model: "google/gemini-2.5-flash-lite",
      schema: AgentRoutingSchema,
      prompt: `
You are a smart customer support routing engine.

Your job is to read a customer conversation analysis and assign it to the MOST SUITABLE support agent from the list below.

You must understand the SEMANTIC MEANING of the customer's problem — not just match keywords.
Think about the actual nature of the issue: is it billing? technical? account access? complaints?

---

CONVERSATION ANALYSIS:
- Topics (EN): ${analysis.topics.join(", ")}
- Topics (AR): ${analysis.topics_ar.join(", ")}
- Keywords: ${analysis.keywords.join(", ")}
- Sentiment: ${analysis.sentiment}
- Primary Emotion: ${JSON.stringify(analysis.emotions?.[0])}
- Resolution Status: ${analysis.resolution_status}
- Summary (EN): ${analysis.summary}
- Summary (AR): ${analysis.summary_ar}

TRANSCRIPT EXCERPT (first 800 chars):
${refinedTranscript.slice(0, 800)}

---

AVAILABLE AGENTS:
${agentList.map((a) =>
  `Agent ID ${a.id}: ${a.name}
  Specialization: ${a.specialization_en} | ${a.specialization_ar}
  Topics: ${a.topics.join(", ")}`
).join("\n\n")}

---

INSTRUCTIONS:
1. Read the customer's ACTUAL PROBLEM from the transcript and analysis
2. Match it SEMANTICALLY to the most appropriate agent — don't just look for keyword overlaps
3. If no agent is clearly suitable, set assigned_agent_id to null
4. Give a match_score between 0 and 1 (how confident you are in this routing)
5. Write a brief routing_reason in BOTH English and Arabic explaining why this agent was chosen
6. The routing reason should help the agent understand what they're getting
7. For the Arabic routing_reason: write in professional Egyptian business Arabic — clear, direct, and human. Not robotic MSA. Example style: "العميل عنده مشكلة في الفاتورة، والوكيل ده متخصص في مشاكل الدفع."

Output structured JSON only.
`,
    });

    const routing = result.object;
    const matchedAgent = agents.find((a) => a.id === routing.assigned_agent_id) ?? null;

    return {
      agent: matchedAgent,
      score: routing.match_score,
      routing_reason_en: routing.routing_reason_en,
      routing_reason_ar: routing.routing_reason_ar,
    };
  } catch (err) {
    console.error("AI routing failed, falling back to keyword router:", err);
    const fallback = findBestAgent(
      agents,
      analysis.topics ?? [],
      analysis.topics_ar ?? [],
      analysis.keywords ?? [],
    );
    return {
      agent: fallback?.agent ?? null,
      score: fallback?.score ?? 0,
      routing_reason_en: "Routed based on keyword matching (AI routing unavailable).",
      routing_reason_ar: "تم التوجيه بمطابقة الكلمات المفتاحية — التوجيه الذكي مش شغال دلوقتي.",
    };
  }
}

function escapeCsv(value: any): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function pctLabel(val: number | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `${Math.round(val * 100)}%`;
}

function qualityLabel(val: string | null | undefined): string {
  const map: Record<string, string> = {
    excellent: "Excellent ممتاز",
    good: "Good جيد",
    medium: "Medium متوسط",
    poor: "Poor ضعيف",
  };
  return val ? (map[val] ?? val) : "—";
}

function sentimentLabel(val: string | null | undefined): string {
  const map: Record<string, string> = {
    positive: "Positive إيجابي",
    negative: "Negative سلبي",
    neutral: "Neutral محايد",
    mixed: "Mixed مختلط",
  };
  return val ? (map[val] ?? val) : "—";
}

function resolutionLabel(val: string | null | undefined): string {
  const map: Record<string, string> = {
    resolved: "Resolved ✓ محلول",
    unresolved: "Unresolved ✗ غير محلول",
    partially_resolved: "Partially Resolved ~ محلول جزئيًا",
    not_applicable: "N/A لا ينطبق",
  };
  return val ? (map[val] ?? val) : "—";
}

function emotionLabel(val: string | null | undefined): string {
  const map: Record<string, string> = {
    hap: "Happy سعيد", happy: "Happy سعيد",
    ang: "Angry غاضب", angry: "Angry غاضب",
    sad: "Sad حزين",
    neu: "Neutral محايد", neutral: "Neutral محايد",
    fea: "Fearful خائف", fear: "Fearful خائف",
    dis: "Disgusted مشمئز", disgust: "Disgusted مشمئز",
    sur: "Surprised متفاجئ",
  };
  return val ? (map[val.toLowerCase()] ?? val) : "—";
}

function formatDateReadable(dt: string | null | undefined): string {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function reportsToCSV(reports: any[]): string {
  const headers = [
    "Report ID",
    "Filename",
    "Date & Time",
    "Sentiment (EN/AR)",
    "Primary Emotion (EN/AR)",
    "Emotion Score",
    "Conversation Quality (EN/AR)",
    "Resolution Status (EN/AR)",
    "Engagement",
    "Frustration",
    "Confidence",
    "Clarity",
    "Conflict Level",
    "Responsiveness",
    "Assigned Agent",
    "Agent Match Score",
    "Routing Reason (EN)",
    "Routing Reason (AR)",
    "Topics (EN)",
    "Topics (AR)",
    "Keywords",
    "Risk Flags",
    "Summary (EN)",
    "Summary (AR)",
    "Outcome / Resolution (EN)",
    "Outcome / Resolution (AR)",
    "Refined Transcript",
  ];

  const rows = reports.map((r) => [
    `#${r.id}`,
    r.filename || "Untitled",
    formatDateReadable(r.created_at),
    sentimentLabel(r.sentiment),
    emotionLabel(r.primary_emotion),
    pctLabel(r.primary_emotion_score),
    qualityLabel(r.conversation_quality),
    resolutionLabel(r.resolution_status),
    pctLabel(r.engagement_level),
    pctLabel(r.frustration_level),
    pctLabel(r.confidence_level),
    pctLabel(r.clarity),
    pctLabel(r.conflict_level),
    pctLabel(r.responsiveness),
    r.assigned_agent_name || "Unassigned — غير معيَّن",
    r.match_score ? pctLabel(r.match_score) : "—",
    r.routing_reason_en || "—",
    r.routing_reason_ar || "—",
    r.topics_en ? JSON.parse(r.topics_en).join(" | ") : "—",
    r.topics_ar ? JSON.parse(r.topics_ar).join(" | ") : "—",
    r.keywords ? JSON.parse(r.keywords).join(", ") : "—",
    r.risk_flags ? JSON.parse(r.risk_flags).join(", ") : "None",
    r.summary_en || "—",
    r.summary_ar || "—",
    r.outcome_reason_en || "—",
    r.outcome_reason_ar || "—",
    r.refined_transcript || r.raw_transcript || "—",
  ].map(escapeCsv).join(","));

  return [headers.join(","), ...rows].join("\n");
}

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
      primary_emotion,
    );

    const analysis = aiResult.object;

    const agents = getAllAgents();
    const routingResult = await routeToAgentWithAI(agents, analysis, analysis.refined_transcript || transcript);

    const assigned_agent_id = routingResult.agent?.id ?? null;
    const assigned_agent_name = routingResult.agent?.name ?? null;
    const match_score = routingResult.score > 0 ? routingResult.score : null;
    const routing_reason_en = routingResult.routing_reason_en;
    const routing_reason_ar = routingResult.routing_reason_ar;

    const { id: reportId } = createReport({
      filename: file.name,
      raw_transcript: transcript,
      refined_transcript: analysis.refined_transcript,
      summary_en: analysis.summary,
      summary_ar: analysis.summary_ar,
      outcome_reason_en: analysis.outcome_reason,
      outcome_reason_ar: analysis.outcome_reason_ar,
      sentiment: analysis.sentiment,
      primary_emotion: primary_emotion?.label ?? null,
      primary_emotion_score: primary_emotion?.score ?? null,
      conversation_quality: analysis.conversation_quality,
      resolution_status: analysis.resolution_status,
      topics_en: analysis.topics,
      topics_ar: analysis.topics_ar,
      keywords: analysis.keywords,
      risk_flags: analysis.risk_flags ?? [],
      engagement_level: analysis.speaker_insight.engagement_level,
      frustration_level: analysis.speaker_insight.frustration_level,
      confidence_level: analysis.speaker_insight.confidence_level,
      clarity: analysis.interaction_quality.clarity,
      conflict_level: analysis.interaction_quality.conflict_level,
      responsiveness: analysis.interaction_quality.responsiveness,
      assigned_agent_id,
      assigned_agent_name,
      match_score,
      routing_reason_en,
      routing_reason_ar,
    });

    return c.json({
      report_id: reportId,
      transcript: analysis.refined_transcript || transcript,
      raw_transcript: transcript,
      audio_emotions,
      primary_emotion,
      assigned_agent: routingResult.agent
        ? {
            id: routingResult.agent.id,
            name: routingResult.agent.name,
            email: routingResult.agent.email,
            specialization_en: routingResult.agent.specialization_en,
            specialization_ar: routingResult.agent.specialization_ar,
            match_score: routingResult.score,
          }
        : null,
      routing_reason_en,
      routing_reason_ar,
      analysis,
    });
  } catch (err: any) {
    console.error("Processing error:", err);
    return c.json({ error: "Processing failed", details: err.message }, 500);
  }
});

app.get("/reports", (c) => {
  const reports = getAllReports();
  return c.json(reports);
});

app.get("/reports/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const report = getReportById(id);
  if (!report) return c.json({ error: "Not found" }, 404);
  return c.json(report);
});

app.get("/reports/export/csv", (c) => {
  const reports = getAllReports();
  const csv = reportsToCSV(reports);
  const dateStr = new Date().toISOString().split("T")[0];
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="vocalize-reports-${dateStr}.csv"`,
    },
  });
});

app.get("/agents", (c) => {
  return c.json(getAllAgents());
});

app.get("/agents/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const agent = getAgentById(id);
  if (!agent) return c.json({ error: "Not found" }, 404);
  return c.json(agent);
});

app.post("/agents", async (c) => {
  try {
    const body = await c.req.json();
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      specialization_en: z.string().min(1),
      specialization_ar: z.string().optional(),
      topics: z.array(z.string()).min(1),
    });
    const data = schema.parse(body);
    const agent = createAgent(data);
    return c.json(agent, 201);
  } catch (err: any) {
    return c.json({ error: "Invalid data", details: err.message }, 400);
  }
});

app.put("/agents/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    const existing = getAgentById(id);
    if (!existing) return c.json({ error: "Not found" }, 404);

    const body = await c.req.json();
    const schema = z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      specialization_en: z.string().min(1),
      specialization_ar: z.string().optional(),
      topics: z.array(z.string()).min(1),
    });
    const data = schema.parse(body);
    updateAgent(id, data);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: "Invalid data", details: err.message }, 400);
  }
});

app.delete("/agents/:id", (c) => {
  const id = parseInt(c.req.param("id"));
  const existing = getAgentById(id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  deleteAgent(id);
  return c.json({ success: true });
});

app.use("/*", serveStatic({ root: "./public" }));

export default app;

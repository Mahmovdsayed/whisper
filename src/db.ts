import { Database } from "bun:sqlite";
import path from "path";

const DB_PATH = path.resolve(import.meta.dir, "../vocalize.db");

export const db = new Database(DB_PATH, { create: true });

db.run("PRAGMA journal_mode = WAL;");
db.run("PRAGMA foreign_keys = ON;");

db.run(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    specialization_en TEXT NOT NULL,
    specialization_ar TEXT,
    topics TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    raw_transcript TEXT,
    refined_transcript TEXT,
    summary_en TEXT,
    summary_ar TEXT,
    outcome_reason_en TEXT,
    outcome_reason_ar TEXT,
    sentiment TEXT,
    primary_emotion TEXT,
    primary_emotion_score REAL,
    conversation_quality TEXT,
    resolution_status TEXT,
    topics_en TEXT,
    topics_ar TEXT,
    keywords TEXT,
    risk_flags TEXT,
    engagement_level REAL,
    frustration_level REAL,
    confidence_level REAL,
    clarity REAL,
    conflict_level REAL,
    responsiveness REAL,
    assigned_agent_id INTEGER REFERENCES agents(id) ON DELETE SET NULL,
    assigned_agent_name TEXT,
    match_score REAL,
    routing_reason_en TEXT,
    routing_reason_ar TEXT
  )
`);

try { db.run("ALTER TABLE reports ADD COLUMN routing_reason_en TEXT"); } catch {}
try { db.run("ALTER TABLE reports ADD COLUMN routing_reason_ar TEXT"); } catch {}

export interface Agent {
  id: number;
  name: string;
  email: string | null;
  specialization_en: string;
  specialization_ar: string | null;
  topics: string;
  created_at: string;
}

export interface Report {
  id: number;
  filename: string | null;
  created_at: string;
  raw_transcript: string | null;
  refined_transcript: string | null;
  summary_en: string | null;
  summary_ar: string | null;
  outcome_reason_en: string | null;
  outcome_reason_ar: string | null;
  sentiment: string | null;
  primary_emotion: string | null;
  primary_emotion_score: number | null;
  conversation_quality: string | null;
  resolution_status: string | null;
  topics_en: string | null;
  topics_ar: string | null;
  keywords: string | null;
  risk_flags: string | null;
  engagement_level: number | null;
  frustration_level: number | null;
  confidence_level: number | null;
  clarity: number | null;
  conflict_level: number | null;
  responsiveness: number | null;
  assigned_agent_id: number | null;
  assigned_agent_name: string | null;
  match_score: number | null;
  routing_reason_en: string | null;
  routing_reason_ar: string | null;
}

const stmtGetAllAgents = db.prepare<Agent, []>(
  `SELECT * FROM agents ORDER BY created_at DESC`,
);
export const getAllAgents = () => stmtGetAllAgents.all();

const stmtGetAgentById = db.prepare<Agent, [number]>(
  `SELECT * FROM agents WHERE id = ?`,
);
export const getAgentById = (id: number) => stmtGetAgentById.get(id);

const stmtCreateAgent = db.prepare(`
  INSERT INTO agents (name, email, specialization_en, specialization_ar, topics)
  VALUES ($name, $email, $specialization_en, $specialization_ar, $topics)
`);
export const createAgent = (data: {
  name: string;
  email?: string;
  specialization_en: string;
  specialization_ar?: string;
  topics: string[];
}) => {
  const result = stmtCreateAgent.run({
    $name: data.name,
    $email: data.email ?? null,
    $specialization_en: data.specialization_en,
    $specialization_ar: data.specialization_ar ?? null,
    $topics: JSON.stringify(data.topics),
  });
  return { id: result.lastInsertRowid, ...data };
};

const stmtUpdateAgent = db.prepare(`
  UPDATE agents SET name=$name, email=$email, specialization_en=$specialization_en,
  specialization_ar=$specialization_ar, topics=$topics WHERE id=$id
`);
export const updateAgent = (
  id: number,
  data: {
    name: string;
    email?: string;
    specialization_en: string;
    specialization_ar?: string;
    topics: string[];
  },
) => {
  stmtUpdateAgent.run({
    $id: id,
    $name: data.name,
    $email: data.email ?? null,
    $specialization_en: data.specialization_en,
    $specialization_ar: data.specialization_ar ?? null,
    $topics: JSON.stringify(data.topics),
  });
};

const stmtDeleteAgent = db.prepare(`DELETE FROM agents WHERE id = ?`);
export const deleteAgent = (id: number) => stmtDeleteAgent.run(id);

const stmtGetAllReports = db.prepare<Report, []>(
  `SELECT * FROM reports ORDER BY created_at DESC`,
);
export const getAllReports = () => stmtGetAllReports.all();

const stmtGetReportById = db.prepare<Report, [number]>(
  `SELECT * FROM reports WHERE id = ?`,
);
export const getReportById = (id: number) => stmtGetReportById.get(id);

const stmtCreateReport = db.prepare(`
  INSERT INTO reports (
    filename, raw_transcript, refined_transcript,
    summary_en, summary_ar, outcome_reason_en, outcome_reason_ar,
    sentiment, primary_emotion, primary_emotion_score,
    conversation_quality, resolution_status,
    topics_en, topics_ar, keywords, risk_flags,
    engagement_level, frustration_level, confidence_level,
    clarity, conflict_level, responsiveness,
    assigned_agent_id, assigned_agent_name, match_score,
    routing_reason_en, routing_reason_ar
  ) VALUES (
    $filename, $raw_transcript, $refined_transcript,
    $summary_en, $summary_ar, $outcome_reason_en, $outcome_reason_ar,
    $sentiment, $primary_emotion, $primary_emotion_score,
    $conversation_quality, $resolution_status,
    $topics_en, $topics_ar, $keywords, $risk_flags,
    $engagement_level, $frustration_level, $confidence_level,
    $clarity, $conflict_level, $responsiveness,
    $assigned_agent_id, $assigned_agent_name, $match_score,
    $routing_reason_en, $routing_reason_ar
  )
`);

export const createReport = (data: {
  filename?: string;
  raw_transcript?: string;
  refined_transcript?: string;
  summary_en?: string;
  summary_ar?: string;
  outcome_reason_en?: string;
  outcome_reason_ar?: string;
  sentiment?: string;
  primary_emotion?: string;
  primary_emotion_score?: number;
  conversation_quality?: string;
  resolution_status?: string;
  topics_en?: string[];
  topics_ar?: string[];
  keywords?: string[];
  risk_flags?: string[];
  engagement_level?: number;
  frustration_level?: number;
  confidence_level?: number;
  clarity?: number;
  conflict_level?: number;
  responsiveness?: number;
  assigned_agent_id?: number | null;
  assigned_agent_name?: string | null;
  match_score?: number | null;
  routing_reason_en?: string | null;
  routing_reason_ar?: string | null;
}) => {
  const result = stmtCreateReport.run({
    $filename: data.filename ?? null,
    $raw_transcript: data.raw_transcript ?? null,
    $refined_transcript: data.refined_transcript ?? null,
    $summary_en: data.summary_en ?? null,
    $summary_ar: data.summary_ar ?? null,
    $outcome_reason_en: data.outcome_reason_en ?? null,
    $outcome_reason_ar: data.outcome_reason_ar ?? null,
    $sentiment: data.sentiment ?? null,
    $primary_emotion: data.primary_emotion ?? null,
    $primary_emotion_score: data.primary_emotion_score ?? null,
    $conversation_quality: data.conversation_quality ?? null,
    $resolution_status: data.resolution_status ?? null,
    $topics_en: data.topics_en ? JSON.stringify(data.topics_en) : null,
    $topics_ar: data.topics_ar ? JSON.stringify(data.topics_ar) : null,
    $keywords: data.keywords ? JSON.stringify(data.keywords) : null,
    $risk_flags: data.risk_flags ? JSON.stringify(data.risk_flags) : null,
    $engagement_level: data.engagement_level ?? null,
    $frustration_level: data.frustration_level ?? null,
    $confidence_level: data.confidence_level ?? null,
    $clarity: data.clarity ?? null,
    $conflict_level: data.conflict_level ?? null,
    $responsiveness: data.responsiveness ?? null,
    $assigned_agent_id: data.assigned_agent_id ?? null,
    $assigned_agent_name: data.assigned_agent_name ?? null,
    $match_score: data.match_score ?? null,
    $routing_reason_en: data.routing_reason_en ?? null,
    $routing_reason_ar: data.routing_reason_ar ?? null,
  });
  return { id: Number(result.lastInsertRowid) };
};

import type { Agent } from "./db";

function normalizeAr(s: string): string {
  return s
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[أإآا]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

function tokenize(phrase: string): string[] {
  return phrase
    .replace(/[،,.\-_]/g, " ")
    .split(/\s+/)
    .map(normalizeAr)
    .filter((w) => w.length > 1);
}

function scoreMatch(
  reportTerms: string[],
  agentTopics: string[]
): number {
  const reportWords = reportTerms.flatMap(tokenize);
  const agentWords = agentTopics.flatMap(tokenize);

  if (reportWords.length === 0 || agentWords.length === 0) return 0;

  let hits = 0;
  const matched = new Set<string>();

  for (const rWord of reportWords) {
    for (const aWord of agentWords) {
      if (matched.has(rWord)) break;
      if (
        rWord.length > 2 &&
        aWord.length > 2 &&
        (rWord.includes(aWord) || aWord.includes(rWord))
      ) {
        hits++;
        matched.add(rWord);
        break;
      }
    }
  }

  const uniqueReportWords = new Set(reportWords).size;
  return uniqueReportWords > 0 ? hits / uniqueReportWords : 0;
}

export function findBestAgent(
  agents: Agent[],
  topicsEn: string[],
  topicsAr: string[],
  keywords: string[]
): { agent: Agent; score: number } | null {
  const MIN_THRESHOLD = 0.05;

  const reportTerms = [...topicsEn, ...topicsAr, ...keywords];
  let best: { agent: Agent; score: number } | null = null;

  for (const agent of agents) {
    let agentTopics: string[] = [];
    try {
      agentTopics = JSON.parse(agent.topics);
    } catch {
      agentTopics = [];
    }

    const specTerms = [
      agent.specialization_en ?? "",
      agent.specialization_ar ?? "",
    ].filter(Boolean);
    const allAgentTerms = [...agentTopics, ...specTerms];

    const score = scoreMatch(reportTerms, allAgentTerms);

    if (score >= MIN_THRESHOLD) {
      if (!best || score > best.score) {
        best = { agent, score };
      }
    }
  }

  return best;
}

// ==============================================================================
// Gardenia 2K26 — Milestone 2: Deterministic Candidate Matching Engine
// ==============================================================================

import { routeAiRequest } from "../ai/router";

export interface CandidateProfile {
  id: string;
  display_name: string;
  role: "student" | "expert" | "sponsor" | "admin" | string;
  skills: string[];
  verified: boolean;
  conflict_of_interest?: boolean;
}

export interface MatchResult {
  candidateId: string;
  displayName: string;
  role: string;
  status: "ELIGIBLE" | "EXCLUDED";
  matchScore: number; // 0 to 100
  matchingSkills: string[];
  missingSkills: string[];
  deterministicReason: string;
  explanation: string;
  exclusionReason?: string;
}

/**
 * Deterministic scoring policy:
 * - Exclusion 1: Conflict of interest flag -> EXCLUDED (Score 0)
 * - Exclusion 2: Role mismatch -> EXCLUDED (Score 0)
 * - Exclusion 3: Unverified status -> EXCLUDED (Score 0)
 * - Score:
 *     Skill overlap: 70% max
 *     Verified status: 20%
 *     Eligibility base: 10%
 *     Total = 0% to 100%
 */
export function scoreCandidate(
  candidate: CandidateProfile,
  requiredSkills: string[],
  targetRole?: "student" | "expert"
): MatchResult {
  // 1. Conflict of Interest Gate
  if (candidate.conflict_of_interest) {
    return {
      candidateId: candidate.id,
      displayName: candidate.display_name,
      role: candidate.role,
      status: "EXCLUDED",
      matchScore: 0,
      matchingSkills: [],
      missingSkills: requiredSkills,
      deterministicReason: "Conflict of interest detected. Excluded by policy.",
      exclusionReason: "Conflict of interest",
      explanation: "EXCLUDED: Candidate has declared or detected conflict of interest.",
    };
  }

  // 2. Role Gate
  if (targetRole && candidate.role !== targetRole) {
    return {
      candidateId: candidate.id,
      displayName: candidate.display_name,
      role: candidate.role,
      status: "EXCLUDED",
      matchScore: 0,
      matchingSkills: [],
      missingSkills: requiredSkills,
      deterministicReason: `Role mismatch: Requires ${targetRole}, but candidate is ${candidate.role}.`,
      exclusionReason: "Role mismatch",
      explanation: `EXCLUDED: Role is ${candidate.role}; requires ${targetRole}.`,
    };
  }

  // 3. Verification Gate
  if (!candidate.verified) {
    return {
      candidateId: candidate.id,
      displayName: candidate.display_name,
      role: candidate.role,
      status: "EXCLUDED",
      matchScore: 0,
      matchingSkills: [],
      missingSkills: requiredSkills,
      deterministicReason: "Unverified candidate profile.",
      exclusionReason: "Unverified profile",
      explanation: "EXCLUDED: Candidate has not completed verified academic onboarding.",
    };
  }

  // 4. Deterministic Skill Overlap Calculation
  const candSkillsLower = (candidate.skills || []).map((s) => s.toLowerCase().trim());
  const matched: string[] = [];
  const missing: string[] = [];

  for (const req of requiredSkills) {
    const reqClean = req.toLowerCase().trim();
    const isMatch = candSkillsLower.some(
      (cs) => cs.includes(reqClean) || reqClean.includes(cs)
    );
    if (isMatch) {
      matched.push(req);
    } else {
      missing.push(req);
    }
  }

  // Formula:
  // - Skill overlap: up to 70 points
  const overlapRatio = requiredSkills.length > 0 ? matched.length / requiredSkills.length : 0.5;
  const skillScore = Math.round(overlapRatio * 70);

  // - Verified credential: 20 points
  const verifiedScore = candidate.verified ? 20 : 0;

  // - Eligibility: 10 points
  const eligibilityScore = 10;

  const totalScore = Math.min(100, Math.max(0, skillScore + verifiedScore + eligibilityScore));

  const deterministicReason = `Skill overlap: ${matched.length}/${requiredSkills.length} skills (+${skillScore}%), Verified (+${verifiedScore}%), Eligibility (+${eligibilityScore}%). Match: ${totalScore}%.`;

  const bullets = matched.length > 0
    ? matched.map((m) => `• ${m}`).join("\n")
    : "• Baseline academic eligibility";

  const explanation = `Candidate: ${candidate.display_name}\nMatch: ${totalScore}%\nWhy:\n${bullets}`;

  return {
    candidateId: candidate.id,
    displayName: candidate.display_name,
    role: candidate.role,
    status: "ELIGIBLE",
    matchScore: totalScore,
    matchingSkills: matched,
    missingSkills: missing,
    deterministicReason,
    explanation,
  };
}

/**
 * Matches a list of candidates against required skills.
 * Sorts eligible candidates descending by match score, followed by excluded candidates.
 */
export function matchCandidates(
  candidates: CandidateProfile[],
  requiredSkills: string[],
  targetRole?: "student" | "expert"
): MatchResult[] {
  const results = candidates.map((c) => scoreCandidate(c, requiredSkills, targetRole));

  return results.sort((a, b) => {
    // Eligible first
    if (a.status === "ELIGIBLE" && b.status === "EXCLUDED") return -1;
    if (a.status === "EXCLUDED" && b.status === "ELIGIBLE") return 1;
    // Higher score first
    return b.matchScore - a.matchScore;
  });
}

/**
 * Optional Gemini summarization of match results.
 * CRITICAL: Gemini NEVER determines score or eligibility; only generates readable summary bullets.
 * If Gemini fails or times out, deterministic explanations are returned seamlessly.
 */
export async function enrichMatchExplanations(
  matches: MatchResult[],
  projectTitle: string
): Promise<MatchResult[]> {
  try {
    const eligible = matches.filter((m) => m.status === "ELIGIBLE");
    if (eligible.length === 0) return matches;

    const summaryPrompt = `Project: ${projectTitle}
Summarize candidate match explanations briefly for these candidates:
${eligible
  .map(
    (c) =>
      `- Candidate: ${c.displayName}, Score: ${c.matchScore}%, Matching skills: ${c.matchingSkills.join(", ")}`
  )
  .join("\n")}

For each candidate, output 2-3 concise bullet points under their name highlighting their strengths.`;

    const aiResponse = await routeAiRequest({
      prompt: summaryPrompt,
      classification: "PUBLIC",
    });

    if (aiResponse.status === "SUCCESS" && aiResponse.output) {
      // Return matches with enhanced explanation if available
      return matches.map((m) => {
        if (m.status === "EXCLUDED") return m;
        return {
          ...m,
          explanation: `${m.explanation}\n\nAI Match Summary:\n${aiResponse.output.slice(0, 300)}...`,
        };
      });
    }
  } catch (err) {
    console.warn("Gemini explanation enrichment skipped, using deterministic reason:", err);
  }

  return matches;
}

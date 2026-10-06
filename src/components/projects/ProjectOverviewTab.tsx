"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Users,
  Coins,
  CheckCircle2,
  Sparkles,
  Bot,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Check,
  XCircle,
  HelpCircle,
  Clock,
  Briefcase,
} from "lucide-react";

interface ProjectOverviewTabProps {
  project: {
    id: string;
    title: string;
    public_summary: string;
    engagement_model: string;
    data_sensitivity: string;
    status: string;
    sponsor_id: string;
    profiles?: {
      id: string;
      display_name: string;
      role: string;
    };
  };
  charter: {
    id: string;
    budget: number;
    milestones_json?: Array<{
      id: number;
      title: string;
      budget: number;
      description: string;
      required_skills: string[];
    }>;
  } | null;
  onApplyClick: () => void;
  // Scoping & matching handlers (for sponsors/experts)
  onAiScope?: () => void;
  scopingLoading?: boolean;
  scopingInfo?: any;
  onFindMatches?: () => void;
  matchingLoading?: boolean;
  matches?: any[] | null;
}

export function ProjectOverviewTab({
  project,
  charter,
  onApplyClick,
  onAiScope,
  scopingLoading,
  scopingInfo,
  onFindMatches,
  matchingLoading,
  matches,
}: ProjectOverviewTabProps) {
  const [localSummary, setLocalSummary] = useState<string | null>(null);
  const [localSummaryLoading, setLocalSummaryLoading] = useState(false);
  const [localSummaryStatus, setLocalSummaryStatus] = useState<string | null>(null);

  // Fetch local Ollama summary on mount
  useEffect(() => {
    async function loadLocalSummary() {
      try {
        setLocalSummaryLoading(true);
        const res = await fetch(`/api/projects/${project.id}/local-summary`);
        if (res.ok) {
          const d = await res.json();
          setLocalSummary(d.summary);
          setLocalSummaryStatus(d.status);
        }
      } catch {
        // Fallback local summary
      } finally {
        setLocalSummaryLoading(false);
      }
    }
    loadLocalSummary();
  }, [project.id]);

  const milestones = charter?.milestones_json || [];
  const allSkills = Array.from(
    new Set(milestones.flatMap((m) => m.required_skills || []))
  );

  const budget = charter?.budget || 100000;
  const isFunded =
    project.engagement_model?.toUpperCase() === "FUNDED" ||
    project.engagement_model === "bounty_milestones";

  return (
    <div className="space-y-8">
      {/* 1. PROJECT SUMMARY (PLAIN ENGLISH) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="max-w-3xl">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            Project Summary
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2.5 mb-3 leading-snug">
            {project.title}
          </h2>

          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            {/* What is this project? */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-700" />
                What is this project?
              </h3>
              <p className="text-slate-600">{project.public_summary}</p>
            </div>

            {/* Who is this for? */}
            <div>
              <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-emerald-700" />
                Who is this for?
              </h3>
              <p className="text-slate-600">
                This research addresses real-world clinical and engineering challenges, enabling open collaboration between students, medical/domain experts, and research sponsors.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Project Facts Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              How much can I earn?
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {isFunded ? `₹${budget.toLocaleString("en-IN")}` : "Knowledge Credits"}
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {isFunded ? "Shared proportionally by student research credits" : "Academic credential on completion"}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              How much work?
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {milestones.length || 2} Milestones
            </span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Reviewed incrementally by domain experts
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              Required Skills
            </span>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(allSkills.length > 0 ? allSkills : ["Python", "PyTorch", "Data Cleaning"]).map((s, idx) => (
                <span
                  key={idx}
                  className="bg-white border border-slate-200 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 2. LOCAL AI PROJECT SUMMARY (PROCESSED BY LOCAL OLLAMA) */}
      <div className="bg-emerald-50/40 border border-emerald-200 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-2xs">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Student-Friendly Summary
              </h3>
              <p className="text-[11px] text-slate-500">
                Processed locally by on-device AI (Ollama smollm2:135m)
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
            <ShieldCheck className="h-3 w-3" />
            Local AI Only · No Cloud Leakage
          </span>
        </div>

        {localSummaryLoading ? (
          <div className="py-4 flex items-center gap-2 text-xs text-indigo-700">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <span>Generating plain-English student summary using local AI...</span>
          </div>
        ) : localSummary ? (
          <div className="bg-white/80 rounded-xl p-4 border border-indigo-100 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
            {localSummary}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Summary will appear here when local model is queried.
          </p>
        )}
      </div>

      {/* 3. HOW DOES IT WORK? (4-STEP SIMPLE FLOW) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider text-slate-500 mb-6">
          How It Works (4 Easy Steps)
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
          {/* Step 1 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs mb-3">
                1
              </span>
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Read the Project
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Review the public problem summary, milestone goals, and required skills.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs mb-3">
                2
              </span>
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Accept Agreement
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Agree to the project terms and click &ldquo;Accept Agreement &amp; Apply&rdquo;.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs mb-3">
                3
              </span>
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Expert Review
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                The domain expert reviews your profile and approves your application.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-xs mb-3">
                4
              </span>
              <h4 className="text-xs font-bold text-slate-900 mb-1">
                Access &amp; Earn
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Get access to the workspace, submit contributions, and earn research credits!
              </p>
            </div>
          </div>
        </div>

        {/* Call to action button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onApplyClick}
            className="inline-flex items-center gap-2 bg-[#3730A3] hover:bg-[#312E81] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition-colors"
          >
            Review Agreement &amp; Apply
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 4. WHAT WILL I WORK ON? (MILESTONES LIST) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              What will I work on?
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              The project is divided into two focused research milestones.
            </p>
          </div>

          {onAiScope && (
            <button
              onClick={onAiScope}
              disabled={scopingLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {scopingLoading ? "Scoping..." : "Re-Scope Milestones"}
            </button>
          )}
        </div>

        <div className="space-y-4">
          {milestones.map((m: any, idx: number) => (
            <div
              key={m.id || idx}
              className="p-5 bg-slate-50 border border-slate-200 rounded-xl"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 font-mono">
                    Milestone {idx + 1}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                    {m.title}
                  </h4>
                </div>
                <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md border border-slate-200 shrink-0">
                  ₹{(m.budget || 50000).toLocaleString("en-IN")} Allocation
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-3">
                {m.description}
              </p>

              {m.required_skills && m.required_skills.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Skills:
                  </span>
                  {m.required_skills.map((sk: string, sIdx: number) => (
                    <span
                      key={sIdx}
                      className="text-[10px] font-medium bg-white px-2 py-0.5 rounded text-slate-600 border border-slate-200"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 5. CANDIDATE MATCHING (WITH CLICKABLE PROFILE LINKS) */}
      {onFindMatches && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Recommended Researchers &amp; Experts
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Calculated deterministically based on skills and conflict-of-interest exclusion.
              </p>
            </div>

            <button
              onClick={onFindMatches}
              disabled={matchingLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              {matchingLoading ? "Matching..." : "Find Candidates"}
            </button>
          </div>

          {matches && matches.length > 0 && (
            <div className="space-y-3 mt-4">
              {matches.map((m) => (
                <div
                  key={m.candidateId}
                  className={`p-4 rounded-xl border transition-all ${
                    m.status === "EXCLUDED"
                      ? "bg-rose-50/40 border-rose-200"
                      : "bg-slate-50 border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/profile/${m.candidateId}`}
                        className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline"
                      >
                        {m.displayName}
                      </Link>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 text-slate-700 rounded capitalize">
                        {m.role}
                      </span>
                      {m.status === "EXCLUDED" ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300 rounded flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Conflict Excluded
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Eligible
                        </span>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black font-mono text-indigo-600">
                        {m.matchScore}%
                      </span>
                      <span className="text-[10px] text-slate-400 block uppercase">
                        Score
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed mb-2">
                    {m.explanation}
                  </p>

                  <div className="text-[11px] text-slate-500">
                    <Link
                      href={`/profile/${m.candidateId}`}
                      className="text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      View Full Profile &rarr;
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

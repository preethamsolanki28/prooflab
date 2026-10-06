"use client";

import React from "react";
import Link from "next/link";
import {
  Coins,
  Award,
  ArrowDown,
  Calculator,
  Lock,
  Code,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Terminal,
} from "lucide-react";
import ContributionSubmissionCard from "@/components/m3/ContributionSubmissionCard";
import ContributionReviewCard from "@/components/m3/ContributionReviewCard";
import EscrowMilestoneSection from "@/components/m3/EscrowMilestoneSection";
import ResearchCreditsDisplay from "@/components/m3/ResearchCreditsDisplay";

interface ProjectWorkTabProps {
  project: {
    id: string;
    title: string;
    data_sensitivity: string;
    status: string;
    sponsor_id: string;
  };
  charter: {
    id: string;
    version: number;
    budget: number;
    milestones_json?: any[];
  } | null;
  isMember: boolean;
  isPending: boolean;
  user: any;
  profile: any;
  contributions: any[];
  userCredits: { totalCredits: number; items: any[] };
  dbMilestones: any[];
  session?: any;
  onRefresh: () => void;
}

export function ProjectWorkTab({
  project,
  charter,
  isMember,
  isPending,
  user,
  profile,
  session,
  contributions,
  userCredits,
  dbMilestones,
  onRefresh,
}: ProjectWorkTabProps) {
  // 1. Calculate pool and credit figures
  // Total milestone budget (e.g. ₹100,000), typically 40% reserved for student pool = ₹40,000
  const totalBudget = charter?.budget || 100000;
  const studentRewardPool = Math.round(totalBudget * 0.4);

  // Compute project total student credits from approved contributions
  const projectContributions = contributions || [];
  const totalProjectCredits = projectContributions
    .filter((c) => c.status === "approved")
    .reduce((sum, c) => sum + (Number(c.research_credits) || 0), 0);

  const myCredits = userCredits?.totalCredits || 0;

  // Pending contributions count for current user
  const myPendingContributions = projectContributions.filter(
    (c) => c.owner_id === user?.id && c.status === "pending"
  ).length;

  // Estimated Earnings formula:
  // If no other credits, your share is 100% of your earned credits;
  // If credits exist, proportional share = Student Pool * (My Credits / Total Credits)
  const myShareRatio =
    totalProjectCredits > 0 ? myCredits / totalProjectCredits : myCredits > 0 ? 1 : 0;
  const estimatedEarnings = Math.round(studentRewardPool * myShareRatio);

  // Released earnings (if milestones accepted and escrow released)
  const hasReleasedEscrow = dbMilestones.some((m) => m.escrow_status === "RELEASED");
  const releasedEarnings = hasReleasedEscrow ? estimatedEarnings : 0;

  const isApprovedMember = isMember && !isPending;

  return (
    <div className="space-y-8">
      {/* 1. TOP VISUAL WORK & EARNINGS FLOW */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">
          How Your Work Turns Into Earnings
        </h2>

        {/* Visual Flow Pipeline */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center">
          {/* Step 1 */}
          <div className="w-full md:w-auto flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Step 1
            </span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">
              YOUR WORK
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Code, benchmarks, data
            </span>
          </div>

          <ArrowDown className="h-4 w-4 text-slate-300 md:-rotate-90 shrink-0" />

          {/* Step 2 */}
          <div className="w-full md:w-auto flex-1 rounded-xl bg-slate-50 border border-slate-200 p-3.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Step 2
            </span>
            <span className="text-xs font-bold text-slate-900 mt-0.5 block">
              REVIEW
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Independent expert scoring
            </span>
          </div>

          <ArrowDown className="h-4 w-4 text-slate-300 md:-rotate-90 shrink-0" />

          {/* Step 3 */}
          <div className="w-full md:w-auto flex-1 rounded-xl bg-indigo-50/70 border border-indigo-200 p-3.5">
            <span className="text-[10px] font-bold uppercase text-indigo-500 block">
              Step 3
            </span>
            <span className="text-xs font-bold text-indigo-950 mt-0.5 block">
              IMPACT SCORE (0–5)
            </span>
            <span className="text-[10px] text-indigo-700 mt-1 block">
              Quality &amp; reproducibility
            </span>
          </div>

          <ArrowDown className="h-4 w-4 text-slate-300 md:-rotate-90 shrink-0" />

          {/* Step 4 */}
          <div className="w-full md:w-auto flex-1 rounded-xl bg-indigo-50/70 border border-indigo-200 p-3.5">
            <span className="text-[10px] font-bold uppercase text-indigo-500 block">
              Step 4
            </span>
            <span className="text-xs font-bold text-indigo-950 mt-0.5 block">
              RESEARCH CREDITS
            </span>
            <span className="text-[10px] text-indigo-700 mt-1 block">
              Awarded to your profile
            </span>
          </div>

          <ArrowDown className="h-4 w-4 text-slate-300 md:-rotate-90 shrink-0" />

          {/* Step 5 */}
          <div className="w-full md:w-auto flex-1 rounded-xl bg-emerald-50/70 border border-emerald-200 p-3.5">
            <span className="text-[10px] font-bold uppercase text-emerald-600 block">
              Step 5
            </span>
            <span className="text-xs font-bold text-emerald-950 mt-0.5 block">
              YOUR SHARE
            </span>
            <span className="text-[10px] text-emerald-700 mt-1 block">
              Proportional pool split
            </span>
          </div>

          <ArrowDown className="h-4 w-4 text-slate-300 md:-rotate-90 shrink-0" />

          {/* Step 6 */}
          <div className="w-full md:w-auto flex-1 rounded-xl bg-emerald-100/80 border border-emerald-300 p-3.5">
            <span className="text-[10px] font-bold uppercase text-emerald-700 block">
              Step 6
            </span>
            <span className="text-xs font-extrabold text-emerald-950 mt-0.5 block">
              ₹ YOUR EARNINGS
            </span>
            <span className="text-[10px] text-emerald-800 mt-1 block">
              Direct escrow payout
            </span>
          </div>
        </div>

        {/* Clear Explanation Callout */}
        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-800 leading-relaxed">
            &ldquo;More valuable, reviewed work = more credits = a larger share of the student reward pool.&rdquo;
          </p>
          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
            Your final ₹ amount depends on your share of the total Research Credits. We do not use a fixed ₹ per credit because rewards are distributed proportionally among all active contributors.
          </p>

          {/* Example with project numbers */}
          <div className="mt-4 pt-3 border-t border-slate-200/80 text-xs text-slate-700">
            <span className="font-bold text-slate-900 block mb-1">
              Live Project Example:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-[11px] font-mono mt-1">
              <div className="bg-white p-2 rounded border border-slate-200">
                Student pool: <strong>₹{studentRewardPool.toLocaleString("en-IN")}</strong>
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                Student A: 8 credits &rarr; larger share
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                Student B: 5 credits &rarr; smaller share
              </div>
              <div className="bg-white p-2 rounded border border-slate-200">
                Student C: 3 credits &rarr; smaller share
              </div>
            </div>
          </div>

          {/* Live Formula Box */}
          <div className="mt-3 bg-indigo-50/60 border border-indigo-100 rounded-lg p-2.5 text-xs text-indigo-950 font-mono flex items-center gap-2">
            <Calculator className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              Your earnings = Student reward pool × Your credits ÷ Total student credits
            </span>
          </div>
        </div>

        {/* Live Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Pending Review
            </span>
            <span className="text-lg font-bold text-amber-600 mt-1 block">
              {myPendingContributions} {myPendingContributions === 1 ? "task" : "tasks"}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Approved Credits
            </span>
            <span className="text-lg font-bold text-indigo-600 mt-1 block">
              {myCredits} credits
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Estimated Earnings
            </span>
            <span className="text-lg font-bold text-emerald-600 mt-1 block">
              ₹{estimatedEarnings.toLocaleString("en-IN")}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">
              Released Earnings
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block">
              ₹{releasedEarnings.toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      {/* 2. PROJECT CODE & WORKSPACE ACCESS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
              <Code className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Project Workspace
              </h3>
              <p className="text-xs text-slate-500">
                Access project repositories, code templates, and contribution tasks
              </p>
            </div>
          </div>

          {isApprovedMember ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Workspace ACTIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
              <Lock className="h-3.5 w-3.5" />
              Workspace LOCKED
            </span>
          )}
        </div>

        {isApprovedMember ? (
          <div>
            <div className="rounded-xl border border-slate-200 bg-slate-900 text-slate-200 p-4 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400 pb-2 mb-2 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" />
                  edge-retinopathy-ml/src (Active Workspace)
                </span>
                <span className="text-emerald-400 text-[10px] uppercase font-bold">Ready</span>
              </div>
              <p className="text-slate-300">
                Project workspace is ready. You can begin contributing below.
              </p>
              <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                <p>• Dataset: /data/fundus_samples/ (pre-processed)</p>
                <p>• Baseline Model: /models/quantized_mobilenet_v3.onnx</p>
                <p>• Evaluation Script: python evaluate.py --cohort test_500</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Full browser IDE with file explorer, code editor, and interactive terminal.
                </span>
                <Link
                  href={`/projects/${project.id}?tab=workspace`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                >
                  <Code className="h-3.5 w-3.5" />
                  Open Browser IDE
                </Link>
              </div>
            </div>

            {/* Contribution Submission Card */}
            <div className="mt-6">
              <ContributionSubmissionCard
                projectId={project.id}
                projectStatus={project.status}
                charterVersion={charter?.version || 1}
                milestones={(charter?.milestones_json || []).map((m: any) => ({
                  id: String(m.id),
                  title: m.title || "Milestone",
                }))}
                userName={profile?.display_name || user?.email || "Student"}
                userRole={profile?.role || "student"}
                token={session?.access_token}
                onSubmitted={onRefresh}
              />
            </div>
          </div>
        ) : isPending ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-6 text-center">
            <Clock className="h-6 w-6 text-amber-600 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-amber-900">
              Workspace LOCKED
            </h4>
            <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto leading-relaxed">
              Your application is waiting for approval.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
            <Lock className="h-6 w-6 text-slate-400 mx-auto mb-2" />
            <h4 className="text-xs font-bold text-slate-800">
              Workspace LOCKED
            </h4>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto leading-relaxed">
              To protect research intellectual property and maintain quality, you must accept the Project Agreement and receive approval before accessing the workspace.
            </p>
          </div>
        )}
      </div>

      {/* 3. CONTRIBUTIONS & REVIEWS */}
      {(profile?.role === "expert" || profile?.role === "sponsor" || profile?.role === "admin") && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <ContributionReviewCard
            contributions={contributions}
            currentUserId={user?.id || ""}
            userRole={profile?.role || "expert"}
            token={session?.access_token}
            onReviewed={onRefresh}
          />
        </div>
      )}

      {/* 4. ESCROW & MILESTONE FUNDING */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <EscrowMilestoneSection
          milestones={dbMilestones}
          projectId={project.id}
          userRole={profile?.role || "student"}
          isSponsor={profile?.role === "sponsor"}
          token={session?.access_token}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}

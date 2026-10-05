"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Coins,
  Award,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  Calculator,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Info,
  Layers,
  ArrowDown,
  Building2,
  FileCheck,
} from "lucide-react";

export default function RewardsExplanationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const { session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [selectedContributor, setSelectedContributor] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"live" | "handout">("live");

  useEffect(() => {
    async function loadRewards() {
      try {
        setLoading(true);
        setError(null);
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/projects/${projectId}/rewards`, { headers });
        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Failed to load rewards");
        setData(resData);
        if (resData.rewards?.contributors?.length > 0) {
          setSelectedContributor(resData.rewards.contributors[0].userId);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load reward calculation");
      } finally {
        setLoading(false);
      }
    }
    loadRewards();
  }, [projectId, session?.access_token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Computing deterministic reward allocations...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-8 flex items-center justify-center">
        <div className="max-w-md bg-rose-950/40 border border-rose-800 rounded-2xl p-6 text-center space-y-4">
          <p className="text-rose-300">{error || "Project data unavailable"}</p>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Project
          </Link>
        </div>
      </div>
    );
  }

  const { rewards, project, handoutFixture } = data;
  const activeContributor = rewards.contributors?.find(
    (c: any) => c.userId === selectedContributor
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={`/projects/${projectId}`}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  REWARD EXPLANATION
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Focus C: Provenance & Governance
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 mt-0.5">
                Deterministic Reward Breakdown
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
              </h1>
            </div>
          </div>

          {/* Toggle between Live Calculation and Handout Benchmark */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-800 rounded-xl">
            <button
              onClick={() => setViewMode("live")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "live"
                  ? "bg-emerald-500 text-slate-950 shadow-md font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Live Calculation
            </button>
            <button
              onClick={() => setViewMode("handout")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "handout"
                  ? "bg-amber-500 text-slate-950 shadow-md font-semibold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Handout Benchmark Fixture
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {viewMode === "handout" ? (
          /* ================================================================ */
          /* M3-08: HANDOUT EXAMPLE FIXTURE VIEW                              */
          /* ================================================================ */
          <div className="space-y-6">
            <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider font-mono text-amber-400 font-semibold">
                    {handoutFixture.label}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">
                    Official ₹1,00,000 Milestone Worked Example
                  </h2>
                  <p className="text-sm text-slate-300 mt-1 max-w-3xl">
                    This fixture mirrors the exact distribution specified in the hackathon handout.
                    The live Gardenia MVP calculation engine operates independently using audited
                    reviewed contribution weights.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <p className="text-xs text-slate-400">Total Milestone</p>
                  <p className="text-lg font-bold text-white mt-1 font-mono">₹1,00,000</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <p className="text-xs text-slate-400">Platform Fee</p>
                  <p className="text-lg font-bold text-slate-300 mt-1 font-mono">₹9,000</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <p className="text-xs text-slate-400">AI Reserve</p>
                  <p className="text-lg font-bold text-slate-300 mt-1 font-mono">₹4,500</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <p className="text-xs text-slate-400">Expert Pool</p>
                  <p className="text-lg font-bold text-amber-400 mt-1 font-mono">₹25,500</p>
                </div>
                <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl">
                  <p className="text-xs text-slate-400">Student Pool</p>
                  <p className="text-lg font-bold text-emerald-400 mt-1 font-mono">₹59,500</p>
                </div>
              </div>

              <div className="mt-6 bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-800 bg-slate-850 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Handout Stated Outputs
                </div>
                <div className="divide-y divide-slate-800/80">
                  {handoutFixture.students.map((s: any, idx: number) => (
                    <div key={idx} className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
                          S{idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{s.name}</p>
                          <p className="text-xs text-slate-400">Student Contributor</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-emerald-400 font-mono">
                          ₹{s.reward.toLocaleString("en-IN")}
                        </p>
                        <p className="text-xs text-slate-400 font-mono">Handout exact stated value</p>
                      </div>
                    </div>
                  ))}
                  <div className="px-5 py-4 flex items-center justify-between bg-slate-900/40">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-xs">
                        EXP
                      </div>
                      <div>
                        <p className="font-semibold text-white">{handoutFixture.expert.name}</p>
                        <p className="text-xs text-slate-400">Lead Domain Expert</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-amber-400 font-mono">
                        ₹{handoutFixture.expert.reward.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">Expert fixed allocation</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ================================================================ */
          /* LIVE DETERMINISTIC CALCULATION (M3-06, M3-07)                     */
          /* ================================================================ */
          <div className="space-y-8">
            {/* Top Pool Breakdown Cards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  Milestone Pool Allocation
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  Pure Server-Side Arithmetic • Zero LLM Dependency
                </span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-medium">Total Milestone</p>
                  <p className="text-xl font-bold text-white mt-1 font-mono">
                    ₹{rewards.totalMilestone?.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[11px] text-slate-500">100% Milestone Budget</span>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-medium">Platform Fee</p>
                  <p className="text-xl font-bold text-slate-300 mt-1 font-mono">
                    ₹{rewards.platformFee?.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[11px] text-slate-500">5% Infrastructure</span>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-medium">AI Reserve</p>
                  <p className="text-xl font-bold text-slate-300 mt-1 font-mono">
                    ₹{rewards.aiReserve?.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[11px] text-slate-500">5% Local Compute Fund</span>
                </div>
                <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4">
                  <p className="text-xs text-slate-400 font-medium">Expert Pool</p>
                  <p className="text-xl font-bold text-amber-400 mt-1 font-mono">
                    ₹{rewards.expertPool?.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[11px] text-slate-500">20% Expert Guidance</span>
                </div>
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4">
                  <p className="text-xs text-emerald-400 font-medium">Student Pool</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">
                    ₹{rewards.studentPool?.toLocaleString("en-IN")}
                  </p>
                  <span className="text-[11px] text-emerald-500/80">
                    70% Reviewed Contribution Pool
                  </span>
                </div>
              </div>
            </div>

            {/* Arithmetic Formula Callout */}
            <div className="bg-slate-900/50 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <Calculator className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Student Reward Formula</h4>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    member_reward = student_pool × (member_credit_weight / total_credit_weight)
                  </p>
                </div>
              </div>
              <div className="text-xs text-slate-400 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono">
                Total Student Credits: <span className="text-emerald-400 font-bold">{rewards.totalStudentCredits}</span>
              </div>
            </div>

            {/* Main Interactive Grid: Contributor List + Provenance Chain */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Contributor Cards (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Contributors ({rewards.contributors?.length || 0})
                </h3>

                {rewards.contributors?.length === 0 ? (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-sm">
                    No approved contributions on this milestone yet. Submit and review contributions to derive rewards.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rewards.contributors?.map((c: any) => {
                      const isSelected = c.userId === selectedContributor;
                      return (
                        <div
                          key={c.userId}
                          onClick={() => setSelectedContributor(c.userId)}
                          className={`p-4 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slate-850 border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-lg"
                              : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
                                {c.userName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-white text-sm">{c.userName}</h4>
                                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                                  <span>{c.creditWeight} Credits</span>
                                  <span>•</span>
                                  <span className="font-mono text-emerald-400">{c.sharePercentage}% Share</span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-emerald-400 font-mono">
                                ₹{c.rewardAmount?.toLocaleString("en-IN")}
                              </p>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {c.creditWeight} / {c.totalCreditWeight} weight
                              </span>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span>{c.contributions?.length || 0} approved work units</span>
                            <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-sans">
                              View Provenance <ChevronRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Expert Fixed Allocation Card */}
                    <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
                            EX
                          </div>
                          <div>
                            <h4 className="font-semibold text-white text-sm">{rewards.expert?.userName}</h4>
                            <p className="text-xs text-slate-400">Domain Expert & Reviewer</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-amber-400 font-mono">
                            ₹{rewards.expert?.rewardAmount?.toLocaleString("en-IN")}
                          </p>
                          <span className="text-[10px] text-slate-400">20% Expert Allocation</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: MAIN FOCUS-C WOW MOMENT (7 cols) */}
              <div className="lg:col-span-7">
                <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 sticky top-24 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-xs font-mono uppercase text-emerald-400 font-semibold tracking-wider">
                        Proof of Contribution Provenance
                      </span>
                      <h3 className="text-lg font-bold text-white mt-0.5">
                        Why did {activeContributor ? activeContributor.userName : "Contributor"} receive this amount?
                      </h3>
                    </div>
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                      <FileCheck className="w-5 h-5" />
                    </div>
                  </div>

                  {activeContributor ? (
                    <div className="space-y-6">
                      {/* Step 1: Contribution */}
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold">
                            1
                          </div>
                          <div className="w-0.5 h-12 bg-slate-800 my-1" />
                        </div>
                        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex-1">
                          <p className="text-xs text-slate-400 uppercase font-mono">Step 1 — Submitted Contribution</p>
                          <div className="mt-1 space-y-1">
                            {activeContributor.contributions?.map((c: any) => (
                              <p key={c.id} className="text-sm font-medium text-white flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                {c.title}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Step 2: Expert Review & Scores */}
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-200 border border-slate-700 flex items-center justify-center font-mono text-xs font-bold">
                            2
                          </div>
                          <div className="w-0.5 h-12 bg-slate-800 my-1" />
                        </div>
                        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex-1">
                          <p className="text-xs text-slate-400 uppercase font-mono">Step 2 — Peer Review Scoring</p>
                          <div className="grid grid-cols-3 gap-2 mt-2 text-xs font-mono">
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">Quality</span>
                              <span className="text-white font-bold">0–2</span>
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">Usefulness</span>
                              <span className="text-white font-bold">0–2</span>
                            </div>
                            <div className="bg-slate-900 p-2 rounded border border-slate-800">
                              <span className="text-slate-400 block text-[10px]">Evidence</span>
                              <span className="text-white font-bold">0–1</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3: Derived Research Credits */}
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-mono text-xs font-bold">
                            3
                          </div>
                          <div className="w-0.5 h-12 bg-slate-800 my-1" />
                        </div>
                        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex-1">
                          <p className="text-xs text-slate-400 uppercase font-mono">Step 3 — Server-Side Research Credits</p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-bold font-mono text-emerald-400">
                              +{activeContributor.creditWeight} Credits
                            </span>
                            <span className="text-xs text-slate-400">
                              (Impact Score = {activeContributor.creditWeight}/5)
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Derived strictly server-side from reviewed contribution impact. Never from commit volume.
                          </p>
                        </div>
                      </div>

                      {/* Step 4: Proportional Reward Allocation */}
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-mono text-xs font-bold shadow-lg shadow-emerald-500/20">
                            4
                          </div>
                        </div>
                        <div className="bg-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 flex-1">
                          <p className="text-xs text-emerald-400 uppercase font-mono font-semibold">Step 4 — Final Deterministic Reward</p>
                          <div className="mt-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800 font-mono text-xs space-y-1">
                            <p className="text-slate-400">
                              Formula: <span className="text-white">{activeContributor.formula}</span>
                            </p>
                            <p className="text-slate-400">
                              Share: <span className="text-emerald-400">{activeContributor.creditWeight} / {activeContributor.totalCreditWeight} ({activeContributor.sharePercentage}%)</span>
                            </p>
                          </div>
                          <div className="mt-3 flex items-baseline justify-between">
                            <span className="text-xs text-slate-400">Disbursed via synthetic escrow:</span>
                            <span className="text-2xl font-bold font-mono text-emerald-400">
                              ₹{activeContributor.rewardAmount?.toLocaleString("en-IN")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      Select a contributor to inspect their full provenance trail.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

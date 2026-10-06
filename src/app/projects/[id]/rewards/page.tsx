"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Coins,
  Award,
  ArrowLeft,
  ChevronRight,
  Calculator,
  RefreshCw,
  Info,
  TrendingUp,
} from "lucide-react";

export default function RewardCalculatorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const { user, session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);

  // Optional preview override for simulator
  const [simulatedCredits, setSimulatedCredits] = useState<number | null>(null);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      setError(null);
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }
      const res = await fetch(`/api/projects/${projectId}/rewards`, { headers });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to load reward calculation");
      setData(resData);
    } catch (err: any) {
      setError(err.message || "Failed to load reward calculation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, [projectId, session?.access_token]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-500">Loading reward calculation...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 space-y-4">
          <h2 className="text-sm font-bold">Failed to load rewards</h2>
          <p className="text-xs text-rose-600">{error || "Project data unavailable"}</p>
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Project
          </Link>
        </div>
      </div>
    );
  }

  const { project, rewards } = data;
  const studentPool = rewards?.studentPool ?? 0;
  const totalApprovedCredits = rewards?.totalStudentCredits ?? 0;

  // Find caller's actual credits in this project
  const userRecord = rewards?.contributors?.find(
    (c: any) => c.userId === user?.id
  );
  const actualCredits = userRecord?.creditWeight ?? 0;

  // Active credits to display (either simulated or actual)
  const yourCredits = simulatedCredits !== null ? simulatedCredits : actualCredits;
  const effectiveTotalCredits =
    simulatedCredits !== null
      ? Math.max(simulatedCredits, totalApprovedCredits)
      : totalApprovedCredits;

  const shareRatio =
    effectiveTotalCredits > 0 ? yourCredits / effectiveTotalCredits : 0;
  const sharePercentage = (shareRatio * 100).toFixed(1);
  const estimatedReward = Math.round(studentPool * shareRatio);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/projects" className="hover:text-emerald-700 transition-colors">
          Projects
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-emerald-700 transition-colors truncate max-w-xs"
        >
          {project?.title || "Project"}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-medium">Reward Calculator</span>
      </nav>

      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
                <Calculator className="w-3.5 h-3.5 text-emerald-700" />
                Live Reward Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Project: {project?.title}
              </span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-1">
              Reward Calculator
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Your reward depends on the share of approved contribution credits you earned.
            </p>
          </div>

          <button
            onClick={fetchRewards}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto transition-colors"
            title="Refresh calculation"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Section 9 UX: Simple 5-Metric Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-6">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Reward Pool
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block">
              ₹{studentPool.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Allocated pool</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Your Credits
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
              {yourCredits}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              {simulatedCredits !== null ? "Simulated" : "Approved"}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Total Credits
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
              {effectiveTotalCredits}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Across team</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Your Share
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
              {sharePercentage}%
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Proportional</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-xl border border-emerald-300 bg-emerald-50/80 shadow-2xs">
            <span className="text-[10px] text-emerald-800 block uppercase font-bold tracking-wider">
              Estimated Reward
            </span>
            <span className="text-lg font-extrabold text-emerald-800 mt-1 block">
              ₹{estimatedReward.toLocaleString()}
            </span>
            <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">
              Based on credits
            </span>
          </div>
        </div>

        {/* Section 9 UX: "How it works" */}
        <div className="mt-6 p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Info className="w-3.5 h-3.5 text-emerald-700" />
            How it works
          </div>
          <p className="text-xs text-slate-600 font-mono">
            Reward Pool &times; Your Credits / Total Credits
          </p>
          <div className="text-xs text-slate-700 pt-1">
            ₹{studentPool.toLocaleString()} &times; ({yourCredits} / {effectiveTotalCredits || 1}) ={" "}
            <strong className="text-emerald-800 font-bold">
              ₹{estimatedReward.toLocaleString()}
            </strong>
          </div>
        </div>

        {/* Optional Simulator Slider */}
        <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              Interactive Reward Simulator
            </label>
            {simulatedCredits !== null && (
              <button
                onClick={() => setSimulatedCredits(null)}
                className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold"
              >
                Reset to My Live Credits ({actualCredits})
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            Preview your reward if you earn additional approved credits on this project.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={Math.max(25, effectiveTotalCredits + 10)}
              value={yourCredits}
              onChange={(e) => setSimulatedCredits(Number(e.target.value))}
              className="flex-1 accent-emerald-700 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-slate-900 w-16 text-right">
              {yourCredits} Credits
            </span>
          </div>
        </div>
      </div>

      {/* Contributor Breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Project Contributor Breakdown
        </h3>
        <p className="text-xs text-slate-500">
          All approved contributors share the student reward pool strictly in proportion to their earned impact scores.
        </p>

        {(!rewards?.contributors || rewards.contributors.length === 0) ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No contributions approved yet for this project. Once contributions are reviewed and awarded an Impact Score (1–5), contributor shares will display here.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 grid grid-cols-4 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <span>Contributor</span>
              <span className="text-center">Approved Credits</span>
              <span className="text-center">Share</span>
              <span className="text-right">Estimated Reward</span>
            </div>
            {rewards.contributors.map((c: any) => {
              const isCurrentUser = c.userId === user?.id;
              return (
                <div
                  key={c.userId}
                  className={`px-4 py-3 grid grid-cols-4 items-center text-xs ${
                    isCurrentUser ? "bg-emerald-50/40 font-semibold" : "bg-white"
                  }`}
                >
                  <div className="truncate">
                    <span className="text-slate-900">{c.userName}</span>
                    {isCurrentUser && (
                      <span className="ml-1.5 text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                        You
                      </span>
                    )}
                  </div>
                  <div className="text-center font-mono text-slate-800">
                    {c.creditWeight}
                  </div>
                  <div className="text-center font-mono text-slate-800">
                    {c.sharePercentage}%
                  </div>
                  <div className="text-right font-bold text-emerald-800">
                    ₹{c.rewardAmount?.toLocaleString()}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

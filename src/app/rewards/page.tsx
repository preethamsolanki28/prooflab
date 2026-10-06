"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Award, Coins, ArrowRight, Calculator, Info, RefreshCw } from "lucide-react";

export default function GlobalRewardsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchGlobalRewards = async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalRewards();
  }, [session?.access_token]);

  const summary = data?.earningsSummary || {
    yourCredits: 0,
    totalCredits: 0,
    rewardPool: 0,
    estimatedReward: 0,
  };

  const yourCredits = summary.yourCredits || 0;
  const totalCredits = summary.totalCredits || (yourCredits > 0 ? yourCredits : 0);
  const rewardPool = summary.rewardPool || 0;
  const shareRatio = totalCredits > 0 ? yourCredits / totalCredits : 0;
  const sharePercentage = (shareRatio * 100).toFixed(1);
  const estimatedReward = summary.estimatedReward || Math.round(rewardPool * shareRatio);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Reward Calculator
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your reward depends on the share of approved contribution credits you earned.
          </p>
        </div>

        <button
          onClick={fetchGlobalRewards}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Main Calculator Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
            <Calculator className="w-3.5 h-3.5 text-emerald-700" />
            Across All Projects
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-2">
            Proportional Reward Distribution
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Credits reflect reviewed contribution impact (1–5), never commit counts or AI calls.
          </p>
        </div>

        {/* Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Reward Pool
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block">
              ₹{rewardPool.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Total Pool</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Your Credits
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
              {yourCredits}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Approved</span>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 bg-white">
            <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
              Total Credits
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block font-mono">
              {totalCredits}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block">All Members</span>
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
              Live estimate
            </span>
          </div>
        </div>

        {/* Section 9: "How it works" */}
        <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 uppercase tracking-wider">
            <Info className="w-3.5 h-3.5 text-emerald-700" />
            How it works
          </div>
          <p className="text-xs text-slate-600 font-mono">
            Reward Pool &times; Your Credits / Total Credits
          </p>
          <div className="text-xs text-slate-700 pt-1">
            ₹{rewardPool.toLocaleString()} &times; ({yourCredits} / {totalCredits || 1}) ={" "}
            <strong className="text-emerald-800 font-bold">
              ₹{estimatedReward.toLocaleString()}
            </strong>
          </div>
        </div>
      </div>

      {/* Quick Navigation to Projects */}
      <div className="flex items-center justify-between p-5 bg-white border border-slate-200 rounded-xl">
        <div>
          <h3 className="text-xs font-bold text-slate-900">Want to earn more credits?</h3>
          <p className="text-xs text-slate-500">Apply to active research projects and submit high-impact contributions.</p>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 text-white rounded-lg text-xs font-semibold hover:bg-emerald-800 transition-colors shadow-2xs"
        >
          <span>Explore Projects</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

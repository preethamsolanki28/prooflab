"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Award, Coins, ArrowRight, ShieldCheck } from "lucide-react";

export default function RewardsPage() {
  const { session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    fetch("/api/dashboard", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  const summary = data?.earningsSummary || {
    yourCredits: 0,
    totalCredits: 0,
    rewardPool: 0,
    estimatedReward: 0,
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Research Rewards &amp; Proportional Credits
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Understand how peer-reviewed contribution impact translates into proportional rewards.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          How Research Rewards Work
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Credits reflect the reviewed impact of your contribution, not the number of commits or lines of code.
          When a milestone is accepted, the student reward pool is distributed strictly proportional to approved credits.
        </p>

        {/* Proportional Formula Box */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-xs text-slate-800 space-y-2">
          <p className="font-semibold text-emerald-800 text-[11px] uppercase tracking-wider">
            Deterministic Reward Calculation
          </p>
          <div className="text-sm font-bold text-slate-900">
            Your reward = Student reward pool &times; (Your approved credits &divide; Total approved credits)
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3 rounded-lg border border-slate-200 bg-white text-center">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Your Credits</span>
            <span className="text-xl font-bold text-slate-900">{summary.yourCredits}</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white text-center">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Total Project Credits</span>
            <span className="text-xl font-bold text-slate-900">{summary.totalCredits}</span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-white text-center">
            <span className="text-[10px] text-slate-400 block uppercase font-medium">Student Pool</span>
            <span className="text-xl font-bold text-slate-900">₹{summary.rewardPool?.toLocaleString()}</span>
          </div>

          <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/50 text-center">
            <span className="text-[10px] text-emerald-700 block uppercase font-medium">Estimated Reward</span>
            <span className="text-xl font-bold text-emerald-800">₹{summary.estimatedReward?.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

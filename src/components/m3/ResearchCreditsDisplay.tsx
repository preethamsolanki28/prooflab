"use client";

import React from "react";
import { Award, CheckCircle2, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";

interface CreditItem {
  contributionId: string;
  title: string;
  impactScore: number;
  quality: number;
  usefulness: number;
  evidence: number;
  decision: string;
  createdAt: string;
}

interface ResearchCreditsDisplayProps {
  totalCredits: number;
  items: CreditItem[];
  userName: string;
}

export default function ResearchCreditsDisplay({
  totalCredits,
  items,
  userName,
}: ResearchCreditsDisplayProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-emerald-600 block">
            Verifiable Contributor Profile
          </span>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Award className="w-4 h-4 text-emerald-600" />
            Research Credits Balance
          </h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold font-mono text-emerald-600">
            {totalCredits}
          </span>
          <span className="text-[10px] text-slate-400 block font-mono">
            Derived Server-Side
          </span>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Aggregated strictly from reviewed contribution impact scores across approved milestones.
        Immutable in the append-only ledger.
      </p>

      <div className="space-y-2 pt-1">
        {items.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No approved research credits recorded for {userName} yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden">
            {items.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50/50 hover:bg-slate-50 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-extrabold text-emerald-600 text-sm">
                    +{item.impactScore}
                  </span>
                  <span className="font-medium text-slate-800">{item.title}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400">
                  <span>Q:{item.quality} U:{item.usefulness} E:{item.evidence}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

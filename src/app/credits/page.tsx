"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Award, CheckCircle2, RefreshCw, ArrowRight, Compass } from "lucide-react";

interface CreditItem {
  contributionId: string;
  title: string;
  summary?: string;
  projectTitle: string;
  impactScore: number;
  credits: number;
  status: string;
  projectId: string;
  createdAt: string;
}

export default function CreditsPage() {
  const { session } = useAuth();
  const [totalCredits, setTotalCredits] = useState<number>(0);
  const [items, setItems] = useState<CreditItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCredits = async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const res = await fetch("/api/credits", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setTotalCredits(d.totalCredits || 0);
        setItems(d.items || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, [session?.access_token]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Credit History
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your earned research credits based on sponsor-reviewed contribution impact.
          </p>
        </div>

        <button
          onClick={fetchCredits}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto transition-colors"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary Stat Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <span className="text-[10px] text-slate-500 block uppercase font-bold tracking-wider">
            Total Approved Credits
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-extrabold text-slate-900 font-mono">
              {totalCredits}
            </span>
            <span className="text-xs text-emerald-700 font-semibold">
              Research Credits
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Credits directly determine your proportional share of student reward pools.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/rewards"
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors"
          >
            View Reward Calculator
          </Link>
          <Link
            href="/projects"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors shadow-2xs"
          >
            Explore Projects
          </Link>
        </div>
      </div>

      {/* Section 10: Simple Credit History Table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          Contribution Records
        </h2>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 animate-pulse">
            Loading credit records...
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">No credit history yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When sponsors review and approve your submitted contributions with an Impact Score (1–5), your credits will appear here.
            </p>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 text-white text-xs font-semibold rounded-lg hover:bg-emerald-800 transition-colors"
            >
              <Compass className="w-3.5 h-3.5" /> Explore Projects
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 grid grid-cols-12 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <span className="col-span-4">Project</span>
              <span className="col-span-4">Contribution</span>
              <span className="col-span-2 text-center">Impact</span>
              <span className="col-span-1 text-center">Credits</span>
              <span className="col-span-1 text-right">Status</span>
            </div>

            {items.map((item) => (
              <div
                key={item.contributionId}
                className="px-4 py-3.5 grid grid-cols-12 items-center text-xs hover:bg-slate-50/50 transition-colors"
              >
                {/* Project */}
                <div className="col-span-4 pr-3">
                  <Link
                    href={`/projects/${item.projectId}`}
                    className="font-semibold text-slate-900 hover:text-emerald-700 truncate block"
                  >
                    {item.projectTitle}
                  </Link>
                </div>

                {/* Contribution */}
                <div className="col-span-4 pr-3">
                  <span className="text-slate-800 truncate block font-medium">
                    {item.title}
                  </span>
                  {item.summary && (
                    <span className="text-[11px] text-slate-500 truncate block mt-0.5">
                      {item.summary}
                    </span>
                  )}
                </div>

                {/* Impact */}
                <div className="col-span-2 text-center font-mono">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800">
                    Impact {item.impactScore}
                  </span>
                </div>

                {/* Credits */}
                <div className="col-span-1 text-center font-mono font-bold text-emerald-800">
                  {item.credits}
                </div>

                {/* Status */}
                <div className="col-span-1 text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Approved
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

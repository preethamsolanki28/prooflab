"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Coins, ShieldCheck, ArrowRight, RefreshCw, CheckCircle2 } from "lucide-react";

export default function EscrowPage() {
  const { profile, session } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchEscrow = useCallback(async () => {
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
  }, [session]);

  useEffect(() => {
    fetchEscrow();
  }, [fetchEscrow]);

  const stats = data?.stats || { availableEscrow: 0, releasedRewards: 0 };
  const projects = data?.projects || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Escrow &amp; Milestone Treasury
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor project milestone budgets, locked escrows, and verified release conditions.
          </p>
        </div>

        <button
          onClick={fetchEscrow}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Available Locked Escrow</span>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            ₹{stats.availableEscrow?.toLocaleString() || "0"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Held in programmatic escrow pending peer review and milestone acceptance.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Released Rewards</span>
          <p className="mt-2 text-2xl font-bold text-emerald-800">
            ₹{stats.releasedRewards?.toLocaleString() || "0"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Released to verified contributors based on approved Research Credits.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
          Project Escrow Allocations
        </h2>

        <div className="mt-3">
          {projects.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No project escrow allocations found.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {projects.map((p: any) => (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      <Link href={`/projects/${p.id}`} className="hover:text-emerald-700">
                        {p.title}
                      </Link>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Budget: <strong>₹{Number(p.budget || 0).toLocaleString()}</strong> &bull; Status: <span className="capitalize">{p.status}</span>
                    </p>
                  </div>

                  <Link
                    href={`/projects/${p.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <span>Manage Escrow</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

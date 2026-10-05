"use client";

import React, { useState } from "react";
import { Coins, CheckCircle2, ShieldAlert, Award, Clock, ArrowRight } from "lucide-react";

interface Milestone {
  id: string;
  title: string;
  description?: string;
  amount: number;
  status: string;
  escrows?: Array<{
    id: string;
    amount: number;
    status: "UNFUNDED" | "FUNDED" | "RELEASED" | "PROTECTED";
    funded_at?: string;
    released_at?: string;
  }>;
}

interface EscrowMilestoneSectionProps {
  milestones: Milestone[];
  projectId: string;
  userRole: string;
  isSponsor: boolean;
  token?: string;
  onRefresh: () => void;
}

export default function EscrowMilestoneSection({
  milestones,
  projectId,
  userRole,
  isSponsor,
  token,
  onRefresh,
}: EscrowMilestoneSectionProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canManageEscrow = isSponsor || userRole === "admin";
  const canAcceptMilestone = isSponsor || userRole === "expert" || userRole === "admin";

  const handleAction = async (milestoneId: string, action: "fund" | "accept" | "release") => {
    try {
      setLoadingAction(`${milestoneId}-${action}`);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/escrow/${milestoneId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to ${action} escrow`);
      }

      setSuccessMsg(data.message || `Milestone action '${action}' completed successfully.`);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Escrow operation failed");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-600" />
            Milestones & Escrow Governance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Synthetic escrow state machine: UNFUNDED → FUNDED → RELEASED
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs">
          {successMsg}
        </div>
      )}

      <div className="space-y-3">
        {milestones.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No milestones configured yet.
          </div>
        ) : (
          milestones.map((m) => {
            const escrow = m.escrows && m.escrows.length > 0 ? m.escrows[0] : null;
            const escrowStatus = escrow?.status || "UNFUNDED";
            const amount = m.amount || escrow?.amount || 40000;

            const isFunded = escrowStatus === "FUNDED";
            const isReleased = escrowStatus === "RELEASED";
            const isProtected = escrowStatus === "PROTECTED";

            return (
              <div
                key={m.id}
                className={`p-4 rounded-xl border transition-all ${
                  isFunded
                    ? "bg-emerald-50/50 border-emerald-200"
                    : isReleased
                    ? "bg-blue-50/50 border-blue-200"
                    : isProtected
                    ? "bg-amber-50/50 border-amber-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-700">{m.title}</span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isFunded
                            ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                            : isReleased
                            ? "bg-blue-100 text-blue-800 border-blue-300"
                            : isProtected
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : "bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        Escrow: {escrowStatus}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Milestone: {m.status.toUpperCase()}
                      </span>
                    </div>
                    {m.description && (
                      <p className="text-xs text-slate-600 mt-1">{m.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold font-mono text-slate-900">
                      ₹{Number(amount).toLocaleString("en-IN")}
                    </span>

                    {/* Escrow Action Controls */}
                    {escrowStatus === "UNFUNDED" && canManageEscrow && (
                      <button
                        onClick={() => handleAction(m.id, "fund")}
                        disabled={loadingAction === `${m.id}-fund`}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        {loadingAction === `${m.id}-fund` ? "Funding..." : "FUND MILESTONE"}
                      </button>
                    )}

                    {isFunded && (m.status === "submitted" || m.status === "in_progress" || m.status === "open") && canAcceptMilestone && (
                      <button
                        onClick={() => handleAction(m.id, "accept")}
                        disabled={loadingAction === `${m.id}-accept`}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        {loadingAction === `${m.id}-accept` ? "Accepting..." : "ACCEPT MILESTONE"}
                      </button>
                    )}

                    {isFunded && (m.status === "accepted" || m.status === "completed") && canManageEscrow && (
                      <button
                        onClick={() => handleAction(m.id, "release")}
                        disabled={loadingAction === `${m.id}-release`}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
                      >
                        {loadingAction === `${m.id}-release` ? "Releasing..." : "RELEASE ESCROW"}
                      </button>
                    )}

                    {userRole === "student" && isFunded && (
                      <span className="text-[11px] text-emerald-700 font-medium bg-emerald-100/60 px-2 py-1 rounded">
                        ✓ Ready for Work
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

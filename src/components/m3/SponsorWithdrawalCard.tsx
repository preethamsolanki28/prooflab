"use client";

import React, { useState } from "react";
import { AlertTriangle, ShieldCheck, Lock, OctagonAlert, Check } from "lucide-react";

interface SponsorWithdrawalCardProps {
  projectId: string;
  projectStatus: string;
  isSponsor: boolean;
  userRole: string;
  token?: string;
  onWithdrawn: () => void;
}

export default function SponsorWithdrawalCard({
  projectId,
  projectStatus,
  isSponsor,
  userRole,
  token,
  onWithdrawn,
}: SponsorWithdrawalCardProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canWithdraw = isSponsor || userRole === "admin";
  const isWithdrawn = projectStatus === "sponsor_withdrawn" || projectStatus === "work_stopped";

  const handleExecuteWithdrawal = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/projects/${projectId}/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Withdrawal failed");
      }

      setShowConfirm(false);
      onWithdrawn();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to withdraw project");
    } finally {
      setLoading(false);
    }
  };

  if (isWithdrawn) {
    return (
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-6 text-amber-950 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-900 font-bold text-base">
            <OctagonAlert className="w-5 h-5 text-amber-600" />
            PROJECT STATUS: Sponsor Withdrew the Project
          </div>
          <span className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider rounded-md bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            CREDITS PROTECTED
          </span>
        </div>
        <p className="text-xs text-amber-800 leading-relaxed font-medium">
          The sponsor has formally exercised withdrawal under Charter Article 7.
          New contribution work is permanently stopped. <strong>Accepted credit remains protected.</strong> All previously reviewed and accepted
          contributions and derived Research Credits remain strictly immutable in the ledger.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-white/80 rounded-xl border border-amber-200">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">New Work</span>
            <span className="text-sm font-extrabold font-mono text-rose-600">STOPPED</span>
          </div>
          <div className="p-3 bg-white/80 rounded-xl border border-amber-200">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Accepted Credits</span>
            <span className="text-sm font-extrabold font-mono text-emerald-600">PROTECTED</span>
          </div>
          <div className="p-3 bg-white/80 rounded-xl border border-amber-200">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">Escrow State</span>
            <span className="text-sm font-extrabold font-mono text-indigo-600">UNDER ACCEPTANCE/REVIEW</span>
          </div>
        </div>
        <p className="text-[10px] text-amber-700 italic">
          Governance Note: This protection is enforced cryptographically via the Gardenia Charter protocol.
        </p>
      </div>
    );
  }

  if (!canWithdraw) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Sponsor Abandonment Governance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Voluntary project withdrawal mechanism protecting student contributions
          </p>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition-colors"
        >
          Withdraw Project
        </button>
      </div>

      {showConfirm && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3 text-xs text-rose-900">
          <div className="flex items-center gap-2 font-bold text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            Confirm Project Withdrawal
          </div>
          <p className="font-semibold text-rose-950">
            "Stopping this project will prevent new work. Accepted contribution credit will remain protected."
          </p>
          <p className="text-rose-700 text-[11px]">
            Future contributions will be blocked. Accepted Research Credits will NOT be erased or modified.
          </p>

          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Withdrawal Reason / Public Note:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Pivot to internal clinical trial / Sponsor scope reduction"
              className="w-full px-3 py-1.5 border border-rose-300 rounded-lg text-xs bg-white text-slate-800"
            />
          </div>

          {errorMsg && (
            <div className="text-rose-700 font-bold">{errorMsg}</div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteWithdrawal}
              disabled={loading}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
            >
              {loading ? "Stopping Project..." : "Execute Withdrawal"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

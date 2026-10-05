"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, ShieldAlert, Gavel, Send, Clock } from "lucide-react";

interface Dispute {
  id: string;
  project_id: string;
  contribution_id?: string;
  raised_by: string;
  reason: string;
  status: "OPEN" | "RESOLVED";
  resolution?: string;
  resolved_by?: string;
  created_at: string;
  resolved_at?: string;
}

interface DisputesSectionProps {
  projectId: string;
  disputes: Dispute[];
  userRole: string;
  token?: string;
  onRefresh: () => void;
}

export default function DisputesSection({
  projectId,
  disputes,
  userRole,
  token,
  onRefresh,
}: DisputesSectionProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionText, setResolutionText] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canResolve = userRole === "admin" || userRole === "sponsor";

  const handleOpenDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          reason: reason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to open dispute");

      setSuccessMsg("Dispute registered and anchored in cryptographic ledger (DISPUTE_OPENED).");
      setReason("");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to open dispute");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (disputeId: string) => {
    if (!resolutionText.trim()) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const res = await fetch("/api/disputes", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          disputeId,
          resolution: resolutionText.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve dispute");

      setSuccessMsg("Dispute resolved and logged (DISPUTE_RESOLVED).");
      setResolvingId(null);
      setResolutionText("");
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to resolve dispute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Gavel className="w-4 h-4 text-indigo-600" />
            Charter Dispute Governance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tamper-evident dispute registration referencing review or reward calculations
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

      {/* Open Dispute Form */}
      <form onSubmit={handleOpenDispute} className="space-y-3">
        <label className="block text-xs font-semibold text-slate-700">
          Open Formal Dispute:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="State grounds: e.g. Impact score miscalculated for preprocessing benchmark..."
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {submitting ? "Filing..." : "File Dispute"}
          </button>
        </div>
      </form>

      {/* Disputes List */}
      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Registered Disputes ({disputes.length})
        </h4>

        {disputes.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No active disputes on record for this project.
          </div>
        ) : (
          disputes.map((d) => {
            const isResolved = d.status === "RESOLVED";

            return (
              <div
                key={d.id}
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  isResolved
                    ? "bg-slate-50/60 border-slate-200"
                    : "bg-amber-50/40 border-amber-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono font-bold text-[10px] border ${
                        isResolved
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }`}
                    >
                      {d.status}
                    </span>
                    <span className="font-semibold text-slate-800">
                      Dispute #{d.id.slice(0, 8)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(d.created_at).toLocaleDateString()}
                  </span>
                </div>

                <p className="text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                  <strong className="text-slate-500 block text-[10px] uppercase">Reason:</strong>
                  {d.reason}
                </p>

                {isResolved && d.resolution && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                    <span className="text-[10px] font-bold uppercase text-emerald-700 block">
                      Admin Resolution:
                    </span>
                    <p className="mt-0.5">{d.resolution}</p>
                  </div>
                )}

                {!isResolved && canResolve && (
                  <div className="pt-2">
                    {resolvingId === d.id ? (
                      <div className="space-y-2 p-3 bg-white rounded-lg border border-slate-200">
                        <input
                          type="text"
                          value={resolutionText}
                          onChange={(e) => setResolutionText(e.target.value)}
                          placeholder="Official resolution determination..."
                          className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setResolvingId(null)}
                            className="px-2.5 py-1 text-slate-600 text-xs"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolve(d.id)}
                            disabled={submitting || !resolutionText.trim()}
                            className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold"
                          >
                            Confirm Resolution
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setResolvingId(d.id)}
                        className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold transition-colors"
                      >
                        Resolve Dispute
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

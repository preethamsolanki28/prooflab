"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Bot,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  FileCode,
  RefreshCw,
  Clock,
  WifiOff,
  CheckCircle2,
} from "lucide-react";
import {
  savePendingAction,
  getPendingActions,
  markActionSynced,
  markActionConflict,
  removePendingAction,
} from "@/lib/outbox/client";
import { PendingAction } from "@/lib/outbox/types";

interface Milestone {
  id: string;
  title: string;
}

interface ContributionSubmissionCardProps {
  projectId: string;
  projectStatus: string;
  charterVersion?: number;
  milestones: Milestone[];
  userName: string;
  userRole: string;
  token?: string;
  onSubmitted: () => void;
}

export default function ContributionSubmissionCard({
  projectId,
  projectStatus,
  charterVersion = 1,
  milestones,
  userName,
  userRole,
  token,
  onSubmitted,
}: ContributionSubmissionCardProps) {
  const [milestoneId, setMilestoneId] = useState(milestones[0]?.id || "");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [contributionType, setContributionType] = useState<
    "code" | "dataset" | "benchmark" | "paper" | "review" | "analysis"
  >("code");
  const [aiAssisted, setAiAssisted] = useState(false);
  const [aiProvider, setAiProvider] = useState<"local" | "cloud" | "none">("local");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pendingNotice, setPendingNotice] = useState<string | null>(null);

  // Demo fallback control: allow simulating offline outage for demo
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [syncing, setSyncing] = useState(false);

  // Load pending actions from local outbox
  const refreshOutbox = () => {
    const list = getPendingActions(projectId);
    setPendingActions(list);
  };

  useEffect(() => {
    refreshOutbox();
  }, [projectId]);

  const isProjectStopped = projectStatus === "sponsor_withdrawn" || projectStatus === "work_stopped";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !summary.trim()) {
      setErrorMsg("Please provide both title and summary for your contribution.");
      return;
    }

    const idempotencyId = crypto.randomUUID();

    // If simulating offline mode, immediately save to local outbox
    if (simulateOffline) {
      const pending = savePendingAction({
        idempotencyId,
        actionType: "CONTRIBUTION_SUBMISSION",
        projectId,
        charterVersion,
        payload: {
          milestoneId: milestoneId || undefined,
          title: title.trim(),
          summary: summary.trim(),
          contributionType,
          aiAssisted,
          aiProvider: aiAssisted ? aiProvider : "none",
        },
      });

      setPendingNotice("Saved locally as PENDING SYNC. Final credit is calculated by the server.");
      setErrorMsg(null);
      setResult(null);
      setTitle("");
      setSummary("");
      refreshOutbox();
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setPendingNotice(null);
      setResult(null);

      const res = await fetch("/api/contributions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          milestoneId: milestoneId || undefined,
          title: title.trim(),
          summary: summary.trim(),
          contributionType,
          aiAssisted,
          aiProvider: aiAssisted ? aiProvider : "none",
          idempotencyId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // If server fails or is unreachable, save to local outbox
        throw new Error(data.error || "Server connection failed");
      }

      setResult(data.contribution);
      setTitle("");
      setSummary("");
      onSubmitted();
    } catch (err: any) {
      // Graceful Fallback: Save to local pending outbox
      savePendingAction({
        idempotencyId,
        actionType: "CONTRIBUTION_SUBMISSION",
        projectId,
        charterVersion,
        payload: {
          milestoneId: milestoneId || undefined,
          title: title.trim(),
          summary: summary.trim(),
          contributionType,
          aiAssisted,
          aiProvider: aiAssisted ? aiProvider : "none",
        },
      });

      setPendingNotice("Saved locally as PENDING SYNC. Final credit is calculated by the server.");
      refreshOutbox();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSyncOutbox = async () => {
    if (pendingActions.length === 0) return;

    try {
      setSyncing(true);
      setErrorMsg(null);

      const res = await fetch("/api/outbox/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          actions: pendingActions.filter((a) => a.status === "PENDING" || a.status === "CONFLICT"),
        }),
      });

      const data = await res.json();
      if (data.results && Array.isArray(data.results)) {
        for (const r of data.results) {
          if (r.status === "SYNCED") {
            markActionSynced(r.idempotencyId, r.serverEntityId);
          } else if (r.status === "CONFLICT") {
            markActionConflict(r.idempotencyId, r.error || "Conflict detected");
          }
        }
      }

      refreshOutbox();
      onSubmitted();
    } catch (err: any) {
      setErrorMsg("Sync failed: Database currently unreachable. Actions remain safely queued locally.");
    } finally {
      setSyncing(false);
    }
  };

  if (isProjectStopped) {
    return (
      <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          New Contributions Blocked
        </div>
        <p className="text-xs text-amber-700 mt-1">
          This project has been withdrawn by the sponsor. New work cannot be submitted.
          All previously accepted contributions and credits remain permanently protected.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <FileCode className="w-4 h-4 text-indigo-600" />
            Submit Work Contribution
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cryptographically hashed and attributed to authenticated human contributor
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-slate-400 block">Authenticated Owner:</span>
          <span className="text-xs font-semibold text-indigo-700 font-mono bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
            {userName} ({userRole})
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
          {errorMsg}
        </div>
      )}

      {pendingNotice && (
        <div className="p-3 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <Clock className="w-4 h-4 text-amber-600" />
            {pendingNotice}
          </div>
          <p className="text-[11px] text-amber-700">
            Your action is saved locally in the browser outbox. When connection is verified,
            click "Sync Pending Actions" to revalidate with the server.
          </p>
        </div>
      )}

      {result && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Contribution Submitted & Anchored in Ledger!
          </p>
          <p className="font-mono text-[11px] text-emerald-800">
            SHA-256 Hash: {result.content_hash}
          </p>
          <p className="text-[11px] text-emerald-700">
            Event: <span className="font-mono font-bold">CONTRIBUTION_SUBMITTED</span> • Awaiting peer review
          </p>
        </div>
      )}

      {/* Local Pending-Action Outbox Banner (M4-01, M4-02) */}
      {pendingActions.length > 0 && (
        <div className="p-4 bg-slate-900 text-slate-100 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Local Pending-Action Outbox ({pendingActions.length})
              </span>
            </div>
            <button
              onClick={handleSyncOutbox}
              disabled={syncing}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow-xs flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync Pending Actions"}
            </button>
          </div>

          <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden text-xs font-mono">
            {pendingActions.map((action) => {
              const payload = action.payload as any;
              const isConflict = action.status === "CONFLICT";
              const isSynced = action.status === "SYNCED";

              return (
                <div key={action.idempotencyId} className="p-3 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isSynced
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isConflict
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {action.status}
                      </span>
                      <span className="text-white font-medium">{payload?.title || "Pending Contribution"}</span>
                      <span className="text-[10px] text-slate-400">Charter v{action.charterVersion}</span>
                    </div>

                    {isConflict && (
                      <p className="text-rose-400 text-[11px] mt-1 font-sans">
                        Action needs review because the project terms changed. ({action.error})
                      </p>
                    )}
                    {isSynced && (
                      <p className="text-emerald-400 text-[11px] mt-1 font-sans">
                        ✓ Synchronized and verified by server.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        removePendingAction(action.idempotencyId);
                        refreshOutbox();
                      }}
                      className="text-slate-400 hover:text-slate-200 text-[11px] underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Milestone</label>
            <select
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Milestone (Optional)</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contribution Type</label>
            <select
              value={contributionType}
              onChange={(e: any) => setContributionType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="code">Source Code / Implementation</option>
              <option value="dataset">Dataset / Preprocessing</option>
              <option value="benchmark">Benchmark Experiment</option>
              <option value="paper">Report / Manuscript</option>
              <option value="analysis">Data Analysis</option>
              <option value="review">Peer Review</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Contribution Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fundus Preprocessing Pipeline & Noise Reduction"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">Work Summary & Evidence</label>
          <textarea
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Describe methodology, dataset partitions, baseline comparisons, and verifiable findings..."
            className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* AI Assistance Declaration */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-indigo-600" />
              AI-Assisted Work
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiAssisted}
                onChange={(e) => setAiAssisted(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>

          {aiAssisted && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">AI Model Provider:</span>
              <div className="flex gap-2 font-mono text-[11px]">
                <button
                  type="button"
                  onClick={() => setAiProvider("local")}
                  className={`px-2.5 py-1 rounded border ${
                    aiProvider === "local"
                      ? "bg-indigo-100 text-indigo-800 border-indigo-300 font-bold"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  Local Model
                </button>
                <button
                  type="button"
                  onClick={() => setAiProvider("cloud")}
                  className={`px-2.5 py-1 rounded border ${
                    aiProvider === "cloud"
                      ? "bg-indigo-100 text-indigo-800 border-indigo-300 font-bold"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  Cloud Gemini
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Demo Resilience Simulation Control */}
        <div className="p-3 bg-slate-100/70 border border-slate-200 rounded-xl flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-slate-600">
            <WifiOff className="w-4 h-4 text-slate-500" />
            <span>Simulate DB Outage (Queue to Local Outbox):</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={simulateOffline}
              onChange={(e) => setSimulateOffline(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          {submitting
            ? "Hashing & Submitting..."
            : simulateOffline
            ? "Queue to Local Outbox (Pending Sync)"
            : "Submit Contribution to Ledger"}
        </button>
      </form>
    </div>
  );
}

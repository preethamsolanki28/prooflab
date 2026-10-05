"use client";

import React, { useState } from "react";
import { Award, CheckCircle2, XCircle, AlertCircle, ShieldCheck, Scale, Star } from "lucide-react";

interface Contribution {
  id: string;
  title: string;
  summary: string;
  contribution_type: string;
  content_hash: string;
  status: string;
  owner_id: string;
  ai_assisted: boolean;
  ai_provider: string;
  created_at: string;
  owner?: {
    id: string;
    display_name: string;
    role: string;
  };
  reviews?: Array<{
    id: string;
    quality: number;
    usefulness: number;
    evidence: number;
    impact_score: number;
    decision: string;
    notes?: string;
  }>;
}

interface ContributionReviewCardProps {
  contributions: Contribution[];
  currentUserId: string;
  userRole: string;
  token?: string;
  onReviewed: () => void;
}

export default function ContributionReviewCard({
  contributions,
  currentUserId,
  userRole,
  token,
  onReviewed,
}: ContributionReviewCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quality, setQuality] = useState<number>(2);
  const [usefulness, setUsefulness] = useState<number>(2);
  const [evidence, setEvidence] = useState<number>(1);
  const [decision, setDecision] = useState<"APPROVED" | "REJECTED" | "NEEDS_REVISION">("APPROVED");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canReview = userRole === "expert" || userRole === "sponsor" || userRole === "admin";
  const impactScore = quality + usefulness + evidence;

  const activeContrib = contributions.find((c) => c.id === selectedId);

  const handleSubmitReview = async () => {
    if (!selectedId) return;

    try {
      setSubmitting(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/contributions/${selectedId}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          quality,
          usefulness,
          evidence,
          decision,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Review submission failed");
      }

      setSuccessMsg(
        `Review recorded: ${decision}. Impact Score: ${impactScore}/5. ${
          decision === "APPROVED" ? `Awarded +${impactScore} Research Credits.` : ""
        }`
      );
      setSelectedId(null);
      setNotes("");
      onReviewed();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-600" />
            Contribution Peer Review & Impact Scoring
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Credits are derived strictly from reviewed impact (Max 5), never from commit counts or AI calls.
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
          Impact Score Rubric (0–5)
        </span>
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

      {/* Contributions List */}
      <div className="space-y-3">
        {contributions.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No contributions submitted yet for review.
          </div>
        ) : (
          contributions.map((c) => {
            const isApproved = c.status === "accepted";
            const isRejected = c.status === "rejected";
            const isPending = c.status === "submitted" || c.status === "reviewed";
            const review = c.reviews && c.reviews.length > 0 ? c.reviews[0] : null;
            const isOwn = c.owner_id === currentUserId;

            return (
              <div
                key={c.id}
                className={`p-4 rounded-xl border transition-all ${
                  c.id === selectedId
                    ? "border-indigo-500 bg-indigo-50/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{c.title}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                          isApproved
                            ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                            : isRejected
                            ? "bg-rose-100 text-rose-800 border-rose-200"
                            : "bg-amber-100 text-amber-800 border-amber-200"
                        }`}
                      >
                        {c.status.toUpperCase()}
                      </span>
                      {c.ai_assisted && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          AI: {c.ai_provider}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2">{c.summary}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>Owner: {c.owner?.display_name || c.owner_id.slice(0, 8)}</span>
                      <span>•</span>
                      <span>Hash: {c.content_hash.slice(0, 12)}...</span>
                      {review && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">
                            Impact: {review.impact_score}/5 (+{review.impact_score} Credits)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {canReview && !isOwn && (
                    <button
                      onClick={() => setSelectedId(c.id === selectedId ? null : c.id)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors"
                    >
                      {c.id === selectedId ? "Close Review" : "Score Contribution"}
                    </button>
                  )}

                  {isOwn && (
                    <span className="text-[11px] text-slate-400 italic shrink-0">
                      Your Contribution
                    </span>
                  )}
                </div>

                {/* Inline Scoring Modal for Selected Contribution */}
                {c.id === selectedId && (
                  <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/80 p-4 rounded-xl space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Evaluate: {c.title}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      {/* Quality Score 0-2 */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                        <label className="font-semibold text-slate-700 flex justify-between">
                          <span>Quality</span>
                          <span className="font-mono text-indigo-600 font-bold">{quality} / 2</span>
                        </label>
                        <p className="text-[10px] text-slate-400">Technical rigor & correctness</p>
                        <div className="flex gap-1 pt-1">
                          {[0, 1, 2].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setQuality(v)}
                              className={`flex-1 py-1 rounded text-xs font-mono font-bold border ${
                                quality === v
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Usefulness Score 0-2 */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                        <label className="font-semibold text-slate-700 flex justify-between">
                          <span>Usefulness / Impact</span>
                          <span className="font-mono text-indigo-600 font-bold">{usefulness} / 2</span>
                        </label>
                        <p className="text-[10px] text-slate-400">Milestone objective utility</p>
                        <div className="flex gap-1 pt-1">
                          {[0, 1, 2].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setUsefulness(v)}
                              className={`flex-1 py-1 rounded text-xs font-mono font-bold border ${
                                usefulness === v
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Evidence Score 0-1 */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                        <label className="font-semibold text-slate-700 flex justify-between">
                          <span>Evidence / Docs</span>
                          <span className="font-mono text-indigo-600 font-bold">{evidence} / 1</span>
                        </label>
                        <p className="text-[10px] text-slate-400">Reproducibility & artifacts</p>
                        <div className="flex gap-1 pt-1">
                          {[0, 1].map((v) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setEvidence(v)}
                              className={`flex-1 py-1 rounded text-xs font-mono font-bold border ${
                                evidence === v
                                  ? "bg-indigo-600 text-white border-indigo-600"
                                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {v}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Total Impact Score & Decision */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white rounded-lg border border-slate-200 text-xs">
                      <div>
                        <span className="text-slate-500">Calculated Impact Score:</span>
                        <span className="ml-2 text-base font-extrabold font-mono text-emerald-600">
                          {impactScore} / 5
                        </span>
                        <span className="text-[11px] text-slate-400 ml-2 font-mono">
                          ({quality} + {usefulness} + {evidence})
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {(["APPROVED", "REJECTED", "NEEDS_REVISION"] as const).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDecision(d)}
                            className={`px-3 py-1.5 rounded-lg font-semibold text-xs border ${
                              decision === d
                                ? d === "APPROVED"
                                  ? "bg-emerald-600 text-white border-emerald-600"
                                  : d === "REJECTED"
                                  ? "bg-rose-600 text-white border-rose-600"
                                  : "bg-amber-600 text-white border-amber-600"
                                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Reviewer rationale / feedback..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-800"
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitReview}
                        disabled={submitting}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50"
                      >
                        {submitting ? "Recording..." : `Submit Review (${decision})`}
                      </button>
                    </div>
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

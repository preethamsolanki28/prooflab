"use client";

import React, { useState } from "react";
import { Award, CheckCircle2, XCircle, AlertCircle, Scale, Star, FileCode } from "lucide-react";

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
  files?: string[] | string;
  owner?: {
    id: string;
    display_name: string;
    role: string;
  };
  reviews?: Array<{
    id: string;
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

const IMPACT_LEVELS = [
  { value: 1, label: "1 — Small", description: "Small contribution" },
  { value: 2, label: "2 — Useful", description: "Useful contribution" },
  { value: 3, label: "3 — Solid", description: "Solid contribution" },
  { value: 4, label: "4 — High-impact", description: "High-impact contribution" },
  { value: 5, label: "5 — Major", description: "Major contribution" },
];

export default function ContributionReviewCard({
  contributions,
  currentUserId,
  userRole,
  token,
  onReviewed,
}: ContributionReviewCardProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [impactScore, setImpactScore] = useState<number>(3);
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canReview = userRole === "expert" || userRole === "sponsor" || userRole === "admin";

  const handleReviewAction = async (decision: "APPROVED" | "REJECTED") => {
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
          impactScore: decision === "APPROVED" ? impactScore : 0,
          decision,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Review submission failed");
      }

      if (decision === "APPROVED") {
        setSuccessMsg(
          `Contribution approved! Impact Score: ${impactScore}/5. Awarded +${impactScore} Research Credits.`
        );
      } else {
        setSuccessMsg("Contribution rejected. 0 credits awarded.");
      }

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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-700" />
            Contribution Review &amp; Impact Scoring
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate submitted work. Approved credits equal the selected Impact Score (1–5).
          </p>
        </div>
        <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          Impact: 1–5 Credits
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Contributions List */}
      <div className="space-y-3">
        {contributions.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No contributions submitted yet for review.
          </div>
        ) : (
          contributions.map((c) => {
            const isApproved = c.status === "accepted";
            const isRejected = c.status === "rejected";
            const review = c.reviews && c.reviews.length > 0 ? c.reviews[0] : null;
            const isOwn = c.owner_id === currentUserId;
            const studentName = c.owner?.display_name || "Student Researcher";

            // Format files display
            const filesDisplay = Array.isArray(c.files)
              ? c.files.join(", ")
              : typeof c.files === "string" && c.files
              ? c.files
              : `${c.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.py`;

            return (
              <div
                key={c.id}
                className={`p-5 rounded-xl border transition-all ${
                  c.id === selectedId
                    ? "border-emerald-600 bg-emerald-50/20 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900">{c.title}</span>
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

                    <p className="text-xs text-slate-600 leading-relaxed">{c.summary}</p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono pt-1">
                      <span>Student: <strong className="text-slate-700 font-sans">{studentName}</strong></span>
                      <span>•</span>
                      <span>Files: <code className="text-slate-700">{filesDisplay}</code></span>
                      {review && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold font-sans">
                            Impact: {review.impact_score}/5 (+{review.impact_score} Credits)
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {canReview && !isOwn && (
                    <button
                      onClick={() => {
                        setSelectedId(c.id === selectedId ? null : c.id);
                        setImpactScore(3);
                        setNotes("");
                      }}
                      className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-2xs"
                    >
                      {c.id === selectedId ? "Close Review" : "Review Contribution"}
                    </button>
                  )}

                  {isOwn && (
                    <span className="text-[11px] text-slate-400 italic shrink-0">
                      Your Contribution
                    </span>
                  )}
                </div>

                {/* Section 11: Sponsor Contribution Review UI */}
                {c.id === selectedId && (
                  <div className="mt-5 pt-5 border-t border-slate-200 bg-slate-50/80 p-5 rounded-xl space-y-4">
                    <div className="space-y-1 border-b border-slate-200 pb-3">
                      <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                        Contribution Review
                      </p>
                      <div className="text-xs text-slate-800 space-y-1">
                        <p>
                          <strong className="text-slate-600 font-semibold">Student: </strong>
                          {studentName}
                        </p>
                        <p>
                          <strong className="text-slate-600 font-semibold">What changed: </strong>
                          {c.summary}
                        </p>
                        <p>
                          <strong className="text-slate-600 font-semibold">Files: </strong>
                          <span className="font-mono text-[11px] text-slate-700">{filesDisplay}</span>
                        </p>
                      </div>
                    </div>

                    {/* Impact Score Selector: 1 to 5 */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          Contribution Impact
                        </label>
                        <span className="text-xs font-mono font-bold text-emerald-700">
                          Credits awarded = {impactScore}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {IMPACT_LEVELS.map((level) => {
                          const isSelected = impactScore === level.value;
                          return (
                            <button
                              key={level.value}
                              type="button"
                              onClick={() => setImpactScore(level.value)}
                              className={`p-2.5 rounded-xl text-left border transition-all ${
                                isSelected
                                  ? "bg-emerald-700 text-white border-emerald-700 shadow-xs"
                                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`text-sm font-extrabold font-mono ${isSelected ? "text-white" : "text-emerald-700"}`}>
                                  {level.value}
                                </span>
                                <span className={`text-[10px] font-semibold ${isSelected ? "text-emerald-100" : "text-slate-400"}`}>
                                  {level.value} Cr
                                </span>
                              </div>
                              <p className={`text-[11px] font-medium mt-1 leading-snug line-clamp-1 ${isSelected ? "text-emerald-100" : "text-slate-600"}`}>
                                {level.description.replace(" contribution", "")}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Optional explanation */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-slate-700">
                        Optional explanation:
                      </label>
                      <textarea
                        rows={2}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Why this contribution received this score..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700 placeholder:text-slate-400"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="w-full sm:w-auto px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewAction("REJECTED")}
                        disabled={submitting}
                        className="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                      >
                        {submitting ? "Processing..." : "Reject Contribution"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewAction("APPROVED")}
                        disabled={submitting}
                        className="w-full sm:w-auto px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                      >
                        {submitting
                          ? "Approving..."
                          : `Approve Contribution (${impactScore} Credits)`}
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

"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  ArrowRight,
} from "lucide-react";

interface ProjectAgreementTabProps {
  project: {
    id: string;
    title: string;
    engagement_model: string;
  };
  charter: {
    id: string;
    version: number;
    budget: number;
    engagement_model: string;
    ip_terms: string;
    publication_terms: string;
    confidentiality_terms: string;
    permitted_ai_tools: string;
    credit_reward_terms: string;
    sponsor_withdrawal_terms: string;
  } | null;
  isMember: boolean;
  isPending: boolean;
  userAcceptance: any;
  userApplication: any;
  onApply: (agreementAck: boolean) => Promise<void>;
  applying: boolean;
  message: string | null;
  error: string | null;
}

export function ProjectAgreementTab({
  project,
  charter,
  isMember,
  isPending,
  userAcceptance,
  userApplication,
  onApply,
  applying,
  message,
  error,
}: ProjectAgreementTabProps) {
  const [agreed, setAgreed] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  const isApproved = isMember && !isPending;
  const hasApplied = isPending || userApplication?.status === "pending_expert_review";

  const handleApplyClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return;
    await onApply(true);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Project Agreement
            </h2>
            <p className="text-xs text-slate-500">
              Collaborative research rules and participant protections
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-700 mt-4 leading-relaxed">
          Before you start working, you need to agree to the rules of this project.
        </p>

        {/* Current Membership / Application Status Banner */}
        {isApproved ? (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-xs text-emerald-900">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <div>
              <p className="font-bold">Agreement Accepted · Active Project Member</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                You have been approved by the expert. Workspace and brief are unlocked.
              </p>
            </div>
          </div>
        ) : hasApplied ? (
          <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900">
            <Clock className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">Application Pending Expert Review</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                You agreed to the terms. The domain expert is reviewing your application.
              </p>
            </div>
          </div>
        ) : null}

        {message && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* WHAT YOU AGREE TO CARD */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-3">
            What You Agree To
          </h3>

          <ul className="space-y-2.5 text-xs text-slate-700">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span><strong>Expected Work:</strong> Deliver high-quality research code, benchmarks, and data cleaning according to milestone goals.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span><strong>Peer Review:</strong> All submissions are reviewed by domain experts using an objective 0–5 quality rubric before acceptance.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span><strong>Credits &amp; Rewards:</strong> Research Credits are earned from approved work. Final earnings are proportional to your share of total credits.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span><strong>Ownership &amp; Attribution:</strong> Open research attribution to human contributors, with commercial rights as specified in the charter.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span><strong>Privacy &amp; Data:</strong> Confidential patient data and model checkpoints must never be sent to public cloud AI tools.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span><strong>Contributor Credits:</strong> Human contributors receive permanent cryptographic attribution in the immutable ledger.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span><strong>Sponsor Withdrawal:</strong> If a sponsor halts a project, accepted contributions and earned credits remain fully protected.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
              <span><strong>Disputes:</strong> Disagreements are handled transparently through the platform governance review process.</span>
            </li>
          </ul>
        </div>

        {/* Action Checkbox & Apply Button */}
        {!isApproved && !hasApplied && (
          <form onSubmit={handleApplyClick} className="mt-6 pt-5 border-t border-slate-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                id="chk-agreement"
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-800">
                I understand and agree to the Project Agreement
              </span>
            </label>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[11px] text-slate-500">
                Submitting creates an application for expert review.
              </p>
              <button
                id="btn-accept-agreement"
                type="submit"
                disabled={!agreed || applying}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3730A3] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#312E81] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {applying ? "Submitting Application..." : "Accept Agreement & Apply"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </form>
        )}

        {/* View Full Agreement Terms Accordion */}
        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowFullTerms(!showFullTerms)}
            className="flex w-full items-center justify-between text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>View full agreement clauses</span>
            {showFullTerms ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {showFullTerms && charter && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 space-y-3 text-xs text-slate-600 font-sans">
              <div>
                <h4 className="font-bold text-slate-900">Intellectual Property &amp; Licensing</h4>
                <p className="mt-0.5">{charter.ip_terms || "Open research with attribution to human contributors."}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Confidentiality &amp; Permitted AI Tools</h4>
                <p className="mt-0.5">{charter.confidentiality_terms || "Confidential data restricted to local models only."}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Publication &amp; Human Authorship</h4>
                <p className="mt-0.5">{charter.publication_terms || "Joint academic publication with human student authors."}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Sponsor Withdrawal Terms</h4>
                <p className="mt-0.5">{charter.sponsor_withdrawal_terms || "Accepted contributions retain full research credits upon withdrawal."}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

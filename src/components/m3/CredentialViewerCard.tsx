"use client";

import React, { useState } from "react";
import { Award, ShieldCheck, CheckCircle2, Sparkles, Building2, User } from "lucide-react";

interface Credential {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  type: string;
  metadata: {
    contributor_name?: string;
    project_title?: string;
    monetary_payout?: boolean;
    issued_by?: string;
  };
  issued_at: string;
}

interface CredentialViewerCardProps {
  projectId: string;
  projectTitle: string;
  isKnowledgeSharing: boolean;
  credentials: Credential[];
  userRole: string;
  isSponsor: boolean;
  members: Array<{ user_id: string; profiles?: { display_name: string } }>;
  token?: string;
  onIssued: () => void;
}

export default function CredentialViewerCard({
  projectId,
  projectTitle,
  isKnowledgeSharing,
  credentials,
  userRole,
  isSponsor,
  members,
  token,
  onIssued,
}: CredentialViewerCardProps) {
  const [selectedUser, setSelectedUser] = useState(members[0]?.user_id || "");
  const [certTitle, setCertTitle] = useState("Open-Source Research Contributor Certificate");
  const [issuing, setIssuing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canIssue = isSponsor || userRole === "admin";

  const handleIssue = async () => {
    if (!selectedUser) return;

    try {
      setIssuing(true);
      setErrorMsg(null);

      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId,
          userId: selectedUser,
          title: certTitle,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to issue credential");

      onIssued();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to issue credential");
    } finally {
      setIssuing(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            Verifiable Digital Credentials (Non-Monetary Recognition)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Knowledge-sharing model: Research credits + verifiable digital recognition (Zero financial payout)
          </p>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
          {isKnowledgeSharing ? "KNOWLEDGE-SHARING PROJECT" : "HYBRID / FUNDED"}
        </span>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs">
          {errorMsg}
        </div>
      )}

      {/* Sponsor Issuance Panel */}
      {canIssue && (
        <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-xl space-y-3 text-xs">
          <h4 className="font-bold text-purple-900">Issue Academic Credential</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Recipient Member:</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full px-3 py-1.5 border border-purple-300 rounded bg-white text-slate-800"
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.profiles?.display_name || m.user_id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-600 mb-1 font-semibold">Certificate Title:</label>
              <input
                type="text"
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
                className="w-full px-3 py-1.5 border border-purple-300 rounded bg-white text-slate-800"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleIssue}
              disabled={issuing || !selectedUser}
              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition-colors"
            >
              {issuing ? "Issuing..." : "Issue Credential"}
            </button>
          </div>
        </div>
      )}

      {/* Issued Certificates List */}
      <div className="space-y-4">
        {credentials.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            No digital credentials issued for this project yet.
          </div>
        ) : (
          credentials.map((c) => (
            <div
              key={c.id}
              className="border-2 border-purple-200 bg-linear-to-br from-purple-50/40 via-white to-purple-50/20 rounded-2xl p-6 shadow-xs relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded">
                      Official Certificate of Research Contribution
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {c.id.slice(0, 8)}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    {c.title}
                  </h3>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Award className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-purple-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Contributor</span>
                  <span className="font-bold text-slate-800">
                    {c.metadata?.contributor_name || "Arjun"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Project</span>
                  <span className="font-medium text-slate-700 truncate block">
                    {c.metadata?.project_title || projectTitle}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Payout</span>
                  <span className="font-mono text-emerald-600 font-semibold">
                    ₹0 (Academic Credit)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase">Issued Date</span>
                  <span className="font-mono text-slate-600">
                    {new Date(c.issued_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-[11px] text-purple-800 bg-purple-100/50 px-3 py-1.5 rounded-lg border border-purple-200">
                <span className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                  Recorded in immutable Gardenia Ledger (CREDENTIAL_ISSUED)
                </span>
                <span className="font-mono text-[10px]">Verifiable Recognition</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

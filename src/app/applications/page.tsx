"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  User,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

export default function ApplicationsPage() {
  const { user, profile, session } = useAuth();
  const isSponsor = profile?.role === "sponsor" || profile?.role === "admin";

  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setApplications(isSponsor ? (d.pendingApplications || []) : (d.myApplications || []));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [session, isSponsor]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleAction(appId: string, projectId: string, action: "accept" | "reject") {
    if (!session?.access_token) return;
    try {
      setActionLoading(appId);
      const res = await fetch(`/api/projects/${projectId}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ applicationId: appId, action }),
      });
      if (res.ok) {
        await fetchApplications();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  function renderStatusBadge(status: string) {
    if (status === "accepted") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </span>
      );
    }
    if (status === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 border border-slate-200">
          <XCircle className="h-3 w-3" />
          Not selected
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
        <Clock className="h-3 w-3" />
        Waiting for approval
      </span>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isSponsor ? "Candidate Applications" : "My Applications"}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isSponsor
              ? "Review student applicants, inspect credentials, and manage team approvals."
              : "Track your project application statuses and workspace approvals."}
          </p>
        </div>

        <button
          onClick={fetchApplications}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/4" />
          <div className="h-10 bg-slate-100 rounded" />
          <div className="h-10 bg-slate-100 rounded" />
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No applications</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {isSponsor
              ? "You currently have no pending student applications for your projects."
              : "You have not submitted applications to any projects yet."}
          </p>
          {!isSponsor && (
            <Link
              href="/projects"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              Explore Research Projects
            </Link>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden divide-y divide-slate-100">
          {applications.map((app) => (
            <div
              key={app.id}
              className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/projects/${app.project?.id || app.project_id}`}
                    className="text-sm font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                  >
                    {app.project?.title || app.projects?.title || "Research Project"}
                  </Link>
                  {renderStatusBadge(app.status)}
                </div>

                {isSponsor ? (
                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span>Applicant:</span>
                    <Link
                      href={`/profile/${app.student_id}`}
                      className="font-semibold text-slate-900 hover:text-emerald-700 underline"
                    >
                      {app.student?.display_name || "Student Researcher"}
                    </Link>
                    {app.student?.verified && (
                      <span className="text-[10px] bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200">
                        Verified
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Sponsor: <strong>{app.project?.sponsor?.display_name || "Research Sponsor"}</strong> &bull; Applied on {new Date(app.created_at).toLocaleDateString()}
                  </p>
                )}

                {/* Candidate skills */}
                {isSponsor && app.student?.skills && app.student.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {app.student.skills.map((s: string) => (
                      <span
                        key={s}
                        className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200 px-1.5 py-0.2 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {isSponsor && app.status === "pending_expert_review" ? (
                  <>
                    <button
                      onClick={() => handleAction(app.id, app.project_id, "accept")}
                      disabled={actionLoading === app.id}
                      className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
                    >
                      Accept Student
                    </button>
                    <button
                      onClick={() => handleAction(app.id, app.project_id, "reject")}
                      disabled={actionLoading === app.id}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                ) : (
                  <Link
                    href={`/projects/${app.project?.id || app.project_id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <span>View Project</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

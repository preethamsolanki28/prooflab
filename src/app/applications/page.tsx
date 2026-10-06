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
  Star,
} from "lucide-react";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" {...props}>
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

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
                  <div className="space-y-2 pt-1">
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

                    {/* Social links */}
                    {(app.student?.github_url || app.student?.linkedin_url) && (
                      <div className="flex items-center gap-3 text-xs">
                        {app.student?.github_url && (
                          <a
                            href={app.student.github_url.startsWith("http") ? app.student.github_url : `https://${app.student.github_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 transition-colors"
                          >
                            <GithubIcon className="h-3 w-3" />
                            <span>GitHub</span>
                          </a>
                        )}
                        {app.student?.linkedin_url && (
                          <a
                            href={app.student.linkedin_url.startsWith("http") ? app.student.linkedin_url : `https://${app.student.linkedin_url}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-emerald-700 transition-colors"
                          >
                            <LinkedinIcon className="h-3 w-3 text-blue-600" />
                            <span>LinkedIn</span>
                          </a>
                        )}
                      </div>
                    )}

                    {/* Ratings Breakdown (Section 8) */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600">
                      <span className="font-bold text-slate-900 flex items-center gap-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                        {app.rating?.overall ?? "5.0"}
                      </span>
                      <span className="text-slate-300">&bull;</span>
                      <span>Work: <strong className="text-slate-700">{app.rating?.workQuality ?? "5.0"}</strong></span>
                      <span className="text-slate-300">&bull;</span>
                      <span>Reliability: <strong className="text-slate-700">{app.rating?.reliability ?? "5.0"}</strong></span>
                      <span className="text-slate-300">&bull;</span>
                      <span>Comm: <strong className="text-slate-700">{app.rating?.communication ?? "5.0"}</strong></span>
                      <span className="text-slate-400">({app.rating?.reviewCount ?? 0} reviews)</span>
                    </div>

                    {/* Recent feedback snippet */}
                    {app.rating?.recentFeedback && app.rating.recentFeedback.length > 0 && (
                      <div className="rounded-md bg-slate-50 p-2 border border-slate-200/80 text-[11px] text-slate-600 italic">
                        &ldquo;{app.rating.recentFeedback[0].comment}&rdquo;
                      </div>
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
                      Reject Application
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

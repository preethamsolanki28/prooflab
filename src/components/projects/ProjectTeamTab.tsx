"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Star,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Award,
  AlertCircle,
  Clock,
  Send,
  Flag,
  Lock,
  ShieldAlert,
} from "lucide-react";
import DisputesSection from "@/components/m3/DisputesSection";

interface ProjectTeamTabProps {
  project: {
    id: string;
    title: string;
    status: string;
    sponsor_id: string;
    profiles?: {
      id: string;
      display_name: string;
      role: string;
    };
  };
  members: Array<{
    user_id: string;
    role: string;
    status: string;
    joined_at: string;
    can_use_private_ai?: boolean;
    profiles?: {
      display_name: string;
    };
  }>;
  applications: any[];
  user: any;
  profile: any;
  session: any;
  onReviewApplication: (studentId: string, action: "accept" | "reject") => Promise<void>;
  onCompleteProject: () => Promise<void>;
  completing: boolean;
  disputes: any[];
  onRefresh: () => void;
}

export function ProjectTeamTab({
  project,
  members,
  applications,
  user,
  profile,
  session,
  onReviewApplication,
  onCompleteProject,
  completing,
  disputes,
  onRefresh,
}: ProjectTeamTabProps) {
  // Feedback submission state
  const [feedbackRevieweeId, setFeedbackRevieweeId] = useState<string>("");
  const [workQuality, setWorkQuality] = useState<number>(5);
  const [reliability, setReliability] = useState<number>(5);
  const [communication, setCommunication] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Reviewing application state
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // Private AI Access State (Section 12 & 14)
  const [privateAiAccess, setPrivateAiAccess] = useState<Record<string, boolean>>({});
  const [togglingAiMember, setTogglingAiMember] = useState<string | null>(null);
  const [aiAccessMessage, setAiAccessMessage] = useState<string | null>(null);

  const fetchPrivateAiAccess = React.useCallback(async () => {
    if (!session?.access_token || !project.id) return;
    try {
      const res = await fetch(`/api/projects/${project.id}/private-ai-access`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setPrivateAiAccess(d.accessMap || {});
      }
    } catch {
      // silent
    }
  }, [session, project.id]);

  React.useEffect(() => {
    fetchPrivateAiAccess();
  }, [fetchPrivateAiAccess]);

  const handleTogglePrivateAi = async (memberId: string, action: "grant" | "revoke") => {
    if (!session?.access_token) return;
    try {
      setTogglingAiMember(memberId);
      setAiAccessMessage(null);
      const res = await fetch(`/api/projects/${project.id}/private-ai-access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ memberId, action }),
      });
      if (res.ok) {
        setPrivateAiAccess((prev) => ({
          ...prev,
          [memberId]: action === "grant",
        }));
        setAiAccessMessage(
          action === "grant"
            ? "Confidential AI access granted."
            : "Confidential AI access revoked."
        );
        onRefresh();
      }
    } catch {
      // ignore
    } finally {
      setTogglingAiMember(null);
    }
  };

  const isSponsorOrAdmin =
    project.sponsor_id === user?.id || profile?.role === "admin";

  const isExpert =
    profile?.role === "expert" ||
    members.some((m) => m.user_id === user?.id && m.role === "expert");

  const canReviewApplications = isSponsorOrAdmin || isExpert;
  const isProjectCompleted = project.status === "complete";

  const pendingApps = applications.filter((a) => a.status === "pending_expert_review");
  const acceptedMembers = members.filter((m) => m.status === "accepted");

  // Determine collaborators available to rate (excluding current user)
  const availableReviewees = [
    {
      id: project.sponsor_id,
      name: project.profiles?.display_name || "Project Sponsor",
      role: "sponsor",
    },
    ...acceptedMembers
      .filter((m) => m.user_id !== project.sponsor_id)
      .map((m) => ({
        id: m.user_id,
        name: m.profiles?.display_name || "Team Member",
        role: m.role,
      })),
  ].filter((p) => p.id !== user?.id);

  const handleApplicationAction = async (studentId: string, action: "accept" | "reject") => {
    try {
      setReviewingId(studentId);
      await onReviewApplication(studentId, action);
      onRefresh();
    } finally {
      setReviewingId(null);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackRevieweeId) {
      setFeedbackError("Please select a collaborator to review.");
      return;
    }
    if (!session?.access_token) {
      setFeedbackError("Please log in to submit feedback.");
      return;
    }

    try {
      setFeedbackLoading(true);
      setFeedbackError(null);
      setFeedbackSuccess(null);

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId: project.id,
          revieweeId: feedbackRevieweeId,
          workQuality,
          reliability,
          communication,
          comment,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit feedback");
      }

      setFeedbackSuccess("Collaborator feedback submitted successfully!");
      setComment("");
      onRefresh();
    } catch (err: any) {
      setFeedbackError(err.message || "Failed to submit feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. PROJECT TEAM & COLLABORATORS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Project Team &amp; Collaborators
              </h2>
              <p className="text-xs text-slate-500">
                Click any name to view their public research profile and ratings
              </p>
            </div>
          </div>

          {/* Project Completion Action for Sponsor / Admin */}
          {isSponsorOrAdmin && !isProjectCompleted && (
            <button
              onClick={onCompleteProject}
              disabled={completing}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {completing ? "Marking Complete..." : "Mark Project Completed"}
            </button>
          )}

          {isProjectCompleted && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Project Completed
            </span>
          )}
        </div>

        {/* Members Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sponsor Card */}
          <div className="rounded-xl border border-purple-200 bg-purple-50/50 p-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 block">
              Research Sponsor
            </span>
            <Link
              href={`/profile/${project.sponsor_id}`}
              className="text-sm font-bold text-slate-900 hover:text-purple-700 hover:underline mt-1 block"
            >
              {project.profiles?.display_name || "Sponsor"}
            </Link>
            <p className="text-[11px] text-slate-500 mt-0.5">Project Creator &amp; Funding Authorizer</p>
          </div>

          {/* Accepted Members */}
          {acceptedMembers.map((m) => (
            <div
              key={m.user_id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  {m.role}
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  Active
                </span>
              </div>
              <Link
                href={`/profile/${m.user_id}`}
                className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline mt-1 block"
              >
                {m.profiles?.display_name || "Collaborator"}
              </Link>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Joined {new Date(m.joined_at).toLocaleDateString()}
              </p>
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-200/60 text-[10px]">
                <span className="text-slate-500">Private AI:</span>
                {Boolean(privateAiAccess[m.user_id] ?? m.can_use_private_ai) ? (
                  <span className="font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    Granted
                  </span>
                ) : (
                  <span className="text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                    Denied (Default)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 1.5 CONFIDENTIAL AI ACCESS (SPONSOR CONTROL) */}
      {isSponsorOrAdmin && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock className="h-4 w-4 text-emerald-700" />
                Confidential AI Access
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Explicitly grant or revoke access to the confidential local model (Ollama). Normal members cannot communicate with private AI unless granted below.
              </p>
            </div>
            {aiAccessMessage && (
              <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 font-medium">
                {aiAccessMessage}
              </span>
            )}
          </div>

          {acceptedMembers.filter((m) => m.user_id !== project.sponsor_id).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
              No student team members have joined this project yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {acceptedMembers
                .filter((m) => m.user_id !== project.sponsor_id)
                .map((m) => {
                  const hasAccess = Boolean(privateAiAccess[m.user_id] ?? m.can_use_private_ai);
                  return (
                    <div key={m.user_id} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {m.profiles?.display_name || "Student Researcher"}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[11px] text-slate-500">Private AI Access:</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                              hasAccess
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {hasAccess ? "ON" : "OFF"}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleTogglePrivateAi(m.user_id, hasAccess ? "revoke" : "grant")}
                        disabled={togglingAiMember === m.user_id}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                          hasAccess
                            ? "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
                            : "bg-emerald-700 text-white hover:bg-emerald-800"
                        }`}
                      >
                        {togglingAiMember === m.user_id
                          ? "Updating..."
                          : hasAccess
                          ? "Revoke Access"
                          : "Grant Access"}
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* 2. EXPERT REVIEW PANEL: PENDING APPLICATIONS */}
      {canReviewApplications && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Pending Student Applications ({pendingApps.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Expert review gate for workspace access
            </span>
          </div>

          {pendingApps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
              No pending student applications for this project.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApps.map((app) => {
                const student = app.profiles;
                const studentName = student?.display_name || "Applicant";
                const isProcessing = reviewingId === app.student_id;

                return (
                  <div
                    key={app.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/profile/${app.student_id}`}
                          className="text-sm font-bold text-slate-900 hover:text-indigo-600 hover:underline"
                        >
                          {studentName}
                        </Link>
                        <span className="text-[10px] font-semibold bg-white border border-slate-200 px-1.5 py-0.2 rounded capitalize text-slate-600">
                          {student?.role || "student"}
                        </span>
                        {student?.verified && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            Verified
                          </span>
                        )}
                      </div>

                      {student?.skills && student.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {student.skills.map((s: string, sIdx: number) => (
                            <span
                              key={sIdx}
                              className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-600"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-[11px] text-slate-400 mt-1">
                        Applied on {new Date(app.created_at).toLocaleDateString()} · Project Agreement signed
                      </p>
                    </div>

                    {/* Actions: Accept or Reject */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleApplicationAction(app.student_id, "reject")}
                        disabled={isProcessing}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleApplicationAction(app.student_id, "accept")}
                        disabled={isProcessing}
                        className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                      >
                        {isProcessing ? "Processing..." : "Accept Student"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. COLLABORATOR FEEDBACK & RATINGS (AVAILABLE UPON PROJECT COMPLETION) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-2xs">
            <Star className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Rate Your Collaborators
            </h3>
            <p className="text-xs text-slate-500">
              Submit peer reviews for collaborators you worked with on this project
            </p>
          </div>
        </div>

        {!isProjectCompleted ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500">
            <Clock className="h-6 w-6 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Feedback Opens When Project Concludes</p>
            <p className="mt-0.5">
              Collaborator feedback becomes available once the sponsor or administrator marks the project completed.
            </p>
          </div>
        ) : (
          <div>
            {feedbackSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{feedbackSuccess}</span>
              </div>
            )}

            {feedbackError && (
              <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{feedbackError}</span>
              </div>
            )}

            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Collaborator to Review
                </label>
                <select
                  value={feedbackRevieweeId}
                  onChange={(e) => setFeedbackRevieweeId(e.target.value)}
                  required
                  className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-hidden"
                >
                  <option value="">-- Choose a collaborator --</option>
                  {availableReviewees.map((rev) => (
                    <option key={rev.id} value={rev.id}>
                      {rev.name} ({rev.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating sliders / selects (1-5) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Work Quality (1–5)
                  </label>
                  <select
                    value={workQuality}
                    onChange={(e) => setWorkQuality(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reliability / Trust (1–5)
                  </label>
                  <select
                    value={reliability}
                    onChange={(e) => setReliability(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Communication (1–5)
                  </label>
                  <select
                    value={communication}
                    onChange={(e) => setCommunication(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900"
                  >
                    {[5, 4, 3, 2, 1].map((s) => (
                      <option key={s} value={s}>{s} Stars</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Written Feedback (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g. Very reliable and delivered model validation on time with clear code benchmarks."
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-900 focus:border-indigo-600 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={feedbackLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3730A3] px-4 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#312E81] disabled:opacity-50 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                {feedbackLoading ? "Submitting..." : "Submit Collaborator Review"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* 4. DISPUTES & FORMAL RESOLUTIONS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <DisputesSection
          projectId={project.id}
          disputes={disputes}
          userRole={profile?.role || "student"}
          token={session?.access_token}
          onRefresh={onRefresh}
        />
      </div>
    </div>
  );
}

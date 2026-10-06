"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  FolderKanban,
  FileText,
  Award,
  Coins,
  ArrowRight,
  ShieldCheck,
  Compass,
  PlusCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  User,
  Sparkles,
  Lock,
  Star,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const { user, profile, session, loading } = useAuth();

  const [data, setData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setDataLoading(true);
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // ignore
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (user && session?.access_token) {
      fetchDashboardData();
    }
  }, [user, session?.access_token, fetchDashboardData]);

  // Handle application approval/rejection from sponsor dashboard
  async function handleApplicationAction(appId: string, projectId: string, action: "accept" | "reject") {
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
        await fetchDashboardData();
      }
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  }

  // 1. Landing Screen for Unauthenticated Visitors
  if (!user && !loading) {
    return (
      <div className="py-12 sm:py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 mb-6">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>ResearchMesh &bull; Verified Research Marketplace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Proof of Contribution <br />
            <span className="text-emerald-700">&amp; Protected Research Collaboration</span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Connect students, domain experts, and research sponsors. 
            Agreements established before work begins. Confidential data locked to on-device AI.
            Contributions immutably recorded in a tamper-evident SHA-256 ledger.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/projects"
              className="flex items-center gap-2 rounded-lg bg-emerald-700 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition-colors"
            >
              Explore Research Projects
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              Sign In / Register
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 mb-3">
                <FileText className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Project Agreement</h3>
              <p className="mt-1 text-xs text-slate-500">
                Transparent rules, review rubrics, and IP protection agreed upon upfront before any code or data is accessed.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 mb-3">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Protected Workspace</h3>
              <p className="mt-1 text-xs text-slate-500">
                Confidential research briefs are strictly restricted to verified contributors. Zero cloud leakage for private briefs.
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-800 mb-3">
                <Award className="h-4 w-4" />
              </div>
              <h3 className="text-xs font-bold text-slate-900">Fair Research Credits</h3>
              <p className="mt-1 text-xs text-slate-500">
                Peer-reviewed impact scores directly determine your proportional share of the reward pool and verified credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isSponsor = profile?.role === "sponsor" || profile?.role === "admin";
  const firstName = profile?.display_name ? profile.display_name.split(" ")[0] : "Researcher";

  // Helper status badge translation for plain language
  function renderApplicationStatusBadge(status: string) {
    if (status === "accepted") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </span>
      );
    }
    if (status === "sponsor_invited") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-800 border border-indigo-200">
          <Star className="h-3 w-3 text-indigo-600 fill-indigo-600" />
          Invited by Sponsor
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

  // 2. SPONSOR DASHBOARD
  if (isSponsor) {
    const stats = data?.stats || {
      publishedProjects: 0,
      pendingApplications: 0,
      availableEscrow: 0,
      releasedRewards: 0,
    };
    const projects = data?.projects || [];
    const pendingApps = data?.pendingApplications || [];
    const recentActivity = data?.recentActivity || [];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome back, {profile?.display_name || "Sponsor"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your research projects, review student applications, and monitor escrow.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            Post Research Project
          </Link>
        </div>

        {/* Top 4 Compact Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Published Projects</span>
              <FolderKanban className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.publishedProjects}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Pending Applications</span>
              <FileText className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.pendingApplications}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Available Escrow</span>
              <Coins className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">₹{stats.availableEscrow.toLocaleString()}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Released Rewards</span>
              <Award className="h-4 w-4 text-slate-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">₹{stats.releasedRewards.toLocaleString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column: Projects & Applications */}
          <div className="lg:col-span-2 space-y-6">
            {/* Pending Applications Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900">Pending Student Applications</h2>
                  {pendingApps.length > 0 && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                      {pendingApps.length} new
                    </span>
                  )}
                </div>
                <Link href="/applications" className="text-xs font-semibold text-emerald-700 hover:underline">
                  View all
                </Link>
              </div>

              <div className="mt-3">
                {pendingApps.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <p className="text-xs">No pending student applications.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingApps.map((app: any) => (
                      <div
                        key={app.id}
                        className="rounded-lg border border-slate-200 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/profile/${app.student_id}`}
                              className="text-xs font-bold text-slate-900 hover:text-emerald-700 underline"
                            >
                              {app.student?.display_name || "Applicant"}
                            </Link>
                            {app.student?.verified && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-medium">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-600">
                            Applied to: <span className="font-semibold text-slate-800">{app.projects?.title}</span>
                          </p>
                          {app.student?.skills && app.student.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {app.student.skills.slice(0, 3).map((s: string) => (
                                <span key={s} className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.2 rounded text-slate-600">
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <button
                            onClick={() => handleApplicationAction(app.id, app.project_id, "accept")}
                            disabled={actionLoading === app.id}
                            className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
                          >
                            Accept Student
                          </button>
                          <button
                            onClick={() => handleApplicationAction(app.id, app.project_id, "reject")}
                            disabled={actionLoading === app.id}
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Published Projects Section */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-900">Your Projects</h2>
                <Link href="/projects" className="text-xs font-semibold text-emerald-700 hover:underline">
                  Browse directory
                </Link>
              </div>

              <div className="mt-3">
                {projects.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    <p className="text-xs">No projects published yet.</p>
                    <Link
                      href="/projects/new"
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                      Post your first research project
                    </Link>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {projects.map((p: any) => (
                      <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                        <div className="space-y-1">
                          <Link
                            href={`/projects/${p.id}`}
                            className="text-xs font-bold text-slate-900 hover:text-emerald-700"
                          >
                            {p.title}
                          </Link>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {p.public_summary}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500">
                            <span>Status: <strong className="capitalize text-slate-700">{p.status}</strong></span>
                            <span>Milestones: <strong>{p.milestones?.length || 0}</strong></span>
                          </div>
                        </div>
                        <Link
                          href={`/projects/${p.id}`}
                          className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-50"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Recent Activity */}
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                Recent Activity
              </h2>

              <div className="mt-3">
                {recentActivity.length === 0 ? (
                  <p className="py-6 text-center text-xs text-slate-400">
                    No recent activity records.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recentActivity.map((act: any) => (
                      <div key={act.id} className="text-xs space-y-0.5">
                        <p className="font-semibold text-slate-800">{act.title}</p>
                        <p className="text-slate-500 text-[11px]">{act.message}</p>
                        <span className="text-[10px] text-slate-400 block">
                          {new Date(act.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. STUDENT / RESEARCHER DASHBOARD
  const stats = data?.stats || {
    activeProjects: 0,
    pendingApplications: 0,
    verifiedCredits: 0,
    earnings: 0,
  };
  const myProjects = data?.myProjects || [];
  const myApplications = data?.myApplications || [];
  const recentActivity = data?.recentActivity || [];
  const availableProjects = data?.availableProjects || [];
  const earningsSummary = data?.earningsSummary || {
    yourCredits: 0,
    totalCredits: 0,
    rewardPool: 0,
    sharePercent: 0,
    estimatedReward: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Find research work, track your contributions, and build your research profile.
          </p>
        </div>
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs shrink-0"
        >
          <Compass className="h-4 w-4" />
          Explore Projects
        </Link>
      </div>

      {/* Top 4 Compact Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Active Projects</span>
            <FolderKanban className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.activeProjects}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Pending Applications</span>
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.pendingApplications}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Verified Credits</span>
            <Award className="h-4 w-4 text-emerald-700" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{stats.verifiedCredits}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">Earnings</span>
            <Coins className="h-4 w-4 text-slate-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">₹{stats.earnings.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column (2 spans): My Projects & My Applications */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: My Projects */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">My Active Projects</h2>
              <Link href="/projects" className="text-xs font-semibold text-emerald-700 hover:underline">
                Explore more
              </Link>
            </div>

            <div className="mt-3">
              {myProjects.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs">No active projects yet.</p>
                  <Link
                    href="/projects"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
                  >
                    Explore Research Projects
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myProjects.map((p: any) => (
                    <div key={p.id} className="py-3.5 flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <Link
                          href={`/projects/${p.id}`}
                          className="text-xs font-bold text-slate-900 hover:text-emerald-700"
                        >
                          {p.title}
                        </Link>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {p.public_summary}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>Sponsor: <strong className="text-slate-700">{p.sponsor?.display_name || "Sponsor"}</strong></span>
                          <span>Status: <strong className="capitalize text-slate-700">{p.status}</strong></span>
                        </div>
                      </div>
                      <Link
                        href={`/projects/${p.id}?tab=workspace`}
                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Open Workspace
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: My Applications */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">My Applications</h2>
              <Link href="/applications" className="text-xs font-semibold text-emerald-700 hover:underline">
                View all
              </Link>
            </div>

            <div className="mt-3">
              {myApplications.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs">No applications submitted yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myApplications.map((app: any) => (
                    <div key={app.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="space-y-0.5">
                        <Link
                          href={`/projects/${app.project?.id}`}
                          className="text-xs font-semibold text-slate-900 hover:text-emerald-700"
                        >
                          {app.project?.title || "Research Project"}
                        </Link>
                        <p className="text-[11px] text-slate-500">
                          Sponsor: {app.project?.sponsor?.display_name || "Research Sponsor"} &bull; {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {renderApplicationStatusBadge(app.status)}
                        {app.status === "sponsor_invited" && (
                          <div className="flex items-center gap-1.5 ml-1">
                            <button
                              onClick={() => handleApplicationAction(app.id, app.project?.id || app.project_id, "accept")}
                              disabled={actionLoading === app.id}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                            >
                              {actionLoading === app.id ? "..." : "Accept"}
                            </button>
                            <button
                              onClick={() => handleApplicationAction(app.id, app.project?.id || app.project_id, "reject")}
                              disabled={actionLoading === app.id}
                              className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-md text-[11px] font-semibold transition-colors disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Available Projects (Section 15) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Available Projects</h2>
                <p className="text-[11px] text-slate-500">Open research projects open for applications</p>
              </div>
              <Link href="/projects" className="text-xs font-semibold text-emerald-700 hover:underline">
                Explore all &rarr;
              </Link>
            </div>

            <div className="mt-3">
              {availableProjects.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs">No open research projects found.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {availableProjects.map((proj: any) => (
                    <div
                      key={proj.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <Link
                          href={`/projects/${proj.id}`}
                          className="text-xs font-bold text-slate-900 hover:text-emerald-700 transition-colors"
                        >
                          {proj.title}
                        </Link>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          {proj.public_summary}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500">
                          <span>
                            Sponsor: <strong className="text-slate-700">{proj.sponsor?.display_name || "Sponsor"}</strong>
                          </span>
                          {proj.budget > 0 && (
                            <span>
                              Budget: <strong className="text-slate-700">₹{Number(proj.budget).toLocaleString()}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/projects/${proj.id}`}
                        className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shrink-0 self-start sm:self-center"
                      >
                        View Project
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Earnings Summary & Recent Activity */}
        <div className="space-y-6">
          {/* Section 4: Earnings & Credits Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Earnings &amp; Credits Summary
            </h2>

            <div className="mt-3 space-y-3">
              <p className="text-xs text-slate-600">
                Your earnings are based on the impact of your approved contributions.
              </p>

              <div className="rounded-lg bg-slate-50 p-3 border border-slate-200/80 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Your approved credits:</span>
                  <span className="font-bold text-slate-900">{earningsSummary.yourCredits}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Total project credits:</span>
                  <span className="font-semibold text-slate-800">{earningsSummary.totalCredits}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Student reward pool:</span>
                  <span className="font-semibold text-slate-800">₹{earningsSummary.rewardPool.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-xs">
                  <span className="font-semibold text-emerald-800">Estimated reward:</span>
                  <span className="font-bold text-emerald-800">₹{earningsSummary.estimatedReward.toLocaleString()}</span>
                </div>
              </div>

              {/* Proportional Formula Callout */}
              <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-100 text-[11px] text-emerald-900 font-mono">
                <p className="font-semibold text-[10px] uppercase text-emerald-700 tracking-wider mb-1">
                  Proportional Formula
                </p>
                Your reward = Student reward pool &times; (Your approved credits &divide; Total approved credits)
              </div>
            </div>
          </div>

          {/* Section 3: Recent Activity */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
              Recent Activity
            </h2>

            <div className="mt-3">
              {recentActivity.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  No recent activity records.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((act: any) => (
                    <div key={act.id} className="text-xs space-y-0.5">
                      <p className="font-semibold text-slate-800">{act.title}</p>
                      <p className="text-slate-500 text-[11px]">{act.message}</p>
                      <span className="text-[10px] text-slate-400 block">
                        {new Date(act.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

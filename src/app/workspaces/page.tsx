"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Briefcase, ArrowRight, ShieldCheck, FolderKanban, RefreshCw } from "lucide-react";

export default function WorkspacesPage() {
  const { user, profile, session } = useAuth();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWorkspaces = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setWorkspaces(d.myProjects || d.projects || []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Research Workspaces
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Access active repositories, milestone tasks, and submit peer-reviewed contributions.
          </p>
        </div>

        <button
          onClick={fetchWorkspaces}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 self-start sm:self-auto transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/4" />
          <div className="h-10 bg-slate-100 rounded" />
        </div>
      ) : workspaces.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-3">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No active workspaces</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Once your project agreement is accepted and approved by the sponsor, your workspace will appear here.
          </p>
          <Link
            href="/projects"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            Explore Projects
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Workspace Active
                  </span>
                  <span className="text-xs text-slate-500 capitalize">
                    {ws.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900">
                  <Link href={`/projects/${ws.id}`} className="hover:text-emerald-700">
                    {ws.title}
                  </Link>
                </h3>

                <p className="text-xs text-slate-600 line-clamp-2">
                  {ws.public_summary}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Sponsor: <strong className="text-slate-800">{ws.sponsor?.display_name || "Research Sponsor"}</strong>
                </span>

                <Link
                  href={`/projects/${ws.id}?tab=workspace`}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

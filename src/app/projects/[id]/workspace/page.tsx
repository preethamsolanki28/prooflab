"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { BrowserIDE } from "@/components/workspace/BrowserIDE";
import {
  ChevronRight,
  Terminal,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const { user, profile, session } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<{
    id: string;
    title: string;
    public_summary?: string;
    data_sensitivity?: string;
    github_repo_url?: string | null;
    status?: string;
  } | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [isSponsor, setIsSponsor] = useState(false);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        setError(null);
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        const res = await fetch(`/api/projects/${projectId}`, { headers });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to load project details");
        }
        setProjectData(data.project);
        setIsMember(Boolean(data.isMember));
        setIsSponsor(Boolean(data.isSponsor));
      } catch (err: any) {
        setError(err.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    }
    if (projectId) {
      loadProject();
    }
  }, [projectId, session?.access_token]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">Loading Project Workspace...</p>
        <p className="text-xs text-slate-500 mt-1">Preparing sandbox environment</p>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-rose-800">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-2">Workspace Unavailable</h2>
          <p className="text-sm text-rose-700 mb-6">{error || "Project could not be found."}</p>
          <Link
            href="/projects"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Link href="/projects" className="hover:text-slate-900 transition-colors">
            Projects
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <Link
            href={`/projects/${projectData.id}`}
            className="hover:text-slate-900 font-medium text-slate-700 truncate max-w-xs transition-colors"
          >
            {projectData.title}
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">Workspace</span>
        </div>

        <div className="flex items-center gap-2">
          {projectData.github_repo_url && (
            <a
              href={projectData.github_repo_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              <span>GitHub Repository</span>
            </a>
          )}
          <Link
            href={`/projects/${projectData.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-colors"
          >
            <span>Project Details</span>
          </Link>
        </div>
      </div>

      {/* Primary In-Dashboard IDE */}
      <BrowserIDE
        projectId={projectData.id}
        projectTitle={projectData.title}
        projectSummary={projectData.public_summary}
        dataSensitivity={projectData.data_sensitivity}
        githubRepoUrl={projectData.github_repo_url}
        token={session?.access_token}
        isApprovedMember={isMember}
        isSponsor={isSponsor}
        initialTab="code"
      />
    </div>
  );
}

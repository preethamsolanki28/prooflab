"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProjectCard, ProjectCardData } from "@/components/projects/project-card";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  RefreshCw,
  FolderKanban,
} from "lucide-react";

function ProjectsContent() {
  const { user, profile, session } = useAuth();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [userApplications, setUserApplications] = useState<any[]>([]);
  const [userMemberships, setUserMemberships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeFilter, setActiveFilter] = useState<"all" | "open" | "applications" | "my_projects">("all");

  const isSponsor = profile?.role === "sponsor" || profile?.role === "admin";

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/projects");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load projects");
      }
      setProjects(data.projects || []);

      // If user is authenticated, fetch their applications and memberships to populate filters
      if (session?.access_token) {
        const appsRes = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (appsRes.ok) {
          const dash = await appsRes.json();
          setUserApplications(dash.myApplications || dash.pendingApplications || []);
          setUserMemberships(dash.myProjects || dash.projects || []);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [session?.access_token]);

  // Combined projects with user application statuses
  const projectsWithStatus = useMemo(() => {
    const appMap = new Map();
    userApplications.forEach((a) => {
      const pId = a.project?.id || a.project_id;
      if (pId) appMap.set(pId, a.status);
    });

    return projects.map((p) => ({
      ...p,
      user_application_status: appMap.get(p.id) || null,
    }));
  }, [projects, userApplications]);

  const filteredProjects = useMemo(() => {
    return projectsWithStatus.filter((proj) => {
      // 1. Filter tabs
      if (activeFilter === "open") {
        if (proj.status !== "active") return false;
      } else if (activeFilter === "applications") {
        const hasApplied = userApplications.some(
          (a) => (a.project?.id || a.project_id) === proj.id
        );
        if (!hasApplied) return false;
      } else if (activeFilter === "my_projects") {
        const isMine =
          proj.sponsor_id === user?.id ||
          userMemberships.some((m) => m.id === proj.id);
        if (!isMine) return false;
      }

      // 2. Search query filter
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const titleMatch = proj.title?.toLowerCase().includes(q);
        const summaryMatch = proj.public_summary?.toLowerCase().includes(q);
        const sponsorMatch = proj.profiles?.display_name?.toLowerCase().includes(q);
        const skillMatch = (proj.skills_needed || []).some((s: string) =>
          s.toLowerCase().includes(q)
        );
        if (!titleMatch && !summaryMatch && !sponsorMatch && !skillMatch) return false;
      }

      return true;
    });
  }, [projectsWithStatus, activeFilter, searchQuery, user?.id, userApplications, userMemberships]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Explore Research Projects
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse verified research initiatives, review project agreements, and apply to contribute.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSponsor && (
            <Link
              href="/projects/new"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Post Project
            </Link>
          )}

          <button
            onClick={fetchProjects}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
            title="Refresh projects"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Simple Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
              activeFilter === "all"
                ? "bg-emerald-700 text-white font-semibold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All Projects
          </button>
          <button
            onClick={() => setActiveFilter("open")}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
              activeFilter === "open"
                ? "bg-emerald-700 text-white font-semibold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Open for Applications
          </button>
          {user && (
            <>
              <button
                onClick={() => setActiveFilter("applications")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                  activeFilter === "applications"
                    ? "bg-emerald-700 text-white font-semibold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                My Applications
              </button>
              <button
                onClick={() => setActiveFilter("my_projects")}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                  activeFilter === "my_projects"
                    ? "bg-emerald-700 text-white font-semibold shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                My Projects
              </button>
            </>
          )}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search title, skills, sponsor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 rounded-xl border border-slate-200 bg-white p-5 animate-pulse space-y-3">
              <div className="h-4 bg-slate-100 rounded w-1/3" />
              <div className="h-6 bg-slate-100 rounded w-3/4" />
              <div className="h-12 bg-slate-100 rounded" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-3">
            <FolderKanban className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No projects found</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? `No research projects matched "${searchQuery}". Try adjusting your search query.`
              : activeFilter === "applications"
              ? "You have not submitted applications to any projects yet."
              : activeFilter === "my_projects"
              ? "You are not an active member or sponsor of any projects yet."
              : "No research projects are currently open. Be the first sponsor to post one!"}
          </p>

          {isSponsor && (
            <Link
              href="/projects/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
            >
              <PlusCircle className="h-3.5 w-3.5" />
              Post Research Project
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading projects...</div>}>
      <ProjectsContent />
    </React.Suspense>
  );
}

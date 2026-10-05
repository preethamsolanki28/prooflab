"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { ProjectCard, ProjectCardData } from "@/components/projects/project-card";
import { useAuth } from "@/lib/auth/auth-context";
import {
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  Lock,
  Coins,
  Award,
  RefreshCw,
} from "lucide-react";

export default function ProjectsPage() {
  const { profile } = useAuth();
  const [projects, setProjects] = useState<ProjectCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "funded" | "knowledge" | "confidential" | "public">("all");

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
    } catch (err: any) {
      setError(err.message || "Failed to connect to database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    return projects.filter((proj) => {
      // Filter by category
      if (activeTab === "funded") {
        const isFunded =
          proj.engagement_model?.toUpperCase() === "FUNDED" ||
          proj.engagement_model === "bounty_milestones";
        if (!isFunded) return false;
      } else if (activeTab === "knowledge") {
        const isKnowledge =
          proj.engagement_model?.toUpperCase() === "KNOWLEDGE-SHARING" ||
          proj.engagement_model === "academic_credits";
        if (!isKnowledge) return false;
      } else if (activeTab === "confidential") {
        if (proj.data_sensitivity !== "confidential") return false;
      } else if (activeTab === "public") {
        if (proj.data_sensitivity !== "public") return false;
      }

      // Filter by search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const titleMatch = proj.title?.toLowerCase().includes(q);
        const summaryMatch = proj.public_summary?.toLowerCase().includes(q);
        const sponsorMatch = proj.profiles?.display_name?.toLowerCase().includes(q);
        if (!titleMatch && !summaryMatch && !sponsorMatch) return false;
      }

      return true;
    });
  }, [projects, activeTab, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            Charter-Enforced Research Projects
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Research Projects Directory
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Browse active research initiatives. Review terms, project charters, and milestone scopes before participating.
            Confidential research briefs are strictly protected by Row-Level Security.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProjects}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Refresh Projects"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/projects/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Post New Project
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        {/* Category Tabs */}
        <div className="inline-flex p-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600 overflow-x-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeTab === "all" ? "bg-white text-indigo-700 font-semibold shadow-xs" : "hover:text-slate-900"
            }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveTab("funded")}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap ${
              activeTab === "funded" ? "bg-white text-indigo-700 font-semibold shadow-xs" : "hover:text-slate-900"
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-indigo-600" />
            Funded
          </button>
          <button
            onClick={() => setActiveTab("knowledge")}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap ${
              activeTab === "knowledge" ? "bg-white text-purple-700 font-semibold shadow-xs" : "hover:text-slate-900"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-purple-600" />
            Knowledge-Sharing
          </button>
          <button
            onClick={() => setActiveTab("confidential")}
            className={`px-3 py-1.5 rounded-md transition-colors flex items-center gap-1 whitespace-nowrap ${
              activeTab === "confidential" ? "bg-white text-rose-700 font-semibold shadow-xs" : "hover:text-slate-900"
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-rose-600" />
            Confidential
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects, keywords, sponsor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">Loading research projects...</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-center text-rose-700">
          <p className="text-sm font-semibold mb-2">Error loading projects</p>
          <p className="text-xs text-rose-600 mb-4">{error}</p>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700"
          >
            Try Again
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="py-16 text-center bg-white border border-slate-200 rounded-xl p-8">
          <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No matching projects found</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No research projects match "${searchQuery}". Try modifying your search or clearing filters.`
              : "No projects in this category yet. Be the first sponsor to post one!"}
          </p>
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

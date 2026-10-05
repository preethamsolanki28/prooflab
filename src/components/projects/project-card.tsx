import React from "react";
import Link from "next/link";
import { Shield, Lock, Globe, Coins, Award, ArrowRight, UserCheck } from "lucide-react";

export interface ProjectCardData {
  id: string;
  title: string;
  public_summary: string;
  engagement_model: string;
  data_sensitivity: "confidential" | "public" | string;
  status: string;
  created_at: string;
  profiles?: {
    display_name?: string;
  };
  charters?: Array<{
    id: string;
    version: number;
    budget: number;
    engagement_model: string;
    milestones_json?: any[];
  }>;
}

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const isConfidential = project.data_sensitivity === "confidential";
  const isFunded = project.engagement_model?.toUpperCase() === "FUNDED" || project.engagement_model === "bounty_milestones";
  const charter = project.charters?.[0];
  const budget = charter?.budget ?? (isFunded ? 100000 : 0);
  const milestoneCount = Array.isArray(charter?.milestones_json) ? charter.milestones_json.length : 2;
  const sponsorName = project.profiles?.display_name || "Research Sponsor";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      <div className="p-6">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {/* Sensitivity Badge */}
          {isConfidential ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              Confidential Data · On-Device AI
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              Public Data · Cloud AI Permitted
            </span>
          )}

          {/* Engagement Badge */}
          {isFunded ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Coins className="w-3.5 h-3.5 text-indigo-600" />
              Funded (₹{budget.toLocaleString("en-IN")})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              Knowledge-Sharing (Credits)
            </span>
          )}
        </div>

        {/* Project Title */}
        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-2">
          {project.title}
        </h3>

        {/* Public Summary */}
        <p className="text-sm text-slate-600 line-clamp-3 mb-4 leading-relaxed">
          {project.public_summary}
        </p>

        {/* Meta Pills */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-slate-500 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Sponsor: <strong className="text-slate-700 font-medium">{sponsorName}</strong></span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>Milestones: <strong className="text-slate-700 font-medium">{milestoneCount} Planned</strong></span>
          </div>
          <div className="text-slate-400">
            Charter: <span className="font-mono text-slate-600">v{charter?.version || 1}</span>
          </div>
        </div>
      </div>

      {/* Card Footer */}
      <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          RLS Gated Access
        </span>
        <Link
          href={`/projects/${project.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          View Charter & Brief
          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}

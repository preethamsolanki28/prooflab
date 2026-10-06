import React from "react";
import Link from "next/link";
import { Lock, Globe, ArrowRight, UserCheck, ShieldCheck } from "lucide-react";

export interface ProjectCardData {
  id: string;
  title: string;
  public_summary: string;
  engagement_model?: string;
  data_sensitivity?: "confidential" | "public" | string;
  status: string;
  created_at: string;
  budget?: number;
  requirements?: string;
  deliverables?: string;
  skills_needed?: string[];
  sponsor_id?: string;
  user_application_status?: string | null;
  profiles?: {
    id?: string;
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
  const charter = project.charters?.[0];
  const budget = Number(project.budget || charter?.budget || 0);
  const milestoneCount = Array.isArray(charter?.milestones_json) ? charter.milestones_json.length : 2;
  const sponsorName = project.profiles?.display_name || "Research Sponsor";
  const sponsorId = project.sponsor_id || project.profiles?.id;
  const skills = project.skills_needed && project.skills_needed.length > 0
    ? project.skills_needed
    : (charter?.milestones_json?.[0]?.required_skills || ["Research", "Implementation"]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between overflow-hidden">
      <div className="p-5">
        {/* Top Meta Header */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>
              Sponsor:{" "}
              {sponsorId ? (
                <Link
                  href={`/profile/${sponsorId}`}
                  className="font-medium text-slate-800 hover:text-emerald-700 hover:underline"
                >
                  {sponsorName}
                </Link>
              ) : (
                <span className="font-medium text-slate-800">{sponsorName}</span>
              )}
            </span>
          </div>

          {/* Privacy badge */}
          {isConfidential ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <Lock className="w-3 h-3 text-slate-500" />
              Confidential Brief
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Globe className="w-3 h-3 text-emerald-600" />
              Public Project
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 line-clamp-2 mb-2">
          <Link href={`/projects/${project.id}`} className="hover:text-emerald-700 transition-colors">
            {project.title}
          </Link>
        </h3>

        {/* Public Summary */}
        <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
          {project.public_summary}
        </p>

        {/* Skills needed tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {skills.slice(0, 4).map((skill: string) => (
            <span
              key={skill}
              className="text-[10px] bg-slate-50 text-slate-600 border border-slate-200/80 px-2 py-0.5 rounded font-medium"
            >
              {skill}
            </span>
          ))}
          {skills.length > 4 && (
            <span className="text-[10px] text-slate-400 self-center">
              +{skills.length - 4} more
            </span>
          )}
        </div>
      </div>

      {/* Footer / Action row */}
      <div className="px-5 py-3 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs">
        <div>
          <span className="text-[10px] text-slate-400 block uppercase font-medium tracking-wider">
            Reward Pool
          </span>
          <span className="font-bold text-slate-900">
            {budget > 0 ? `₹${budget.toLocaleString("en-IN")}` : "Research Credits"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {project.user_application_status === "pending_expert_review" && (
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Waiting for approval
            </span>
          )}
          {project.user_application_status === "accepted" && (
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Approved
            </span>
          )}

          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 transition-colors shadow-2xs"
          >
            <span>View Project</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

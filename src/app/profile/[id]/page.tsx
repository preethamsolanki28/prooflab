"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Star,
  ShieldCheck,
  Award,
  FolderCheck,
  MessageSquare,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  User,
  ThumbsUp,
} from "lucide-react";

interface ProfileData {
  profile: {
    id: string;
    display_name: string;
    role: string;
    skills: string[];
    verified: boolean;
    created_at: string;
  };
  stats: {
    projects_completed: number;
    total_research_credits: number;
    total_reviews: number;
    overall_rating: number;
    work_quality: number;
    reliability: number;
    communication: number;
    has_reviews: boolean;
  };
  reviews: Array<{
    id: string;
    reviewer_name: string;
    reviewer_role: string;
    project_title: string;
    work_quality: number;
    reliability: number;
    communication: number;
    comment: string;
    created_at: string;
  }>;
}

export default function ProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const profileId = resolvedParams.id;

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/profile/${profileId}`);
        const resData = await res.json();
        if (!res.ok) {
          throw new Error(resData.error || "Profile not found");
        }
        setData(resData);
      } catch (err: any) {
        setError(err.message || "Failed to load user profile");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [profileId]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#3730A3] border-t-transparent" />
          <p className="text-xs text-slate-500 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-sm font-bold text-red-900">Profile Not Found</h2>
          <p className="mt-1 text-xs text-red-700">{error || "User could not be found."}</p>
          <Link
            href="/projects"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3.5 py-2 text-xs font-semibold text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const { profile, stats, reviews } = data;

  const roleBadgeStyles: Record<string, string> = {
    student: "bg-blue-100 text-blue-800 border-blue-200",
    expert: "bg-emerald-100 text-emerald-800 border-emerald-200",
    sponsor: "bg-purple-100 text-purple-800 border-purple-200",
    admin: "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Navigation Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Projects
        </Link>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#3730A3] to-indigo-500 text-white shadow-sm font-bold text-xl uppercase">
              {profile.display_name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {profile.display_name}
                </h1>
                {profile.verified && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200"
                    title="Verified Platform Member"
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] uppercase font-bold tracking-wider border ${
                    roleBadgeStyles[profile.role] || "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {profile.role}
                </span>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">
                  Member since {new Date(profile.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-center min-w-[90px]">
              <span className="text-lg font-bold text-slate-900">
                {stats.projects_completed}
              </span>
              <span className="text-[10px] uppercase font-semibold text-slate-500">
                Projects
              </span>
            </div>

            {profile.role === "student" && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-indigo-200 bg-indigo-50/60 px-4 py-2.5 text-center min-w-[90px]">
                <span className="text-lg font-bold text-indigo-900">
                  {stats.total_research_credits}
                </span>
                <span className="text-[10px] uppercase font-semibold text-indigo-700">
                  Credits
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Skills Section */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Skills & Expertise
            </h2>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {profile.skills.map((skill, idx) => (
                <span
                  key={idx}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ratings & Collaboration Overview */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Overall Rating Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Overall Rating
            </h2>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900">
                {stats.overall_rating}
              </span>
              <span className="text-sm font-semibold text-slate-400">/ 5.0</span>
            </div>
            <div className="mt-2 flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(stats.overall_rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-slate-200"
                  }`}
                />
              ))}
              <span className="ml-1.5 text-xs font-medium text-slate-600">
                ({stats.total_reviews} {stats.total_reviews === 1 ? "review" : "reviews"})
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            {stats.has_reviews
              ? `Derived server-side from verified project reviews.`
              : `New platform participant. Initial baseline score shown.`}
          </p>
        </div>

        {/* Rating Category Breakdown */}
        <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Performance Breakdown
          </h2>

          <div className="space-y-4">
            {/* Work Quality */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">Work Quality</span>
                <span className="text-slate-900 font-bold">{stats.work_quality} / 5.0</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all"
                  style={{ width: `${(stats.work_quality / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Reliability / Trustworthiness */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">Reliability / Trustworthiness</span>
                <span className="text-slate-900 font-bold">{stats.reliability} / 5.0</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{ width: `${(stats.reliability / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Communication */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-slate-700">Communication</span>
                <span className="text-slate-900 font-bold">{stats.communication} / 5.0</span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all"
                  style={{ width: `${(stats.communication / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collaborator Feedback & Reviews List */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-[#3730A3]" />
            Collaborator Reviews ({reviews.length})
          </h2>
          <span className="text-xs text-slate-500">
            Reviews from completed research projects
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
            <p className="text-xs text-slate-500">
              No written collaborator reviews yet. Reviews become available once completed projects are rated.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {rev.reviewer_name}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {rev.reviewer_role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Project: <span className="text-slate-600 font-medium">{rev.project_title}</span>
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(rev.created_at).toLocaleDateString()}
                  </span>
                </div>

                {rev.comment && (
                  <p className="mt-3 text-xs text-slate-700 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                )}

                <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <span>Work Quality: <strong className="text-slate-700">{rev.work_quality}/5</strong></span>
                  <span>Reliability: <strong className="text-slate-700">{rev.reliability}/5</strong></span>
                  <span>Communication: <strong className="text-slate-700">{rev.communication}/5</strong></span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

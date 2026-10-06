"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ShieldCheck,
  Star,
  Award,
  CheckCircle2,
  Calendar,
  MessageSquare,
  ExternalLink,
  Edit3,
  Save,
  FolderKanban,
  User,
  ArrowLeft,
} from "lucide-react";

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...props}>
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user, session } = useAuth();

  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [githubInput, setGithubInput] = useState("");
  const [linkedinInput, setLinkedinInput] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [saveLoading, setSaveLoading] = useState(false);

  const isOwner = user?.id === id;

  async function fetchProfile() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/profile/${id}`);
      if (!res.ok) {
        throw new Error("Profile not found");
      }
      const data = await res.json();
      setProfile(data.profile);
      setStats(data.stats);
      setReviews(data.reviews || []);
      setBioInput(data.profile?.bio || "");
      setGithubInput(data.profile?.github_url || "");
      setLinkedinInput(data.profile?.linkedin_url || "");
      setSkillsInput((data.profile?.skills || []).join(", "));
    } catch (err: any) {
      setError(err.message || "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      fetchProfile();
    }
  }, [id]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token || !isOwner) return;

    try {
      setSaveLoading(true);
      const parsedSkills = skillsInput
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch(`/api/profile/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          bio: bioInput.trim(),
          github_url: githubInput.trim(),
          linkedin_url: linkedinInput.trim(),
          skills: parsedSkills,
        }),
      });

      if (!res.ok) throw new Error("Failed to update profile");
      const json = await res.json();
      setProfile(json.profile);
      setIsEditing(false);
    } catch (err: any) {
      alert(err.message || "Could not save profile");
    } finally {
      setSaveLoading(false);
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3.5 w-3.5 ${
              star <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "text-slate-300"
            }`}
          />
        ))}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="rounded-xl border border-slate-200 bg-white p-8 animate-pulse space-y-4">
          <div className="h-16 w-16 bg-slate-100 rounded-full" />
          <div className="h-6 w-1/3 bg-slate-100 rounded" />
          <div className="h-4 w-1/2 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-12 text-center">
        <h2 className="text-sm font-bold text-slate-800">Profile Not Found</h2>
        <p className="text-xs text-slate-500 mt-1">This user profile does not exist.</p>
        <button
          onClick={() => router.back()}
          className="mt-4 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </button>

      {/* Main Profile Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-700 text-white text-2xl font-bold shrink-0 shadow-2xs">
              {profile.display_name?.charAt(0) || "U"}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  {profile.display_name}
                </h1>
                {profile.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    Verified
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 capitalize font-medium">
                {profile.role} &bull; Member since {new Date(profile.created_at).getFullYear()}
              </p>

              {/* Bio */}
              <p className="text-xs text-slate-700 mt-2 max-w-xl leading-relaxed">
                {profile.bio || "No bio added yet."}
              </p>

              {/* Social Links (Dynamic from DB) */}
              <div className="flex items-center gap-3 pt-2">
                {profile.github_url ? (
                  <a
                    href={profile.github_url.startsWith("http") ? profile.github_url : `https://${profile.github_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <GithubIcon className="h-3.5 w-3.5" />
                    <span>GitHub</span>
                  </a>
                ) : isOwner ? (
                  <span className="text-[11px] text-slate-400">Add GitHub in Edit Profile</span>
                ) : null}

                {profile.linkedin_url ? (
                  <a
                    href={profile.linkedin_url.startsWith("http") ? profile.linkedin_url : `https://${profile.linkedin_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-emerald-700 transition-colors"
                  >
                    <LinkedinIcon className="h-3.5 w-3.5 text-blue-600" />
                    <span>LinkedIn</span>
                  </a>
                ) : isOwner ? (
                  <span className="text-[11px] text-slate-400">Add LinkedIn in Edit Profile</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Owner Edit Action */}
          {isOwner && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shrink-0 self-start"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit Profile
            </button>
          )}
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-slate-200 space-y-4">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Edit Your Profile Information
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700">Bio</label>
              <textarea
                rows={2}
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value)}
                placeholder="Share your research background, university, or interests..."
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">GitHub Profile URL</label>
                <input
                  type="text"
                  value={githubInput}
                  onChange={(e) => setGithubInput(e.target.value)}
                  placeholder="https://github.com/username"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">LinkedIn Profile URL</label>
                <input
                  type="text"
                  value={linkedinInput}
                  onChange={(e) => setLinkedinInput(e.target.value)}
                  placeholder="https://linkedin.com/in/username"
                  className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Skills (comma-separated)</label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                placeholder="PyTorch, Computer Vision, TypeScript, Python"
                className="mt-1 w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
              >
                {saveLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Skills Tags */}
        {profile.skills && profile.skills.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Skills &amp; Expertise
            </span>
            <div className="flex flex-wrap gap-1.5">
              {profile.skills.map((s: string) => (
                <span
                  key={s}
                  className="text-xs bg-slate-50 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-md font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats & Ratings Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Overall Rating Card */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
          <span className="text-xs font-bold text-slate-900 block">Overall Collaborator Rating</span>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats?.overall_rating || "5.0"}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          {renderStars(stats?.overall_rating || 5.0)}
          <p className="text-[11px] text-slate-500">
            Based on <strong>{stats?.total_reviews || 0}</strong> verified project reviews
          </p>

          <div className="pt-3 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Work Quality:</span>
              <strong className="text-slate-800">{stats?.work_quality || "5.0"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Reliability:</span>
              <strong className="text-slate-800">{stats?.reliability || "5.0"}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Communication:</span>
              <strong className="text-slate-800">{stats?.communication || "5.0"}</strong>
            </div>
          </div>
        </div>

        {/* Projects Completed */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 block">Completed Projects</span>
            <p className="mt-3 text-3xl font-extrabold text-slate-900">
              {stats?.projects_completed || 0}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Collaborated on research initiatives with students, sponsors, and domain experts.
          </p>
        </div>

        {/* Verified Research Credits */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-bold text-slate-900 block">Research Credits Earned</span>
            <p className="mt-3 text-3xl font-extrabold text-emerald-800">
              {stats?.total_research_credits || 0}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Derived directly from peer-reviewed contributions across active research milestones.
          </p>
        </div>
      </div>

      {/* Collaborator Feedback & Reviews List */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
          <span>Collaborator Feedback &amp; Reviews</span>
          <span className="text-xs font-medium text-slate-400">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </span>
        </h2>

        <div className="mt-4">
          {reviews.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No collaborator reviews received yet. Reviews are posted after project completion.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 space-y-4">
              {reviews.map((rev: any) => (
                <div key={rev.id} className="pt-4 first:pt-0 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div>
                      <span className="text-xs font-bold text-slate-900">{rev.reviewer_name}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({rev.reviewer_role})</span>
                      <span className="text-[11px] text-slate-500 block">
                        Project: <em>{rev.project_title}</em>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderStars(rev.work_quality || 5)}
                      <span className="text-[10px] text-slate-400">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {rev.comment && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200/80 leading-relaxed">
                      &ldquo;{rev.comment}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

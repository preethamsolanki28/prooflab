"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ShieldCheck,
  Lock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Plus,
  Trash2,
  FileText,
  Clock,
  Coins,
} from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const { user, profile, session } = useAuth();

  const [loading, setLoading] = useState(false);
  const [aiScopingLoading, setAiScopingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiSuccessBadge, setAiSuccessBadge] = useState<string | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [skillsNeeded, setSkillsNeeded] = useState("Python, Machine Learning, Data Processing");
  const [deliverables, setDeliverables] = useState("");
  const [timeline, setTimeline] = useState("6-8 weeks");
  const [budget, setBudget] = useState(100000);

  // Milestones State
  const [milestones, setMilestones] = useState([
    {
      title: "Milestone 1: Baseline Architecture & Pipeline",
      description: "Setup reproducible data ingestion and baseline model benchmark.",
      skills: "Python, PyTorch",
      budget: 50000,
    },
    {
      title: "Milestone 2: Validation & Final Evaluation Report",
      description: "Evaluate accuracy benchmarks and author technical report.",
      skills: "Model Evaluation, Biostatistics",
      budget: 50000,
    },
  ]);

  // Confidential Information Box (Optional, separate)
  const [confidentialBrief, setConfidentialBrief] = useState("");

  // User Agreement (Sponsor writes/pastes)
  const [agreementText, setAgreementText] = useState(`PROJECT AGREEMENT
1. Work Expectations: Contributors agree to deliver reproducible code and evaluation documentation according to milestone criteria.
2. Review & Attribution: All contributions are human-reviewed before research credits are derived.
3. Proportional Rewards: The student reward pool is distributed proportional to reviewed impact scores.
4. Ownership & License: Open research with attribution to human contributors; sponsor receives non-exclusive commercial rights.
5. Confidentiality: Confidential datasets and briefs are restricted to verified contributors and must never be shared or sent to unauthorized cloud services.
6. Exit & Disputes: Contributors retain credit for reviewed and accepted contributions. Disagreements are subject to administrative review.`);

  const isSponsorOrAdmin = profile?.role === "sponsor" || profile?.role === "admin";

  // AI Assist Scoping
  async function handleAiAssist() {
    if (!title && !description) {
      setError("Please provide at least a Project Title or Description to generate AI suggestions.");
      return;
    }
    setError(null);
    setAiScopingLoading(true);
    setAiSuccessBadge(null);

    try {
      const res = await fetch("/api/ai/scope-draft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          title,
          description,
          requirements,
          confidential_brief: confidentialBrief,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI scoping failed");

      if (data.requirements) setRequirements(data.requirements);
      if (data.deliverables) setDeliverables(data.deliverables);
      if (data.skills_needed && Array.isArray(data.skills_needed)) {
        setSkillsNeeded(data.skills_needed.join(", "));
      }
      if (data.milestones && Array.isArray(data.milestones)) {
        const halfBudget = budget > 0 ? Math.floor(budget / data.milestones.length) : 0;
        setMilestones(
          data.milestones.map((m: any, idx: number) => ({
            title: m.title || `Milestone ${idx + 1}`,
            description: m.description || "",
            skills: Array.isArray(m.required_skills) ? m.required_skills.join(", ") : "Research",
            budget: halfBudget,
          }))
        );
      }
      setAiSuccessBadge(data.routeBadge || "AI Scoping Generated");
    } catch (err: any) {
      setError(err.message || "Failed to generate AI scoping suggestions.");
    } finally {
      setAiScopingLoading(false);
    }
  }

  function addMilestone() {
    setMilestones([
      ...milestones,
      {
        title: `Milestone ${milestones.length + 1}: `,
        description: "",
        skills: "Python",
        budget: 0,
      },
    ]);
  }

  function removeMilestone(idx: number) {
    if (milestones.length <= 1) return;
    setMilestones(milestones.filter((_, i) => i !== idx));
  }

  function updateMilestone(idx: number, field: string, val: any) {
    const updated = [...milestones];
    updated[idx] = { ...updated[idx], [field]: val };
    setMilestones(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) {
      setError("You must be signed in to post a project.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError("Please fill in the project title and description.");
      return;
    }

    if (!agreementText.trim()) {
      setError("Please provide the User Agreement terms before posting.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const parsedSkills = skillsNeeded
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const formattedMilestones = milestones.map((m, idx) => ({
        id: idx + 1,
        title: m.title.trim(),
        description: m.description.trim(),
        budget: Number(m.budget) || 0,
        required_skills: m.skills.split(",").map((s) => s.trim()).filter(Boolean),
        acceptance_criteria: ["Code quality verification", "Reproducible benchmarks"],
      }));

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          requirements: requirements.trim(),
          deliverables: deliverables.trim(),
          skills_needed: parsedSkills,
          timeline: timeline.trim(),
          budget: Number(budget) || 0,
          confidential_brief: confidentialBrief.trim(),
          agreement_text: agreementText.trim(),
          milestones: formattedMilestones,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish project.");
      }

      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.message || "Failed to post project.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Post Research Project
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Describe the problem, define deliverables, set contributor agreement rules, and publish for student applications.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {aiSuccessBadge && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{aiSuccessBadge}: Scoping requirements and milestones generated below. Please review and refine.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Project Details */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Project Details</h2>
            <button
              type="button"
              onClick={handleAiAssist}
              disabled={aiScopingLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
              <span>{aiScopingLoading ? "Scoping with AI..." : "AI Assist Scoping"}</span>
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Diabetic Retinopathy Screening on Edge Devices"
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Project Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what needs to be researched, built, or evaluated in plain English..."
              required
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Skills Needed
              </label>
              <input
                type="text"
                value={skillsNeeded}
                onChange={(e) => setSkillsNeeded(e.target.value)}
                placeholder="e.g. Python, PyTorch, Computer Vision"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">Comma-separated</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Timeline / Duration
              </label>
              <input
                type="text"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="e.g. 6-8 weeks"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">
                Budget / Student Reward Pool (₹)
              </label>
              <input
                type="number"
                min={0}
                step={5000}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400">Enter 0 for non-monetary credit &amp; credential projects</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">
                Expected Deliverables
              </label>
              <input
                type="text"
                value={deliverables}
                onChange={(e) => setDeliverables(e.target.value)}
                placeholder="e.g. Trained checkpoints, test suite, evaluation paper"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">
              Technical Requirements &amp; Prerequisites
            </label>
            <textarea
              rows={2}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Hardware constraints, dataset prerequisites, or specific libraries..."
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Section 2: Milestones */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Project Milestones</h2>
              <p className="text-[11px] text-slate-500">Break project into reviewed milestones</p>
            </div>
            <button
              type="button"
              onClick={addMilestone}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-3 w-3" />
              Add Milestone
            </button>
          </div>

          <div className="space-y-3">
            {milestones.map((m, idx) => (
              <div key={idx} className="rounded-lg border border-slate-200 p-3.5 bg-slate-50/50 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Milestone {idx + 1}
                  </span>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(idx)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={m.title}
                      onChange={(e) => updateMilestone(idx, "title", e.target.value)}
                      placeholder="Milestone title"
                      required
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      min={0}
                      value={m.budget}
                      onChange={(e) => updateMilestone(idx, "budget", Number(e.target.value))}
                      placeholder="Budget (₹)"
                      className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <textarea
                  rows={2}
                  value={m.description}
                  onChange={(e) => updateMilestone(idx, "description", e.target.value)}
                  placeholder="What will contributors deliver for this milestone?"
                  required
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Confidential Information (Separate Box) */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-900">Confidential Information</h2>
            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.2 rounded font-medium">
              Optional
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Only authorized, accepted project members can access this information. Public project listings will NOT expose this.
          </p>

          <textarea
            rows={3}
            value={confidentialBrief}
            onChange={(e) => setConfidentialBrief(e.target.value)}
            placeholder="Confidential dataset locations, unreleased weights, internal API keys, patient cohorts..."
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-900 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>

        {/* Section 4: User Agreement */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xs space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-emerald-700" />
            <h2 className="text-sm font-bold text-slate-900">User Agreement</h2>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 px-2 py-0.2 rounded font-medium">
              Required
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Contributors must review and accept these terms before applying. Describe the responsibilities, contribution review, rewards, ownership, confidentiality, and dispute terms.
          </p>

          <textarea
            rows={7}
            value={agreementText}
            onChange={(e) => setAgreementText(e.target.value)}
            required
            className="w-full font-mono text-[11px] leading-relaxed rounded-lg border border-slate-200 p-3 text-slate-800 focus:border-emerald-600 focus:outline-hidden"
          />
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors shadow-2xs disabled:opacity-50"
          >
            {loading ? "Publishing..." : "Publish Research Project"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Globe,
  Coins,
  Award,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Info,
} from "lucide-react";

export default function NewProjectPage() {
  const router = useRouter();
  const { user, profile, session, switchPersona } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [publicSummary, setPublicSummary] = useState("");
  const [engagementModel, setEngagementModel] = useState<"FUNDED" | "KNOWLEDGE-SHARING">("FUNDED");
  const [dataSensitivity, setDataSensitivity] = useState<"confidential" | "public">("confidential");
  const [budget, setBudget] = useState(100000);
  const [confidentialBrief, setConfidentialBrief] = useState("");

  // Milestone state
  const [m1Title, setM1Title] = useState("Milestone 1: Baseline Architecture & Edge Quantization");
  const [m1Budget, setM1Budget] = useState(50000);
  const [m1Desc, setM1Desc] = useState("Train baseline quantized model and establish latency baseline on device.");
  const [m1Skills, setM1Skills] = useState("PyTorch, Edge Inference, Quantization");

  const [m2Title, setM2Title] = useState("Milestone 2: Clinical Validation & Benchmark Report");
  const [m2Budget, setM2Budget] = useState(50000);
  const [m2Desc, setM2Desc] = useState("Evaluate sensitivity and compile reproducible peer-reviewed technical paper.");
  const [m2Skills, setM2Skills] = useState("Medical Imaging, Model Evaluation, Biostatistics");

  // Governance terms
  const [ipTerms, setIpTerms] = useState(
    "Attribution to human contributors under open research license; perpetual non-exclusive commercial license to sponsor."
  );
  const [pubTerms, setPubTerms] = useState(
    "Joint academic publication with named human student contributors as co-authors."
  );

  const isSponsorOrAdmin = profile?.role === "sponsor" || profile?.role === "admin";

  const handlePreFill = (type: "funded_med" | "open_nlp") => {
    if (type === "funded_med") {
      setTitle("Federated Edge Diagnostics for Rural Pulmonary Audio Analysis");
      setPublicSummary(
        "Deploying privacy-preserving acoustic machine learning models on edge microphones to detect early respiratory conditions without transferring patient audio to central cloud servers."
      );
      setEngagementModel("FUNDED");
      setDataSensitivity("confidential");
      setBudget(120000);
      setConfidentialBrief(
        "CONFIDENTIAL DATASET: Access to 2,400 anonymized clinical audio recordings (unreleased hospital cohort) and proprietary noise cancellation filters. Under no circumstance may acoustic spectrograms be sent to external cloud APIs."
      );
      setM1Title("Milestone 1: Audio Feature Extraction & INT8 Quantization");
      setM1Budget(60000);
      setM1Desc("Develop real-time mel-spectrogram pipeline running under 15ms latency on ARM Cortex.");
      setM2Title("Milestone 2: Clinical Noise Robustness & Benchmark Report");
      setM2Budget(60000);
      setM2Desc("Validate model against hospital acoustic noise profile with 94%+ sensitivity.");
    } else {
      setTitle("Open Source Indic Language Mathematical Reasoning Benchmark");
      setPublicSummary(
        "Collaborative curation and evaluation suite for evaluating multi-step mathematical reasoning capabilities of modern open-weights LLMs across Hindi, Tamil, and Telugu."
      );
      setEngagementModel("KNOWLEDGE-SHARING");
      setDataSensitivity("public");
      setBudget(0);
      setConfidentialBrief(
        "COLLABORATION REPOSITORY: Central coordination sheets, synthetic problem generation scripts, and validation rubrics. Cloud AI assistance is encouraged."
      );
      setM1Title("Milestone 1: Dataset Generation & Multi-Dialect Annotation");
      setM1Budget(0);
      setM1Desc("Curate 5,000 verified multilingual reasoning problems with step-by-step solutions.");
      setM2Title("Milestone 2: Automated Benchmark Harness & Leaderboard");
      setM2Budget(0);
      setM2Desc("Publish leaderboard and evaluation harness under open-source Apache 2.0 license.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.access_token) {
      setError("You must be logged in to post a project.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const milestones = [
        {
          id: 1,
          title: m1Title,
          budget: engagementModel === "FUNDED" ? Number(m1Budget) : 0,
          description: m1Desc,
          required_skills: m1Skills.split(",").map((s) => s.trim()),
        },
        {
          id: 2,
          title: m2Title,
          budget: engagementModel === "FUNDED" ? Number(m2Budget) : 0,
          description: m2Desc,
          required_skills: m2Skills.split(",").map((s) => s.trim()),
        },
      ];

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          title,
          public_summary: publicSummary,
          engagement_model: engagementModel,
          data_sensitivity: dataSensitivity,
          confidential_brief: confidentialBrief,
          budget: engagementModel === "FUNDED" ? Number(budget) : 0,
          milestones,
          ip_terms: ipTerms,
          publication_terms: pubTerms,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create project");
      }

      // Redirect to the new project detail view
      router.push(`/projects/${data.project.id}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Sponsor Role Verification Banner */}
      {!isSponsorOrAdmin && (
        <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-xl shadow-xs">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-base font-bold text-amber-900">
                Sponsor Authorization Required
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                You are currently logged in as{" "}
                <strong className="font-semibold text-amber-900">{profile?.display_name || "Guest"}</strong> (
                {profile?.role || "unauthenticated"}). Only research sponsors have authorization to post projects, fund milestone escrows, and define project charters.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => switchPersona("sponsor@gardenia.test")}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Switch to Dr. Ramesh (Sponsor)
                </button>
                <span className="text-xs text-amber-700">or sign in with sponsor credentials</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Post New Research Project</h1>
            <p className="text-sm text-slate-600 mt-1">
              Define the project charter, milestone escrow, and data privacy boundaries.
            </p>
          </div>
          {/* Quick Pre-fill buttons */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Quick Template:</span>
            <button
              type="button"
              onClick={() => handlePreFill("funded_med")}
              className="px-2.5 py-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md hover:bg-indigo-100"
            >
              Funded (Confidential)
            </button>
            <button
              type="button"
              onClick={() => handlePreFill("open_nlp")}
              className="px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-100"
            >
              Open (Knowledge-Sharing)
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Basic Information */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</span>
            Public Project Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Edge AI Quantization for Diabetic Retinopathy"
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Public Summary (Visible in Directory) <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={publicSummary}
                onChange={(e) => setPublicSummary(e.target.value)}
                placeholder="High-level overview of the research problem, methodology, and expected outcomes..."
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Engagement Model
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEngagementModel("FUNDED")}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      engagementModel === "FUNDED"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5" />
                    Funded (Escrow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEngagementModel("KNOWLEDGE-SHARING")}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      engagementModel === "KNOWLEDGE-SHARING"
                        ? "bg-purple-50 border-purple-600 text-purple-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    Knowledge-Sharing
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Data Sensitivity & AI Boundary
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDataSensitivity("confidential")}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      dataSensitivity === "confidential"
                        ? "bg-rose-50 border-rose-600 text-rose-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Confidential
                  </button>
                  <button
                    type="button"
                    onClick={() => setDataSensitivity("public")}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1.5 transition-all ${
                      dataSensitivity === "public"
                        ? "bg-emerald-50 border-emerald-600 text-emerald-700 shadow-xs"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    Public / Open
                  </button>
                </div>
              </div>
            </div>

            {engagementModel === "FUNDED" && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Milestone Escrow Budget (INR ₹)
                </label>
                <input
                  type="number"
                  min={1000}
                  step={5000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Confidential Brief (Separated Storage) */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-start justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">2</span>
                Confidential Research Brief (RLS Protected)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Stored in a separate physical database table (<code className="font-mono text-slate-700">project_private_briefs</code>). Non-members receive 0 rows.
              </p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              <Lock className="w-3 h-3" />
              Row-Level Security
            </span>
          </div>

          <div>
            <textarea
              rows={4}
              value={confidentialBrief}
              onChange={(e) => setConfidentialBrief(e.target.value)}
              placeholder="Internal datasets, proprietary model weights, clinical patient metadata, or confidential instructions. This will only be accessible to researchers who accept the project charter..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 focus:bg-white focus:outline-hidden font-sans"
            />
            <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              Once accepted, this content will be dynamically watermarked with the viewer's identity and timestamp.
            </p>
          </div>
        </div>

        {/* Section 3: Charter Milestones & Governance */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">3</span>
            Charter v1: Milestones & Terms
          </h2>

          <div className="space-y-6">
            {/* Milestone 1 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Milestone 1</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={m1Title}
                      onChange={(e) => setM1Title(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Budget (₹)</label>
                    <input
                      type="number"
                      value={m1Budget}
                      onChange={(e) => setM1Budget(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Scope & Deliverables</label>
                  <input
                    type="text"
                    value={m1Desc}
                    onChange={(e) => setM1Desc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Milestone 2 */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Milestone 2</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={m2Title}
                      onChange={(e) => setM2Title(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Budget (₹)</label>
                    <input
                      type="number"
                      value={m2Budget}
                      onChange={(e) => setM2Budget(Number(e.target.value))}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Scope & Deliverables</label>
                  <input
                    type="text"
                    value={m2Desc}
                    onChange={(e) => setM2Desc(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* Governance Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">IP & Licensing Terms</label>
                <textarea
                  rows={2}
                  value={ipTerms}
                  onChange={(e) => setIpTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Publication & Authorship</label>
                <textarea
                  rows={2}
                  value={pubTerms}
                  onChange={(e) => setPubTerms(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isSponsorOrAdmin}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
          >
            {loading ? "Publishing Project & Charter..." : "Publish Project & Publish Charter v1"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Globe,
  Coins,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  History,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Fingerprint,
  Sparkles,
  Users,
  Bot,
  Send,
  Terminal,
  Check,
  XCircle,
  AlertTriangle,
  Gavel,
  Calculator,
  Scale,
} from "lucide-react";
import EscrowMilestoneSection from "@/components/m3/EscrowMilestoneSection";
import ContributionSubmissionCard from "@/components/m3/ContributionSubmissionCard";
import ContributionReviewCard from "@/components/m3/ContributionReviewCard";
import ResearchCreditsDisplay from "@/components/m3/ResearchCreditsDisplay";
import SponsorWithdrawalCard from "@/components/m3/SponsorWithdrawalCard";
import DisputesSection from "@/components/m3/DisputesSection";
import CredentialViewerCard from "@/components/m3/CredentialViewerCard";

interface ProjectDetailData {
  project: {
    id: string;
    title: string;
    public_summary: string;
    engagement_model: string;
    data_sensitivity: "confidential" | "public" | string;
    status: string;
    created_at: string;
    sponsor_id: string;
    profiles?: {
      id: string;
      display_name: string;
      role: string;
    };
  };
  charter: {
    id: string;
    version: number;
    budget: number;
    engagement_model: string;
    milestones_json: Array<{
      id: number;
      title: string;
      budget: number;
      description: string;
      required_skills: string[];
    }>;
    roles_json?: Array<{
      role: string;
      count: number;
      focus: string;
    }>;
    ip_terms: string;
    publication_terms: string;
    confidentiality_terms: string;
    permitted_ai_tools: string;
    credit_reward_terms: string;
    sponsor_withdrawal_terms: string;
    commercialisation_terms?: string;
  } | null;
  members: Array<{
    user_id: string;
    role: string;
    status: string;
    joined_at: string;
    profiles?: {
      display_name: string;
    };
  }>;
  userAcceptance: {
    id: string;
    accepted_at: string;
    engagement_ack: boolean;
  } | null;
  isMember: boolean;
  isSponsor: boolean;
  hasConfidentialBrief: boolean;
}

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const { user, profile, session, switchPersona } = useAuth();

  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab: overview | work | charter | brief | governance | ledger
  const [activeTab, setActiveTab] = useState<
    "overview" | "work" | "charter" | "brief" | "governance" | "ledger"
  >("overview");

  // M3 Contributions, Credits, Disputes & Credentials State
  const [contributions, setContributions] = useState<any[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);
  const [userCredits, setUserCredits] = useState<{ totalCredits: number; items: any[] }>({
    totalCredits: 0,
    items: [],
  });
  const [disputes, setDisputes] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [dbMilestones, setDbMilestones] = useState<any[]>([]);

  // Charter Acceptance State
  const [acknowledgementChecked, setAcknowledgementChecked] = useState(false);
  const [acceptingCharter, setAcceptingCharter] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState<string | null>(null);

  // Confidential Brief State
  const [briefLoading, setBriefLoading] = useState(false);
  const [confidentialBrief, setConfidentialBrief] = useState<string | null>(null);
  const [briefAccessDenied, setBriefAccessDenied] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [viewerWatermark, setViewerWatermark] = useState<string | null>(null);

  // Ledger State
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [verifyingLedger, setVerifyingLedger] = useState(false);

  // M2 AI Scoping State
  const [scopingLoading, setScopingLoading] = useState(false);
  const [scopingInfo, setScopingInfo] = useState<{
    aiProvider: string;
    routeBadge: string;
    fallbackUsed: boolean;
    status: string;
    latencyMs?: number;
  } | null>(null);

  // M2 Candidate Matching State
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [matches, setMatches] = useState<any[] | null>(null);
  const [matchRoleFilter, setMatchRoleFilter] = useState<"all" | "student" | "expert">("all");

  // M2 ResearchCopilot State
  const [copilotTask, setCopilotTask] = useState("");
  const [copilotClassification, setCopilotClassification] = useState<"PUBLIC" | "CONFIDENTIAL">("PUBLIC");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<any | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  // Fetch Project Metadata
  const fetchProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch(`/api/projects/${projectId}`, { headers });
      const resData = await res.json();

      if (!res.ok) {
        throw new Error(resData.error || "Failed to load project");
      }

      setData(resData);
    } catch (err: any) {
      setError(err.message || "Failed to load project details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId, session?.access_token]);

  // Fetch Brief when Brief tab becomes active or user accepts
  const fetchBrief = async () => {
    if (!session?.access_token) {
      setBriefAccessDenied(true);
      setBriefError("Authentication required. Please log in.");
      return;
    }

    try {
      setBriefLoading(true);
      setBriefError(null);
      setBriefAccessDenied(false);

      const res = await fetch(`/api/projects/${projectId}/brief`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const resData = await res.json();
      if (!res.ok || !resData.allowed) {
        setBriefAccessDenied(true);
        setBriefError(resData.error || "Access Denied by PostgreSQL Row-Level Security.");
        setConfidentialBrief(null);
      } else {
        setConfidentialBrief(resData.confidential_brief);
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const viewerName = (resData.viewer?.name || profile?.display_name || "RESEARCHER").toUpperCase();
        const code = projectId.slice(0, 8).toUpperCase();
        setViewerWatermark(`${viewerName} · ${code} · ${timeStr}`);
      }
    } catch (err: any) {
      setBriefError(err.message || "Network error fetching brief");
      setBriefAccessDenied(true);
    } finally {
      setBriefLoading(false);
    }
  };

  // M3 Data Fetchers
  const fetchContributions = async () => {
    try {
      setContributionsLoading(true);
      const res = await fetch(`/api/contributions?projectId=${projectId}`);
      const resData = await res.json();
      if (res.ok) {
        setContributions(resData.contributions || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContributionsLoading(false);
    }
  };

  const fetchCredits = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/users/${user.id}/credits?projectId=${projectId}`);
      const resData = await res.json();
      if (res.ok) {
        setUserCredits(resData);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDisputes = async () => {
    try {
      const res = await fetch(`/api/disputes?projectId=${projectId}`);
      const resData = await res.json();
      if (res.ok) {
        setDisputes(resData.disputes || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCredentials = async () => {
    try {
      const res = await fetch(`/api/credentials?projectId=${projectId}`);
      const resData = await res.json();
      if (res.ok) {
        setCredentials(resData.credentials || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDbMilestones = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/rewards`);
      const resData = await res.json();
      if (res.ok) {
        setDbMilestones(resData.milestones || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshM3Data = () => {
    fetchContributions();
    fetchCredits();
    fetchDisputes();
    fetchCredentials();
    fetchDbMilestones();
    fetchProject();
  };

  useEffect(() => {
    if (activeTab === "brief") {
      fetchBrief();
    } else if (activeTab === "ledger") {
      fetchLedger();
    } else if (activeTab === "work" || activeTab === "governance") {
      refreshM3Data();
    }
  }, [activeTab, projectId, session?.access_token, user?.id]);

  useEffect(() => {
    fetchContributions();
    fetchCredits();
    fetchDbMilestones();
  }, [projectId, user?.id]);

  // Fetch Ledger entries for this project
  const fetchLedger = async () => {
    try {
      setLedgerLoading(true);
      const res = await fetch(`/api/ledger?projectId=${projectId}`);
      const resData = await res.json();
      if (res.ok) {
        setLedgerEntries(resData.entries || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLedgerLoading(false);
    }
  };

  // Verify Ledger Chain
  const handleVerifyLedger = async (simulateTamper: boolean = false) => {
    try {
      setVerifyingLedger(true);
      setVerificationResult(null);

      const res = await fetch("/api/ledger/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          simulateTamper,
        }),
      });

      const resData = await res.json();
      if (res.ok) {
        setVerificationResult(resData);
      } else {
        setVerificationResult({ error: resData.error || "Verification failed" });
      }
    } catch (err: any) {
      setVerificationResult({ error: err.message || "Failed to execute verification" });
    } finally {
      setVerifyingLedger(false);
    }
  };

  // Handle Charter Acceptance
  const handleAcceptCharter = async () => {
    if (!session?.access_token) {
      setError("Please log in to accept the charter.");
      return;
    }
    if (!data?.charter?.id) {
      setError("No active charter found for this project.");
      return;
    }
    if (!acknowledgementChecked) {
      setError("Please check the explicit acknowledgement checkbox before accepting.");
      return;
    }

    try {
      setAcceptingCharter(true);
      setError(null);

      const res = await fetch("/api/charter/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          charterId: data.charter.id,
          projectId: data.project.id,
          engagement_ack: true,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to accept charter");
      }

      setAcceptMessage("Charter successfully accepted! Team membership recorded and brief unlocked.");
      // Refresh project data to update membership and acceptances
      await fetchProject();
      // Auto-switch to brief tab after acceptance
      setActiveTab("brief");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setAcceptingCharter(false);
    }
  };

  // M2: AI Scoping
  const handleAiScope = async () => {
    try {
      setScopingLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/scope`, { method: "POST" });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Scoping failed");
      setScopingInfo({
        aiProvider: resData.aiProvider,
        routeBadge: resData.routeBadge,
        fallbackUsed: resData.fallbackUsed,
        status: resData.status,
        latencyMs: resData.latencyMs,
      });
      await fetchProject();
    } catch (err: any) {
      setError(err.message || "Failed to execute AI scoping");
    } finally {
      setScopingLoading(false);
    }
  };

  // M2: Candidate Matching
  const handleFindMatches = async (roleFilter?: "all" | "student" | "expert") => {
    try {
      setMatchingLoading(true);
      const rf = roleFilter || matchRoleFilter;
      const url = `/api/projects/${projectId}/match${rf !== "all" ? `?role=${rf}` : ""}`;
      const res = await fetch(url);
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Matching failed");
      setMatches(resData.matches || []);
    } catch (err: any) {
      setError(err.message || "Failed to find candidate matches");
    } finally {
      setMatchingLoading(false);
    }
  };

  // M2: ResearchCopilot
  const handleAskCopilot = async (customPrompt?: string, customClassification?: "PUBLIC" | "CONFIDENTIAL") => {
    const promptToSend = customPrompt || copilotTask;
    const classToSend = customClassification || copilotClassification;
    if (!promptToSend.trim()) return;
    if (!session?.access_token) {
      setCopilotError("Please sign in to ask ResearchCopilot.");
      return;
    }

    try {
      setCopilotLoading(true);
      setCopilotError(null);
      const res = await fetch("/api/copilot/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          projectId,
          task: promptToSend,
          classification: classToSend,
        }),
      });

      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "ResearchCopilot execution failed");
      setCopilotResult(resData);
    } catch (err: any) {
      setCopilotError(err.message || "Copilot error");
    } finally {
      setCopilotLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading project details and charter...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h2 className="text-base font-bold">Failed to load project</h2>
          <p className="text-xs text-rose-600 mt-1 mb-4">{error}</p>
          <Link
            href="/projects"
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700"
          >
            ← Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { project, charter, members, userAcceptance, isMember, isSponsor } = data;
  const isConfidential = project.data_sensitivity === "confidential";
  const isFunded = project.engagement_model?.toUpperCase() === "FUNDED" || project.engagement_model === "bounty_milestones";
  const budget = charter?.budget ?? (isFunded ? 100000 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4">
        <Link href="/projects" className="hover:text-indigo-600">Projects</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-medium truncate max-w-md">{project.title}</span>
      </nav>

      {/* Project Banner / Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs mb-8">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {isConfidential ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <Lock className="w-3.5 h-3.5 text-rose-600" />
              CONFIDENTIAL DATA · STRICT ON-DEVICE AI ONLY
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              PUBLIC DATA · CLOUD AI PERMITTED
            </span>
          )}

          {isFunded ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Coins className="w-3.5 h-3.5 text-indigo-600" />
              FUNDED ESCROW: ₹{budget.toLocaleString("en-IN")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              KNOWLEDGE-SHARING (VERIFIABLE RESEARCH CREDITS)
            </span>
          )}

          {userAcceptance && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
              CHARTER ACCEPTED
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
          {project.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-4xl leading-relaxed mb-6">
          {project.public_summary}
        </p>

        {/* Meta Bar */}
        <div className="flex flex-wrap items-center gap-y-3 gap-x-6 text-xs text-slate-500 pt-4 border-t border-slate-100">
          <div>
            Sponsor: <strong className="text-slate-800 font-semibold">{project.profiles?.display_name || "Research Sponsor"}</strong>
          </div>
          <div>
            Charter Version: <strong className="text-slate-800 font-mono">v{charter?.version || 1}</strong>
          </div>
          <div>
            Active Team Members: <strong className="text-slate-800 font-semibold">{members.length}</strong>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-400">Current Persona:</span>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
              {profile?.display_name || "Guest"} ({profile?.role || "anonymous"})
            </span>
          </div>
        </div>
      </div>

      {/* Sponsor Abandonment Protected Status Card */}
      {project.status === "sponsor_withdrawn" && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-300 text-amber-900 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            PROJECT STATUS: Sponsor Withdrew the Project
          </div>
          <p className="text-xs text-amber-800 mt-1">
            New work: <strong>STOPPED</strong> • Accepted Credits: <strong>PROTECTED</strong> • Escrow: <strong>UNDER ACCEPTANCE/REVIEW</strong>
          </p>
        </div>
      )}

      {/* Tabs Header */}
      <div className="border-b border-slate-200 mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap space-x-4 sm:space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            Overview
          </button>

          <button
            onClick={() => setActiveTab("work")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "work"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Coins className="w-4 h-4" />
            Work & Credits
            {contributions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-700 rounded-full text-[10px]">
                {contributions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("charter")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "charter"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Charter (v{charter?.version || 1})
            {userAcceptance && (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("brief")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "brief"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Lock className="w-4 h-4" />
            Confidential Brief
            {isMember ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("governance")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "governance"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Gavel className="w-4 h-4" />
            Governance & Disputes
            {disputes.filter((d) => d.status === "OPEN").length > 0 && (
              <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                {disputes.filter((d) => d.status === "OPEN").length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "ledger"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            Audit Ledger Chain
          </button>
        </div>

        <Link
          href={`/projects/${projectId}/rewards`}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors shrink-0"
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-600" />
          Reward Provenance & Explanations →
        </Link>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Milestones Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-indigo-600" />
                    Charter Milestones & Escrow Allocation
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Structured milestone contracts with verified deliverables and required technical skills.
                  </p>
                </div>

                {/* AI Scope Project Button */}
                <button
                  onClick={handleAiScope}
                  disabled={scopingLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors shrink-0"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${scopingLoading ? "animate-spin" : ""}`} />
                  {scopingLoading ? "Generating 2 Milestones..." : "AI Scope Project"}
                </button>
              </div>

              {/* Scoping Info Badge Strip */}
              {scopingInfo && (
                <div className="mb-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-indigo-900">AI Scoping Result:</span>
                    <span className="font-mono px-2 py-0.5 rounded text-[11px] bg-white border border-indigo-200 text-indigo-700 font-semibold">
                      {scopingInfo.routeBadge}
                    </span>
                    {scopingInfo.fallbackUsed && (
                      <span className="px-2 py-0.5 rounded text-[11px] bg-amber-100 text-amber-800 border border-amber-300 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Fallback Used
                      </span>
                    )}
                  </div>
                  {scopingInfo.latencyMs !== undefined && (
                    <span className="text-indigo-600 font-mono text-[11px]">
                      Latency: {scopingInfo.latencyMs}ms
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {charter?.milestones_json?.map((m: any, idx: number) => (
                  <div key={m.id || idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <span className="text-xs font-mono font-bold text-indigo-600 uppercase">
                          Milestone {idx + 1}
                        </span>
                        <h3 className="text-sm font-bold text-slate-900 mt-0.5">{m.title}</h3>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md shrink-0">
                        {m.budget > 0 ? `₹${Number(m.budget).toLocaleString("en-IN")}` : "Research Credits"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mb-3">{m.description}</p>
                    {m.acceptance_criteria && Array.isArray(m.acceptance_criteria) && m.acceptance_criteria.length > 0 && (
                      <div className="mb-2.5 pl-3 border-l-2 border-indigo-200 space-y-0.5 text-xs text-slate-600">
                        <span className="font-semibold text-slate-700 block text-[11px] uppercase tracking-wider">Criteria:</span>
                        {m.acceptance_criteria.map((c: string, cIdx: number) => (
                          <div key={cIdx} className="text-[11px]">• {c}</div>
                        ))}
                      </div>
                    )}
                    {m.required_skills && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60">
                        <span className="text-xs text-slate-400 font-medium">Skills:</span>
                        {m.required_skills.map((skill: string, sIdx: number) => (
                          <span
                            key={sIdx}
                            className="px-2 py-0.5 text-xs font-medium bg-white text-slate-700 border border-slate-200 rounded-md"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* M2: Candidate Matching Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-600" />
                    Deterministic Candidate Matching & Eligibility
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transparent rule-based scoring based on skill overlap, verification, and conflict-of-interest exclusion.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="inline-flex p-0.5 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                    <button
                      onClick={() => {
                        setMatchRoleFilter("all");
                        handleFindMatches("all");
                      }}
                      className={`px-2 py-1 rounded-md transition-colors ${matchRoleFilter === "all" ? "bg-white text-indigo-700 font-bold shadow-2xs" : ""}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => {
                        setMatchRoleFilter("student");
                        handleFindMatches("student");
                      }}
                      className={`px-2 py-1 rounded-md transition-colors ${matchRoleFilter === "student" ? "bg-white text-indigo-700 font-bold shadow-2xs" : ""}`}
                    >
                      Students
                    </button>
                    <button
                      onClick={() => {
                        setMatchRoleFilter("expert");
                        handleFindMatches("expert");
                      }}
                      className={`px-2 py-1 rounded-md transition-colors ${matchRoleFilter === "expert" ? "bg-white text-indigo-700 font-bold shadow-2xs" : ""}`}
                    >
                      Experts
                    </button>
                  </div>

                  <button
                    onClick={() => handleFindMatches()}
                    disabled={matchingLoading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors"
                  >
                    <Users className={`w-3.5 h-3.5 ${matchingLoading ? "animate-spin" : ""}`} />
                    {matchingLoading ? "Matching..." : "Find Matches"}
                  </button>
                </div>
              </div>

              {/* Match Cards List */}
              {matchingLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin mx-auto mb-2" />
                  Evaluating candidate skill profiles and conflict filters...
                </div>
              ) : matches && matches.length > 0 ? (
                <div className="space-y-3">
                  {matches.map((m) => (
                    <div
                      key={m.candidateId}
                      className={`p-4 rounded-xl border transition-all ${
                        m.status === "EXCLUDED"
                          ? "bg-rose-50/40 border-rose-200"
                          : "bg-slate-50 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{m.displayName}</h3>
                            <span className="px-2 py-0.5 text-[11px] font-semibold bg-white border border-slate-200 text-slate-700 rounded capitalize">
                              {m.role}
                            </span>
                            {m.status === "EXCLUDED" ? (
                              <span className="px-2 py-0.5 text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300 rounded flex items-center gap-1">
                                <XCircle className="w-3 h-3" />
                                EXCLUDED: {m.exclusionReason || "Conflict"}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                ELIGIBLE
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="text-right shrink-0">
                          <span className={`text-base font-black font-mono ${m.status === "EXCLUDED" ? "text-slate-400" : "text-indigo-600"}`}>
                            {m.matchScore}%
                          </span>
                          <span className="text-[10px] text-slate-400 block uppercase font-medium">Match Score</span>
                        </div>
                      </div>

                      {/* Explanation bullets */}
                      <p className="text-xs text-slate-600 whitespace-pre-wrap mb-3 leading-relaxed">
                        {m.explanation}
                      </p>

                      {/* Matching and Missing Skills */}
                      {m.status === "ELIGIBLE" && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/70 text-xs">
                          <span className="text-[11px] text-slate-400 font-medium">Matched Skills:</span>
                          {m.matchingSkills.map((s: string, sIdx: number) => (
                            <span key={sIdx} className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium text-[11px]">
                              ✓ {s}
                            </span>
                          ))}
                          {m.missingSkills.length > 0 && (
                            <>
                              <span className="text-[11px] text-slate-400 font-medium ml-2">Missing:</span>
                              {m.missingSkills.map((s: string, sIdx: number) => (
                                <span key={sIdx} className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 text-[11px]">
                                  {s}
                                </span>
                              ))}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  Click <strong>Find Matches</strong> to rank eligible researchers and exclude conflicted experts.
                </div>
              )}
            </div>

            {/* M2: ResearchCopilot Section */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      ResearchCopilot (Project-Scoped Assistant)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Scoped agent with 2 tools: <code className="font-mono text-indigo-700">get_project_context</code> and <code className="font-mono text-indigo-700">draft_contribution_summary</code>.
                    </p>
                  </div>
                </div>

                {/* Privacy Badge / Selector */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
                  <button
                    onClick={() => setCopilotClassification("PUBLIC")}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors flex items-center gap-1 ${
                      copilotClassification === "PUBLIC"
                        ? "bg-white text-emerald-700 shadow-2xs border border-emerald-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Globe className="w-3 h-3 text-emerald-600" />
                    Public (Cloud)
                  </button>
                  <button
                    onClick={() => setCopilotClassification("CONFIDENTIAL")}
                    className={`px-2.5 py-1 rounded-md font-semibold text-[11px] transition-colors flex items-center gap-1 ${
                      copilotClassification === "CONFIDENTIAL"
                        ? "bg-white text-rose-700 shadow-2xs border border-rose-200"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Lock className="w-3 h-3 text-rose-600" />
                    Confidential (Local Only)
                  </button>
                </div>
              </div>

              {/* Sample Prompts Pills */}
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                <span className="text-[11px] text-slate-400 font-medium">Quick Prompts:</span>
                <button
                  onClick={() => {
                    setCopilotTask("What should I work on for this milestone?");
                    setCopilotClassification("PUBLIC");
                    handleAskCopilot("What should I work on for this milestone?", "PUBLIC");
                  }}
                  className="px-2 py-0.5 text-[11px] bg-slate-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-50 font-medium"
                >
                  "What should I work on for this milestone?"
                </button>
                <button
                  onClick={() => {
                    setCopilotTask("Draft summary: Implemented INT8 quantization for MobileNetV4 with 92% validation accuracy on fundus images.");
                    setCopilotClassification("PUBLIC");
                    handleAskCopilot("Draft summary: Implemented INT8 quantization for MobileNetV4 with 92% validation accuracy on fundus images.", "PUBLIC");
                  }}
                  className="px-2 py-0.5 text-[11px] bg-slate-50 text-indigo-700 border border-indigo-200 rounded hover:bg-indigo-50 font-medium"
                >
                  "Draft summary: INT8 quantization..."
                </button>
                <button
                  onClick={() => {
                    setCopilotTask("Confidential question: How should we partition the private patient cohort dataset on edge storage?");
                    setCopilotClassification("CONFIDENTIAL");
                    handleAskCopilot("Confidential question: How should we partition the private patient cohort dataset on edge storage?", "CONFIDENTIAL");
                  }}
                  className="px-2 py-0.5 text-[11px] bg-rose-50 text-rose-700 border border-rose-200 rounded hover:bg-rose-100 font-medium"
                >
                  "Confidential question: Patient cohort..."
                </button>
              </div>

              {/* Chat Input */}
              <div className="relative mb-4">
                <textarea
                  rows={2}
                  value={copilotTask}
                  onChange={(e) => setCopilotTask(e.target.value)}
                  placeholder="Ask ResearchCopilot about milestone tasks or ask to draft a contribution summary..."
                  className="w-full pl-3 pr-24 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
                <button
                  onClick={() => handleAskCopilot()}
                  disabled={copilotLoading || !copilotTask.trim()}
                  className="absolute right-2.5 bottom-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-md shadow-2xs flex items-center gap-1.5 transition-colors"
                >
                  <Send className={`w-3 h-3 ${copilotLoading ? "animate-spin" : ""}`} />
                  {copilotLoading ? "Running..." : "Ask"}
                </button>
              </div>

              {copilotError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 mb-4">
                  {copilotError}
                </div>
              )}

              {/* Copilot Response Card */}
              {copilotResult && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  {/* Response Text */}
                  <div className="prose prose-xs text-slate-800 leading-relaxed font-sans bg-white p-4 rounded-lg border border-slate-200 shadow-2xs whitespace-pre-wrap">
                    {copilotResult.output}
                  </div>

                  {/* Metadata and Attribution Strip */}
                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-[11px] text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700">AI Provider:</span>
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                        copilotResult.aiProvider === "local" ? "bg-rose-100 text-rose-800 border border-rose-200" : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}>
                        {copilotResult.aiProvider.toUpperCase()} AI ({copilotResult.dataClassification})
                      </span>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-700">Human Owner:</span>{" "}
                      <strong className="text-indigo-700 font-bold">{copilotResult.humanOwner?.name}</strong>
                    </div>

                    <div>
                      <span className="font-semibold text-slate-700">Project:</span>{" "}
                      <span className="text-slate-600 truncate max-w-[140px] inline-block align-bottom">{project.title}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono">
                      Tool: {copilotResult.toolUsed}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Policy & Boundary */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Two-Model AI Routing & Privacy Policy
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {isConfidential
                  ? "This project is classified as CONFIDENTIAL. In accordance with the Two-Model Privacy Architecture, all queries containing or analyzing private brief data are strictly routed to local, on-device AI runtimes. Under no circumstances is confidential data transmitted to public cloud LLMs."
                  : "This project is classified as PUBLIC DATA. Queries may leverage cloud LLM API capabilities (Gemini 3.8 Flash) for accelerated scoping and automated checks."}
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700">
                AI Policy: {charter?.permitted_ai_tools || (isConfidential ? "Local model runtimes (Ollama/on-device) only." : "Cloud Gemini & Local models.")}
              </div>
            </div>
          </div>

          {/* Right Column: Roles & Team */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-600" />
                Project Team ({members.length})
              </h2>

              <div className="space-y-3">
                {/* Sponsor */}
                <div className="flex items-center justify-between p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{project.profiles?.display_name || "Sponsor"}</p>
                    <p className="text-xs text-indigo-600 font-medium">Project Sponsor</p>
                  </div>
                  <span className="px-2 py-0.5 text-xs font-semibold bg-indigo-100 text-indigo-800 rounded-md">
                    Author
                  </span>
                </div>

                {/* Accepted Members */}
                {members.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{m.profiles?.display_name || "Student Researcher"}</p>
                      <p className="text-xs text-slate-500 capitalize">{m.role}</p>
                    </div>
                    <span className="px-2 py-0.5 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-md">
                      Accepted
                    </span>
                  </div>
                ))}
              </div>

              {!userAcceptance && (
                <button
                  onClick={() => setActiveTab("charter")}
                  className="w-full mt-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Review & Accept Charter
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: WORK & CREDITS */}
      {activeTab === "work" && (
        <div className="space-y-8">
          {/* Top Banner Linking to Rewards */}
          <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-slate-50 to-indigo-500/10 border border-emerald-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Deterministic Milestone Rewards Engine</h4>
                <p className="text-xs text-slate-500">
                  Reviewed contribution impact → Research Credits → Verified Proportional Reward Pool.
                </p>
              </div>
            </div>
            <Link
              href={`/projects/${projectId}/rewards`}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shrink-0 transition-colors flex items-center gap-1.5 shadow-xs"
            >
              Inspect Reward Breakdown & Provenance <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Milestones & Escrow */}
          <EscrowMilestoneSection
            milestones={dbMilestones.length > 0 ? dbMilestones : (charter?.milestones_json as any) || []}
            projectId={projectId}
            userRole={profile?.role || "student"}
            isSponsor={isSponsor}
            token={session?.access_token}
            onRefresh={refreshM3Data}
          />

          {/* 2-column layout: Submission/Review vs Credits Balance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Contribution Submission */}
              <ContributionSubmissionCard
                projectId={projectId}
                projectStatus={project.status}
                milestones={dbMilestones.length > 0 ? dbMilestones : (charter?.milestones_json as any) || []}
                userName={profile?.display_name || user?.email || "Student"}
                userRole={profile?.role || "student"}
                token={session?.access_token}
                onSubmitted={refreshM3Data}
              />

              {/* Contribution Peer Review */}
              <ContributionReviewCard
                contributions={contributions}
                currentUserId={user?.id || ""}
                userRole={profile?.role || "student"}
                token={session?.access_token}
                onReviewed={refreshM3Data}
              />
            </div>

            <div className="space-y-6">
              {/* User Research Credits */}
              <ResearchCreditsDisplay
                totalCredits={userCredits.totalCredits}
                items={userCredits.items}
                userName={profile?.display_name || "You"}
              />

              {/* Security Invariants Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs text-slate-600">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  M3 Focus-C Security Guarantees
                </span>
                <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-500">
                  <li>Contributions attributed strictly to authenticated user session</li>
                  <li>SHA-256 content hash generated server-side</li>
                  <li>Credits derived strictly from reviewed impact (Max 5)</li>
                  <li>Escrow requires sponsor funding before work can release</li>
                  <li>Rewards calculated via deterministic arithmetic (No AI)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CHARTER (v1) & ACCEPTANCE */}
      {activeTab === "charter" && (
        <div className="space-y-8">
          {/* Charter Header Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase">
                  Project Charter Document
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Gardenia 2K26 Collaboration Charter — Version {charter?.version || 1}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Binding research agreement defining IP, authorship, AI boundaries, and milestone rewards before work commences.
                </p>
              </div>

              {userAcceptance ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg shrink-0 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-xs font-bold text-green-800">You Accepted Charter v{charter?.version || 1}</p>
                    <p className="text-xs text-green-700">
                      {new Date(userAcceptance.accepted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg shrink-0 flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-xs font-bold text-amber-800">Acceptance Required</p>
                    <p className="text-xs text-amber-700">Must accept before accessing private brief</p>
                  </div>
                </div>
              )}
            </div>

            {/* 17 Charter Clauses Display */}
            <div className="mt-8 space-y-6 text-sm text-slate-700">
              {/* Clause 1: Engagement Model */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                  1. Engagement Model & Escrow Terms
                </h3>
                <p className="text-xs text-slate-600">
                  This project operates under the <strong>{charter?.engagement_model}</strong> model with a total escrow allocation of <strong>{budget > 0 ? `₹${budget.toLocaleString("en-IN")}` : "0 (Verifiable Academic Credits)"}</strong>. Rewards or Research Credits are distributed exclusively upon verified review of accepted milestones.
                </p>
              </div>

              {/* Clause 2: Milestones */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                  2. Milestone Deliverables & Acceptance Criteria
                </h3>
                <div className="space-y-2">
                  {charter?.milestones_json?.map((m: any, idx: number) => (
                    <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-md text-xs">
                      <span className="font-bold text-indigo-700">Milestone {idx + 1}: {m.title}</span> — {m.description}
                      <div className="mt-1 font-mono text-slate-500">
                        Budget: ₹{m.budget?.toLocaleString("en-IN") || 0}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clause 3 & 4: IP and Publication */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                    3. Intellectual Property Rights
                  </h3>
                  <p className="text-xs text-slate-600">
                    {charter?.ip_terms || "Open research with attribution to human contributors under open research license."}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                    4. Academic Publication & Authorship
                  </h3>
                  <p className="text-xs text-slate-600">
                    {charter?.publication_terms || "Joint academic publication with named human student authors and expert reviewers."}
                  </p>
                </div>
              </div>

              {/* Clause 5 & 6: Confidentiality and Permitted AI Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                    5. Data Confidentiality & Local Model Requirement
                  </h3>
                  <p className="text-xs text-slate-600">
                    {charter?.confidentiality_terms || "Confidential project data must never be sent to public cloud LLMs. Local runtimes required."}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                    6. Permitted AI Tools
                  </h3>
                  <p className="text-xs text-slate-600">
                    {charter?.permitted_ai_tools || (isConfidential ? "Local model runtimes (Ollama/on-device) only." : "Cloud Gemini & Local models.")}
                  </p>
                </div>
              </div>

              {/* Clause 7: Human Credit and Review */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                  7. Human Credit & AI Non-Attribution Principle
                </h3>
                <p className="text-xs text-slate-600">
                  Every AI-assisted contribution MUST have a named human owner who understands and takes accountability for the work. AI systems do not receive author credit or financial rewards. Milestone rewards are allocated based on human review impact scoring.
                </p>
              </div>

              {/* Clause 8: Sponsor Withdrawal Protection */}
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-1">
                  8. Sponsor Withdrawal Terms & Student Credit Protection
                </h3>
                <p className="text-xs text-slate-600">
                  {charter?.sponsor_withdrawal_terms || "In case of sponsor withdrawal, all accepted milestone contributions and Research Credits remain fully protected in the immutable ledger."}
                </p>
              </div>
            </div>

            {/* Acceptance Action Box */}
            <div className="mt-8 pt-6 border-t border-slate-200">
              {userAcceptance ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">Charter Acceptance Recorded</p>
                      <p className="text-xs text-emerald-700">
                        Accepted on {new Date(userAcceptance.accepted_at).toLocaleString()}. You are an accepted team member.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab("brief")}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    Open Confidential Brief
                  </button>
                </div>
              ) : (
                <div className="p-6 bg-indigo-50/50 border border-indigo-200 rounded-xl">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    Accept Charter & Join Research Team
                  </h3>
                  <p className="text-xs text-slate-600 mb-4">
                    By accepting, your acceptance will be recorded into the cryptographic ledger, your project membership will be updated to <code className="font-mono text-indigo-700">accepted</code>, and the confidential research brief will be unlocked via Row-Level Security.
                  </p>

                  <div className="flex items-start gap-2.5 mb-4">
                    <input
                      type="checkbox"
                      id="charter-ack-checkbox"
                      checked={acknowledgementChecked}
                      onChange={(e) => setAcknowledgementChecked(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="charter-ack-checkbox" className="text-xs font-medium text-slate-700 cursor-pointer">
                      I have read and agree to Charter v{charter?.version || 1}. I understand and accept this project's engagement model: <strong>[{project.engagement_model}]</strong> and data sensitivity terms.
                    </label>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={handleAcceptCharter}
                      disabled={!acknowledgementChecked || acceptingCharter}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2"
                    >
                      {acceptingCharter ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Recording Acceptance...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          Accept Charter & Unlock Brief
                        </>
                      )}
                    </button>
                    {acceptMessage && (
                      <span className="text-xs font-semibold text-green-700">{acceptMessage}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CONFIDENTIAL BRIEF & VIEWER WATERMARK */}
      {activeTab === "brief" && (
        <div className="space-y-6">
          {briefLoading ? (
            <div className="py-20 text-center bg-white border border-slate-200 rounded-xl">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Evaluating PostgreSQL Row-Level Security permissions...</p>
            </div>
          ) : briefAccessDenied || !confidentialBrief ? (
            /* LOCKED BRIEF CARD (RLS GATE) */
            <div className="bg-white border border-rose-200 rounded-xl p-8 sm:p-12 shadow-xs text-center">
              <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-rose-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                🔒 Confidential Research Brief Locked
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
                Access to proprietary model checkpoints, dataset partition instructions, and internal parameters is gated at the database level by PostgreSQL Row-Level Security (<code className="font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">project_private_briefs</code>). Anonymous users and unaccepted researchers receive 0 rows.
              </p>

              <div className="inline-block p-4 bg-slate-50 border border-slate-200 rounded-lg text-left text-xs text-slate-600 max-w-md mx-auto mb-6">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  RLS Gate Status: Access Denied
                </div>
                <div>{briefError || "Accept the project charter to unlock this confidential brief."}</div>
              </div>

              <div>
                <button
                  onClick={() => setActiveTab("charter")}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  Review & Accept Charter to Unlock
                </button>
              </div>
            </div>
          ) : (
            /* UNLOCKED BRIEF CARD WITH DYNAMIC VIEWER WATERMARK */
            <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
              {/* Unlocked Header Banner */}
              <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">
                    Row-Level Security Access Granted · Audited in Cryptographic Ledger
                  </span>
                </div>
                <div className="text-xs font-mono text-emerald-700">
                  Action: <span className="font-bold">PRIVATE_BRIEF_ACCESSED</span>
                </div>
              </div>

              {/* Watermarked Brief Container */}
              <div className="relative p-8 sm:p-12 overflow-hidden min-h-[360px] bg-slate-50/50">
                {/* Dynamic Watermark Pattern */}
                <div className="watermark-overlay" aria-hidden="true">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div key={i} className="select-none tracking-widest">
                      {viewerWatermark || "CONFIDENTIAL · GARDENIA 2K26"}
                    </div>
                  ))}
                </div>

                {/* Brief Content */}
                <div className="relative z-20 max-w-3xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 mb-4 border border-rose-200">
                    <Lock className="w-3.5 h-3.5" />
                    RESTRICTED CONFIDENTIAL BRIEF
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Proprietary Dataset & Implementation Specifications
                  </h3>

                  <div className="prose prose-sm text-slate-800 leading-relaxed font-sans bg-white/90 p-6 rounded-lg border border-slate-200 shadow-xs backdrop-blur-xs whitespace-pre-wrap">
                    {confidentialBrief}
                  </div>

                  <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      Watermark Stamp: <strong className="font-mono text-slate-700">{viewerWatermark}</strong>
                    </div>
                    <div>
                      AI Boundary: <strong className="text-rose-700">Local Model Only (Fail-Closed)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: GOVERNANCE & DISPUTES */}
      {activeTab === "governance" && (
        <div className="space-y-8">
          {/* Sponsor Withdrawal Abandonment Protection */}
          <SponsorWithdrawalCard
            projectId={projectId}
            projectStatus={project.status}
            isSponsor={isSponsor}
            userRole={profile?.role || "student"}
            token={session?.access_token}
            onWithdrawn={refreshM3Data}
          />

          {/* Disputes Section */}
          <DisputesSection
            projectId={projectId}
            disputes={disputes}
            userRole={profile?.role || "student"}
            token={session?.access_token}
            onRefresh={refreshM3Data}
          />

          {/* Non-Monetary Project Credential Viewer */}
          <CredentialViewerCard
            projectId={projectId}
            projectTitle={project.title}
            isKnowledgeSharing={project.engagement_model !== "FUNDED"}
            credentials={credentials}
            userRole={profile?.role || "student"}
            isSponsor={isSponsor}
            members={members}
            token={session?.access_token}
            onIssued={refreshM3Data}
          />
        </div>
      )}

      {/* TAB 4: AUDIT LEDGER CHAIN */}
      {activeTab === "ledger" && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase">
                  SHA-256 Cryptographic Hash Chain
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Project Audit Trail & Proof of Contribution
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Every project creation, charter publication, acceptance, and confidential brief access is permanently chained into the immutable ledger.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVerifyLedger(false)}
                  disabled={verifyingLedger}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  {verifyingLedger ? "Verifying..." : "Verify Hash Chain"}
                </button>

                <button
                  onClick={() => handleVerifyLedger(true)}
                  disabled={verifyingLedger}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  title="Simulates an attacker tampering with an entry in a safe clone to prove failure detection"
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Tamper Lab
                </button>
              </div>
            </div>

            {/* Verification Result Banner */}
            {verificationResult && (
              <div className="mt-6">
                {verificationResult.simulation ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Tamper Lab Simulation Results (Production Ledger Untouched):
                    </p>
                    <div className="mt-2 font-mono text-[11px] bg-white p-3 rounded border border-amber-200 overflow-x-auto">
                      <div>Status: <strong>{verificationResult.result?.status}</strong></div>
                      <div>Reason: {verificationResult.result?.reason}</div>
                      <div>Detected at entry index: {verificationResult.result?.detected_at_index}</div>
                      <div>Production ledger untouched: {String(verificationResult.result?.production_ledger_untouched)}</div>
                    </div>
                  </div>
                ) : verificationResult.result?.status === "PASS" ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Cryptographic Chain Verified: PASS ({verificationResult.result?.entries_verified} entries valid)
                    </p>
                    <div className="mt-1 font-mono text-[11px] text-emerald-800">
                      Head Hash: {verificationResult.result?.head_hash}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900">
                    <p className="font-bold">Verification Failed: {verificationResult.result?.reason}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ledger Entries Table */}
            <div className="mt-6 overflow-x-auto">
              {ledgerLoading ? (
                <div className="py-12 text-center text-xs text-slate-500">Loading ledger chain...</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">No ledger entries recorded yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Action</th>
                      <th className="py-2.5 px-3">Actor</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3">Entry Hash (SHA-256)</th>
                      <th className="py-2.5 px-3">Previous Hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {ledgerEntries.map((entry, idx) => (
                      <tr key={entry.id} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {entry.action}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          {entry.profiles?.display_name || entry.actor_id?.slice(0, 8)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">
                          {new Date(entry.created_at).toLocaleTimeString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 truncate max-w-[140px]" title={entry.entry_hash}>
                          {entry.entry_hash.slice(0, 16)}...
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-400 truncate max-w-[140px]" title={entry.prev_hash}>
                          {entry.prev_hash.slice(0, 16)}...
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

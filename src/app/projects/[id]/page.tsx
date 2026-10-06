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
  Clock,
} from "lucide-react";

import { ProjectOverviewTab } from "@/components/projects/ProjectOverviewTab";
import { ProjectWorkTab } from "@/components/projects/ProjectWorkTab";
import { ProjectAgreementTab } from "@/components/projects/ProjectAgreementTab";
import { ProjectTeamTab } from "@/components/projects/ProjectTeamTab";

import SponsorWithdrawalCard from "@/components/m3/SponsorWithdrawalCard";
import DisputesSection from "@/components/m3/DisputesSection";
import CredentialViewerCard from "@/components/m3/CredentialViewerCard";
import { generateWatermark } from "@/lib/watermark";

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
  userApplication?: {
    id: string;
    status: string;
    created_at: string;
  } | null;
  isMember: boolean;
  isPending?: boolean;
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

  const { user, profile, session } = useAuth();

  const [data, setData] = useState<ProjectDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active tab: overview | work | agreement | confidential | feedback | security
  const [activeTab, setActiveTab] = useState<
    "overview" | "work" | "agreement" | "confidential" | "feedback" | "security"
  >("overview");

  // M3 Contributions, Credits, Disputes & Credentials State
  const [contributions, setContributions] = useState<any[]>([]);
  const [userCredits, setUserCredits] = useState<{ totalCredits: number; items: any[] }>({
    totalCredits: 0,
    items: [],
  });
  const [disputes, setDisputes] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [dbMilestones, setDbMilestones] = useState<any[]>([]);

  // Applications & Approvals State
  const [applications, setApplications] = useState<any[]>([]);
  const [acceptingCharter, setAcceptingCharter] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState<string | null>(null);
  const [completingProject, setCompletingProject] = useState(false);

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
  const [invitingCandidateId, setInvitingCandidateId] = useState<string | null>(null);
  const [invitedCandidateIds, setInvitedCandidateIds] = useState<Set<string>>(new Set());
  const [respondingToInvite, setRespondingToInvite] = useState(false);

  // M2: Candidate Matching (Sponsor only)
  const handleFindMatches = async () => {
    try {
      setMatchingLoading(true);
      const res = await fetch(`/api/projects/${projectId}/match`);
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Matching failed");
      setMatches(resData.matches || []);
    } catch (err: any) {
      setError(err.message || "Failed to find candidate matches");
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleInviteCandidate = async (candidateId: string) => {
    if (!session?.access_token) return;
    try {
      setInvitingCandidateId(candidateId);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/invite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ candidateId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to invite candidate");
      setInvitedCandidateIds((prev) => new Set(prev).add(candidateId));
      fetchProject();
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    } finally {
      setInvitingCandidateId(null);
    }
  };

  const handleRespondToInvitation = async (action: "accept" | "reject") => {
    if (!session?.access_token) return;
    try {
      setRespondingToInvite(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to respond to invitation");
      await fetchProject();
    } catch (err: any) {
      setError(err.message || "Failed to update invitation status");
    } finally {
      setRespondingToInvite(false);
    }
  };
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

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/applications`);
      if (res.ok) {
        const d = await res.json();
        setApplications(d.applications || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchProject();
    fetchApplications();
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
        const viewerName = resData.viewer?.name || profile?.display_name || "RESEARCHER";
        setViewerWatermark(generateWatermark(viewerName, projectId));
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
      const res = await fetch(`/api/contributions?projectId=${projectId}`);
      const resData = await res.json();
      if (res.ok) {
        setContributions(resData.contributions || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCredits = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/credits?userId=${user.id}&projectId=${projectId}`);
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
      const res = await fetch(`/api/milestones?projectId=${projectId}`);
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
    fetchApplications();
    fetchProject();
  };

  useEffect(() => {
    if (activeTab === "confidential") {
      fetchBrief();
    } else if (activeTab === "security") {
      fetchLedger();
    } else if (activeTab === "work" || activeTab === "feedback") {
      refreshM3Data();
    }
  }, [activeTab, projectId, session, user?.id]);

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

  // Handle Student Application
  const handleApply = async (agreementAck: boolean) => {
    if (!session?.access_token) {
      setError("Please log in to apply for this project.");
      return;
    }
    if (!data?.charter?.id) {
      setError("No active agreement found for this project.");
      return;
    }

    try {
      setAcceptingCharter(true);
      setError(null);

      const res = await fetch(`/api/projects/${projectId}/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          charterId: data.charter.id,
          agreement_ack: agreementAck,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit application");
      }

      setAcceptMessage("Project Agreement accepted! Your application is now pending expert review.");
      await fetchProject();
      await fetchApplications();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setAcceptingCharter(false);
    }
  };

  // Expert/Sponsor review student application
  const handleReviewApplication = async (studentId: string, action: "accept" | "reject") => {
    if (!session?.access_token) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/applications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ studentId, action }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to update application");
      }
      await fetchApplications();
      await fetchProject();
    } catch (err: any) {
      setError(err.message || "Failed to review student application");
    }
  };

  // Sponsor/Admin mark project completed
  const handleCompleteProject = async () => {
    if (!session?.access_token) return;
    try {
      setCompletingProject(true);
      const res = await fetch(`/api/projects/${projectId}/complete`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to mark project complete");
      }
      await fetchProject();
    } catch (err: any) {
      setError(err.message || "Failed to complete project");
    } finally {
      setCompletingProject(false);
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
        <p className="text-sm text-slate-500">Loading project details and agreement...</p>
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
            &larr; Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { project, charter, members, userAcceptance, isMember, isPending, isSponsor } = data;
  const isApprovedMember = isMember && !isPending;
  const isConfidential = project.data_sensitivity === "confidential";
  const isFunded = project.engagement_model?.toUpperCase() === "FUNDED" || project.engagement_model === "bounty_milestones";
  const budget = charter?.budget ?? (isFunded ? 100000 : 0);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500 mb-2">
        <Link href="/projects" className="hover:text-emerald-700">Projects</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-800 font-medium truncate max-w-md">{project.title}</span>
      </nav>

      {/* Project Banner / Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {isConfidential ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              CONFIDENTIAL DATA · LOCAL AI ONLY
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              PUBLIC DATA · CLOUD AI PERMITTED
            </span>
          )}

          {budget > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Coins className="w-3.5 h-3.5 text-emerald-600" />
              REWARD POOL (₹{budget.toLocaleString("en-IN")})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <Award className="w-3.5 h-3.5 text-slate-600" />
              RESEARCH CREDITS &amp; CREDENTIALS
            </span>
          )}

          {isApprovedMember && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ACTIVE MEMBER
            </span>
          )}

          {isPending && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              WAITING FOR APPROVAL
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
            Sponsor:{" "}
            <Link
              href={`/profile/${project.sponsor_id}`}
              className="text-slate-800 font-semibold hover:text-emerald-700 hover:underline"
            >
              {project.profiles?.display_name || "Research Sponsor"}
            </Link>
          </div>
          <div>
            Agreement Version: <strong className="text-slate-800 font-mono">v{charter?.version || 1}</strong>
          </div>
          <div>
            Active Team Members: <strong className="text-slate-800 font-semibold">{members.length}</strong>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-slate-400">Current User:</span>
            <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
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
            New work: <strong>STOPPED</strong> • Accepted Credits: <strong>PROTECTED</strong> • Escrow: <strong>UNDER REVIEW</strong>
          </p>
        </div>
      )}

      {/* Student Received Sponsor Invitation Banner */}
      {data.userApplication?.status === "sponsor_invited" && !isMember && (
        <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-indigo-50/90 border-2 border-indigo-200 text-indigo-950 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <Users className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
            <div>
              <div className="font-bold text-sm text-indigo-950">
                You have been invited to join this project by the sponsor!
              </div>
              <p className="text-xs text-indigo-800/90 mt-0.5">
                The sponsor has selected your profile and invited you to collaborate. Accept the invitation to access the workspace, charter, and confidential project brief.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleRespondToInvitation("accept")}
              disabled={respondingToInvite}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {respondingToInvite ? "Processing..." : "Accept Invitation"}
            </button>
            <button
              onClick={() => handleRespondToInvitation("reject")}
              disabled={respondingToInvite}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Redesigned 6 Tabs Header */}
      <div className="border-b border-slate-200 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap space-x-2 sm:space-x-6">
          {/* Tab 1: Overview */}
          <button
            id="tab-overview"
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <FileText className="w-4 h-4" />
            Overview
          </button>

          {/* Tab 2: Work & Earnings */}
          <button
            id="tab-work"
            onClick={() => setActiveTab("work")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "work"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Coins className="w-4 h-4" />
            Work &amp; Earnings
            {contributions.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded-full text-[10px]">
                {contributions.length}
              </span>
            )}
          </button>

          {/* Tab 3: Agreement */}
          <button
            id="tab-agreement"
            onClick={() => setActiveTab("agreement")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "agreement"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Agreement
            {isApprovedMember ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : isPending ? (
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            ) : null}
          </button>

          {/* Tab 4: Confidential Data (Sponsor Only - Section 4 & 18) */}
          {isSponsor && (
            <button
              id="tab-confidential"
              onClick={() => setActiveTab("confidential")}
              className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
                activeTab === "confidential"
                  ? "border-emerald-700 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              <Lock className="w-4 h-4" />
              Confidential Data
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </button>
          )}

          {/* Tab 5: Team & Feedback */}
          <button
            id="tab-feedback"
            onClick={() => setActiveTab("feedback")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "feedback"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Users className="w-4 h-4" />
            Team &amp; Feedback
          </button>

          {/* Tab 6: Security / Audit */}
          <button
            id="tab-security"
            onClick={() => setActiveTab("security")}
            className={`py-3 px-1 border-b-2 font-semibold text-sm transition-colors flex items-center gap-2 ${
              activeTab === "security"
                ? "border-emerald-700 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            }`}
          >
            <Fingerprint className="w-4 h-4" />
            Security / Audit
          </button>
        </div>

        <Link
          href={`/projects/${projectId}/rewards`}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors shrink-0"
        >
          <Calculator className="w-3.5 h-3.5 text-emerald-600" />
          Reward Calculator
        </Link>
      </div>

      {/* ================================================================ */}
      {/* TAB 1: OVERVIEW */}
      {/* ================================================================ */}
      {activeTab === "overview" && (
        <ProjectOverviewTab
          project={project}
          charter={charter}
          onApplyClick={() => setActiveTab("agreement")}
          onAiScope={handleAiScope}
          scopingLoading={scopingLoading}
          scopingInfo={scopingInfo}
          onFindMatches={isSponsor ? handleFindMatches : undefined}
          matchingLoading={matchingLoading}
          matches={matches}
          isSponsor={isSponsor}
          onInviteCandidate={handleInviteCandidate}
          invitingCandidateId={invitingCandidateId}
          invitedCandidateIds={invitedCandidateIds}
        />
      )}

      {/* ================================================================ */}
      {/* TAB 2: WORK & EARNINGS */}
      {/* ================================================================ */}
      {activeTab === "work" && (
        <ProjectWorkTab
          project={project}
          charter={charter}
          isMember={isMember}
          isPending={Boolean(isPending)}
          user={user}
          profile={profile}
          session={session}
          contributions={contributions}
          userCredits={userCredits}
          dbMilestones={dbMilestones}
          onRefresh={refreshM3Data}
        />
      )}

      {/* ================================================================ */}
      {/* TAB 3: AGREEMENT */}
      {/* ================================================================ */}
      {activeTab === "agreement" && (
        <ProjectAgreementTab
          project={project}
          charter={charter}
          isMember={isMember}
          isPending={Boolean(isPending)}
          userAcceptance={userAcceptance}
          userApplication={data?.userApplication}
          onApply={handleApply}
          applying={acceptingCharter}
          message={acceptMessage}
          error={error}
        />
      )}

      {/* ================================================================ */}
      {/* TAB 4: CONFIDENTIAL DATA (SPONSOR ONLY) */}
      {/* ================================================================ */}
      {activeTab === "confidential" && isSponsor && (
        <div className="space-y-6">
          {briefLoading ? (
            <div className="py-20 text-center bg-white border border-slate-200 rounded-2xl">
              <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Checking project access permissions...</p>
            </div>
          ) : briefAccessDenied || !confidentialBrief ? (
            /* LOCKED BRIEF CARD */
            <div className="bg-white border border-amber-200 rounded-2xl p-8 sm:p-12 shadow-xs text-center">
              <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                🔒 Project Brief Locked
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto mb-6 leading-relaxed">
                Access to proprietary model checkpoints, patient cohort identifiers, and internal benchmarks is protected. To protect research confidentiality, only approved project members can access this brief.
              </p>

              <div className="inline-block p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 max-w-md mx-auto mb-6">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-1">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  Why you cannot access this:
                </div>
                <div>{briefError || "Access is unlocked once your application is approved by the project expert."}</div>
              </div>

              <div>
                <button
                  onClick={() => setActiveTab("agreement")}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                >
                  Review Agreement &amp; Apply
                </button>
              </div>
            </div>
          ) : (
            /* UNLOCKED BRIEF CARD WITH DYNAMIC VIEWER WATERMARK */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-800">
                    Why you can access this: You are an approved member who accepted the project agreement.
                  </span>
                </div>
                <div className="text-xs font-mono text-emerald-700">
                  Access Audited in Cryptographic Ledger
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
                    RESTRICTED PROJECT BRIEF
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-4">
                    Proprietary Dataset &amp; Implementation Specifications
                  </h3>

                  <div className="prose prose-sm text-slate-800 leading-relaxed font-sans bg-white/90 p-6 rounded-xl border border-slate-200 shadow-xs backdrop-blur-xs whitespace-pre-wrap">
                    {confidentialBrief}
                  </div>

                  <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                    <div>
                      Watermark Stamp: <strong className="font-mono text-slate-700">{viewerWatermark}</strong>
                    </div>
                    <div>
                      AI Boundary: <strong className="text-rose-700">Local Model Only (Zero Cloud Transmission)</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 5: TEAM & FEEDBACK */}
      {/* ================================================================ */}
      {activeTab === "feedback" && (
        <ProjectTeamTab
          project={project}
          members={members}
          applications={applications}
          user={user}
          profile={profile}
          session={session}
          onReviewApplication={handleReviewApplication}
          onCompleteProject={handleCompleteProject}
          completing={completingProject}
          disputes={disputes}
          onRefresh={refreshM3Data}
        />
      )}

      {/* ================================================================ */}
      {/* TAB 6: SECURITY / AUDIT */}
      {/* ================================================================ */}
      {activeTab === "security" && (
        <div className="space-y-8">
          {/* 1. Cryptographic SHA-256 Ledger Section */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <span className="text-xs font-mono font-bold text-indigo-600 uppercase">
                  SHA-256 Cryptographic Hash Chain
                </span>
                <h2 className="text-xl font-bold text-slate-900 mt-1">
                  Project Audit Trail &amp; Proof of Contribution
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Every project creation, agreement publication, application, acceptance, and contribution is chained into the immutable ledger.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleVerifyLedger(false)}
                  disabled={verifyingLedger}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  {verifyingLedger ? "Verifying..." : "Verify Hash Chain"}
                </button>

                <button
                  onClick={() => handleVerifyLedger(true)}
                  disabled={verifyingLedger}
                  className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
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
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-rose-600 text-white">
                        TAMPER DETECTED
                      </span>
                      <p className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        Ledger verification failed. First mismatch: Entry {verificationResult.result?.detected_at_index ?? 1}.
                      </p>
                    </div>
                    <div className="mt-2 font-mono text-[11px] bg-white p-3 rounded-lg border border-amber-200 overflow-x-auto">
                      <div>Status: <strong>{verificationResult.result?.status}</strong></div>
                      <div>Reason: {verificationResult.result?.reason}</div>
                      <div>Detected at entry index: {verificationResult.result?.detected_at_index}</div>
                      <div>Production ledger untouched: {String(verificationResult.result?.production_ledger_untouched)}</div>
                    </div>
                  </div>
                ) : verificationResult.result?.status === "PASS" ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-emerald-600 text-white">
                        LEDGER VERIFIED
                      </span>
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Cryptographic Chain Verified: PASS ({verificationResult.result?.entries_verified} entries valid)
                      </p>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-emerald-800">
                      Head Hash: {verificationResult.result?.head_hash}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900">
                    <p className="font-bold">Ledger Verification Failed</p>
                    <p className="font-mono mt-1">{verificationResult.error || "Chain verification error"}</p>
                  </div>
                )}
              </div>
            )}

            {/* Ledger Entries List */}
            <div className="mt-6">
              {ledgerLoading ? (
                <div className="py-8 text-center text-xs text-slate-500">Loading ledger chain...</div>
              ) : ledgerEntries.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No ledger entries recorded yet.</div>
              ) : (
                <div className="space-y-3">
                  {ledgerEntries.map((entry, idx) => (
                    <div
                      key={entry.id || idx}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-indigo-700">#{entry.entry_index ?? idx}</span>
                          <span className="font-semibold text-slate-900">{entry.action}</span>
                          <span className="text-[10px] text-slate-400">by {entry.actor_name || entry.actor_id?.slice(0, 8)}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1">
                          Hash: <span className="text-slate-700">{entry.entry_hash?.slice(0, 24)}...</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. ResearchCopilot with Privacy Boundary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">ResearchCopilot (Dual-AI Architecture)</h3>
                <p className="text-xs text-slate-500">
                  Project-scoped AI assistant. PUBLIC queries use OpenRouter; CONFIDENTIAL queries route strictly to on-device Ollama.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700">Classification:</span>
                <button
                  type="button"
                  onClick={() => setCopilotClassification("PUBLIC")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    copilotClassification === "PUBLIC"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  PUBLIC (OpenRouter GPT-4o-mini)
                </button>
                <button
                  type="button"
                  onClick={() => setCopilotClassification("CONFIDENTIAL")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    copilotClassification === "CONFIDENTIAL"
                      ? "bg-rose-50 border-rose-300 text-rose-800"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  CONFIDENTIAL (Local Ollama Only)
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={copilotTask}
                  onChange={(e) => setCopilotTask(e.target.value)}
                  placeholder="Ask a technical or research question about this project..."
                  className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-hidden"
                />
                <button
                  onClick={() => handleAskCopilot()}
                  disabled={copilotLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#3730A3] px-4 py-2 text-xs font-bold text-white hover:bg-[#312E81] disabled:opacity-50 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  {copilotLoading ? "Querying..." : "Send"}
                </button>
              </div>

              {copilotError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                  {copilotError}
                </div>
              )}

              {copilotResult && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-sans">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <span className="font-semibold text-slate-700">Copilot Output</span>
                    <span className="font-mono text-[10px] text-indigo-700 bg-white border border-slate-200 px-2 py-0.5 rounded">
                      Provider: {copilotResult.provider} · Route: {copilotResult.routeBadge}
                    </span>
                  </div>
                  <p className="text-slate-800 whitespace-pre-wrap">{copilotResult.output}</p>
                </div>
              )}
            </div>
          </div>

          {/* 3. Sponsor Withdrawal Protection */}
          <SponsorWithdrawalCard
            projectId={projectId}
            projectStatus={project.status}
            isSponsor={isSponsor}
            userRole={profile?.role || "student"}
            token={session?.access_token}
            onWithdrawn={refreshM3Data}
          />

          {/* 4. Non-Monetary Project Credential Viewer */}
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
    </div>
  );
}

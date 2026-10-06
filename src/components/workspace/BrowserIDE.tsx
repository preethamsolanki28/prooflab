"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import {
  Code,
  Terminal as TerminalIcon,
  Folder,
  FolderOpen,
  File,
  GitBranch,
  Save,
  CheckCircle2,
  Lock,
  RefreshCw,
  ExternalLink,
  GitCommit,
  Send,
  FileText,
  FileCode,
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  Users,
  Activity,
  Plus,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  ShieldAlert,
  Play,
  Maximize2,
  Minimize2,
  Check,
} from "lucide-react";

interface WorkspaceMember {
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  profiles?: {
    display_name?: string;
    role?: string;
  };
}

interface WorkspaceCommit {
  id: string;
  commit_hash: string;
  commit_message: string;
  branch: string;
  changed_files: string[];
  created_at: string;
  user_id?: string;
}

interface WorkspaceFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: WorkspaceFile[];
}

interface OpenTab {
  path: string;
  name: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
}

interface BrowserIDEProps {
  projectId: string;
  projectTitle: string;
  projectSummary?: string;
  dataSensitivity?: string;
  githubRepoUrl?: string | null;
  token?: string;
  isApprovedMember?: boolean;
  isSponsor?: boolean;
  initialTab?: "overview" | "discussions" | "tasks" | "code" | "files" | "team" | "activity";
  onOpenContributionModal?: (commitData?: { title: string; summary: string; hash: string }) => void;
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "py":
      return "python";
    case "js":
    case "mjs":
    case "cjs":
      return "javascript";
    case "ts":
      return "typescript";
    case "tsx":
      return "typescript";
    case "jsx":
      return "javascript";
    case "json":
      return "json";
    case "md":
      return "markdown";
    case "css":
      return "css";
    case "html":
      return "html";
    case "sh":
    case "bash":
      return "shell";
    case "sql":
      return "sql";
    case "yml":
    case "yaml":
      return "yaml";
    default:
      return "plaintext";
  }
}

export function BrowserIDE({
  projectId,
  projectTitle: initialTitle,
  projectSummary: initialSummary,
  dataSensitivity: initialSensitivity,
  githubRepoUrl: initialRepoUrl,
  token,
  isApprovedMember: initialApproved,
  isSponsor: initialSponsor,
  initialTab = "code",
  onOpenContributionModal,
}: BrowserIDEProps) {
  // Navigation sidebar state
  const [activeSidebarTab, setActiveSidebarTab] = useState<
    "overview" | "discussions" | "tasks" | "code" | "files" | "team" | "activity"
  >(initialTab);

  // Authorization & Workspace State
  const [accessStatus, setAccessStatus] = useState<"LOADING" | "ACTIVE" | "LOCKED">("LOADING");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [workspaceServiceUrl, setWorkspaceServiceUrl] = useState<string | null>(null);
  const [projectMeta, setProjectMeta] = useState({
    title: initialTitle,
    publicSummary: initialSummary || "",
    dataSensitivity: initialSensitivity || "confidential",
    githubRepoUrl: initialRepoUrl || null,
    status: "active",
    budget: 0,
  });
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [commits, setCommits] = useState<WorkspaceCommit[]>([]);

  // File Explorer & Monaco Editor State
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    tests: true,
  });
  const [openTabs, setOpenTabs] = useState<OpenTab[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>("");
  const [saving, setSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // New File Modal
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFilePath, setNewFilePath] = useState<string>("");
  const [creatingFile, setCreatingFile] = useState<boolean>(false);

  // Terminal State
  const [terminalOpen, setTerminalOpen] = useState<boolean>(true);
  const [terminalHeight, setTerminalHeight] = useState<"compact" | "expanded">("compact");
  const [terminalHistory, setTerminalHistory] = useState<
    Array<{ type: "cmd" | "stdout" | "stderr" | "info"; text: string }>
  >([
    { type: "info", text: "ResearchMesh Cloud Sandbox [Version 2.4.0]" },
    { type: "info", text: `Project: ${initialTitle}` },
    { type: "info", text: "Ready. Type commands below or click quick command shortcuts." },
  ]);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [runningCmd, setRunningCmd] = useState<boolean>(false);
  const [cmdHistoryIndex, setCmdHistoryIndex] = useState<number>(-1);
  const [pastCommands, setPastCommands] = useState<string[]>([]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Git Commit Modal
  const [commitModalOpen, setCommitModalOpen] = useState<boolean>(false);
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [committing, setCommitting] = useState<boolean>(false);
  const [lastCommitHash, setLastCommitHash] = useState<string | null>(null);

  // Discussions State
  const [discussionMessages, setDiscussionMessages] = useState<
    Array<{ id: string; sender: string; role: string; time: string; text: string }>
  >([
    {
      id: "1",
      sender: "System",
      role: "Governance",
      time: "Workspace Initialized",
      text: "Sandbox repository ready. Approved team members can collaborate, run tests, and commit research code.",
    },
  ]);
  const [newDiscussionText, setNewDiscussionText] = useState("");

  // 1. Authorize Workspace Access from Backend
  useEffect(() => {
    async function checkAccess() {
      if (!token) {
        setAccessStatus("LOCKED");
        setAccessError("Sign in to access the project workspace.");
        return;
      }
      try {
        setAccessStatus("LOADING");
        const res = await fetch(`/api/projects/${projectId}/workspace`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok && data.access === "ACTIVE") {
          setAccessStatus("ACTIVE");
          setWorkspaceServiceUrl(data.workspaceServiceUrl);
          if (data.project) {
            setProjectMeta({
              title: data.project.title || initialTitle,
              publicSummary: data.project.publicSummary || initialSummary || "",
              dataSensitivity: data.project.dataSensitivity || initialSensitivity || "confidential",
              githubRepoUrl: data.project.githubRepoUrl || initialRepoUrl || null,
              status: data.project.status || "active",
              budget: data.project.budget || 0,
            });
          }
          if (data.members) setMembers(data.members);
          if (data.milestones) setMilestones(data.milestones);
          if (data.commits) setCommits(data.commits);

          loadFiles();
        } else {
          setAccessStatus("LOCKED");
          setAccessError(data.error || "Workspace access is locked until sponsor approves your application.");
        }
      } catch (err: any) {
        setAccessStatus("LOCKED");
        setAccessError(err.message || "Failed to verify workspace authorization.");
      }
    }
    checkAccess();
  }, [projectId, token]);

  // 2. Load File Tree
  const loadFiles = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/workspace/files`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const filesList: WorkspaceFile[] = data.files || [];
        setFiles(filesList);

        // If no tabs are open, open src/model.py or README.md
        if (openTabs.length === 0) {
          openFileInTab("src/model.py");
        }
      }
    } catch {
      // ignore
    }
  };

  // 3. Open File in Editor Tab
  const openFileInTab = async (filePath: string) => {
    if (!token) return;

    // Check if already open
    const existingIndex = openTabs.findIndex((t) => t.path === filePath);
    if (existingIndex !== -1) {
      setActiveFilePath(filePath);
      return;
    }

    try {
      const res = await fetch(
        `/api/projects/${projectId}/workspace/files?path=${encodeURIComponent(filePath)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        const newTab: OpenTab = {
          path: filePath,
          name: filePath.split("/").pop() || filePath,
          content: data.content ?? "",
          originalContent: data.content ?? "",
          isDirty: false,
        };
        setOpenTabs((prev) => [...prev, newTab]);
        setActiveFilePath(filePath);
      }
    } catch {
      // ignore
    }
  };

  // 4. Close Tab
  const closeTab = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newTabs = openTabs.filter((t) => t.path !== filePath);
    setOpenTabs(newTabs);
    if (activeFilePath === filePath) {
      if (newTabs.length > 0) {
        setActiveFilePath(newTabs[newTabs.length - 1].path);
      } else {
        setActiveFilePath("");
      }
    }
  };

  // 5. Update Active Tab Content
  const handleEditorChange = (value: string | undefined) => {
    const newContent = value ?? "";
    setOpenTabs((prev) =>
      prev.map((t) => {
        if (t.path === activeFilePath) {
          return {
            ...t,
            content: newContent,
            isDirty: newContent !== t.originalContent,
          };
        }
        return t;
      })
    );
  };

  const activeTab = openTabs.find((t) => t.path === activeFilePath);

  // 6. Save Active File
  const handleSaveFile = async () => {
    if (!token || !activeFilePath || !activeTab) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/projects/${projectId}/workspace/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filePath: activeFilePath,
          content: activeTab.content,
        }),
      });
      if (res.ok) {
        setOpenTabs((prev) =>
          prev.map((t) =>
            t.path === activeFilePath
              ? { ...t, originalContent: t.content, isDirty: false }
              : t
          )
        );
        setSaveToast(`Saved ${activeFilePath}`);
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  // 7. Create New File
  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilePath.trim() || !token) return;
    try {
      setCreatingFile(true);
      const initialBoilerplate = newFilePath.endsWith(".py")
        ? `# ${newFilePath}\ndef main():\n    print("Research module ready")\n\nif __name__ == "__main__":\n    main()\n`
        : newFilePath.endsWith(".json")
        ? `{\n  "version": "1.0.0"\n}\n`
        : `// ${newFilePath}\nconsole.log("Ready");\n`;

      const res = await fetch(`/api/projects/${projectId}/workspace/files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filePath: newFilePath.trim(),
          content: initialBoilerplate,
        }),
      });

      if (res.ok) {
        setShowNewFileModal(false);
        const createdPath = newFilePath.trim();
        setNewFilePath("");
        await loadFiles();
        await openFileInTab(createdPath);
      }
    } catch {
      // ignore
    } finally {
      setCreatingFile(false);
    }
  };

  // Keyboard shortcut: Ctrl+S / Cmd+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeFilePath, activeTab, token]);

  // 8. Execute Terminal Command
  const runCommand = async (cmdToRun: string) => {
    const cmd = cmdToRun.trim();
    if (!cmd || runningCmd || !token) return;

    setRunningCmd(true);
    setTerminalHistory((prev) => [...prev, { type: "cmd", text: `$ ${cmd}` }]);
    setPastCommands((prev) => [...prev, cmd]);
    setCmdHistoryIndex(-1);
    setTerminalInput("");

    try {
      const res = await fetch(`/api/projects/${projectId}/workspace/terminal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();

      if (data.stdout) {
        setTerminalHistory((prev) => [...prev, { type: "stdout", text: data.stdout.trim() }]);
      }
      if (data.stderr) {
        setTerminalHistory((prev) => [...prev, { type: "stderr", text: data.stderr.trim() }]);
      }
      if (data.commitHash) {
        setLastCommitHash(data.commitHash);
        refreshCommits();
      }
    } catch (err: any) {
      setTerminalHistory((prev) => [
        ...prev,
        { type: "stderr", text: `Command execution failed: ${err.message}` },
      ]);
    } finally {
      setRunningCmd(false);
      setTimeout(() => {
        terminalBottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    }
  };

  // 9. Git Commit Action
  const handleCommit = async () => {
    if (!commitMessage.trim() || !token) return;
    try {
      setCommitting(true);
      const res = await fetch(`/api/projects/${projectId}/workspace/git`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: commitMessage.trim(),
          files: activeFilePath ? [activeFilePath] : ["src/model.py"],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastCommitHash(data.commitHash);
        setCommitModalOpen(false);
        const msg = commitMessage.trim();
        setCommitMessage("");
        setTerminalHistory((prev) => [
          ...prev,
          { type: "info", text: `[Git Commit] [main ${data.commitHash.slice(0, 7)}] ${msg}` },
        ]);
        refreshCommits();
      }
    } catch {
      // ignore
    } finally {
      setCommitting(false);
    }
  };

  const refreshCommits = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/workspace`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.commits) setCommits(data.commits);
    } catch {
      // ignore
    }
  };

  // Toggle folder expansion
  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  // Render file tree recursively
  const renderFileTree = (items: WorkspaceFile[], depth = 0) => {
    return items.map((item) => {
      if (item.type === "directory") {
        const isExpanded = Boolean(expandedFolders[item.path]);
        return (
          <div key={item.path}>
            <button
              onClick={() => toggleFolder(item.path)}
              className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-slate-300 hover:text-white hover:bg-slate-800/60 rounded text-left transition-colors"
              style={{ paddingLeft: `${depth * 12 + 8}px` }}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              )}
              {isExpanded ? (
                <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )}
              <span className="truncate">{item.name}</span>
            </button>
            {isExpanded && item.children && (
              <div>{renderFileTree(item.children, depth + 1)}</div>
            )}
          </div>
        );
      }

      const isActive = activeFilePath === item.path;
      return (
        <button
          key={item.path}
          onClick={() => openFileInTab(item.path)}
          className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs rounded text-left transition-colors truncate ${
            isActive
              ? "bg-indigo-600/30 text-indigo-300 font-medium border-l-2 border-indigo-500"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          }`}
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          {item.name.endsWith(".py") ? (
            <FileCode className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          ) : item.name.endsWith(".json") ? (
            <FileText className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
          ) : item.name.endsWith(".md") ? (
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : (
            <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span className="truncate">{item.name}</span>
        </button>
      );
    });
  };

  // --------------------------------------------------------------------------
  // LOCKED / UNAUTHORIZED STATE
  // --------------------------------------------------------------------------
  if (accessStatus === "LOCKED") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden p-8 shadow-sm text-center max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 mb-2">
          WORKSPACE LOCKED
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Workspace Access Restricted
        </h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto leading-relaxed">
          {accessError ||
            "You must be an approved project member or sponsor to access the cloud workspace."}
        </p>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-left text-xs text-slate-600 mb-6 space-y-2">
          <div className="font-semibold text-slate-900">How to unlock access:</div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
              1
            </span>
            <span>Submit your application to participate in this project</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
              2
            </span>
            <span>Project sponsor reviews and approves your application</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
              3
            </span>
            <span>Workspace, code editor, and sandbox terminal unlock automatically</span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Back to Project Overview
          </Link>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Check Access Again
          </button>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // LOADING STATE
  // --------------------------------------------------------------------------
  if (accessStatus === "LOADING") {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center my-8">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700">Authorizing Workspace Sandbox...</p>
        <p className="text-xs text-slate-500 mt-1">Verifying membership and credentials</p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ACTIVE IN-DASHBOARD IDE
  // --------------------------------------------------------------------------
  return (
    <div className="bg-slate-950 text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col h-[820px]">
      {/* ==================================================================== */}
      {/* TOP HEADER BAR */}
      {/* ==================================================================== */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <span>←</span>
            <span>Project</span>
          </Link>
          <div className="h-4 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white truncate max-w-xs sm:max-w-md">
              {projectMeta.title}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              WORKSPACE ACTIVE
            </span>
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <GitBranch className="w-3 h-3 text-indigo-400" />
              main
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projectMeta.dataSensitivity === "confidential" ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldAlert className="w-3.5 h-3.5" />
              Confidential Sandbox (Local AI)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              Public Research
            </span>
          )}

          {lastCommitHash && (
            <span className="hidden lg:inline-flex text-xs text-slate-400 bg-slate-800/80 px-2 py-1 rounded border border-slate-700 font-mono">
              commit: {lastCommitHash.slice(0, 7)}
            </span>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MAIN BODY: LEFT SIDEBAR + WORKSPACE CONTENT */}
      {/* ==================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* ------------------------------------------------------------------ */}
        {/* LEFT WORKSPACE SIDEBAR */}
        {/* ------------------------------------------------------------------ */}
        <div className="w-52 bg-slate-900/90 border-r border-slate-800 flex flex-col shrink-0 justify-between">
          <div className="p-2 space-y-1">
            <button
              onClick={() => setActiveSidebarTab("overview")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeSidebarTab === "overview"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 shrink-0" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab("discussions")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeSidebarTab === "discussions"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <MessageSquare className="w-4 h-4 shrink-0" />
              <span>Discussions</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab("tasks")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeSidebarTab === "tasks"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <ListTodo className="w-4 h-4 shrink-0" />
              <span>Tasks</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab("code")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeSidebarTab === "code"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Code className="w-4 h-4 shrink-0" />
              <span className="font-semibold">Code</span>
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </button>

            <button
              onClick={() => setActiveSidebarTab("files")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeSidebarTab === "files"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Folder className="w-4 h-4 shrink-0" />
              <span>Files</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab("team")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeSidebarTab === "team"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Team</span>
            </button>

            <button
              onClick={() => setActiveSidebarTab("activity")}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                activeSidebarTab === "activity"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Activity className="w-4 h-4 shrink-0" />
              <span>Activity</span>
            </button>
          </div>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-slate-800 bg-slate-900/50 text-[11px] text-slate-400 space-y-1.5">
            <div className="flex items-center justify-between">
              <span>Branch</span>
              <span className="font-mono text-slate-200">main</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Files</span>
              <span className="text-slate-200">{files.length}</span>
            </div>
            {projectMeta.githubRepoUrl && (
              <a
                href={projectMeta.githubRepoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 pt-1 truncate"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                <span className="truncate">GitHub Repo</span>
              </a>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* WORKSPACE CONTENT AREA */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
          {/* ================================================================ */}
          {/* TAB 1: CODE (IN-DASHBOARD MONACO IDE) */}
          {/* ================================================================ */}
          {activeSidebarTab === "code" && (
            <div className="flex-1 flex overflow-hidden">
              {/* FILE EXPLORER SUB-SIDEBAR */}
              <div className="w-56 bg-slate-900/70 border-r border-slate-800 flex flex-col shrink-0">
                <div className="h-10 px-3 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400 font-medium">
                  <span className="tracking-wider text-[11px] uppercase font-semibold text-slate-300">
                    Explorer
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setShowNewFileModal(true)}
                      title="New File"
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={loadFiles}
                      title="Refresh Files"
                      className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
                  {renderFileTree(files)}
                </div>
              </div>

              {/* EDITOR + TERMINAL SPLIT CONTAINER */}
              <div className="flex-1 flex flex-col overflow-hidden bg-[#1e1e1e]">
                {/* FILE TABS BAR + ACTION BUTTONS */}
                <div className="h-10 bg-[#181818] border-b border-slate-800 flex items-center justify-between px-2 shrink-0">
                  <div className="flex items-center gap-1 overflow-x-auto max-w-2xl py-1">
                    {openTabs.map((t) => {
                      const isCurrent = t.path === activeFilePath;
                      return (
                        <div
                          key={t.path}
                          onClick={() => setActiveFilePath(t.path)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t text-xs cursor-pointer border-t-2 transition-all ${
                            isCurrent
                              ? "bg-[#1e1e1e] text-white border-indigo-500 font-medium"
                              : "text-slate-400 hover:text-slate-200 hover:bg-[#202020] border-transparent"
                          }`}
                        >
                          <span className="truncate max-w-[140px]">{t.name}</span>
                          {t.isDirty && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          )}
                          <button
                            onClick={(e) => closeTab(t.path, e)}
                            className="p-0.5 text-slate-500 hover:text-white rounded hover:bg-slate-700/50"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* ACTION CONTROLS */}
                  <div className="flex items-center gap-2">
                    {saveToast && (
                      <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded flex items-center gap-1 animate-fade-in">
                        <Check className="w-3 h-3" />
                        {saveToast}
                      </span>
                    )}

                    <button
                      onClick={() => setShowNewFileModal(true)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white rounded transition-colors flex items-center gap-1 border border-slate-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New File</span>
                    </button>

                    <button
                      onClick={handleSaveFile}
                      disabled={saving || !activeTab?.isDirty}
                      className={`px-3 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 shadow-sm ${
                        activeTab?.isDirty
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
                          : "bg-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{saving ? "Saving..." : "Save"}</span>
                    </button>

                    <button
                      onClick={() => setCommitModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800 rounded transition-colors flex items-center gap-1"
                    >
                      <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Commit</span>
                    </button>

                    <button
                      onClick={() => setTerminalOpen(!terminalOpen)}
                      className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-1 border ${
                        terminalOpen
                          ? "bg-slate-800 text-slate-200 border-slate-700"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      <TerminalIcon className="w-3.5 h-3.5" />
                      <span>CLI</span>
                    </button>
                  </div>
                </div>

                {/* MONACO CODE EDITOR */}
                <div className="flex-1 relative overflow-hidden bg-[#1e1e1e]">
                  {activeTab ? (
                    <Editor
                      height="100%"
                      path={activeTab.path}
                      language={detectLanguage(activeTab.path)}
                      value={activeTab.content}
                      theme="vs-dark"
                      onChange={handleEditorChange}
                      options={{
                        minimap: { enabled: true },
                        fontSize: 13,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 2,
                        wordWrap: "on",
                        padding: { top: 12 },
                      }}
                    />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                      <Code className="w-12 h-12 mb-2 text-slate-700" />
                      <p>No file selected</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Select a file from the explorer or create a new file
                      </p>
                    </div>
                  )}
                </div>

                {/* REAL TERMINAL / CLI PANEL AT BOTTOM */}
                {terminalOpen && (
                  <div
                    className={`bg-[#0c0c0c] border-t border-slate-800 flex flex-col transition-all shrink-0 ${
                      terminalHeight === "expanded" ? "h-80" : "h-52"
                    }`}
                  >
                    {/* TERMINAL HEADER & QUICK COMMANDS */}
                    <div className="h-8 bg-slate-900/90 border-b border-slate-800 px-3 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2">
                        <TerminalIcon className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-semibold text-slate-300 text-[11px] tracking-wider uppercase">
                          Terminal / CLI
                        </span>
                      </div>

                      {/* QUICK COMMAND CHIPS */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <button
                          onClick={() => runCommand("npm install")}
                          disabled={runningCmd}
                          className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                        >
                          npm install
                        </button>
                        <button
                          onClick={() => runCommand("npm run test")}
                          disabled={runningCmd}
                          className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                        >
                          npm run test
                        </button>
                        <button
                          onClick={() => runCommand("npm run build")}
                          disabled={runningCmd}
                          className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                        >
                          npm run build
                        </button>
                        <button
                          onClick={() => runCommand("git status")}
                          disabled={runningCmd}
                          className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                        >
                          git status
                        </button>
                        <button
                          onClick={() => runCommand("git log -n 5 --oneline")}
                          disabled={runningCmd}
                          className="px-2 py-0.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                        >
                          git log
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            setTerminalHeight(terminalHeight === "expanded" ? "compact" : "expanded")
                          }
                          className="p-1 text-slate-500 hover:text-slate-300 rounded"
                          title="Resize Terminal"
                        >
                          {terminalHeight === "expanded" ? (
                            <Minimize2 className="w-3 h-3" />
                          ) : (
                            <Maximize2 className="w-3 h-3" />
                          )}
                        </button>
                        <button
                          onClick={() => setTerminalOpen(false)}
                          className="p-1 text-slate-500 hover:text-slate-300 rounded"
                          title="Close Terminal"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* TERMINAL LOG OUTPUT */}
                    <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1 select-text">
                      {terminalHistory.map((line, idx) => (
                        <div
                          key={idx}
                          className={`leading-relaxed whitespace-pre-wrap break-all ${
                            line.type === "cmd"
                              ? "text-emerald-400 font-semibold"
                              : line.type === "stderr"
                              ? "text-rose-400"
                              : line.type === "info"
                              ? "text-cyan-400/80"
                              : "text-slate-300"
                          }`}
                        >
                          {line.text}
                        </div>
                      ))}
                      {runningCmd && (
                        <div className="text-amber-400 text-xs flex items-center gap-1.5 animate-pulse">
                          <span>Executing command...</span>
                        </div>
                      )}
                      <div ref={terminalBottomRef} />
                    </div>

                    {/* TERMINAL INPUT PROMPT */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        runCommand(terminalInput);
                      }}
                      className="h-9 bg-slate-900 border-t border-slate-800/80 px-3 flex items-center gap-2"
                    >
                      <span className="text-emerald-400 font-mono text-xs font-bold">$</span>
                      <input
                        type="text"
                        value={terminalInput}
                        onChange={(e) => setTerminalInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            if (pastCommands.length > 0) {
                              const nextIdx =
                                cmdHistoryIndex === -1
                                  ? pastCommands.length - 1
                                  : Math.max(0, cmdHistoryIndex - 1);
                              setCmdHistoryIndex(nextIdx);
                              setTerminalInput(pastCommands[nextIdx]);
                            }
                          } else if (e.key === "ArrowDown") {
                            e.preventDefault();
                            if (cmdHistoryIndex !== -1) {
                              const nextIdx = cmdHistoryIndex + 1;
                              if (nextIdx < pastCommands.length) {
                                setCmdHistoryIndex(nextIdx);
                                setTerminalInput(pastCommands[nextIdx]);
                              } else {
                                setCmdHistoryIndex(-1);
                                setTerminalInput("");
                              }
                            }
                          }
                        }}
                        placeholder="Type bash or git command (e.g. npm test, git status, git commit)..."
                        disabled={runningCmd}
                        className="flex-1 bg-transparent text-slate-100 font-mono text-xs focus:outline-none placeholder-slate-600"
                      />
                      <button
                        type="submit"
                        disabled={runningCmd || !terminalInput.trim()}
                        className="text-slate-400 hover:text-white disabled:opacity-30 p-1"
                      >
                        <Play className="w-3 h-3" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: OVERVIEW */}
          {/* ================================================================ */}
          {activeSidebarTab === "overview" && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">{projectMeta.title}</h3>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active Research Sandbox
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed mb-6">
                  {projectMeta.publicSummary ||
                    "Collaborative research environment with full terminal execution, Monaco code editing, and Git commit tracking."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-1">Active Members</div>
                    <div className="text-xl font-bold text-white">{members.length || 1}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-1">Workspace Files</div>
                    <div className="text-xl font-bold text-white">{files.length}</div>
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4">
                    <div className="text-xs text-slate-400 mb-1">Tracked Commits</div>
                    <div className="text-xl font-bold text-white">{commits.length}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <Code className="w-4 h-4 text-indigo-400" />
                    Quick Start & Commands
                  </h4>
                  <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                    You have access to a real in-browser CLI and dark Monaco code editor. Normal
                    commands including <code className="text-indigo-300">npm test</code>,{" "}
                    <code className="text-indigo-300">npm install</code>, and{" "}
                    <code className="text-indigo-300">git commit</code> execute directly in this sandbox.
                  </p>
                  <button
                    onClick={() => setActiveSidebarTab("code")}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <Code className="w-3.5 h-3.5" />
                    Launch Code Editor
                  </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-emerald-400" />
                    Git & Repository State
                  </h4>
                  <div className="text-xs text-slate-300 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Default Branch:</span>
                      <span className="font-mono text-white">main</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Latest Hash:</span>
                      <span className="font-mono text-emerald-400">
                        {lastCommitHash ? lastCommitHash.slice(0, 7) : "GENESIS"}
                      </span>
                    </div>
                    {projectMeta.githubRepoUrl && (
                      <div className="flex justify-between pt-1">
                        <span className="text-slate-400">Source:</span>
                        <a
                          href={projectMeta.githubRepoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-400 hover:underline truncate max-w-[180px]"
                        >
                          {projectMeta.githubRepoUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 3: DISCUSSIONS */}
          {/* ================================================================ */}
          {activeSidebarTab === "discussions" && (
            <div className="flex-1 flex flex-col p-6 overflow-hidden max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-indigo-400" />
                  Project Discussions & Peer Sync
                </h3>
                <span className="text-xs text-slate-400">
                  {discussionMessages.length} messages
                </span>
              </div>

              <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl p-4 overflow-y-auto space-y-3 mb-4">
                {discussionMessages.map((msg) => (
                  <div key={msg.id} className="bg-slate-950/80 border border-slate-800 rounded-lg p-3.5">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{msg.sender}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-900/50 text-indigo-300 border border-indigo-700/50">
                          {msg.role}
                        </span>
                      </div>
                      <span className="text-slate-500 text-[11px]">{msg.time}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{msg.text}</p>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newDiscussionText.trim()) return;
                  setDiscussionMessages((prev) => [
                    ...prev,
                    {
                      id: String(Date.now()),
                      sender: "You",
                      role: "Contributor",
                      time: "Just now",
                      text: newDiscussionText.trim(),
                    },
                  ]);
                  setNewDiscussionText("");
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={newDiscussionText}
                  onChange={(e) => setNewDiscussionText(e.target.value)}
                  placeholder="Post a message or question for the project team..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={!newDiscussionText.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: TASKS */}
          {/* ================================================================ */}
          {activeSidebarTab === "tasks" && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-indigo-400" />
                  Milestones & Research Deliverables
                </h3>
                <span className="text-xs text-slate-400">
                  {milestones.length} defined milestones
                </span>
              </div>

              {milestones.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                  <ListTodo className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm">No formal milestones uploaded.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Contributions can be created and reviewed in the Code tab.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {milestones.map((m, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-400">
                            Milestone {m.id || idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {m.title || "Research Deliverable"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {m.description || "Research task implementation and verification."}
                        </p>
                        {m.required_skills && m.required_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {m.required_skills.map((skill: string, sIdx: number) => (
                              <span
                                key={sIdx}
                                className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        {m.budget ? (
                          <div className="text-xs font-semibold text-emerald-400">
                            ₹{Number(m.budget).toLocaleString("en-IN")}
                          </div>
                        ) : null}
                        <button
                          onClick={() => setActiveSidebarTab("code")}
                          className="mt-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 rounded transition-colors"
                        >
                          Work on Task →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: FILES */}
          {/* ================================================================ */}
          {activeSidebarTab === "files" && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Folder className="w-4 h-4 text-indigo-400" />
                  Repository Files Tree
                </h3>
                <button
                  onClick={() => setShowNewFileModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New File
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="h-9 bg-slate-800/80 px-4 flex items-center justify-between text-xs font-medium text-slate-400 border-b border-slate-800">
                  <span>File Name</span>
                  <div className="flex items-center gap-8">
                    <span>Size</span>
                    <span>Action</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/60 text-xs">
                  {files.map((f) => (
                    <div
                      key={f.path}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        {f.type === "directory" ? (
                          <Folder className="w-4 h-4 text-amber-400" />
                        ) : (
                          <FileCode className="w-4 h-4 text-blue-400" />
                        )}
                        <span className="text-slate-200">{f.path}</span>
                      </div>
                      <div className="flex items-center gap-8">
                        <span className="text-slate-500 font-mono text-[11px]">
                          {f.size ? `${f.size} B` : "dir"}
                        </span>
                        <button
                          onClick={() => {
                            setActiveSidebarTab("code");
                            openFileInTab(f.path);
                          }}
                          className="text-indigo-400 hover:text-indigo-300 font-medium"
                        >
                          Open in Editor
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 6: TEAM */}
          {/* ================================================================ */}
          {activeSidebarTab === "team" && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Active Workspace Team
                </h3>
                <span className="text-xs text-slate-400">
                  {members.length || 1} approved participants
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {members.map((m, idx) => (
                  <div
                    key={idx}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-300">
                        {(m.profiles?.display_name || "U").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white">
                          {m.profiles?.display_name || "Team Contributor"}
                        </div>
                        <div className="text-xs text-slate-400 capitalize">
                          Role: {m.role}
                        </div>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 7: ACTIVITY */}
          {/* ================================================================ */}
          {activeSidebarTab === "activity" && (
            <div className="flex-1 p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  Git Commit & Contribution Timeline
                </h3>
                <span className="text-xs text-slate-400">
                  {commits.length} tracked events
                </span>
              </div>

              {commits.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                  <GitCommit className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm">No Git commits recorded yet.</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Make changes in the Code tab and run `git commit` to register your contribution.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {commits.map((c) => (
                    <div
                      key={c.id}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800">
                            {c.commit_hash.slice(0, 7)}
                          </span>
                          <span className="text-sm font-semibold text-white">
                            {c.commit_message}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 pt-1">
                          <span>Branch: {c.branch}</span>
                          <span>•</span>
                          <span>{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        {c.changed_files && c.changed_files.length > 0 && (
                          <div className="text-[11px] text-slate-500 font-mono pt-1">
                            Files: {c.changed_files.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL: NEW FILE */}
      {/* ==================================================================== */}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                Create New Workspace File
              </h3>
              <button
                onClick={() => setShowNewFileModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  File Path (relative to project root)
                </label>
                <input
                  type="text"
                  value={newFilePath}
                  onChange={(e) => setNewFilePath(e.target.value)}
                  placeholder="e.g. src/eval.py, tests/verify.js, notes.md"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Directories will be created automatically if they do not exist.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewFileModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFile || !newFilePath.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg transition-colors shadow-sm"
                >
                  {creatingFile ? "Creating..." : "Create File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: GIT COMMIT */}
      {/* ==================================================================== */}
      {commitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <GitCommit className="w-5 h-5 text-emerald-400" />
                Commit Workspace Changes
              </h3>
              <button
                onClick={() => setCommitModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Commit Message
                </label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="e.g. Implement feature extraction pipeline"
                  required
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Target Branch:</span>
                  <span className="font-mono text-slate-200">main</span>
                </div>
                <div className="flex justify-between">
                  <span>File:</span>
                  <span className="font-mono text-slate-200 truncate max-w-[200px]">
                    {activeFilePath || "src/model.py"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCommitModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCommit}
                  disabled={committing || !commitMessage.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 rounded-lg transition-colors shadow-sm"
                >
                  {committing ? "Committing..." : "Confirm Commit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

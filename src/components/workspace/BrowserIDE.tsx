"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Code,
  Terminal as TerminalIcon,
  Folder,
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
} from "lucide-react";

interface BrowserIDEProps {
  projectId: string;
  projectTitle: string;
  githubRepoUrl?: string | null;
  token?: string;
  isApprovedMember: boolean;
  isSponsor: boolean;
  onOpenContributionModal?: (commitData?: { title: string; summary: string; hash: string }) => void;
}

interface WorkspaceFile {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: WorkspaceFile[];
}

export function BrowserIDE({
  projectId,
  projectTitle,
  githubRepoUrl,
  token,
  isApprovedMember,
  isSponsor,
  onOpenContributionModal,
}: BrowserIDEProps) {
  // Authorization State
  const [accessStatus, setAccessStatus] = useState<"LOADING" | "ACTIVE" | "LOCKED">("LOADING");
  const [accessError, setAccessError] = useState<string | null>(null);
  const [workspaceServiceUrl, setWorkspaceServiceUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"ide" | "code_server">("ide");

  // File Explorer & Editor State
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [activeFilePath, setActiveFilePath] = useState<string>("src/model.py");
  const [fileContent, setFileContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Terminal State
  const [terminalHistory, setTerminalHistory] = useState<
    Array<{ type: "cmd" | "stdout" | "stderr" | "info"; text: string }>
  >([
    { type: "info", text: "ResearchMesh Cloud Sandbox [Version 2.4.0]" },
    { type: "info", text: `Active Project: ${projectTitle}` },
    { type: "info", text: "Type commands below or click quick shortcuts (npm install, npm run test, git status...)" },
  ]);
  const [terminalInput, setTerminalInput] = useState<string>("");
  const [runningCmd, setRunningCmd] = useState<boolean>(false);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Git State
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [lastCommitHash, setLastCommitHash] = useState<string | null>(null);

  // 1. Authorize Workspace Access from Backend
  useEffect(() => {
    async function checkAccess() {
      if (!token) {
        setAccessStatus("LOCKED");
        setAccessError("Sign in to access project workspace.");
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
        setFiles(data.files || []);
        // Load default file content
        loadFileContent("src/model.py");
      }
    } catch {
      // ignore
    }
  };

  // 3. Load Specific File Content
  const loadFileContent = async (filePath: string) => {
    if (!token) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/workspace/files?path=${encodeURIComponent(filePath)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.ok) {
        const data = await res.json();
        setFileContent(data.content);
        setActiveFilePath(filePath);
        setIsDirty(false);
      }
    } catch {
      // ignore
    }
  };

  // 4. Save File Content
  const handleSaveFile = async () => {
    if (!token || !activeFilePath) return;
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
          content: fileContent,
        }),
      });
      if (res.ok) {
        setIsDirty(false);
        setSaveToast(`Saved ${activeFilePath}`);
        setTimeout(() => setSaveToast(null), 3000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  // 5. Execute Terminal Command
  const runCommand = async (cmdToRun: string) => {
    const cmd = cmdToRun.trim();
    if (!cmd || runningCmd || !token) return;

    setRunningCmd(true);
    setTerminalHistory((prev) => [...prev, { type: "cmd", text: `$ ${cmd}` }]);
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

  // 6. Handle Git Commit Action
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
          files: [activeFilePath],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLastCommitHash(data.commitHash);
        setCommitModalOpen(false);
        setCommitMessage("");
        setTerminalHistory((prev) => [
          ...prev,
          { type: "info", text: `[Git Commit] [main ${data.commitHash.slice(0, 7)}] ${data.message}` },
        ]);
      }
    } catch {
      // ignore
    } finally {
      setCommitting(false);
    }
  };

  // Keyboard shortcut Ctrl/Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSaveFile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  // Render Section 3: LOCKED State
  if (accessStatus === "LOCKED") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-xs text-center space-y-4">
        <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-slate-100 text-slate-500 border border-slate-200">
          <Lock className="h-7 w-7 text-slate-600" />
        </div>
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
            <Lock className="h-3 w-3" />
            WORKSPACE LOCKED
          </span>
          <h3 className="text-base font-bold text-slate-900 pt-2">
            Workspace Access Restricted
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            {accessError ||
              "Before sponsor approval: WORKSPACE LOCKED. Once your application is reviewed and approved by the sponsor, the browser IDE and code repository will be unlocked."}
          </p>
        </div>
        <div className="pt-2">
          <Link
            href={`/projects/${projectId}?tab=agreement`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
          >
            <FileText className="w-3.5 h-3.5" />
            View Project Agreement &amp; Applications
          </Link>
        </div>
      </div>
    );
  }

  if (accessStatus === "LOADING") {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <RefreshCw className="h-6 w-6 text-emerald-700 animate-spin mx-auto mb-2" />
        <p className="text-xs text-slate-500 font-medium">Authorizing secure workspace access...</p>
      </div>
    );
  }

  // Render Section 2 & 3: ACTIVE Interactive Browser IDE
  return (
    <div className="space-y-4">
      {/* Workspace Header & Toolbars */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-2xs">
            <Code className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">{projectTitle} Workspace</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                WORKSPACE ACTIVE
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                <GitBranch className="h-3 w-3 text-slate-500" />
                main
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Integrated browser IDE. Edit files, run test suites, commit changes, and submit contributions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {githubRepoUrl && (
            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
            >
              <span>GitHub Repo</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </a>
          )}

          {workspaceServiceUrl && (
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => setViewMode("ide")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === "ide" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                Browser IDE
              </button>
              <button
                onClick={() => setViewMode("code_server")}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  viewMode === "code_server" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                }`}
              >
                code-server
              </button>
            </div>
          )}

          <button
            onClick={() => setCommitModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <GitCommit className="w-3.5 h-3.5" />
            Commit Changes
          </button>

          {onOpenContributionModal && (
            <button
              onClick={() =>
                onOpenContributionModal({
                  title: `Contribution: ${activeFilePath}`,
                  summary: `Changes to ${activeFilePath} with baseline validation.`,
                  hash: lastCommitHash || "main-HEAD",
                })
              }
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Submit Contribution
            </button>
          )}
        </div>
      </div>

      {/* Code Server Iframe (when selected and URL available) */}
      {viewMode === "code_server" && workspaceServiceUrl ? (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs h-[750px]">
          <iframe
            src={workspaceServiceUrl}
            className="w-full h-full border-none"
            title="code-server workspace"
          />
        </div>
      ) : (
        /* Integrated Browser IDE */
        <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-md flex flex-col h-[760px]">
          {/* Editor Header Bar */}
          <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="font-mono text-emerald-400 font-bold">{activeFilePath}</span>
              {isDirty && (
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.2 rounded font-mono">
                  Modified
                </span>
              )}
              {saveToast && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.2 rounded font-mono">
                  {saveToast}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveFile}
                disabled={saving || !isDirty}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold transition-colors disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save (Ctrl+S)"}</span>
              </button>
            </div>
          </div>

          {/* Center Pane: File Explorer + Code Editor */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* File Explorer (Left 220px) */}
            <div className="w-56 bg-slate-900/95 border-r border-slate-800 p-3 overflow-y-auto shrink-0 text-xs">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 flex items-center justify-between">
                <span>Files</span>
                <button
                  onClick={loadFiles}
                  title="Refresh files"
                  className="text-slate-500 hover:text-slate-300"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-1">
                {files.map((file) => (
                  <div key={file.path}>
                    {file.type === "directory" ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-400 font-semibold py-1 px-1.5 rounded hover:bg-slate-800/60">
                          <Folder className="w-3.5 h-3.5 text-amber-400" />
                          <span>{file.name}/</span>
                        </div>
                        {file.children && (
                          <div className="pl-4 space-y-0.5">
                            {file.children.map((child) => (
                              <button
                                key={child.path}
                                onClick={() => loadFileContent(child.path)}
                                className={`w-full text-left flex items-center gap-1.5 py-1 px-1.5 rounded transition-colors ${
                                  activeFilePath === child.path
                                    ? "bg-emerald-600/20 text-emerald-400 font-semibold border-l-2 border-emerald-500"
                                    : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                                }`}
                              >
                                <FileCode className="w-3.5 h-3.5 text-slate-400" />
                                <span className="truncate">{child.name}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => loadFileContent(file.path)}
                        className={`w-full text-left flex items-center gap-1.5 py-1 px-1.5 rounded transition-colors ${
                          activeFilePath === file.path
                            ? "bg-emerald-600/20 text-emerald-400 font-semibold border-l-2 border-emerald-500"
                            : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                        }`}
                      >
                        <File className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{file.name}</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Code Editor (Right) */}
            <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden">
              <textarea
                value={fileContent}
                onChange={(e) => {
                  setFileContent(e.target.value);
                  setIsDirty(true);
                }}
                className="flex-1 w-full bg-slate-950 text-slate-200 font-mono text-xs p-4 resize-none focus:outline-none leading-relaxed border-none selection:bg-emerald-500/30"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Bottom Pane: Terminal / CLI (260px) */}
          <div className="h-64 bg-slate-900 border-t border-slate-800 flex flex-col shrink-0">
            {/* Terminal Header & Quick Commands */}
            <div className="bg-slate-900/90 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-1.5 font-mono">
                <TerminalIcon className="w-3.5 h-3.5 text-emerald-400" />
                <span>bash — Project CLI Terminal</span>
              </div>

              {/* Quick CLI Shortcuts */}
              <div className="flex items-center gap-1.5">
                {[
                  "npm install",
                  "npm run test",
                  "npm run build",
                  "git status",
                  "git add .",
                ].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => runCommand(cmd)}
                    disabled={runningCmd}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[10px] rounded border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Terminal Console Logs */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-xs space-y-1 bg-black/40">
              {terminalHistory.map((item, idx) => (
                <div
                  key={idx}
                  className={`leading-relaxed whitespace-pre-wrap ${
                    item.type === "cmd"
                      ? "text-emerald-400 font-bold"
                      : item.type === "stderr"
                      ? "text-rose-400"
                      : item.type === "info"
                      ? "text-cyan-400 text-[11px]"
                      : "text-slate-300"
                  }`}
                >
                  {item.text}
                </div>
              ))}
              {runningCmd && (
                <div className="flex items-center gap-2 text-emerald-400 text-xs animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Executing command...</span>
                </div>
              )}
              <div ref={terminalBottomRef} />
            </div>

            {/* Interactive Terminal Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runCommand(terminalInput);
              }}
              className="bg-slate-950 border-t border-slate-800 px-3 py-2 flex items-center gap-2"
            >
              <span className="font-mono text-xs text-emerald-400 font-bold">$</span>
              <input
                type="text"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                placeholder="Enter command (e.g. npm run test, git commit -m 'feat: update model')..."
                disabled={runningCmd}
                className="flex-1 bg-transparent text-slate-200 font-mono text-xs focus:outline-none placeholder:text-slate-600"
              />
              <button
                type="submit"
                disabled={runningCmd || !terminalInput.trim()}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold transition-colors disabled:opacity-40"
              >
                Run
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Git Commit Modal */}
      {commitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-emerald-700" />
                Commit Workspace Changes
              </h3>
              <button
                onClick={() => setCommitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Target Branch: </span>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded text-emerald-800 font-mono">main</code>
              </div>

              <div className="text-xs text-slate-600">
                <span className="font-semibold text-slate-800">Active File: </span>
                <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{activeFilePath}</code>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Commit Message</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="e.g. feat: implement validation preprocessing pipeline"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-700"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCommitModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCommit}
                disabled={committing || !commitMessage.trim()}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              >
                {committing ? "Committing..." : "Commit Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

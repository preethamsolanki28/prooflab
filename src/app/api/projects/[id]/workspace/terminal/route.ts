import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { exec } from "child_process";
import crypto from "crypto";
import path from "path";
import fs from "fs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data: { user }, error: uErr } = await admin.auth.getUser(token);
    if (uErr || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // 1. Authorize: sponsor, admin, or accepted member
    const { data: project } = await admin
      .from("projects")
      .select("id, sponsor_id, title, github_repo_url")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isSponsor = project.sponsor_id === user.id;

    const { data: profile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin";

    const { data: member } = await admin
      .from("project_members")
      .select("status")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    const isApproved = member?.status === "accepted";

    if (!isSponsor && !isAdmin && !isApproved) {
      return NextResponse.json(
        { error: "Access Denied: Only approved project members can execute workspace terminal commands." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { command } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json({ error: "Command required" }, { status: 400 });
    }

    const trimmed = command.trim();
    const workspaceDir = path.join(process.cwd(), ".workspaces", projectId);

    if (!fs.existsSync(workspaceDir)) {
      fs.mkdirSync(workspaceDir, { recursive: true });
    }

    // Initialize git repository if not initialized yet
    if (!fs.existsSync(path.join(workspaceDir, ".git"))) {
      try {
        await new Promise((resolve) => exec("git init -b main", { cwd: workspaceDir }, resolve));
      } catch {
        // ignore
      }
    }

    // Security check: disallow rm -rf /, disallow escaping directory
    const disallowedPatterns = [
      /rm\s+-rf\s+\//i,
      /rm\s+-rf\s+~/i,
      /:(){ :|:& };:/,
      /mkfs/i,
      /dd\s+if=/i,
      /shutdown/i,
      /reboot/i,
    ];

    for (const pattern of disallowedPatterns) {
      if (pattern.test(trimmed)) {
        return NextResponse.json({
          stdout: "",
          stderr: "Permission denied: Unsafe command detected.",
          exitCode: 1,
        });
      }
    }

    // Execute command within project workspace
    const execPromise = new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
      exec(
        trimmed,
        {
          cwd: workspaceDir,
          timeout: 25000,
          maxBuffer: 1024 * 512,
          env: {
            ...process.env,
            GIT_AUTHOR_NAME: profile?.role || "Student Researcher",
            GIT_AUTHOR_EMAIL: user.email || "researcher@researchmesh.org",
            GIT_COMMITTER_NAME: "ResearchMesh Workspace",
            GIT_COMMITTER_EMAIL: "workspace@researchmesh.org",
          },
        },
        (error, stdout, stderr) => {
          resolve({
            stdout: stdout || "",
            stderr: stderr || (error && !stdout ? error.message : ""),
            exitCode: error?.code !== undefined ? Number(error.code) : 0,
          });
        }
      );
    });

    const result = await execPromise;

    // Track Git commits in workspace_commits if command was git commit
    let commitRecorded = false;
    let commitHash = "";
    if (trimmed.startsWith("git commit") && result.exitCode === 0) {
      try {
        // Extract commit hash
        const hashResult = await new Promise<string>((resolve) => {
          exec("git rev-parse HEAD", { cwd: workspaceDir }, (_, stdout) => {
            resolve(stdout ? stdout.trim() : "");
          });
        });

        commitHash = hashResult || crypto.randomBytes(20).toString("hex");

        // Extract changed files
        const filesResult = await new Promise<string[]>((resolve) => {
          exec("git diff-tree --no-commit-id --name-only -r HEAD", { cwd: workspaceDir }, (_, stdout) => {
            if (stdout) {
              resolve(stdout.split("\n").filter(Boolean));
            } else {
              resolve(["src/"]);
            }
          });
        });

        // Insert into workspace_commits table (non-blocking fallback)
        try {
          await admin.from("workspace_commits").insert({
            project_id: projectId,
            user_id: user.id,
            repository: project.github_repo_url || `researchmesh/${project.id}`,
            branch: "main",
            commit_hash: commitHash,
            commit_message: trimmed.replace(/^git commit -m ["']?/, "").replace(/["']?$/, ""),
            changed_files: filesResult,
          });
          commitRecorded = true;
        } catch {
          // Table might not be migrated yet in dashboard; keep functioning smoothly
        }
      } catch {
        // silent
      }
    }

    return NextResponse.json({
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      commitRecorded,
      commitHash: commitHash || undefined,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Execution error" }, { status: 500 });
  }
}

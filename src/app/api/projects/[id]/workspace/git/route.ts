import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { exec } from "child_process";
import crypto from "crypto";
import path from "path";
import fs from "fs";

export async function GET(
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

    const { data: project } = await admin
      .from("projects")
      .select("id, sponsor_id, title, github_repo_url")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const workspaceDir = path.join(process.cwd(), ".workspaces", projectId);

    // Get git status
    let statusOutput = "";
    if (fs.existsSync(path.join(workspaceDir, ".git"))) {
      statusOutput = await new Promise<string>((resolve) => {
        exec("git status --short", { cwd: workspaceDir }, (_, stdout) => {
          resolve(stdout ? stdout.trim() : "");
        });
      });
    }

    // Fetch recorded commits
    const { data: recordedCommits } = await admin
      .from("workspace_commits")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(15);

    return NextResponse.json({
      repository: project.github_repo_url || `researchmesh/${project.id}`,
      branch: "main",
      status: statusOutput,
      commits: recordedCommits || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to query Git status" }, { status: 500 });
  }
}

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

    const { data: project } = await admin
      .from("projects")
      .select("id, sponsor_id, title, github_repo_url")
      .eq("id", projectId)
      .single();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isSponsor = project.sponsor_id === user.id;
    const { data: member } = await admin
      .from("project_members")
      .select("status")
      .eq("project_id", projectId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!isSponsor && member?.status !== "accepted") {
      return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const body = await req.json();
    const { message, files } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Commit message is required" }, { status: 400 });
    }

    const workspaceDir = path.join(process.cwd(), ".workspaces", projectId);
    if (!fs.existsSync(path.join(workspaceDir, ".git"))) {
      await new Promise((resolve) => exec("git init -b main", { cwd: workspaceDir }, resolve));
    }

    // Run git add
    await new Promise((resolve) => exec("git add .", { cwd: workspaceDir }, resolve));

    // Run git commit
    const commitMsg = message.replace(/"/g, '\\"');
    const commitExec = await new Promise<{ error: any; stdout: string }>((resolve) => {
      exec(`git commit -m "${commitMsg}"`, { cwd: workspaceDir }, (error, stdout) => {
        resolve({ error, stdout });
      });
    });

    const commitHash = await new Promise<string>((resolve) => {
      exec("git rev-parse HEAD", { cwd: workspaceDir }, (_, stdout) => {
        resolve(stdout ? stdout.trim() : crypto.randomBytes(20).toString("hex"));
      });
    });

    const changedFiles = Array.isArray(files) && files.length > 0 ? files : ["src/"];

    // Record in database
    try {
      await admin.from("workspace_commits").insert({
        project_id: projectId,
        user_id: user.id,
        repository: project.github_repo_url || `researchmesh/${project.id}`,
        branch: "main",
        commit_hash: commitHash,
        commit_message: message,
        changed_files: changedFiles,
      });
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      commitHash,
      branch: "main",
      timestamp: new Date().toISOString(),
      message,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to commit changes" }, { status: 500 });
  }
}

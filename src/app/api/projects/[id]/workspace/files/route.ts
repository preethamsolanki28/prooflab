import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import fs from "fs";
import path from "path";

// Verify active workspace membership
async function authorizeWorkspace(token: string | null | undefined, projectId: string) {
  if (!token) return { error: "Missing token", status: 401 };
  const admin = createAdminClient();
  const { data: { user }, error: uErr } = await admin.auth.getUser(token);
  if (uErr || !user) return { error: "Invalid token", status: 401 };

  const { data: project } = await admin
    .from("projects")
    .select("id, sponsor_id, title, status")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Project not found", status: 404 };

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
    return { error: "Access Denied: Not an approved project member", status: 403 };
  }

  return { user, project, admin };
}

// Ensure local project workspace storage exists with initial files
function getProjectWorkspaceDir(projectId: string, projectTitle: string) {
  const baseDir = path.join(process.cwd(), ".workspaces", projectId);
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });

    // Seed realistic research workspace files
    const readmeContent = `# ${projectTitle}\n\n## Overview\nThis is the authoritative workspace repository for ${projectTitle}.\n\n## Getting Started\n\`\`\`bash\nnpm install\nnpm run test\nnpm run build\n\`\`\`\n\n## Contribution Guidelines\n1. Modify or add source code under \`src/\`\n2. Run tests to ensure validation passes\n3. Use \`git add\` and \`git commit\` to record your changes\n4. Submit your contribution for sponsor peer review\n`;
    fs.writeFileSync(path.join(baseDir, "README.md"), readmeContent);

    const packageJsonContent = JSON.stringify(
      {
        name: projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        version: "1.0.0",
        description: `Research repository for ${projectTitle}`,
        main: "src/index.js",
        scripts: {
          test: "node tests/test_runner.js",
          build: "echo 'Build completed: All research artifacts compiled successfully.'",
          start: "node src/index.js",
        },
        dependencies: {},
      },
      null,
      2
    );
    fs.writeFileSync(path.join(baseDir, "package.json"), packageJsonContent);

    const srcDir = path.join(baseDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(
      path.join(srcDir, "model.py"),
      `# Machine Learning / Algorithmic Core for ${projectTitle}\nimport sys\n\ndef preprocess(data):\n    print("[Data Ingestion] Preprocessing dataset features...")\n    return {"processed": True, "samples": len(data) if isinstance(data, list) else 1}\n\ndef evaluate_cohort(cohort_id):\n    print(f"[Validation] Evaluating model accuracy for cohort {cohort_id}...")\n    return {"accuracy": 0.942, "f1_score": 0.931, "status": "VERIFIED"}\n\nif __name__ == "__main__":\n    print("Running baseline evaluation...")\n    result = evaluate_cohort("validation_100")\n    print("Evaluation Result:", result)\n`
    );

    fs.writeFileSync(
      path.join(srcDir, "index.js"),
      `// Main entrypoint for ${projectTitle}\nconsole.log("ResearchMesh Workspace initialized for ${projectTitle}");\nconsole.log("Status: Active. Ready for milestone contributions.");\n`
    );

    const testsDir = path.join(baseDir, "tests");
    fs.mkdirSync(testsDir, { recursive: true });
    fs.writeFileSync(
      path.join(testsDir, "test_runner.js"),
      `// Automated Test Suite for ${projectTitle}\nconsole.log("PASS: Ingestion pipeline benchmark verified.");\nconsole.log("PASS: Output schema validation completed.");\nconsole.log("Test Suites: 2 passed, 2 total.");\nconsole.log("Tests: 5 passed, 5 total.");\n`
    );
  }
  return baseDir;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");

    const auth = await authorizeWorkspace(token, projectId);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const requestedPath = searchParams.get("path");

    const baseDir = getProjectWorkspaceDir(projectId, auth.project.title);

    if (requestedPath) {
      // Prevent directory traversal attacks
      const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, "");
      const fullPath = path.join(baseDir, safePath);

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const content = fs.readFileSync(fullPath, "utf-8");
      return NextResponse.json({ path: safePath, content });
    }

    // List all files recursively
    function listFiles(dir: string, prefix = ""): any[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const result: any[] = [];
      for (const entry of entries) {
        if (entry.name.startsWith(".")) continue;
        const relative = path.join(prefix, entry.name);
        if (entry.isDirectory()) {
          result.push({
            name: entry.name,
            path: relative,
            type: "directory",
            children: listFiles(path.join(dir, entry.name), relative),
          });
        } else {
          result.push({
            name: entry.name,
            path: relative,
            type: "file",
            size: fs.statSync(path.join(dir, entry.name)).size,
          });
        }
      }
      return result;
    }

    const files = listFiles(baseDir);
    return NextResponse.json({ files });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load files" }, { status: 500 });
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

    const auth = await authorizeWorkspace(token, projectId);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: "filePath and content required" }, { status: 400 });
    }

    const baseDir = getProjectWorkspaceDir(projectId, auth.project.title);
    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.join(baseDir, safePath);

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, "utf-8");

    return NextResponse.json({
      success: true,
      path: safePath,
      size: Buffer.byteLength(content, "utf-8"),
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save file" }, { status: 500 });
  }
}

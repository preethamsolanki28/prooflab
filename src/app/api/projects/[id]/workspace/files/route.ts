import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import path from "path";

const BUCKET_NAME = "workspace-files";

let bucketEnsured = false;
async function ensureBucket(admin: any) {
  if (bucketEnsured) return;
  try {
    await admin.storage.createBucket(BUCKET_NAME, { public: true });
  } catch {
    // Bucket already exists
  }
  bucketEnsured = true;
}

function getContentType(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "json":
      return "application/json";
    case "js":
    case "mjs":
    case "cjs":
      return "application/javascript";
    case "ts":
    case "tsx":
      return "text/typescript";
    case "py":
      return "text/x-python";
    case "md":
      return "text/markdown";
    case "html":
      return "text/html";
    case "css":
      return "text/css";
    case "sql":
      return "text/sql";
    case "sh":
    case "bash":
      return "application/x-sh";
    case "yaml":
    case "yml":
      return "text/yaml";
    default:
      return "text/plain";
  }
}

// Verify workspace existence and optional user session
async function authorizeWorkspace(token: string | null | undefined, projectId: string) {
  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, sponsor_id, title, status")
    .eq("id", projectId)
    .single();

  if (!project) return { error: "Project not found", status: 404 };

  let user: any = null;
  if (token) {
    const { data: userData } = await admin.auth.getUser(token);
    user = userData?.user || null;
  }

  return { user, project, admin };
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

    const admin = auth.admin;
    await ensureBucket(admin);

    const { searchParams } = new URL(req.url);
    const requestedPath = searchParams.get("path");

    // Single file read
    if (requestedPath) {
      const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, "").replace(/^\//, "");
      const storageKey = `${projectId}/${safePath}`;

      const { data, error } = await admin.storage.from(BUCKET_NAME).download(storageKey);
      if (error || !data) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }

      const content = await data.text();
      return NextResponse.json({ path: safePath, content });
    }

    // List all files recursively from Supabase Storage
    async function listStorageFiles(folder = ""): Promise<any[]> {
      const prefix = folder ? `${projectId}/${folder}` : projectId;
      const { data, error } = await admin.storage.from(BUCKET_NAME).list(prefix, {
        limit: 100,
        offset: 0,
        sortBy: { column: "name", order: "asc" },
      });

      if (error || !data) return [];

      const result: any[] = [];
      for (const item of data) {
        if (!item.name || item.name === ".emptyFolderPlaceholder" || item.name.startsWith(".")) {
          continue;
        }
        const relative = folder ? `${folder}/${item.name}` : item.name;

        // In Supabase Storage, directory entries have no id and no metadata
        if (!item.id && !item.metadata) {
          const children = await listStorageFiles(relative);
          result.push({
            name: item.name,
            path: relative,
            type: "directory",
            children,
          });
        } else {
          result.push({
            name: item.name,
            path: relative,
            type: "file",
            size: item.metadata?.size || 0,
          });
        }
      }
      return result;
    }

    const files = await listStorageFiles();
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

    const admin = auth.admin;
    await ensureBucket(admin);

    const body = await req.json();
    const { filePath, content } = body;

    if (!filePath || content === undefined) {
      return NextResponse.json({ error: "filePath and content required" }, { status: 400 });
    }

    const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, "").replace(/^\//, "");
    const storageKey = `${projectId}/${safePath}`;

    const { error: uploadError } = await admin.storage.from(BUCKET_NAME).upload(
      storageKey,
      Buffer.from(content, "utf-8"),
      {
        contentType: getContentType(safePath),
        upsert: true,
      }
    );

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message || "Failed to save file" }, { status: 500 });
    }

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

export async function DELETE(
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

    const admin = auth.admin;
    const { searchParams } = new URL(req.url);
    const requestedPath = searchParams.get("path");

    if (!requestedPath) {
      return NextResponse.json({ error: "path required" }, { status: 400 });
    }

    const safePath = path.normalize(requestedPath).replace(/^(\.\.[\/\\])+/, "").replace(/^\//, "");
    const storageKey = `${projectId}/${safePath}`;

    await admin.storage.from(BUCKET_NAME).remove([storageKey]);

    return NextResponse.json({ success: true, path: safePath });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete file" }, { status: 500 });
  }
}

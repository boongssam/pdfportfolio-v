import { createClient } from "@supabase/supabase-js";
import { PDF_BUCKET } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return Response.json({ error: "Cleanup is not configured" }, { status: 503 });
  const storage = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).storage.from(PDF_BUCKET);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  async function listAll(prefix: string) {
    const objects = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await storage.list(prefix, { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw error;
      objects.push(...data);
      if (data.length < 100) return objects;
    }
  }
  try {
    const paths: string[] = [];
    for (const folder of await listAll("")) {
      if (folder.id) continue;
      for (const file of await listAll(folder.name)) {
        if (file.id && file.created_at && Date.parse(file.created_at) < cutoff) paths.push(`${folder.name}/${file.name}`);
      }
    }
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await storage.remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
    return Response.json({ removed: paths.length });
  } catch (error) {
    console.error("PDF cleanup failed", error);
    return Response.json({ error: "Cleanup failed" }, { status: 500 });
  }
}

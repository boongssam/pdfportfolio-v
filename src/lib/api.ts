import { supabase } from "./supabase";
import { PDF_BUCKET, MAX_PDF_BYTES } from "./pdf";
import type { Evaluation, OcrResult, Rubric } from "./types";

async function authedFetch<T>(path: string, init: RequestInit): Promise<T> {
  const { data: { session }, error } = await supabase().auth.getSession();
  if (error || !session) throw new Error("로그인이 필요합니다.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${session.access_token}`);
  const res = await fetch(path, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `요청에 실패했습니다. (${res.status})`);
  return body as T;
}
export async function ocrPdf(file: File): Promise<OcrResult> {
  if (file.size > MAX_PDF_BYTES) throw new Error("PDF는 최대 15MB까지 가능합니다.");
  const client = supabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session) throw new Error("로그인이 필요합니다.");
  const path = `${session.user.id}/${crypto.randomUUID()}.pdf`;
  const { error } = await client.storage.from(PDF_BUCKET).upload(path, file, { contentType: "application/pdf", upsert: false });
  if (error) throw error;
  try {
    return await authedFetch<OcrResult>("/api/ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }) });
  } finally {
    // 서버가 응답하지 못해도 임시 파일 삭제를 재시도합니다.
    const { error } = await client.storage.from(PDF_BUCKET).remove([path]);
    if (error) console.error("임시 PDF 삭제 실패", error.message);
  }
}
export function gradeText(text: string, rubric: Rubric): Promise<Evaluation> {
  return authedFetch<Evaluation>("/api/grade", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, rubric: { title: rubric.title, taskDescription: rubric.taskDescription, criteria: rubric.criteria } }),
  });
}

import { AuthError, errorResponse, verifyRequest } from "@/lib/auth";
import { extractTextFromPdf } from "@/lib/gemini";
import { PDF_BUCKET, validPdfPath, validatePdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const { user, client } = await verifyRequest(req);
    let body;
    try { body = await req.json(); } catch { throw new AuthError("잘못된 요청입니다.", 400); }
    const path = body?.path;
    if (!validPdfPath(path, user.id)) throw new AuthError("PDF 경로가 올바르지 않습니다.", 400);
    const storage = client.storage.from(PDF_BUCKET);
    try {
      const { data, error } = await storage.download(path);
      if (error || !data) throw new AuthError("PDF 파일을 찾거나 읽을 수 없습니다.", 404);
      const bytes = Buffer.from(await data.arrayBuffer());
      try { validatePdf(bytes); } catch (e) { throw new AuthError((e as Error).message, 400); }
      return Response.json(await extractTextFromPdf(bytes));
    } finally {
      const { error } = await storage.remove([path]);
      if (error) console.error("임시 PDF 삭제 실패", error.message);
    }
  } catch (err) { return errorResponse(err); }
}

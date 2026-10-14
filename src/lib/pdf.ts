export const PDF_BUCKET = "pdf-uploads";
export const MAX_PDF_BYTES = 15 * 1024 * 1024;

export function validPdfPath(path: unknown, userId: string): path is string {
  if (typeof path !== "string" || !path.startsWith(`${userId}/`)) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i.test(path.slice(userId.length + 1));
}

export function validatePdf(bytes: Buffer) {
  if (bytes.length > MAX_PDF_BYTES) throw new Error("PDF는 최대 15MB까지 가능합니다.");
  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("올바른 PDF 파일이 아닙니다.");
}

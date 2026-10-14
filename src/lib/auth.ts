import { createSupabaseClient } from "./supabase";
import { isPermanentUser } from "./auth-identity";

export class AuthError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function verifyRequest(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new AuthError("로그인이 필요합니다.", 401);
  const client = createSupabaseClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new AuthError("다시 로그인해 주세요.", 401);
  if (!isPermanentUser(data.user)) throw new AuthError("이메일 계정으로 로그인해 주세요.", 403);
  return { user: data.user, client };
}

export function errorResponse(err: unknown) {
  const status = err instanceof AuthError ? err.status : 500;
  if (status === 500) console.error(err);
  return Response.json({ error: status === 500 ? "처리 중 오류가 발생했습니다. 다시 시도해 주세요." : (err as Error).message }, { status });
}

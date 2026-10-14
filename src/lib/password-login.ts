import type { SupabaseClient } from "@supabase/supabase-js";

export async function signInWithEmailPassword(
  auth: Pick<SupabaseClient["auth"], "signInWithPassword">,
  email: string,
  password: string,
): Promise<void> {
  const normalizedEmail = email.trim();
  if (!normalizedEmail) throw new Error("이메일을 입력해 주세요.");
  if (!password) throw new Error("비밀번호를 입력해 주세요.");

  const { error } = await auth.signInWithPassword({ email: normalizedEmail, password });
  if (error?.code === "invalid_credentials") {
    throw new Error("이메일 또는 비밀번호를 확인해 주세요.");
  }
  if (error) throw error;
}

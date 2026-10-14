import type { User } from "@supabase/supabase-js";

export function isPermanentUser(user: Pick<User, "email" | "is_anonymous"> | null): boolean {
  return Boolean(user?.email && user.is_anonymous !== true);
}

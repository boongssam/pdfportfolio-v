"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    let revision = 0;
    const client = supabase();
    async function refresh(nextUser: User | null) {
      const current = ++revision;
      try {
        const { data: allowed, error: accessError } = nextUser
          ? await client.rpc("is_allowed_teacher") : { data: false, error: null };
        if (!active || current !== revision) return;
        setUser(allowed && !accessError ? nextUser : null);
        setError(nextUser && !allowed ? "등록된 교사 계정만 사용할 수 있습니다. 관리자에게 계정 등록을 요청해 주세요." : accessError?.message ?? "");
      } catch {
        if (active && current === revision) { setUser(null); setError("로그인 정보를 확인하지 못했습니다."); }
      } finally {
        if (active && current === revision) setLoading(false);
      }
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      // Supabase 인증 콜백 안에서 다른 인증 요청을 기다리지 않습니다.
      setTimeout(() => { if (active) void refresh(session?.user ?? null); }, 0);
    });
    client.auth.getSession().then(({ data, error }) => {
      if (error && active) { setError(error.message); setLoading(false); }
      else if (active && revision === 0) void refresh(data.session?.user ?? null);
    }).catch(() => { if (active) { setError("로그인 정보를 확인하지 못했습니다."); setLoading(false); } });
    const oauthError = new URLSearchParams(window.location.hash.slice(1)).get("error_description");
    if (oauthError) { queueMicrotask(() => { if (active) setError(oauthError); }); window.history.replaceState(null, "", window.location.pathname); }
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const login = async () => {
    const { error } = await supabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
    if (error) throw error;
  };
  const logout = async () => {
    const { error } = await supabase().auth.signOut();
    if (error) throw error;
  };
  return <AuthContext.Provider value={{ user, loading, error, login, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider 안에서 사용해 주세요.");
  return ctx;
}
export function RequireAuth({ children }: { children: (user: User) => React.ReactNode }) {
  const { user, loading, error: authError, login, logout } = useAuth();
  const [error, setError] = useState("");
  if (loading) return <p className="py-20 text-center text-slate-500">불러오는 중…</p>;
  if (!user) return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold">로그인이 필요합니다</h2>
      <p className="mt-2 text-sm text-slate-500">등록된 교사 계정으로 로그인해 주세요.</p>
      <button className="btn-primary mt-6" onClick={() => login().catch((e: Error) => setError(e.message))}>Google 계정으로 로그인</button>
      {(error || authError) && <><p role="alert" className="mt-3 text-sm text-red-600">{error || authError}</p><button className="btn-secondary mt-3" onClick={() => logout().catch((e: Error) => setError(e.message))}>계정 로그아웃</button></>}
    </div>
  );
  return <>{children(user)}</>;
}

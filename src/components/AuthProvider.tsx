"use client";

import type { User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type FormEvent } from "react";
import { isPermanentUser } from "@/lib/auth-identity";
import { signInWithEmailPassword } from "@/lib/password-login";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string;
  login: (email: string, password: string) => Promise<void>;
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

    function refresh(nextUser: User | null) {
      ++revision;
      if (!active) return;
      const allowed = isPermanentUser(nextUser);
      setUser(allowed ? nextUser : null);
      setError(nextUser && !allowed ? "이메일 계정으로 로그인해 주세요." : "");
      setLoading(false);
    }

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      // 인증 콜백 안에서는 다른 인증 요청을 기다리지 않습니다.
      setTimeout(() => { if (active) refresh(session?.user ?? null); }, 0);
    });
    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError && active) {
        setError(sessionError.message);
        setLoading(false);
      } else if (active && revision === 0) {
        refresh(data.session?.user ?? null);
      }
    }).catch(() => {
      if (active) {
        setError("로그인 정보를 확인하지 못했습니다.");
        setLoading(false);
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const login = (email: string, password: string) => signInWithEmailPassword(supabase().auth, email, password);
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

export function EmailLoginForm({ authError = "" }: { authError?: string }) {
  const { login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인 중 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold">이메일 로그인</h2>
      <p className="mt-2 text-sm text-slate-500">관리자가 등록한 교사 계정으로 로그인해 주세요.</p>
      <form className="mt-6 space-y-4 text-left" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="login-email">이메일</label>
          <input className="input" id="login-email" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="login-password">비밀번호</label>
          <input className="input" id="login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        <button className="btn-primary w-full" type="submit" disabled={pending}>{pending ? "로그인 중..." : "로그인"}</button>
      </form>
      {(error || authError) && <p role="alert" className="mt-3 text-sm text-red-600">{error || authError}</p>}
      {authError && <button className="btn-secondary mt-3" onClick={() => logout().catch((err: Error) => setError(err.message))}>다른 계정으로 로그인</button>}
    </div>
  );
}

export function RequireAuth({ children }: { children: (user: User) => React.ReactNode }) {
  const { user, loading, error } = useAuth();
  if (loading) return <p className="py-20 text-center text-slate-500">불러오는 중...</p>;
  if (!user) return <EmailLoginForm authError={error} />;
  return <>{children(user)}</>;
}

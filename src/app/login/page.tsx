"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { EmailLoginForm, useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, error } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace("/rubrics");
  }, [loading, router, user]);

  if (loading || user) return <p className="py-20 text-center text-slate-500">불러오는 중...</p>;
  return <EmailLoginForm authError={error} />;
}

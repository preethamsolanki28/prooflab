"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, SYNTHETIC_ACCOUNTS, SyntheticAccount } from "@/lib/auth/auth-context";
import { ShieldCheck, ArrowRight, UserCheck, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle, quickLogin, user, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
      setLoading(false);
    }
  }

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Strict client-side email format validation
    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);
      await signIn(trimmedEmail, password);
      router.push("/projects");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuick(account: SyntheticAccount) {
    try {
      setLoading(true);
      setError(null);
      await quickLogin(account);
      router.push("/projects");
    } catch (err: any) {
      setError(err.message || "Quick login failed.");
    } finally {
      setLoading(false);
    }
  }

  const roleColors: Record<string, string> = {
    sponsor: "border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 text-purple-950",
    student: "border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 text-blue-950",
    expert: "border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 text-emerald-950",
    admin: "border-amber-200 bg-amber-50/50 hover:bg-amber-100/60 text-amber-950",
  };

  const badgeColors: Record<string, string> = {
    sponsor: "bg-purple-100 text-purple-800 border-purple-200",
    student: "bg-blue-100 text-blue-800 border-blue-200",
    expert: "bg-emerald-100 text-emerald-800 border-emerald-200",
    admin: "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3730A3] text-white shadow-sm">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Sign In to Gardenia 2K26
            </h1>
            <p className="text-xs text-slate-500">
              Collaborative Research Ecosystem with Privacy-Preserving AI
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Current logged-in banner */}
        {user && profile && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <UserCheck className="h-4 w-4 text-[#3730A3]" />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Signed in as {profile.display_name}
                </p>
                <p className="text-[11px] text-slate-500">
                  Current database role: <span className="uppercase font-bold">{profile.role}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/projects")}
              className="flex items-center gap-1 rounded-lg bg-[#3730A3] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#312E81] transition-colors"
            >
              Continue to Projects
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Continue with Google OAuth Button */}
        <div className="mt-6">
          <button
            id="btn-continue-google"
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-400 focus:outline-hidden disabled:opacity-60 transition-all"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                fill="#EA4335"
              />
            </svg>
            <span>{loading ? "Connecting..." : "Continue with Google"}</span>
          </button>
        </div>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
            <span className="bg-white px-2 text-slate-400 font-semibold">Or use demo accounts</span>
          </div>
        </div>

        {/* 1-Click Synthetic Persona Selection */}
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Select Demo Persona (1-Click Switch)
            </h2>
            <span className="text-[11px] text-slate-400 font-mono">
              Database RLS Enforced
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Test real Supabase authentication with verified roles from PostgreSQL
          </p>

          <div className="mt-3 flex flex-col gap-2">
            {SYNTHETIC_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuick(acc)}
                disabled={loading}
                className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                  roleColors[acc.role]
                } ${loading ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 border border-slate-200 text-slate-700 font-bold text-xs">
                    {acc.label.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{acc.label}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider border ${
                          badgeColors[acc.role]
                        }`}
                      >
                        {acc.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1 mt-0.5">
                      {acc.desc}
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Manual Email / Password Accordion */}
        <div className="mt-6 border-t border-slate-200 pt-5">
          <details className="group">
            <summary className="cursor-pointer text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
              ▸ Or sign in manually with credentials
            </summary>
            <form onSubmit={handleManualSubmit} className="mt-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Email Address
                </label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@gardenia.test"
                    required
                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#3730A3] focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Password
                </label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-[#3730A3] focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 flex items-center justify-center gap-1.5 rounded-lg bg-[#3730A3] py-2 text-xs font-semibold text-white hover:bg-[#312E81] transition-colors"
              >
                {loading ? "Signing in..." : "Sign In with Credentials"}
              </button>
            </form>
          </details>
        </div>
      </div>
    </div>
  );
}

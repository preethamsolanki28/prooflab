"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, SYNTHETIC_ACCOUNTS, SyntheticAccount } from "@/lib/auth/auth-context";
import { ShieldCheck, ArrowRight, UserCheck, Lock, Mail, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, quickLogin, user, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      await signIn(email, password);
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

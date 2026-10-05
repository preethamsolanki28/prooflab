"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import {
  ShieldCheck,
  Lock,
  Cpu,
  FileBadge,
  ArrowRight,
  Sparkles,
  BookOpen,
  Award,
} from "lucide-react";

export default function HomePage() {
  const { user, profile } = useAuth();

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl text-center">
        {/* Banner Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50/80 px-3.5 py-1 text-xs font-semibold text-[#3730A3] mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Gardenia 2K26 — Collaborative Research Ecosystem</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
          Proof of Contribution <br />
          <span className="text-[#3730A3]">&amp; Protected Collaboration</span>
        </h1>

        <p className="mx-auto mt-5 max-w-2xl text-base text-slate-600 sm:text-lg">
          Terms agreed before work begins. Confidential data routed strictly to on-device AI.
          Contributions cryptographically chained in an immutable SHA-256 ledger.
          Viewer-specific watermarks tracing intellectual leakage.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/projects"
            className="flex items-center gap-2 rounded-xl bg-[#3730A3] px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#312E81] transition-all"
          >
            Explore Research Projects
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
          >
            {user && profile ? `Switch Persona (${profile.display_name})` : "Sign In / Switch Persona"}
          </Link>
        </div>

        {/* Four Key Pillars Grid */}
        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 text-left">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-[#3730A3] mb-3">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Dual-AI Privacy Routing</h3>
            <p className="mt-1 text-xs text-slate-500">
              Public data routes to cloud AI (OpenRouter GPT-4o-mini). Confidential data is processed strictly on local model runtimes.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 mb-3">
              <Lock className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">RLS Charter Gating</h3>
            <p className="mt-1 text-xs text-slate-500">
              Confidential brief is physically separated and locked until the versioned charter is explicitly accepted.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-700 mb-3">
              <FileBadge className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Viewer Watermark</h3>
            <p className="mt-1 text-xs text-slate-500">
              Semi-transparent viewer identity and timestamp dynamically overlaid on confidential research assets for traceability.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 mb-3">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Hash-Chained Ledger</h3>
            <p className="mt-1 text-xs text-slate-500">
              PostgreSQL pgcrypto SHA-256 chain guarantees immutable contribution history. Updates and deletes are blocked.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

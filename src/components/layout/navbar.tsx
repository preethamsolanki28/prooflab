"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, SYNTHETIC_ACCOUNTS, UserRole } from "@/lib/auth/auth-context";
import {
  ShieldCheck,
  FolderKanban,
  PlusCircle,
  FileSearch,
  LogOut,
  UserCheck,
  ChevronDown,
  Lock,
  Layers,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut, quickLogin } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  async function handleSwitch(account: (typeof SYNTHETIC_ACCOUNTS)[0]) {
    try {
      setSwitching(true);
      await quickLogin(account);
      setRoleMenuOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Quick switch failed:", err);
    } finally {
      setSwitching(false);
    }
  }

  const roleBadgeColors: Record<UserRole, string> = {
    sponsor: "bg-purple-100 text-purple-800 border-purple-200",
    student: "bg-blue-100 text-blue-800 border-blue-200",
    expert: "bg-emerald-100 text-emerald-800 border-emerald-200",
    admin: "bg-amber-100 text-amber-800 border-amber-200",
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link href="/projects" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#3730A3] text-white shadow-sm">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 leading-tight">
                Gardenia 2K26
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                Proof of Contribution
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
            <Link
              href="/projects"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                pathname.startsWith("/projects") && pathname !== "/projects/new"
                  ? "bg-slate-100 text-[#3730A3]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <FolderKanban className="h-4 w-4" />
              Projects
            </Link>

            {(profile?.role === "sponsor" || profile?.role === "admin") && (
              <Link
                href="/projects/new"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  pathname === "/projects/new"
                    ? "bg-slate-100 text-[#3730A3]"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <PlusCircle className="h-4 w-4" />
                Post Project
              </Link>
            )}

            <Link
              href="/audit"
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                pathname === "/audit"
                  ? "bg-slate-100 text-[#3730A3]"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <FileSearch className="h-4 w-4" />
              Ledger Audit
            </Link>
          </nav>
        </div>

        {/* Right Section: User Status & Persona Switcher */}
        <div className="flex items-center gap-3">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-slate-100" />
          ) : user && profile ? (
            <div className="flex items-center gap-2">
              {/* Persona Switcher Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                  disabled={switching}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs hover:bg-slate-100 transition-colors"
                  title="Switch synthetic persona"
                >
                  <UserCheck className="h-3.5 w-3.5 text-slate-500" />
                  <span className="font-semibold">{profile.display_name}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider border ${
                      roleBadgeColors[profile.role]
                    }`}
                  >
                    {profile.role}
                  </span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </button>

                {roleMenuOpen && (
                  <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl border border-slate-200 bg-white p-2 shadow-xl ring-1 ring-black/5 z-50">
                    <div className="px-3 py-2 border-b border-slate-100">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Synthetic Persona Switcher
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Test different roles under database RLS
                      </p>
                    </div>
                    <div className="mt-1 flex flex-col gap-1">
                      {SYNTHETIC_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.email}
                          onClick={() => handleSwitch(acc)}
                          className={`flex items-start justify-between rounded-lg p-2 text-left transition-colors ${
                            profile.role === acc.role &&
                            profile.display_name.startsWith(acc.label.split(" ")[0])
                              ? "bg-slate-100"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-medium text-slate-900">
                              {acc.label}
                            </p>
                            <p className="text-[10px] text-slate-500 line-clamp-1">
                              {acc.desc}
                            </p>
                          </div>
                          <span
                            className={`rounded px-1 py-0.5 text-[9px] uppercase font-bold border ${
                              roleBadgeColors[acc.role]
                            }`}
                          >
                            {acc.role}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="flex items-center gap-1.5 rounded-lg bg-[#3730A3] px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#312E81] transition-colors"
              >
                <Lock className="h-3.5 w-3.5" />
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

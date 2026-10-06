"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/lib/auth/auth-context";
import {
  ShieldCheck,
  FolderKanban,
  PlusCircle,
  FileSearch,
  LogOut,
  UserCheck,
  Lock,
  Layers,
  Bell,
  User,
  CheckCircle,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, session, loading, signOut } = useAuth();
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = React.useCallback(async () => {
    if (!session?.access_token) return;
    try {
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
      }
    } catch {
      // ignore in silent polling
    }
  }, [session]);

  React.useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function handleMarkAllRead() {
    if (!session?.access_token) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ all: true }),
      });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
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
              {/* User Profile Badge */}
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 shadow-xs">
                <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
                <span className="font-semibold">{profile.display_name}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider border ${
                    roleBadgeColors[profile.role]
                  }`}
                >
                  {profile.role}
                </span>
              </div>

              {/* Notification Bell Dropdown */}
              <div className="relative">
                <button
                  id="btn-notifications-bell"
                  onClick={() => setNotifMenuOpen(!notifMenuOpen)}
                  className="relative flex items-center justify-center rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {notifMenuOpen && (
                  <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-xl border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Notifications</span>
                        {unreadCount > 0 && (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.2 text-[10px] font-semibold text-red-700">
                            {unreadCount} new
                          </span>
                        )}
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-[11px] font-medium text-[#3730A3] hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="mt-2 max-h-72 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="py-4 text-center text-xs text-slate-400">
                          No notifications yet
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            onClick={() => {
                              if (n.project_id) {
                                router.push(`/projects/${n.project_id}`);
                              } else if (n.related_user_id) {
                                router.push(`/profile/${n.related_user_id}`);
                              }
                              setNotifMenuOpen(false);
                            }}
                            className={`rounded-lg p-2.5 text-left transition-colors cursor-pointer border ${
                              n.read
                                ? "bg-white border-slate-100 hover:bg-slate-50"
                                : "bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-1">
                              <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                                {n.title}
                              </p>
                              {!n.read && (
                                <span className="h-2 w-2 rounded-full bg-[#3730A3] shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              {n.message}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* View My Profile Link */}
              <Link
                href={`/profile/${user.id}`}
                className="flex items-center gap-1 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="My Profile"
              >
                <User className="h-4 w-4" />
              </Link>

              {/* Logout Button */}
              <button
                onClick={() => signOut()}
                className="flex items-center gap-1 rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
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

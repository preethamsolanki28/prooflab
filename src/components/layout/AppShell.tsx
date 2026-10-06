"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth, UserRole } from "@/lib/auth/auth-context";
import {
  ShieldCheck,
  LayoutDashboard,
  Compass,
  FolderKanban,
  PlusCircle,
  FileText,
  Briefcase,
  Bell,
  Coins,
  Award,
  User,
  Star,
  FileCheck2,
  Search,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, session, loading, signOut } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  const isSponsor = profile?.role === "sponsor" || profile?.role === "admin";
  const isAuthPage = pathname === "/login";

  // Notification Polling
  const fetchNotifications = useCallback(async () => {
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
      // silent polling
    }
  }, [session]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
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

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/projects?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }

  // If on login page, render children directly without surrounding sidebar
  if (isAuthPage) {
    return <main className="min-h-screen bg-[#F8FAFC]">{children}</main>;
  }

  // Unauthenticated Public Top Bar Layout
  if (!user && !loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-6">
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <span className="font-semibold text-slate-900 text-sm tracking-tight">
                ResearchMesh
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/projects"
                className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Explore Projects
              </Link>
              <Link
                href="/login"
                className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 transition-colors shadow-2xs"
              >
                Sign In
              </Link>
            </div>
          </div>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  // Role Badge Styling
  const roleBadgeColor: Record<UserRole, string> = {
    sponsor: "bg-purple-50 text-purple-700 border-purple-200",
    student: "bg-emerald-50 text-emerald-800 border-emerald-200",
    expert: "bg-blue-50 text-blue-700 border-blue-200",
    admin: "bg-amber-50 text-amber-800 border-amber-200",
  };

  const navItemClass = (isActive: boolean) =>
    `flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
      isActive
        ? "bg-emerald-50 text-emerald-900 font-semibold"
        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
    }`;

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] text-slate-900">
      {/* Sidebar: Desktop */}
      <aside className="hidden md:flex md:w-60 md:flex-col md:fixed md:inset-y-0 border-r border-slate-200 bg-white z-30">
        {/* Brand */}
        <div className="flex h-14 items-center gap-2.5 px-4 border-b border-slate-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-700 text-white shadow-2xs">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-slate-900 leading-none">
              ResearchMesh
            </span>
            <span className="text-[10px] text-slate-500 mt-0.5">ProofLab Core</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {/* Main Navigation */}
          <div className="space-y-0.5">
            <Link href="/" className={navItemClass(pathname === "/")}>
              <LayoutDashboard className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Dashboard</span>
            </Link>

            {isSponsor ? (
              <>
                <Link
                  href="/projects"
                  className={navItemClass(pathname.startsWith("/projects") && pathname !== "/projects/new")}
                >
                  <FolderKanban className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>Projects</span>
                </Link>
                <Link
                  href="/projects/new"
                  className={navItemClass(pathname === "/projects/new")}
                >
                  <PlusCircle className="h-4 w-4 shrink-0 text-slate-500" />
                  <span>Post Project</span>
                </Link>
              </>
            ) : (
              <Link
                href="/projects"
                className={navItemClass(pathname.startsWith("/projects") && pathname !== "/projects/new")}
              >
                <Compass className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Explore Projects</span>
              </Link>
            )}

            <Link href="/applications" className={navItemClass(pathname === "/applications")}>
              <FileText className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Applications</span>
            </Link>

            <Link href="/workspaces" className={navItemClass(pathname === "/workspaces")}>
              <Briefcase className="h-4 w-4 shrink-0 text-slate-500" />
              <span>{isSponsor ? "Workspaces" : "My Workspaces"}</span>
            </Link>

            <Link href="/notifications" className={navItemClass(pathname === "/notifications")}>
              <Bell className="h-4 w-4 shrink-0 text-slate-500" />
              <div className="flex flex-1 items-center justify-between">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <span className="h-4 min-w-4 px-1 rounded-full bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
            </Link>
          </div>

          {/* Sponsor Finance Section */}
          {isSponsor && (
            <div className="pt-2 border-t border-slate-100 space-y-0.5">
              <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Finance
              </p>
              <Link href="/escrow" className={navItemClass(pathname === "/escrow")}>
                <Coins className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Escrow</span>
              </Link>
              <Link href="/rewards" className={navItemClass(pathname === "/rewards")}>
                <Award className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Rewards</span>
              </Link>
            </div>
          )}

          {/* Account & Trust */}
          <div className="pt-2 border-t border-slate-100 space-y-0.5">
            <p className="px-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Account &amp; Trust
            </p>
            {user && (
              <Link
                href={`/profile/${user.id}`}
                className={navItemClass(pathname.startsWith(`/profile/${user.id}`))}
              >
                <User className="h-4 w-4 shrink-0 text-slate-500" />
                <span>Profile</span>
              </Link>
            )}
            <Link href="/ratings" className={navItemClass(pathname === "/ratings")}>
              <Star className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Ratings</span>
            </Link>
            <Link href="/audit" className={navItemClass(pathname === "/audit")}>
              <FileCheck2 className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Security / Audit</span>
            </Link>
          </div>
        </nav>

        {/* User Card in Sidebar Bottom */}
        <div className="p-3 border-t border-slate-200">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5 border border-slate-200/80">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white text-xs font-semibold shrink-0">
                {profile?.display_name?.charAt(0) || "U"}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {profile?.display_name || "User"}
                </p>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[9px] uppercase font-bold border ${
                    profile?.role ? roleBadgeColor[profile.role] : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {profile?.role || "user"}
                </span>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="p-1 text-slate-400 hover:text-slate-700 transition-colors rounded"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Wrapper */}
      <div className="flex-1 flex flex-col md:pl-60">
        {/* Top Bar Header */}
        <header className="sticky top-0 z-20 h-14 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-6 flex items-center justify-between">
          {/* Mobile hamburger + search */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>

            {/* Quick Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search projects, skills, or members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50/50 pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-emerald-600 focus:outline-hidden transition-all"
              />
            </form>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2.5">
            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                id="btn-notifications-bell"
                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                className="relative p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-700 text-[9px] font-bold text-white shadow-2xs">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {notifDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-900">Notifications</span>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-medium text-emerald-700 hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="mt-2 max-h-72 overflow-y-auto space-y-1.5">
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-slate-400">
                        No notifications yet
                      </p>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (n.project_id) router.push(`/projects/${n.project_id}`);
                            else if (n.related_user_id) router.push(`/profile/${n.related_user_id}`);
                            setNotifDropdownOpen(false);
                          }}
                          className={`rounded-lg p-2 text-left cursor-pointer border transition-colors ${
                            n.read
                              ? "bg-white border-slate-100 hover:bg-slate-50"
                              : "bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50"
                          }`}
                        >
                          <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                            {n.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-100 text-center">
                    <Link
                      href="/notifications"
                      onClick={() => setNotifDropdownOpen(false)}
                      className="text-xs font-medium text-emerald-700 hover:underline inline-flex items-center gap-1"
                    >
                      View all notifications
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Direct Link */}
            {user && (
              <Link
                href={`/profile/${user.id}`}
                className="flex items-center gap-2 pl-2 border-l border-slate-200 hover:opacity-80 transition-opacity"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-700 text-white text-xs font-semibold">
                  {profile?.display_name?.charAt(0) || "U"}
                </div>
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-900 leading-tight">
                    {profile?.display_name || "User"}
                  </span>
                  <span className="text-[10px] text-slate-500 capitalize leading-tight">
                    {profile?.role || "Researcher"}
                  </span>
                </div>
              </Link>
            )}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-200 bg-white p-4 space-y-2 z-30">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass(pathname === "/")}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/projects"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass(pathname.startsWith("/projects") && pathname !== "/projects/new")}
            >
              <Compass className="h-4 w-4" />
              <span>{isSponsor ? "Projects" : "Explore Projects"}</span>
            </Link>
            {isSponsor && (
              <Link
                href="/projects/new"
                onClick={() => setMobileMenuOpen(false)}
                className={navItemClass(pathname === "/projects/new")}
              >
                <PlusCircle className="h-4 w-4" />
                <span>Post Project</span>
              </Link>
            )}
            <Link
              href="/applications"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass(pathname === "/applications")}
            >
              <FileText className="h-4 w-4" />
              <span>Applications</span>
            </Link>
            <Link
              href="/workspaces"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass(pathname === "/workspaces")}
            >
              <Briefcase className="h-4 w-4" />
              <span>Workspaces</span>
            </Link>
            <Link
              href="/notifications"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass(pathname === "/notifications")}
            >
              <Bell className="h-4 w-4" />
              <span>Notifications ({unreadCount})</span>
            </Link>
            <Link
              href="/audit"
              onClick={() => setMobileMenuOpen(false)}
              className={navItemClass(pathname === "/audit")}
            >
              <FileCheck2 className="h-4 w-4" />
              <span>Security / Audit</span>
            </Link>
          </div>
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

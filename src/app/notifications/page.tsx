"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { Bell, CheckCheck, RefreshCw, ExternalLink } from "lucide-react";

export default function NotificationsPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = useCallback(async () => {
    if (!session?.access_token) return;
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setNotifications(d.notifications || []);
        setUnreadCount(d.unreadCount || 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchNotifications();
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

  const displayedNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    return true;
  });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Notifications
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Application approvals, milestone updates, credit reviews, and collaborator feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-700" />
              Mark all as read
            </button>
          )}

          <button
            onClick={fetchNotifications}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            filter === "all"
              ? "bg-emerald-700 text-white font-semibold shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
            filter === "unread"
              ? "bg-emerald-700 text-white font-semibold shadow-2xs"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 animate-pulse space-y-3">
          <div className="h-4 bg-slate-100 rounded w-1/4" />
          <div className="h-8 bg-slate-100 rounded" />
          <div className="h-8 bg-slate-100 rounded" />
        </div>
      ) : displayedNotifications.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-slate-50 text-slate-400 mb-3">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No notifications</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {filter === "unread"
              ? "You have caught up with all your notifications."
              : "You have no notification activity records yet."}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-2xs divide-y divide-slate-100 overflow-hidden">
          {displayedNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                if (n.project_id) router.push(`/projects/${n.project_id}`);
                else if (n.related_user_id) router.push(`/profile/${n.related_user_id}`);
              }}
              className={`p-4 flex items-start justify-between gap-4 cursor-pointer transition-colors ${
                n.read ? "hover:bg-slate-50" : "bg-emerald-50/40 hover:bg-emerald-50"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900">{n.title}</h4>
                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-emerald-700 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                <span className="text-[10px] text-slate-400 block pt-1">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>

              <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

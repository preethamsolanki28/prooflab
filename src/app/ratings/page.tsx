"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { Star, MessageSquare, ArrowRight, ShieldCheck } from "lucide-react";

export default function RatingsPage() {
  const { user, session } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/profile/${user.id}`)
      .then((r) => r.json())
      .then((d) => setProfileData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const stats = profileData?.stats || {
    overall_rating: 5.0,
    total_reviews: 0,
    work_quality: 5.0,
    reliability: 5.0,
    communication: 5.0,
  };
  const reviews = profileData?.reviews || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold tracking-tight text-slate-900">
          Collaborator Ratings &amp; Reviews
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Peer reviews across completed research milestones and collaborative projects.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
          <span className="text-xs font-medium text-slate-500">Overall Rating</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900">{stats.overall_rating}</span>
            <span className="text-xs text-slate-400">/ 5.0</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {stats.total_reviews} verified reviews
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:col-span-2 space-y-2">
          <span className="text-xs font-bold text-slate-900 block">Rating Dimensions</span>
          <div className="grid grid-cols-3 gap-3 pt-1 text-center">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">Work Quality</span>
              <span className="text-sm font-bold text-slate-900">{stats.work_quality} / 5</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">Reliability</span>
              <span className="text-sm font-bold text-slate-900">{stats.reliability} / 5</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-medium">Communication</span>
              <span className="text-sm font-bold text-slate-900">{stats.communication} / 5</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
          Reviews from Completed Projects
        </h2>

        <div className="mt-4">
          {reviews.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-400">
              No project reviews received yet. Reviews unlock once a project is marked completed.
            </p>
          ) : (
            <div className="divide-y divide-slate-100 space-y-3">
              {reviews.map((r: any) => (
                <div key={r.id} className="pt-3 first:pt-0">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-900">{r.reviewer_name}</span>
                    <span className="text-slate-400 text-[10px]">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">&ldquo;{r.comment}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";

export type UserRole = "sponsor" | "student" | "expert" | "admin";

export interface UserProfile {
  id: string;
  display_name: string;
  role: UserRole;
  skills: string[];
  verified: boolean;
  conflict_of_interest?: boolean;
  created_at: string;
  avatar_url?: string | null;
  bio?: string | null;
  github_url?: string | null;
  linkedin_url?: string | null;
}

export interface SyntheticAccount {
  email: string;
  password: string;
  role: UserRole;
  label: string;
  desc: string;
}

export const SYNTHETIC_ACCOUNTS: SyntheticAccount[] = [];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, role: UserRole) => Promise<{ needsConfirmation: boolean; user: User | null }>;
  signInWithGoogle: (role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  quickLogin: (account: SyntheticAccount) => Promise<void>;
  switchPersona: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

/**
 * ============================================================================
 * GOOGLE OAUTH CONFIGURATION GUIDE (SUPABASE + GOOGLE CLOUD)
 * ============================================================================
 * To enable live Google sign-in:
 * 1. Google Cloud Console (https://console.cloud.google.com/):
 *    - Create/select a project, go to APIs & Services > Credentials.
 *    - Configure OAuth Consent Screen (User Type: External, Add app name, email).
 *    - Create Credentials > OAuth 2.0 Client ID (Web Application).
 *    - Under "Authorized redirect URIs", add your Supabase Auth callback URL:
 *      https://<project-ref>.supabase.co/auth/v1/callback
 *      (or for local Supabase: http://127.0.0.1:54321/auth/v1/callback)
 *    - Copy the Client ID and Client Secret.
 *
 * 2. Supabase Dashboard:
 *    - Navigate to Authentication > Providers > Google.
 *    - Toggle "Enable Google provider".
 *    - Paste Client ID and Client Secret from Google Cloud.
 *    - Under Authentication > URL Configuration:
 *      - Site URL: http://localhost:3000 (development) or production domain.
 *      - Redirect URLs: http://localhost:3000/**, https://your-production-app.vercel.app/**
 * ============================================================================
 */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string, currentUser?: User | null, currentToken?: string) {
    try {
      const targetUser = currentUser || user;
      const meta = targetUser?.user_metadata;
      const derivedName =
        meta?.full_name ||
        meta?.name ||
        meta?.display_name ||
        (targetUser?.email ? targetUser.email.split("@")[0] : "Researcher");

      // Check intended role from URL or localStorage
      let intendedRole: UserRole | undefined;
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRole = urlParams.get("role") as UserRole | null;
        const storedRole = localStorage.getItem("researchmesh_intended_role") as UserRole | null;
        if (urlRole && ["sponsor", "student", "expert", "admin"].includes(urlRole)) {
          intendedRole = urlRole;
        } else if (storedRole && ["sponsor", "student", "expert", "admin"].includes(storedRole)) {
          intendedRole = storedRole;
        }
        if (storedRole) {
          localStorage.removeItem("researchmesh_intended_role");
        }
      }

      const derivedRole = intendedRole || ((meta?.role as UserRole) || "student");
      const avatarUrl = meta?.avatar_url || meta?.picture || undefined;

      // 1. Try to read existing profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        if (intendedRole && data.role !== intendedRole) {
          const token = currentToken || session?.access_token;
          if (token) {
            try {
              const res = await fetch("/api/profile/ensure", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  userId,
                  displayName: derivedName,
                  role: intendedRole,
                  avatarUrl,
                }),
              });
              if (res.ok) {
                const json = await res.json();
                if (json.profile) {
                  setProfile(json.profile as UserProfile);
                  return;
                }
              }
            } catch (err) {
              console.warn("Could not sync updated role:", err);
            }
          }
        }
        setProfile(data as UserProfile);
        return;
      }

      // 2. Try inserting via server ensure endpoint (admin privileged client)
      const token = currentToken || session?.access_token;
      if (token) {
        try {
          const res = await fetch("/api/profile/ensure", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              userId,
              displayName: derivedName,
              role: derivedRole,
              avatarUrl,
            }),
          });
          if (res.ok) {
            const json = await res.json();
            if (json.profile) {
              setProfile(json.profile as UserProfile);
              return;
            }
          }
        } catch (serverErr) {
          console.warn("Server profile ensure fetch error:", serverErr);
        }
      }

      // 3. Fallback direct client insert
      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          display_name: derivedName,
          role: derivedRole,
          skills: [],
          verified: true,
          avatar_url: avatarUrl,
        })
        .select()
        .maybeSingle();

      if (!insertError && newProfile) {
        setProfile(newProfile as UserProfile);
        return;
      }

      // 4. Fallback in-memory profile so the user is never blocked or left in unauthenticated state
      setProfile({
        id: userId,
        display_name: derivedName,
        role: derivedRole,
        skills: [],
        verified: true,
        created_at: new Date().toISOString(),
        avatar_url: avatarUrl,
      });
    } catch (err) {
      console.error("Error fetching or provisioning authoritative profile:", err);
    }
  }

  useEffect(() => {
    // 1. Initial session load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id, session.user, session.access_token).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // 2. Auth state subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id, session.user, session.access_token);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password = "Password123!") {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    if (data?.user) {
      await fetchProfile(data.user.id, data.user, data.session?.access_token);
    }
    setLoading(false);
  }

  async function signUp(email: string, password: string, displayName: string, role: UserRole = "student") {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          full_name: displayName,
          role,
        },
      },
    });
    if (error) {
      setLoading(false);
      throw error;
    }
    if (data?.user && !data.session) {
      setLoading(false);
      return { needsConfirmation: true, user: data.user };
    }
    if (data?.user) {
      await fetchProfile(data.user.id, data.user, data.session?.access_token);
    }
    setLoading(false);
    return { needsConfirmation: false, user: data?.user ?? null };
  }

  async function quickLogin(account: SyntheticAccount) {
    await signIn(account.email, account.password);
  }

  async function switchPersona(email: string) {
    const acc = SYNTHETIC_ACCOUNTS.find((a) => a.email === email);
    if (acc) {
      await quickLogin(acc);
    } else {
      await signIn(email, "Password123!");
    }
  }

  async function signInWithGoogle(intendedRole?: UserRole) {
    setLoading(true);
    if (typeof window !== "undefined" && intendedRole) {
      localStorage.setItem("researchmesh_intended_role", intendedRole);
    }
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectUrl = intendedRole ? `${origin}/?role=${intendedRole}` : `${origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      setLoading(false);
      throw error;
    }
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    setLoading(false);
  }

  async function refreshProfile() {
    if (user) {
      await fetchProfile(user.id);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        quickLogin,
        switchPersona,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

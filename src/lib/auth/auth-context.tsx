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
}

export interface SyntheticAccount {
  email: string;
  password: string;
  role: UserRole;
  label: string;
  desc: string;
}

export const SYNTHETIC_ACCOUNTS: SyntheticAccount[] = [
  {
    email: "sponsor@gardenia.test",
    password: "Password123!",
    role: "sponsor",
    label: "Dr. Ramesh (Sponsor)",
    desc: "Research sponsor with project & budget authorization",
  },
  {
    email: "student_a@gardenia.test",
    password: "Password123!",
    role: "student",
    label: "Arjun (Student A)",
    desc: "Primary student researcher (CV, PyTorch, Edge ML)",
  },
  {
    email: "student_b@gardenia.test",
    password: "Password123!",
    role: "student",
    label: "Priya (Student B)",
    desc: "Web standards & accessibility researcher",
  },
  {
    email: "student_c@gardenia.test",
    password: "Password123!",
    role: "student",
    label: "Kavita (Student C)",
    desc: "Medical imaging & biostatistics candidate",
  },
  {
    email: "expert@gardenia.test",
    password: "Password123!",
    role: "expert",
    label: "Dr. Ananya (Expert)",
    desc: "Independent clinical validation expert (eligible)",
  },
  {
    email: "conflict_expert@gardenia.test",
    password: "Password123!",
    role: "expert",
    label: "Dr. Conflict (Conflicted)",
    desc: "Domain expert with flagged conflict of interest",
  },
  {
    email: "admin@gardenia.test",
    password: "Password123!",
    role: "admin",
    label: "System Admin",
    desc: "Platform governance and ledger auditor",
  },
];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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

  async function fetchProfile(userId: string, currentUser?: User | null) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data as UserProfile);
        return;
      }

      // If profile does not exist yet (e.g. initial Google OAuth sign-in),
      // initialize it with safe default role 'student' without overwriting anything.
      const targetUser = currentUser || user;
      const meta = targetUser?.user_metadata;
      const derivedName =
        meta?.full_name ||
        meta?.name ||
        meta?.display_name ||
        (targetUser?.email ? targetUser.email.split("@")[0] : "New Researcher");

      const { data: newProfile, error: insertError } = await supabase
        .from("profiles")
        .insert({
          id: userId,
          display_name: derivedName,
          role: "student",
          skills: [],
          verified: true,
        })
        .select()
        .maybeSingle();

      if (!insertError && newProfile) {
        setProfile(newProfile as UserProfile);
      } else {
        // Fallback retry select in case of trigger race
        const { data: retryProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();
        if (retryProfile) {
          setProfile(retryProfile as UserProfile);
        }
      }
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
        fetchProfile(session.user.id).finally(() => setLoading(false));
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
        await fetchProfile(session.user.id);
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setLoading(false);
      throw error;
    }
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

  async function signInWithGoogle() {
    setLoading(true);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/login`,
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

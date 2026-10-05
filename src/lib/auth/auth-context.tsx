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
    desc: "Primary student researcher who accepts charter",
  },
  {
    email: "student_b@gardenia.test",
    password: "Password123!",
    role: "student",
    label: "Priya (Student B)",
    desc: "Unaccepted non-member testing access barriers",
  },
  {
    email: "expert@gardenia.test",
    password: "Password123!",
    role: "expert",
    label: "Dr. Ananya (Expert)",
    desc: "Domain expert evaluating contributions",
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
  signOut: () => Promise<void>;
  quickLogin: (account: SyntheticAccount) => Promise<void>;
  switchPersona: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error("Error fetching authoritative profile:", err);
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

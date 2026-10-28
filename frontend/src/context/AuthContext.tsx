import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile } from '@ai-toon/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (name: string, email: string, password: string) => Promise<{ error: Error | null; needsEmailConfirmation?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loginDemoUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'ai_toon_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  // Helper to construct UserProfile from user or session
  const buildProfile = (usr: User | null): UserProfile | null => {
    if (!usr) return null;
    const fullName = usr.user_metadata?.full_name || usr.email?.split('@')[0] || 'Student';
    return {
      id: usr.id,
      email: usr.email || '',
      fullName,
      createdAt: usr.created_at || new Date().toISOString(),
      preferredLanguage: 'en',
      preferredTone: 'funny',
    };
  };

  useEffect(() => {
    // If Supabase is configured, use official Supabase session management
    if (isConfigured) {
      supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
        if (!error && initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          setProfile(buildProfile(initialSession.user));
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setProfile(buildProfile(currentSession?.user ?? null));
        setLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    } else {
      // Check for local demo user if testing without Supabase credentials
      const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo);
          setUser(parsed.user);
          setProfile(parsed.profile);
        } catch {
          localStorage.removeItem(DEMO_STORAGE_KEY);
        }
      }
      setLoading(false);
    }
  }, [isConfigured]);

  const signUp = async (name: string, email: string, password: string) => {
    if (!isConfigured) {
      return {
        error: new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local or use Demo Login below.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      });

      if (error) {
        return { error };
      }

      // If user is returned without session, Supabase email confirmation is enabled
      const needsEmailConfirmation = Boolean(data.user && !data.session);
      return { error: null, needsEmailConfirmation };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Registration failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return {
        error: new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local or use Demo Login below.'),
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.session) {
        setSession(data.session);
        setUser(data.user);
        setProfile(buildProfile(data.user));
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Login failed') };
    }
  };

  const signOut = async () => {
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  // Demo user helper when exploring in local dev without live Supabase keys
  const loginDemoUser = () => {
    const demoUser = {
      id: 'demo-student-id-123',
      email: 'alex.explorer@student.aitoon.edu',
      user_metadata: { full_name: 'Alex Explorer' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    const demoProfile: UserProfile = {
      id: 'demo-student-id-123',
      email: 'alex.explorer@student.aitoon.edu',
      fullName: 'Alex Explorer',
      createdAt: new Date().toISOString(),
      preferredLanguage: 'en',
      preferredTone: 'funny',
    };

    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ user: demoUser, profile: demoProfile }));
    setUser(demoUser);
    setProfile(demoProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured,
        signUp,
        signIn,
        signOut,
        loginDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

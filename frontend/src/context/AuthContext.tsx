import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile, UserRole, MemberVerificationStatus, MemberSessionStatus } from '@ai-toon/shared';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { API_BASE_URL } from '../config/api';

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
  loginDemoAdmin: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_STORAGE_KEY = 'ai_toon_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isConfigured = isSupabaseConfigured();

  // Helper to sync session state with backend members store
  const syncWithBackend = useCallback(async (
    usr: User | null,
    status: MemberSessionStatus = 'logged_in'
  ): Promise<Partial<UserProfile> | null> => {
    if (!usr || !usr.email) return null;
    const fullName = usr.user_metadata?.full_name || usr.email.split('@')[0] || 'Member';

    try {
      // 1. Notify backend of session presence
      const res = await fetch(`${API_BASE_URL}/members/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: usr.id,
          email: usr.email,
          fullName,
          status,
        }),
      });

      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          return {
            role: body.data.role as UserRole,
            verificationStatus: body.data.verificationStatus as MemberVerificationStatus,
            sessionStatus: body.data.sessionStatus as MemberSessionStatus,
            lastLoginAt: body.data.lastLoginAt,
            lastActiveAt: body.data.lastActiveAt,
          };
        }
      }
    } catch (err) {
      console.warn('[AuthContext] Backend session sync non-critical warning:', err);
    }
    return null;
  }, []);

  // Helper to build initial or updated UserProfile
  const buildProfile = (
    usr: User | null,
    backendOverrides?: Partial<UserProfile> | null
  ): UserProfile | null => {
    if (!usr) return null;
    const fullName = usr.user_metadata?.full_name || usr.email?.split('@')[0] || 'Student';
    const email = usr.email || '';

    // Default role logic: check email or metadata
    let defaultRole: UserRole = 'user';
    if (email.startsWith('admin') || usr.user_metadata?.role === 'admin') {
      defaultRole = 'admin';
    }

    return {
      id: usr.id,
      email,
      fullName,
      role: backendOverrides?.role || defaultRole,
      verificationStatus: backendOverrides?.verificationStatus || 'verified',
      sessionStatus: backendOverrides?.sessionStatus || 'logged_in',
      createdAt: usr.created_at || new Date().toISOString(),
      lastLoginAt: backendOverrides?.lastLoginAt || new Date().toISOString(),
      lastActiveAt: backendOverrides?.lastActiveAt || new Date().toISOString(),
      preferredLanguage: 'en',
      preferredTone: 'funny',
    };
  };

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE_URL}/members/me`, {
        headers: {
          'x-user-id': user.id,
          'x-user-email': user.email || '',
        },
      });
      if (res.ok) {
        const body = await res.json();
        if (body.success && body.data) {
          setProfile((prev) => {
            if (!prev) return buildProfile(user, body.data);
            return {
              ...prev,
              role: body.data.role,
              verificationStatus: body.data.verificationStatus,
              sessionStatus: body.data.sessionStatus,
              lastActiveAt: body.data.lastActiveAt,
              lastLoginAt: body.data.lastLoginAt,
            };
          });
        }
      }
    } catch (err) {
      console.warn('[AuthContext] refreshProfile error:', err);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    if (isConfigured) {
      supabase.auth.getSession().then(async ({ data: { session: initialSession }, error }) => {
        if (!mounted) return;
        if (!error && initialSession) {
          setSession(initialSession);
          setUser(initialSession.user);
          const backendData = await syncWithBackend(initialSession.user, 'logged_in');
          if (mounted) {
            setProfile(buildProfile(initialSession.user, backendData));
          }
        }
        setLoading(false);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
        if (!mounted) return;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          const backendData = await syncWithBackend(currentSession.user, 'logged_in');
          if (mounted) {
            setProfile(buildProfile(currentSession.user, backendData));
          }
        } else {
          setProfile(null);
        }
        setLoading(false);
      });

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    } else {
      // Local demo persistence
      const savedDemo = localStorage.getItem(DEMO_STORAGE_KEY);
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo);
          setUser(parsed.user);
          setProfile(parsed.profile);
          // Sync with backend asynchronously
          syncWithBackend(parsed.user, 'logged_in');
        } catch {
          localStorage.removeItem(DEMO_STORAGE_KEY);
        }
      }
      setLoading(false);
    }
  }, [isConfigured, syncWithBackend]);

  const signUp = async (name: string, email: string, password: string) => {
    if (!isConfigured) {
      return {
        error: new Error(
          'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local or use Demo Login.'
        ),
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

      if (data.user) {
        // Register new account in backend with pending verification
        await fetch(`${API_BASE_URL}/members/session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: data.user.id,
            email: data.user.email,
            fullName: name,
            status: data.session ? 'logged_in' : 'logged_out',
          }),
        }).catch(() => { });
      }

      const needsEmailConfirmation = Boolean(data.user && !data.session);
      return { error: null, needsEmailConfirmation };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Registration failed') };
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!isConfigured) {
      return {
        error: new Error(
          'Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env.local or use Demo Login.'
        ),
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
        const backendData = await syncWithBackend(data.user, 'logged_in');
        setProfile(buildProfile(data.user, backendData));
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Login failed') };
    }
  };

  const signOut = async () => {
    if (user) {
      // Notify backend that member has logged out
      await syncWithBackend(user, 'logged_out').catch(() => { });
    }
    if (isConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  // Student Demo Login helper
  const loginDemoUser = () => {
    const demoUser = {
      id: 'demo-student-id-123',
      email: 'alex.explorer@student.aitoon.edu',
      user_metadata: { full_name: 'Alex Explorer', role: 'user' },
      app_metadata: {},
      aud: 'authenticated',
      created_at: '2026-10-01T11:15:00.000Z',
    } as unknown as User;

    const demoProfile: UserProfile = {
      id: 'demo-student-id-123',
      email: 'alex.explorer@student.aitoon.edu',
      fullName: 'Alex Explorer',
      role: 'user',
      verificationStatus: 'verified',
      sessionStatus: 'logged_in',
      createdAt: '2026-10-01T11:15:00.000Z',
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      preferredLanguage: 'en',
      preferredTone: 'funny',
    };

    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ user: demoUser, profile: demoProfile }));
    setUser(demoUser);
    setProfile(demoProfile);
    syncWithBackend(demoUser, 'logged_in');
  };

  // Administrator Demo Login helper
  const loginDemoAdmin = () => {
    const adminUser = {
      id: 'admin-super-001',
      email: 'admin@aitoon.edu',
      user_metadata: { full_name: 'System Administrator', role: 'admin' },
      app_metadata: { role: 'admin' },
      aud: 'authenticated',
      created_at: '2026-09-01T08:00:00.000Z',
    } as unknown as User;

    const adminProfile: UserProfile = {
      id: 'admin-super-001',
      email: 'admin@aitoon.edu',
      fullName: 'System Administrator',
      role: 'admin',
      verificationStatus: 'verified',
      sessionStatus: 'logged_in',
      createdAt: '2026-09-01T08:00:00.000Z',
      lastLoginAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      preferredLanguage: 'en',
      preferredTone: 'funny',
    };

    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({ user: adminUser, profile: adminProfile }));
    setUser(adminUser);
    setProfile(adminProfile);
    syncWithBackend(adminUser, 'logged_in');
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
        loginDemoAdmin,
        refreshProfile,
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

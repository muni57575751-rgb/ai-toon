import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProfile, UserRole } from '@ai-toon/shared';
import { API_BASE_URL, safeJsonParse } from '../config/api';

export const MASTER_ADMIN_EMAIL = 'muni57575751@gmail.com';
export const MASTER_ADMIN_PASSWORD = 'Poola@1234';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<{ error: Error | null; needsAdminApproval?: boolean }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loginDemoAdmin: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (fullName: string) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'ai_toon_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to build UserProfile
  const buildProfile = (
    usr: User | null,
    backendOverrides?: Partial<UserProfile> | null
  ): UserProfile | null => {
    if (!usr) return null;
    const fullName = usr.user_metadata?.full_name || usr.email?.split('@')[0] || 'Member';
    const email = usr.email || '';

    let defaultRole: UserRole = 'user';
    if (email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      defaultRole = 'admin';
    }

    return {
      id: usr.id,
      email,
      fullName: backendOverrides?.fullName || fullName,
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
      const parsed = await safeJsonParse(res);
      if (parsed.ok && parsed.data?.success && parsed.data.data) {
        const d = parsed.data.data;
        setProfile((prev) => {
          if (!prev) return buildProfile(user, d);
          return {
            ...prev,
            role: d.role,
            verificationStatus: d.verificationStatus,
            sessionStatus: d.sessionStatus,
            lastActiveAt: d.lastActiveAt,
            lastLoginAt: d.lastLoginAt,
          };
        });
      }
    } catch (err) {
      console.warn('[AuthContext] refreshProfile error:', err);
    }
  }, [user]);

  useEffect(() => {
    // Clean up any legacy demo keys
    localStorage.removeItem('ai_toon_demo_user');

    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth) {
      try {
        const parsed = JSON.parse(savedAuth);
        setUser(parsed.user);
        setProfile(parsed.profile);

        // Verify session status with backend safely
        fetch(`${API_BASE_URL}/members/me`, {
          headers: {
            'x-user-id': parsed.user.id,
            'x-user-email': parsed.user.email,
          },
        })
          .then((res) => safeJsonParse(res))
          .then((parsedRes) => {
            if (parsedRes.ok && parsedRes.data?.success && parsedRes.data.data) {
              const d = parsedRes.data.data;
              if (
                d.verificationStatus === 'pending' ||
                d.verificationStatus === 'rejected'
              ) {
                // If account has been revoked or pending, clear session
                localStorage.removeItem(AUTH_STORAGE_KEY);
                setUser(null);
                setProfile(null);
              } else {
                setProfile(buildProfile(parsed.user, d));
              }
            }
          })
          .catch(() => {});
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const signUp = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ error: Error | null; needsAdminApproval?: boolean }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const parsed = await safeJsonParse(res, 'Registration failed.');
      if (!parsed.ok || !parsed.data?.success) {
        return {
          error: new Error(parsed.error || parsed.data?.error?.message || 'Registration failed.'),
        };
      }

      return { error: null, needsAdminApproval: true };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error('Network error during registration.'),
      };
    }
  };

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const parsed = await safeJsonParse(res, 'Invalid email or password.');
      if (!parsed.ok || !parsed.data?.success) {
        return {
          error: new Error(parsed.error || parsed.data?.error?.message || 'Invalid email or password.'),
        };
      }

      const userData = parsed.data.data.user;
      const profileData = parsed.data.data.profile || {};

      const userObj = {
        id: userData.id,
        email: userData.email,
        user_metadata: { full_name: userData.fullName, role: userData.role },
        app_metadata: { role: userData.role },
        aud: 'authenticated',
        created_at: profileData.createdAt,
      } as unknown as User;

      const fullProfile: UserProfile = {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        verificationStatus: userData.verificationStatus,
        sessionStatus: 'logged_in',
        createdAt: profileData.createdAt,
        lastLoginAt: profileData.lastLoginAt,
        lastActiveAt: profileData.lastActiveAt,
        preferredLanguage: 'en',
        preferredTone: 'funny',
      };

      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ user: userObj, profile: fullProfile })
      );
      setUser(userObj);
      setProfile(fullProfile);

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error('Login network error.'),
      };
    }
  };

  const signOut = async () => {
    if (user) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      }).catch(() => {});
    }
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const updateProfile = async (fullName: string): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in.' };
    try {
      const res = await fetch(`${API_BASE_URL}/members/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
        },
        body: JSON.stringify({ fullName }),
      });
      const parsed = await safeJsonParse(res, 'Failed to update profile.');
      if (!parsed.ok || !parsed.data?.success) {
        return { success: false, error: parsed.error || parsed.data?.error?.message || 'Failed to update profile.' };
      }
      setProfile((prev) => (prev ? { ...prev, fullName } : null));
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        try {
          const parsedLocal = JSON.parse(savedAuth);
          parsedLocal.profile.fullName = fullName;
          parsedLocal.user.user_metadata = { ...parsedLocal.user.user_metadata, full_name: fullName };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsedLocal));
        } catch {}
      }
      return { success: true };
    } catch {
      return { success: false, error: 'Network error updating profile.' };
    }
  };

  const deleteAccount = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not logged in.' };
    try {
      const res = await fetch(`${API_BASE_URL}/members/delete-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          'x-user-email': user.email || '',
        },
      });
      const parsed = await safeJsonParse(res, 'Failed to delete account.');
      if (!parsed.ok || !parsed.data?.success) {
        return { success: false, error: parsed.error || parsed.data?.error?.message || 'Failed to delete account.' };
      }
      await signOut();
      return { success: true };
    } catch {
      return { success: false, error: 'Network error deleting account.' };
    }
  };

  // Quick Master Admin Login Helper (muni57575751@gmail.com / Poola@1234)
  const loginDemoAdmin = async (): Promise<{ error: Error | null }> => {
    return signIn(MASTER_ADMIN_EMAIL, MASTER_ADMIN_PASSWORD);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: true,
        signUp,
        signIn,
        signOut,
        loginDemoAdmin,
        refreshProfile,
        updateProfile,
        deleteAccount,
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

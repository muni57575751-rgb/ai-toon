-- ============================================================================
-- AI TOON: SUPABASE DATABASE SCHEMA
-- ============================================================================
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- It creates the authoritative tables, indexes, RLS policies, and triggers for AI Toon.

-- 1. MEMBERS / USER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password TEXT,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('verified', 'approved', 'pending', 'rejected', 'suspended')),
    session_status TEXT NOT NULL DEFAULT 'logged_out' CHECK (session_status IN ('logged_in', 'logged_out')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_at TIMESTAMPTZ,
    verified_by TEXT,
    suspended_at TIMESTAMPTZ,
    suspended_reason TEXT,
    last_login_at TIMESTAMPTZ DEFAULT NOW(),
    last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. NOTIFICATIONS TABLE (Admin Approval Queue)
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL DEFAULT 'NEW_REGISTRATION',
    member_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    actioned_at TIMESTAMPTZ,
    actioned_by TEXT,
    approved_role TEXT DEFAULT 'user'
);

-- 3. QUIZ ATTEMPTS TABLE
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
    story_id TEXT NOT NULL,
    topic TEXT NOT NULL,
    score INT NOT NULL,
    total INT NOT NULL,
    percentage INT NOT NULL,
    time_taken_seconds INT,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. USER STORIES TABLE
CREATE TABLE IF NOT EXISTS public.user_stories (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.members(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    tone TEXT NOT NULL,
    language TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    introduction TEXT,
    key_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    illustrations JSONB NOT NULL DEFAULT '[]'::jsonb,
    quiz JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. AUDIT LOGS TABLES
CREATE TABLE IF NOT EXISTS public.login_audit (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    email TEXT NOT NULL,
    success BOOLEAN NOT NULL,
    reason TEXT,
    ip TEXT,
    browser TEXT,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_audit (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    target_email TEXT,
    details JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.system_settings (
    id TEXT PRIMARY KEY DEFAULT 'global',
    user_approval_required BOOLEAN NOT NULL DEFAULT TRUE,
    story_generation_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    max_admins INT NOT NULL DEFAULT 5,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. SEED MASTER ADMIN (Muni)
INSERT INTO public.members (
    id, email, full_name, password, role, verification_status, session_status, created_at, verified_at, verified_by
) VALUES (
    'admin-muni-master',
    'muni57575751@gmail.com',
    'Muni (Super Admin)',
    'Poola@1234',
    'admin',
    'verified',
    'logged_in',
    NOW(),
    NOW(),
    'System Master Root'
) ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    verification_status = 'verified';

INSERT INTO public.system_settings (id, user_approval_required, story_generation_enabled, max_admins)
VALUES ('global', TRUE, TRUE, 5)
ON CONFLICT (id) DO NOTHING;

-- 8. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members(email);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members(verification_status);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_user ON public.user_stories(user_id);

-- 9. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Anonymous/Authenticated Read Policies
CREATE POLICY "Public read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Public insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update members" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Public delete members" ON public.members FOR DELETE USING (true);

CREATE POLICY "Public read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Public insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notifications" ON public.notifications FOR UPDATE USING (true);

CREATE POLICY "Public read quiz_attempts" ON public.quiz_attempts FOR SELECT USING (true);
CREATE POLICY "Public insert quiz_attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read user_stories" ON public.user_stories FOR SELECT USING (true);
CREATE POLICY "Public insert user_stories" ON public.user_stories FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read audit" ON public.admin_audit FOR SELECT USING (true);
CREATE POLICY "Public insert audit" ON public.admin_audit FOR INSERT WITH CHECK (true);
CREATE POLICY "Public read login_audit" ON public.login_audit FOR SELECT USING (true);
CREATE POLICY "Public insert login_audit" ON public.login_audit FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Public update settings" ON public.system_settings FOR UPDATE USING (true);


-- 1. Create Users Table (Admins)
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Guests Table (Contacts)
CREATE TABLE IF NOT EXISTS public.guests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    status TEXT DEFAULT 'uninvited',
    group_id TEXT,
    souls INTEGER DEFAULT 1,
    message TEXT,
    type TEXT,
    sent_at TEXT,
    arrival_date TEXT,
    arrival_mode TEXT,
    arrival_details TEXT,
    profile_image_url TEXT,
    document_url TEXT,
    vault_access BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Shared Vault Table (Crowdsourced Photos)
CREATE TABLE IF NOT EXISTS public.shared_vault (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    uploader_id TEXT REFERENCES public.guests(id),
    uploader_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Templates Table
CREATE TABLE IF NOT EXISTS public.templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    is_quick_action BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Groups Table
CREATE TABLE IF NOT EXISTS public.groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create Push Subscriptions Table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id TEXT PRIMARY KEY,
    guest_id TEXT REFERENCES public.guests(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_vault ENABLE ROW LEVEL SECURITY;

-- Simple policy: Service Role can do anything (Default)
-- Note: For production, you'd add more granular policies

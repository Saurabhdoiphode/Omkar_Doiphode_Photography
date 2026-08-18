-- =====================================================================
-- Omkar Doiphode Photography — Supabase Table Setup (RUN ONCE)
-- ---------------------------------------------------------------------
-- How to use:
--   1. Open your Supabase project dashboard
--   2. Go to: SQL Editor → New query
--   3. Paste the entire file and click "Run"
--
-- Why: Uploaded logos / profile photos were disappearing on the live
--      site because the cloud tables did not exist. The server only
--      fell back to local files, which Render wipes on every restart.
--      These tables make all uploads PERMANENT in the cloud.
-- =====================================================================

-- =====================================================================
-- 1. logos  →  brand logo storage (permanent, survives restarts)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.logos (
  id BIGSERIAL PRIMARY KEY,
  logo_path TEXT NOT NULL,
  filepath TEXT,
  is_active INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.logos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logos_all" ON public.logos;
CREATE POLICY "logos_all" ON public.logos FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.logos TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.logos_id_seq TO anon, authenticated;

-- =====================================================================
-- 2. profile_photo  →  Omkar About Us profile photo (permanent)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.profile_photo (
  id BIGSERIAL PRIMARY KEY,
  photo_path TEXT NOT NULL,
  filepath TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profile_photo ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profile_photo_all" ON public.profile_photo;
CREATE POLICY "profile_photo_all" ON public.profile_photo FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.profile_photo TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.profile_photo_id_seq TO anon, authenticated;

-- =====================================================================
-- 3. reviews  →  client reviews approval + display (permanent)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id BIGSERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  review_text TEXT NOT NULL,
  is_approved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reviews_all" ON public.reviews;
CREATE POLICY "reviews_all" ON public.reviews FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.reviews TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.reviews_id_seq TO anon, authenticated;

-- =====================================================================
-- 4. private_galleries  →  passcode-protected client photo galleries
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.private_galleries (
  id BIGSERIAL PRIMARY KEY,
  gallery_code TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  passcode TEXT NOT NULL,
  photo_urls TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.private_galleries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "private_galleries_all" ON public.private_galleries;
CREATE POLICY "private_galleries_all" ON public.private_galleries FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.private_galleries TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.private_galleries_id_seq TO anon, authenticated;

-- =====================================================================
-- 5. gallery_items  →  portfolio gallery images
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  badge TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gallery_items_all" ON public.gallery_items;
CREATE POLICY "gallery_items_all" ON public.gallery_items FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.gallery_items TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.gallery_items_id_seq TO anon, authenticated;

-- =====================================================================
-- 6. bookings  →  client booking requests + calendar status (pending / confirmed / blocked / cancelled)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
  id BIGSERIAL PRIMARY KEY,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_location TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bookings_all" ON public.bookings;
CREATE POLICY "bookings_all" ON public.bookings FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.bookings TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.bookings_id_seq TO anon, authenticated;

-- =====================================================================
-- 7. blocked_dates  →  manually blocked / freed dates for the calendar
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.blocked_dates (
  id BIGSERIAL PRIMARY KEY,
  date_str TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'blocked',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocked_dates_all" ON public.blocked_dates;
CREATE POLICY "blocked_dates_all" ON public.blocked_dates FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.blocked_dates TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.blocked_dates_id_seq TO anon, authenticated;

-- =====================================================================
-- Verify: after running, you should see all 7 tables listed here:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name IN
--   ('logos','profile_photo','reviews','private_galleries','gallery_items','bookings','blocked_dates');
-- =====================================================================
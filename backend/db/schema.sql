-- =====================================================================
-- DAPITAN CITY BOARDING HOUSE FINDER SYSTEM
-- Database: PostgreSQL 18
-- Target Custom Schema: dapitan_schema
-- =====================================================================

-- 1. Create Dedicated Schema
CREATE SCHEMA IF NOT EXISTS "dapitan_schema";

-- 2. Set search path so queries default to dapitan_schema
SET search_path TO "dapitan_schema", public;

-- 3. Extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

-- =====================================================================
-- ENUM TYPES (Created inside dapitan_schema)
-- =====================================================================
DO $$ BEGIN
  CREATE TYPE "dapitan_schema".user_role AS ENUM ('user', 'owner', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "dapitan_schema".verification_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "dapitan_schema".listing_status AS ENUM ('pending_approval', 'published', 'rejected', 'archived');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "dapitan_schema".room_type AS ENUM ('single', 'double', 'bedspace', 'apartment', 'studio');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- =====================================================================
-- TABLES
-- =====================================================================

-- Table 1: Users (Students, Seekers, Boarding House Owners, Admins)
CREATE TABLE IF NOT EXISTS "dapitan_schema".users (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_number VARCHAR(25),
    role "dapitan_schema".user_role DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: Owner Verification Applications
CREATE TABLE IF NOT EXISTS "dapitan_schema".owner_verifications (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES "dapitan_schema".users(id) ON DELETE CASCADE,
    valid_id_url TEXT NOT NULL,
    business_permit_or_proof_url TEXT,
    notes TEXT,
    status "dapitan_schema".verification_status DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES "dapitan_schema".users(id),
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Boarding Houses (Located in Dapitan City)
CREATE TABLE IF NOT EXISTS "dapitan_schema".boarding_houses (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES "dapitan_schema".users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    barangay VARCHAR(100) NOT NULL, -- e.g., Dawo, Bagting, Sta. Cruz, Potungan, San Vicente
    street_address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    house_rules TEXT,
    contact_phone VARCHAR(25) NOT NULL,
    status "dapitan_schema".listing_status DEFAULT 'pending_approval',
    admin_review_notes TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 4: Rooms inside Boarding Houses
CREATE TABLE IF NOT EXISTS "dapitan_schema".rooms (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    boarding_house_id UUID NOT NULL REFERENCES "dapitan_schema".boarding_houses(id) ON DELETE CASCADE,
    room_name_or_number VARCHAR(50) NOT NULL,
    room_type "dapitan_schema".room_type DEFAULT 'single',
    monthly_rate DECIMAL(10, 2) NOT NULL,
    deposit_required DECIMAL(10, 2) DEFAULT 0.00,
    total_slots INT DEFAULT 1,
    available_slots INT DEFAULT 1,
    is_airconditioned BOOLEAN DEFAULT FALSE,
    is_furnished BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 5: Master Amenities
CREATE TABLE IF NOT EXISTS "dapitan_schema".amenities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) UNIQUE NOT NULL,
    icon_name VARCHAR(50)
);

-- Table 6: Boarding House & Amenity Junction
CREATE TABLE IF NOT EXISTS "dapitan_schema".boarding_house_amenities (
    boarding_house_id UUID REFERENCES "dapitan_schema".boarding_houses(id) ON DELETE CASCADE,
    amenity_id INT REFERENCES "dapitan_schema".amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (boarding_house_id, amenity_id)
);

-- Table 7: Boarding House Photographs
CREATE TABLE IF NOT EXISTS "dapitan_schema".listing_photos (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    boarding_house_id UUID REFERENCES "dapitan_schema".boarding_houses(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    is_cover_photo BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Table 8: User Favorites / Bookmarks
CREATE TABLE IF NOT EXISTS "dapitan_schema".favorites (
    user_id UUID REFERENCES "dapitan_schema".users(id) ON DELETE CASCADE,
    boarding_house_id UUID REFERENCES "dapitan_schema".boarding_houses(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, boarding_house_id)
);

-- Table 9: Inaccurate or Inappropriate Listing Reports
CREATE TABLE IF NOT EXISTS "dapitan_schema".listing_reports (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    reporter_id UUID REFERENCES "dapitan_schema".users(id) ON DELETE SET NULL,
    boarding_house_id UUID REFERENCES "dapitan_schema".boarding_houses(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status VARCHAR(30) DEFAULT 'pending', -- pending, investigated, dismissed, action_taken
    admin_remarks TEXT,
    reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- PERFORMANCE INDEXES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON "dapitan_schema".users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON "dapitan_schema".users(role);

CREATE INDEX IF NOT EXISTS idx_verifications_owner ON "dapitan_schema".owner_verifications(owner_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON "dapitan_schema".owner_verifications(status);

CREATE INDEX IF NOT EXISTS idx_bh_barangay ON "dapitan_schema".boarding_houses(barangay);
CREATE INDEX IF NOT EXISTS idx_bh_status ON "dapitan_schema".boarding_houses(status);
CREATE INDEX IF NOT EXISTS idx_bh_owner ON "dapitan_schema".boarding_houses(owner_id);

CREATE INDEX IF NOT EXISTS idx_rooms_bh ON "dapitan_schema".rooms(boarding_house_id);
CREATE INDEX IF NOT EXISTS idx_rooms_rate ON "dapitan_schema".rooms(monthly_rate);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON "dapitan_schema".rooms(room_type);

CREATE INDEX IF NOT EXISTS idx_photos_bh ON "dapitan_schema".listing_photos(boarding_house_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON "dapitan_schema".favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_bh ON "dapitan_schema".listing_reports(boarding_house_id);

-- =====================================================================
-- SEED DATA (Default Amenities)
-- =====================================================================
INSERT INTO "dapitan_schema".amenities (name, icon_name)
VALUES
    ('Free Wi-Fi', 'wifi'),
    ('Drinking Water Provided', 'water_drop'),
    ('Air Conditioning', 'ac_unit'),
    ('Own Toilet & Bath', 'bathroom'),
    ('Common Kitchen / Cooking Allowed', 'restaurant'),
    ('Laundry / Washing Area', 'local_laundry_service'),
    ('Gated & CCTV Secured', 'security'),
    ('Study Table / Area', 'menu_book'),
    ('Motorcycle Parking', 'two_wheeler'),
    ('No Curfew', 'lock_open')
ON CONFLICT (name) DO NOTHING;

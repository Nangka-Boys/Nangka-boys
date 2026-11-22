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

-- Table 10: System Audit Logs (Audit Trail & Logging)
CREATE TABLE IF NOT EXISTS "dapitan_schema".audit_logs (
    id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(30) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'PROCEDURE_EXEC', 'SYSTEM_EVENT'
    record_id VARCHAR(100),
    user_id UUID,
    old_data JSONB,
    new_data JSONB,
    description TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================================
-- PERFORMANCE & AUDIT INDEXES
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

CREATE INDEX IF NOT EXISTS idx_audit_table ON "dapitan_schema".audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_operation ON "dapitan_schema".audit_logs(operation);
CREATE INDEX IF NOT EXISTS idx_audit_record ON "dapitan_schema".audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON "dapitan_schema".audit_logs(created_at DESC);

-- =====================================================================
-- 1. USER-DEFINED FUNCTIONS (UDFs)
-- =====================================================================

-- UDF 1: Calculate room occupancy & capacity metrics for a boarding house
CREATE OR REPLACE FUNCTION "dapitan_schema".fn_calculate_room_occupancy(p_boarding_house_id UUID)
RETURNS TABLE (
    total_capacity BIGINT,
    total_available BIGINT,
    total_occupied BIGINT,
    occupancy_rate NUMERIC(5,2)
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(total_slots), 0)::BIGINT AS total_capacity,
        COALESCE(SUM(available_slots), 0)::BIGINT AS total_available,
        COALESCE(SUM(total_slots - available_slots), 0)::BIGINT AS total_occupied,
        CASE 
            WHEN COALESCE(SUM(total_slots), 0) = 0 THEN 0.00
            ELSE ROUND(((SUM(total_slots - available_slots)::NUMERIC / SUM(total_slots)::NUMERIC) * 100), 2)
        END AS occupancy_rate
    FROM "dapitan_schema".rooms
    WHERE boarding_house_id = p_boarding_house_id;
END;
$$;

-- UDF 2: Retrieve monthly rate price range & room count for a boarding house
CREATE OR REPLACE FUNCTION "dapitan_schema".fn_get_price_range(p_boarding_house_id UUID)
RETURNS TABLE (
    min_rate NUMERIC(10,2),
    max_rate NUMERIC(10,2),
    avg_rate NUMERIC(10,2),
    room_count BIGINT
) LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(MIN(monthly_rate), 0.00) AS min_rate,
        COALESCE(MAX(monthly_rate), 0.00) AS max_rate,
        COALESCE(ROUND(AVG(monthly_rate), 2), 0.00) AS avg_rate,
        COUNT(*)::BIGINT AS room_count
    FROM "dapitan_schema".rooms
    WHERE boarding_house_id = p_boarding_house_id;
END;
$$;

-- UDF 3: Validate whether an owner account is officially verified
CREATE OR REPLACE FUNCTION "dapitan_schema".fn_is_owner_verified(p_owner_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE
    v_is_verified BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM "dapitan_schema".owner_verifications
        WHERE owner_id = p_owner_id AND status = 'approved'
    ) INTO v_is_verified;
    RETURN v_is_verified;
END;
$$;

-- UDF 4: Return JSONB array of amenity objects linked to a boarding house
CREATE OR REPLACE FUNCTION "dapitan_schema".fn_get_boarding_house_amenities(p_boarding_house_id UUID)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
    v_amenities JSONB;
BEGIN
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object('id', a.id, 'name', a.name, 'icon_name', a.icon_name)
        ), '[]'::jsonb
    )
    INTO v_amenities
    FROM "dapitan_schema".boarding_house_amenities bha
    JOIN "dapitan_schema".amenities a ON bha.amenity_id = a.id
    WHERE bha.boarding_house_id = p_boarding_house_id;
    
    RETURN v_amenities;
END;
$$;

-- =====================================================================
-- 2. DATABASE TRIGGER FUNCTIONS & TRIGGERS
-- =====================================================================

-- Trigger Function: Set updated_at timestamp
CREATE OR REPLACE FUNCTION "dapitan_schema".fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Trigger Function: Auto-synchronize boarding house availability from room slots
CREATE OR REPLACE FUNCTION "dapitan_schema".fn_sync_boarding_house_availability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_target_bh_id UUID;
    v_total_available INT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_target_bh_id := OLD.boarding_house_id;
    ELSE
        v_target_bh_id := NEW.boarding_house_id;
    END IF;

    SELECT COALESCE(SUM(available_slots), 0)
    INTO v_total_available
    FROM "dapitan_schema".rooms
    WHERE boarding_house_id = v_target_bh_id;

    -- If 0 slots available, mark is_available as FALSE; if > 0, mark TRUE
    UPDATE "dapitan_schema".boarding_houses
    SET is_available = (v_total_available > 0),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_target_bh_id;

    RETURN NULL;
END;
$$;

-- Trigger Function: Row-level audit logging trigger
CREATE OR REPLACE FUNCTION "dapitan_schema".fn_audit_log_trigger()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
    v_record_id VARCHAR(100);
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
    v_user_id UUID := NULL;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id::VARCHAR;
        v_new_data := to_jsonb(NEW);
        IF TG_TABLE_NAME = 'users' THEN
            v_new_data := v_new_data - 'password_hash';
            v_user_id := NEW.id;
        ELSIF TG_TABLE_NAME = 'boarding_houses' THEN
            v_user_id := NEW.owner_id;
        ELSIF TG_TABLE_NAME = 'owner_verifications' THEN
            v_user_id := NEW.owner_id;
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := NEW.id::VARCHAR;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        IF TG_TABLE_NAME = 'users' THEN
            v_old_data := v_old_data - 'password_hash';
            v_new_data := v_new_data - 'password_hash';
            v_user_id := NEW.id;
        ELSIF TG_TABLE_NAME = 'boarding_houses' THEN
            v_user_id := NEW.owner_id;
        ELSIF TG_TABLE_NAME = 'owner_verifications' THEN
            v_user_id := NEW.owner_id;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id::VARCHAR;
        v_old_data := to_jsonb(OLD);
        IF TG_TABLE_NAME = 'users' THEN
            v_old_data := v_old_data - 'password_hash';
            v_user_id := NULL;
        ELSIF TG_TABLE_NAME = 'boarding_houses' THEN
            v_user_id := OLD.owner_id;
        ELSIF TG_TABLE_NAME = 'owner_verifications' THEN
            v_user_id := OLD.owner_id;
        END IF;
    END IF;

    INSERT INTO "dapitan_schema".audit_logs (
        table_name,
        operation,
        record_id,
        user_id,
        old_data,
        new_data,
        description
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        v_record_id,
        v_user_id,
        v_old_data,
        v_new_data,
        TG_OP || ' on ' || TG_TABLE_NAME || ' (ID: ' || v_record_id || ')'
    );

    RETURN NULL;
END;
$$;

-- Triggers for updated_at timestamps
DROP TRIGGER IF EXISTS trg_update_users_timestamp ON "dapitan_schema".users;
CREATE TRIGGER trg_update_users_timestamp
    BEFORE UPDATE ON "dapitan_schema".users
    FOR EACH ROW EXECUTE FUNCTION "dapitan_schema".fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_update_bh_timestamp ON "dapitan_schema".boarding_houses;
CREATE TRIGGER trg_update_bh_timestamp
    BEFORE UPDATE ON "dapitan_schema".boarding_houses
    FOR EACH ROW EXECUTE FUNCTION "dapitan_schema".fn_set_updated_at();

-- Trigger for syncing room availability with boarding house status
DROP TRIGGER IF EXISTS trg_sync_bh_availability ON "dapitan_schema".rooms;
CREATE TRIGGER trg_sync_bh_availability
    AFTER INSERT OR UPDATE OF available_slots, total_slots OR DELETE ON "dapitan_schema".rooms
    FOR EACH ROW EXECUTE FUNCTION "dapitan_schema".fn_sync_boarding_house_availability();

-- Triggers for Row-Level Audit Logging
DROP TRIGGER IF EXISTS trg_audit_users ON "dapitan_schema".users;
CREATE TRIGGER trg_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON "dapitan_schema".users
    FOR EACH ROW EXECUTE FUNCTION "dapitan_schema".fn_audit_log_trigger();

DROP TRIGGER IF EXISTS trg_audit_boarding_houses ON "dapitan_schema".boarding_houses;
CREATE TRIGGER trg_audit_boarding_houses
    AFTER INSERT OR UPDATE OR DELETE ON "dapitan_schema".boarding_houses
    FOR EACH ROW EXECUTE FUNCTION "dapitan_schema".fn_audit_log_trigger();

DROP TRIGGER IF EXISTS trg_audit_owner_verifications ON "dapitan_schema".owner_verifications;
CREATE TRIGGER trg_audit_owner_verifications
    AFTER INSERT OR UPDATE OR DELETE ON "dapitan_schema".owner_verifications
    FOR EACH ROW EXECUTE FUNCTION "dapitan_schema".fn_audit_log_trigger();

-- =====================================================================
-- 3. STORED PROCEDURES
-- =====================================================================

-- Stored Procedure 1: Approve owner verification & promote role
CREATE OR REPLACE PROCEDURE "dapitan_schema".sp_approve_owner_verification(
    p_verification_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
LANGUAGE plpgsql AS $$
DECLARE
    v_owner_id UUID;
BEGIN
    SELECT owner_id INTO v_owner_id
    FROM "dapitan_schema".owner_verifications
    WHERE id = p_verification_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Verification application with ID % not found', p_verification_id;
    END IF;

    -- Update verification record
    UPDATE "dapitan_schema".owner_verifications
    SET status = 'approved',
        reviewed_by = p_admin_id,
        reviewed_at = CURRENT_TIMESTAMP,
        notes = COALESCE(p_notes, notes)
    WHERE id = p_verification_id;

    -- Promote user role to owner
    UPDATE "dapitan_schema".users
    SET role = 'owner',
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_owner_id;

    -- Record in audit logs
    INSERT INTO "dapitan_schema".audit_logs (
        table_name, operation, record_id, user_id, description
    ) VALUES (
        'owner_verifications',
        'PROCEDURE_EXEC',
        p_verification_id::TEXT,
        p_admin_id,
        'Executed sp_approve_owner_verification: Verified owner ' || v_owner_id::TEXT
    );
END;
$$;

-- Stored Procedure 2: Archive listing by admin
CREATE OR REPLACE PROCEDURE "dapitan_schema".sp_archive_listing(
    p_boarding_house_id UUID,
    p_admin_id UUID,
    p_reason TEXT DEFAULT 'Archived by administrator'
)
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE "dapitan_schema".boarding_houses
    SET status = 'archived',
        is_available = FALSE,
        admin_review_notes = p_reason,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_boarding_house_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Boarding house with ID % not found', p_boarding_house_id;
    END IF;

    INSERT INTO "dapitan_schema".audit_logs (
        table_name, operation, record_id, user_id, description
    ) VALUES (
        'boarding_houses',
        'PROCEDURE_EXEC',
        p_boarding_house_id::TEXT,
        p_admin_id,
        'Executed sp_archive_listing: Reason: ' || COALESCE(p_reason, 'None')
    );
END;
$$;

-- Stored Procedure 3: Update room availability slots with validation
CREATE OR REPLACE PROCEDURE "dapitan_schema".sp_update_room_slots(
    p_room_id UUID,
    p_new_available_slots INT,
    p_user_id UUID
)
LANGUAGE plpgsql AS $$
DECLARE
    v_total_slots INT;
BEGIN
    SELECT total_slots INTO v_total_slots
    FROM "dapitan_schema".rooms
    WHERE id = p_room_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Room with ID % not found', p_room_id;
    END IF;

    IF p_new_available_slots < 0 OR p_new_available_slots > v_total_slots THEN
        RAISE EXCEPTION 'Available slots must be between 0 and total capacity (%)', v_total_slots;
    END IF;

    UPDATE "dapitan_schema".rooms
    SET available_slots = p_new_available_slots
    WHERE id = p_room_id;

    INSERT INTO "dapitan_schema".audit_logs (
        table_name, operation, record_id, user_id, description
    ) VALUES (
        'rooms',
        'PROCEDURE_EXEC',
        p_room_id::TEXT,
        p_user_id,
        'Executed sp_update_room_slots: Room ' || p_room_id::TEXT || ' slots updated to ' || p_new_available_slots::TEXT
    );
END;
$$;

-- =====================================================================
-- 4. DATABASE VIEWS
-- =====================================================================

-- View 1: Active published listings with aggregated stats & cover photo
CREATE OR REPLACE VIEW "dapitan_schema".vw_active_listings AS
SELECT 
    bh.id,
    bh.owner_id,
    bh.title,
    bh.description,
    bh.barangay,
    bh.street_address,
    bh.latitude,
    bh.longitude,
    bh.house_rules,
    bh.contact_phone,
    bh.status,
    bh.is_available,
    bh.created_at,
    bh.updated_at,
    u.full_name AS owner_name,
    u.email AS owner_email,
    u.phone_number AS owner_phone,
    (
        SELECT lp.photo_url 
        FROM "dapitan_schema".listing_photos lp 
        WHERE lp.boarding_house_id = bh.id 
        ORDER BY lp.is_cover_photo DESC, lp.uploaded_at ASC 
        LIMIT 1
    ) AS cover_photo,
    COALESCE(pr.min_rate, 0.00) AS min_rate,
    COALESCE(pr.max_rate, 0.00) AS max_rate,
    COALESCE(pr.avg_rate, 0.00) AS avg_rate,
    COALESCE(pr.room_count, 0) AS total_rooms,
    COALESCE(occ.total_capacity, 0) AS total_capacity,
    COALESCE(occ.total_available, 0) AS total_available_slots,
    COALESCE(occ.occupancy_rate, 0.00) AS occupancy_rate,
    "dapitan_schema".fn_get_boarding_house_amenities(bh.id) AS amenities
FROM "dapitan_schema".boarding_houses bh
JOIN "dapitan_schema".users u ON bh.owner_id = u.id
LEFT JOIN LATERAL "dapitan_schema".fn_get_price_range(bh.id) pr ON TRUE
LEFT JOIN LATERAL "dapitan_schema".fn_calculate_room_occupancy(bh.id) occ ON TRUE
WHERE bh.status = 'published';

-- View 2: Owner verification queue with user details
CREATE OR REPLACE VIEW "dapitan_schema".vw_owner_verification_queue AS
SELECT 
    v.id AS verification_id,
    v.owner_id,
    u.full_name AS applicant_name,
    u.email AS applicant_email,
    u.phone_number AS applicant_phone,
    u.role AS current_role,
    u.is_active AS user_active,
    v.valid_id_url,
    v.business_permit_or_proof_url,
    v.notes AS applicant_notes,
    v.status AS verification_status,
    v.rejection_reason,
    v.reviewed_by AS reviewer_admin_id,
    admin_u.full_name AS reviewer_name,
    v.reviewed_at,
    v.submitted_at
FROM "dapitan_schema".owner_verifications v
JOIN "dapitan_schema".users u ON v.owner_id = u.id
LEFT JOIN "dapitan_schema".users admin_u ON v.reviewed_by = admin_u.id;

-- View 3: Listing reports detailed
CREATE OR REPLACE VIEW "dapitan_schema".vw_listing_reports_detailed AS
SELECT 
    lr.id AS report_id,
    lr.boarding_house_id,
    bh.title AS boarding_house_title,
    bh.barangay AS boarding_house_barangay,
    owner_u.id AS owner_id,
    owner_u.full_name AS owner_name,
    owner_u.email AS owner_email,
    lr.reporter_id,
    COALESCE(rep_u.full_name, 'Anonymous Seeker') AS reporter_name,
    rep_u.email AS reporter_email,
    lr.reason,
    lr.status AS report_status,
    lr.admin_remarks,
    lr.reported_at
FROM "dapitan_schema".listing_reports lr
JOIN "dapitan_schema".boarding_houses bh ON lr.boarding_house_id = bh.id
JOIN "dapitan_schema".users owner_u ON bh.owner_id = owner_u.id
LEFT JOIN "dapitan_schema".users rep_u ON lr.reporter_id = rep_u.id;

-- View 4: System dashboard statistics
CREATE OR REPLACE VIEW "dapitan_schema".vw_system_dashboard_stats AS
SELECT 
    (SELECT COUNT(*) FROM "dapitan_schema".users WHERE role = 'user') AS users_count,
    (SELECT COUNT(*) FROM "dapitan_schema".users WHERE role = 'owner') AS owners_count,
    (SELECT COUNT(*) FROM "dapitan_schema".users WHERE role = 'admin') AS admins_count,
    (SELECT COUNT(*) FROM "dapitan_schema".boarding_houses) AS total_listings_count,
    (SELECT COUNT(*) FROM "dapitan_schema".boarding_houses WHERE status = 'published') AS published_listings_count,
    (SELECT COUNT(*) FROM "dapitan_schema".boarding_houses WHERE status = 'pending_approval') AS pending_listings_count,
    (SELECT COUNT(*) FROM "dapitan_schema".boarding_houses WHERE status = 'rejected') AS rejected_listings_count,
    (SELECT COUNT(*) FROM "dapitan_schema".boarding_houses WHERE status = 'archived') AS archived_listings_count,
    (SELECT COUNT(*) FROM "dapitan_schema".rooms) AS total_rooms_count,
    (SELECT COALESCE(SUM(available_slots), 0) FROM "dapitan_schema".rooms) AS total_available_slots_count,
    (SELECT COUNT(*) FROM "dapitan_schema".owner_verifications WHERE status = 'pending') AS pending_verifications_count,
    (SELECT COUNT(*) FROM "dapitan_schema".listing_reports WHERE status = 'pending') AS pending_reports_count,
    (SELECT COUNT(*) FROM "dapitan_schema".audit_logs) AS total_audit_logs_count;

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

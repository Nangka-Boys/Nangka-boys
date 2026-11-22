const db = require('../config/db');

const migrateAndSeed = async () => {
  const schemaName = db.schema || 'dapitan_schema';
  console.log(`🔄 Initializing custom schema "${schemaName}" in PostgreSQL 18...`);

  const schemaSQL = `
    -- Create custom schema if not exists
    CREATE SCHEMA IF NOT EXISTS "${schemaName}";

    -- Set search path to custom schema
    SET search_path TO "${schemaName}", public;

    -- Enable UUID extension (in public or current schema)
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;

    -- Custom Enums inside custom schema
    DO $$ BEGIN
      CREATE TYPE "${schemaName}".user_role AS ENUM ('user', 'owner', 'admin');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "${schemaName}".verification_status AS ENUM ('pending', 'approved', 'rejected');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "${schemaName}".listing_status AS ENUM ('pending_approval', 'published', 'rejected', 'archived');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    DO $$ BEGIN
      CREATE TYPE "${schemaName}".room_type AS ENUM ('single', 'double', 'bedspace', 'apartment', 'studio');
    EXCEPTION WHEN duplicate_object THEN null;
    END $$;

    -- 1. Users Table
    CREATE TABLE IF NOT EXISTS "${schemaName}".users (
      id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      phone_number VARCHAR(25),
      role "${schemaName}".user_role DEFAULT 'user',
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Owner Verification Requests
    CREATE TABLE IF NOT EXISTS "${schemaName}".owner_verifications (
      id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
      owner_id UUID NOT NULL REFERENCES "${schemaName}".users(id) ON DELETE CASCADE,
      valid_id_url TEXT NOT NULL,
      business_permit_or_proof_url TEXT,
      notes TEXT,
      status "${schemaName}".verification_status DEFAULT 'pending',
      rejection_reason TEXT,
      reviewed_by UUID REFERENCES "${schemaName}".users(id),
      reviewed_at TIMESTAMPTZ,
      submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Boarding Houses Table
    CREATE TABLE IF NOT EXISTS "${schemaName}".boarding_houses (
      id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
      owner_id UUID NOT NULL REFERENCES "${schemaName}".users(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      barangay VARCHAR(100) NOT NULL,
      street_address TEXT NOT NULL,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      house_rules TEXT,
      contact_phone VARCHAR(25) NOT NULL,
      status "${schemaName}".listing_status DEFAULT 'pending_approval',
      admin_review_notes TEXT,
      is_available BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. Rooms in Boarding House
    CREATE TABLE IF NOT EXISTS "${schemaName}".rooms (
      id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
      boarding_house_id UUID NOT NULL REFERENCES "${schemaName}".boarding_houses(id) ON DELETE CASCADE,
      room_name_or_number VARCHAR(50) NOT NULL,
      room_type "${schemaName}".room_type DEFAULT 'single',
      monthly_rate DECIMAL(10, 2) NOT NULL,
      deposit_required DECIMAL(10, 2) DEFAULT 0.00,
      total_slots INT DEFAULT 1,
      available_slots INT DEFAULT 1,
      is_airconditioned BOOLEAN DEFAULT FALSE,
      is_furnished BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. Master Amenities List
    CREATE TABLE IF NOT EXISTS "${schemaName}".amenities (
      id SERIAL PRIMARY KEY,
      name VARCHAR(80) UNIQUE NOT NULL,
      icon_name VARCHAR(50)
    );

    -- 6. Boarding House - Amenity Junction
    CREATE TABLE IF NOT EXISTS "${schemaName}".boarding_house_amenities (
      boarding_house_id UUID REFERENCES "${schemaName}".boarding_houses(id) ON DELETE CASCADE,
      amenity_id INT REFERENCES "${schemaName}".amenities(id) ON DELETE CASCADE,
      PRIMARY KEY (boarding_house_id, amenity_id)
    );

    -- 7. Media / Photos
    CREATE TABLE IF NOT EXISTS "${schemaName}".listing_photos (
      id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
      boarding_house_id UUID REFERENCES "${schemaName}".boarding_houses(id) ON DELETE CASCADE,
      photo_url TEXT NOT NULL,
      is_cover_photo BOOLEAN DEFAULT FALSE,
      uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 8. User Favorites
    CREATE TABLE IF NOT EXISTS "${schemaName}".favorites (
      user_id UUID REFERENCES "${schemaName}".users(id) ON DELETE CASCADE,
      boarding_house_id UUID REFERENCES "${schemaName}".boarding_houses(id) ON DELETE CASCADE,
      saved_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, boarding_house_id)
    );

    -- 9. Listing Reports
    CREATE TABLE IF NOT EXISTS "${schemaName}".listing_reports (
      id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
      reporter_id UUID REFERENCES "${schemaName}".users(id) ON DELETE SET NULL,
      boarding_house_id UUID REFERENCES "${schemaName}".boarding_houses(id) ON DELETE CASCADE,
      reason TEXT NOT NULL,
      status VARCHAR(30) DEFAULT 'pending',
      admin_remarks TEXT,
      reported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 10. Audit Logs Table (Audit Trail & Logging)
    CREATE TABLE IF NOT EXISTS "${schemaName}".audit_logs (
      id UUID PRIMARY KEY DEFAULT public.uuid_generate_v4(),
      table_name VARCHAR(100) NOT NULL,
      operation VARCHAR(30) NOT NULL,
      record_id VARCHAR(100),
      user_id UUID,
      old_data JSONB,
      new_data JSONB,
      description TEXT,
      ip_address VARCHAR(50),
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- Ensure foreign key constraint is removed from audit_logs so history survives user deletion
    ALTER TABLE "${schemaName}".audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey CASCADE;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_users_email ON "${schemaName}".users(email);
    CREATE INDEX IF NOT EXISTS idx_users_role ON "${schemaName}".users(role);
    CREATE INDEX IF NOT EXISTS idx_verifications_owner ON "${schemaName}".owner_verifications(owner_id);
    CREATE INDEX IF NOT EXISTS idx_verifications_status ON "${schemaName}".owner_verifications(status);
    CREATE INDEX IF NOT EXISTS idx_bh_barangay ON "${schemaName}".boarding_houses(barangay);
    CREATE INDEX IF NOT EXISTS idx_bh_status ON "${schemaName}".boarding_houses(status);
    CREATE INDEX IF NOT EXISTS idx_bh_owner ON "${schemaName}".boarding_houses(owner_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_bh ON "${schemaName}".rooms(boarding_house_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_rate ON "${schemaName}".rooms(monthly_rate);
    CREATE INDEX IF NOT EXISTS idx_rooms_type ON "${schemaName}".rooms(room_type);
    CREATE INDEX IF NOT EXISTS idx_photos_bh ON "${schemaName}".listing_photos(boarding_house_id);
    CREATE INDEX IF NOT EXISTS idx_favorites_user ON "${schemaName}".favorites(user_id);
    CREATE INDEX IF NOT EXISTS idx_reports_bh ON "${schemaName}".listing_reports(boarding_house_id);
    CREATE INDEX IF NOT EXISTS idx_audit_table ON "${schemaName}".audit_logs(table_name);
    CREATE INDEX IF NOT EXISTS idx_audit_operation ON "${schemaName}".audit_logs(operation);
    CREATE INDEX IF NOT EXISTS idx_audit_created ON "${schemaName}".audit_logs(created_at DESC);

    -- =====================================================================
    -- 1. USER-DEFINED FUNCTIONS (UDFs)
    -- =====================================================================
    CREATE OR REPLACE FUNCTION "${schemaName}".fn_calculate_room_occupancy(p_boarding_house_id UUID)
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
        FROM "${schemaName}".rooms
        WHERE boarding_house_id = p_boarding_house_id;
    END;
    $$;

    CREATE OR REPLACE FUNCTION "${schemaName}".fn_get_price_range(p_boarding_house_id UUID)
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
        FROM "${schemaName}".rooms
        WHERE boarding_house_id = p_boarding_house_id;
    END;
    $$;

    CREATE OR REPLACE FUNCTION "${schemaName}".fn_is_owner_verified(p_owner_id UUID)
    RETURNS BOOLEAN LANGUAGE plpgsql AS $$
    DECLARE
        v_is_verified BOOLEAN;
    BEGIN
        SELECT EXISTS (
            SELECT 1 FROM "${schemaName}".owner_verifications
            WHERE owner_id = p_owner_id AND status = 'approved'
        ) INTO v_is_verified;
        RETURN v_is_verified;
    END;
    $$;

    CREATE OR REPLACE FUNCTION "${schemaName}".fn_get_boarding_house_amenities(p_boarding_house_id UUID)
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
        FROM "${schemaName}".boarding_house_amenities bha
        JOIN "${schemaName}".amenities a ON bha.amenity_id = a.id
        WHERE bha.boarding_house_id = p_boarding_house_id;
        
        RETURN v_amenities;
    END;
    $$;

    -- =====================================================================
    -- 2. TRIGGER FUNCTIONS & TRIGGERS
    -- =====================================================================
    CREATE OR REPLACE FUNCTION "${schemaName}".fn_set_updated_at()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$;

    CREATE OR REPLACE FUNCTION "${schemaName}".fn_sync_boarding_house_availability()
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
        FROM "${schemaName}".rooms
        WHERE boarding_house_id = v_target_bh_id;

        UPDATE "${schemaName}".boarding_houses
        SET is_available = (v_total_available > 0),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_target_bh_id;

        RETURN NULL;
    END;
    $$;

    CREATE OR REPLACE FUNCTION "${schemaName}".fn_audit_log_trigger()
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

        INSERT INTO "${schemaName}".audit_logs (
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

    DROP TRIGGER IF EXISTS trg_update_users_timestamp ON "${schemaName}".users;
    CREATE TRIGGER trg_update_users_timestamp
        BEFORE UPDATE ON "${schemaName}".users
        FOR EACH ROW EXECUTE FUNCTION "${schemaName}".fn_set_updated_at();

    DROP TRIGGER IF EXISTS trg_update_bh_timestamp ON "${schemaName}".boarding_houses;
    CREATE TRIGGER trg_update_bh_timestamp
        BEFORE UPDATE ON "${schemaName}".boarding_houses
        FOR EACH ROW EXECUTE FUNCTION "${schemaName}".fn_set_updated_at();

    DROP TRIGGER IF EXISTS trg_sync_bh_availability ON "${schemaName}".rooms;
    CREATE TRIGGER trg_sync_bh_availability
        AFTER INSERT OR UPDATE OF available_slots, total_slots OR DELETE ON "${schemaName}".rooms
        FOR EACH ROW EXECUTE FUNCTION "${schemaName}".fn_sync_boarding_house_availability();

    DROP TRIGGER IF EXISTS trg_audit_users ON "${schemaName}".users;
    CREATE TRIGGER trg_audit_users
        AFTER INSERT OR UPDATE OR DELETE ON "${schemaName}".users
        FOR EACH ROW EXECUTE FUNCTION "${schemaName}".fn_audit_log_trigger();

    DROP TRIGGER IF EXISTS trg_audit_boarding_houses ON "${schemaName}".boarding_houses;
    CREATE TRIGGER trg_audit_boarding_houses
        AFTER INSERT OR UPDATE OR DELETE ON "${schemaName}".boarding_houses
        FOR EACH ROW EXECUTE FUNCTION "${schemaName}".fn_audit_log_trigger();

    DROP TRIGGER IF EXISTS trg_audit_owner_verifications ON "${schemaName}".owner_verifications;
    CREATE TRIGGER trg_audit_owner_verifications
        AFTER INSERT OR UPDATE OR DELETE ON "${schemaName}".owner_verifications
        FOR EACH ROW EXECUTE FUNCTION "${schemaName}".fn_audit_log_trigger();

    -- =====================================================================
    -- 3. STORED PROCEDURES
    -- =====================================================================
    CREATE OR REPLACE PROCEDURE "${schemaName}".sp_approve_owner_verification(
        p_verification_id UUID,
        p_admin_id UUID,
        p_notes TEXT DEFAULT NULL
    )
    LANGUAGE plpgsql AS $$
    DECLARE
        v_owner_id UUID;
    BEGIN
        SELECT owner_id INTO v_owner_id
        FROM "${schemaName}".owner_verifications
        WHERE id = p_verification_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Verification application with ID % not found', p_verification_id;
        END IF;

        UPDATE "${schemaName}".owner_verifications
        SET status = 'approved',
            reviewed_by = p_admin_id,
            reviewed_at = CURRENT_TIMESTAMP,
            notes = COALESCE(p_notes, notes)
        WHERE id = p_verification_id;

        UPDATE "${schemaName}".users
        SET role = 'owner',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_owner_id;

        INSERT INTO "${schemaName}".audit_logs (
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

    CREATE OR REPLACE PROCEDURE "${schemaName}".sp_archive_listing(
        p_boarding_house_id UUID,
        p_admin_id UUID,
        p_reason TEXT DEFAULT 'Archived by administrator'
    )
    LANGUAGE plpgsql AS $$
    BEGIN
        UPDATE "${schemaName}".boarding_houses
        SET status = 'archived',
            is_available = FALSE,
            admin_review_notes = p_reason,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_boarding_house_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Boarding house with ID % not found', p_boarding_house_id;
        END IF;

        INSERT INTO "${schemaName}".audit_logs (
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

    CREATE OR REPLACE PROCEDURE "${schemaName}".sp_update_room_slots(
        p_room_id UUID,
        p_new_available_slots INT,
        p_user_id UUID
    )
    LANGUAGE plpgsql AS $$
    DECLARE
        v_total_slots INT;
    BEGIN
        SELECT total_slots INTO v_total_slots
        FROM "${schemaName}".rooms
        WHERE id = p_room_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Room with ID % not found', p_room_id;
        END IF;

        IF p_new_available_slots < 0 OR p_new_available_slots > v_total_slots THEN
            RAISE EXCEPTION 'Available slots must be between 0 and total capacity (%)', v_total_slots;
        END IF;

        UPDATE "${schemaName}".rooms
        SET available_slots = p_new_available_slots
        WHERE id = p_room_id;

        INSERT INTO "${schemaName}".audit_logs (
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
    CREATE OR REPLACE VIEW "${schemaName}".vw_active_listings AS
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
            FROM "${schemaName}".listing_photos lp 
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
        "${schemaName}".fn_get_boarding_house_amenities(bh.id) AS amenities
    FROM "${schemaName}".boarding_houses bh
    JOIN "${schemaName}".users u ON bh.owner_id = u.id
    LEFT JOIN LATERAL "${schemaName}".fn_get_price_range(bh.id) pr ON TRUE
    LEFT JOIN LATERAL "${schemaName}".fn_calculate_room_occupancy(bh.id) occ ON TRUE
    WHERE bh.status = 'published';

    CREATE OR REPLACE VIEW "${schemaName}".vw_owner_verification_queue AS
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
    FROM "${schemaName}".owner_verifications v
    JOIN "${schemaName}".users u ON v.owner_id = u.id
    LEFT JOIN "${schemaName}".users admin_u ON v.reviewed_by = admin_u.id;

    CREATE OR REPLACE VIEW "${schemaName}".vw_listing_reports_detailed AS
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
    FROM "${schemaName}".listing_reports lr
    JOIN "${schemaName}".boarding_houses bh ON lr.boarding_house_id = bh.id
    JOIN "${schemaName}".users owner_u ON bh.owner_id = owner_u.id
    LEFT JOIN "${schemaName}".users rep_u ON lr.reporter_id = rep_u.id;

    CREATE OR REPLACE VIEW "${schemaName}".vw_system_dashboard_stats AS
    SELECT 
        (SELECT COUNT(*) FROM "${schemaName}".users WHERE role = 'user') AS users_count,
        (SELECT COUNT(*) FROM "${schemaName}".users WHERE role = 'owner') AS owners_count,
        (SELECT COUNT(*) FROM "${schemaName}".users WHERE role = 'admin') AS admins_count,
        (SELECT COUNT(*) FROM "${schemaName}".boarding_houses) AS total_listings_count,
        (SELECT COUNT(*) FROM "${schemaName}".boarding_houses WHERE status = 'published') AS published_listings_count,
        (SELECT COUNT(*) FROM "${schemaName}".boarding_houses WHERE status = 'pending_approval') AS pending_listings_count,
        (SELECT COUNT(*) FROM "${schemaName}".boarding_houses WHERE status = 'rejected') AS rejected_listings_count,
        (SELECT COUNT(*) FROM "${schemaName}".boarding_houses WHERE status = 'archived') AS archived_listings_count,
        (SELECT COUNT(*) FROM "${schemaName}".rooms) AS total_rooms_count,
        (SELECT COALESCE(SUM(available_slots), 0) FROM "${schemaName}".rooms) AS total_available_slots_count,
        (SELECT COUNT(*) FROM "${schemaName}".owner_verifications WHERE status = 'pending') AS pending_verifications_count,
        (SELECT COUNT(*) FROM "${schemaName}".listing_reports WHERE status = 'pending') AS pending_reports_count,
        (SELECT COUNT(*) FROM "${schemaName}".audit_logs) AS total_audit_logs_count;
  `;

  try {
    await db.query(schemaSQL);
    console.log(`✅ Schema "${schemaName}", custom types, and tables successfully created.`);

    // Seed default amenities if empty
    const amenitiesCount = await db.query(`SELECT COUNT(*) FROM "${schemaName}".amenities`);
    if (parseInt(amenitiesCount.rows[0].count, 10) === 0) {
      const amenities = [
        ['Free Wi-Fi', 'wifi'],
        ['Drinking Water Provided', 'water_drop'],
        ['Air Conditioning', 'ac_unit'],
        ['Own Toilet & Bath', 'bathroom'],
        ['Common Kitchen / Cooking Allowed', 'restaurant'],
        ['Laundry / Washing Area', 'local_laundry_service'],
        ['Gated & CCTV Secured', 'security'],
        ['Study Table / Area', 'menu_book'],
        ['Motorcycle Parking', 'two_wheeler'],
        ['No Curfew', 'lock_open'],
      ];

      for (const [name, icon] of amenities) {
        await db.query(`INSERT INTO "${schemaName}".amenities (name, icon_name) VALUES ($1, $2)`, [name, icon]);
      }
      console.log(`🌱 Seeded default boarding house amenities inside schema "${schemaName}".`);
    }

  } catch (err) {
    console.error('❌ Migration failed:', err);
    throw err;
  }
};

module.exports = { migrateAndSeed };

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

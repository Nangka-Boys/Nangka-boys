const db = require('../config/db');
const fs = require('fs');
const path = require('path');

// Helper to check if an owner is approved
const checkOwnerApproval = async (ownerId) => {
  const check = await db.query(
    `SELECT status FROM owner_verifications WHERE owner_id = $1 AND status = 'approved'`,
    [ownerId]
  );
  return check.rows.length > 0;
};

// Room capacity = how many people the room can fit (Dapitan boarding houses cap at 6)
const MAX_ROOM_CAPACITY = 6;

const normalizeCapacity = (value) =>
  Math.min(MAX_ROOM_CAPACITY, Math.max(1, parseInt(value, 10) || 1));

const normalizeAvailableSlots = (value, capacity) => {
  if (value === undefined || value === null || value === '') return capacity;
  return Math.min(capacity, Math.max(0, parseInt(value, 10) || 0));
};

// Legacy room_type kept in sync for existing filters
const roomTypeForCapacity = (capacity) => {
  if (capacity <= 1) return 'single';
  if (capacity === 2) return 'double';
  return 'bedspace';
};

// GET /api/listings (Public search & filter)
const getListings = async (req, res) => {
  try {
    const {
      search,
      barangay,
      min_price,
      max_price,
      room_type,
      amenities, // comma-separated ids e.g. "1,2,3"
      is_available,
    } = req.query;

    let whereClauses = [`bh.status = 'published'`];
    let params = [];
    let paramIndex = 1;

    // Search query (title or description or address)
    if (search) {
      whereClauses.push(`(bh.title ILIKE $${paramIndex} OR bh.description ILIKE $${paramIndex} OR bh.street_address ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Barangay filter
    if (barangay) {
      whereClauses.push(`bh.barangay ILIKE $${paramIndex}`);
      params.push(barangay);
      paramIndex++;
    }

    // Availability filter
    if (is_available !== undefined) {
      whereClauses.push(`bh.is_available = $${paramIndex}`);
      params.push(is_available === 'true');
      paramIndex++;
    }

    // Room type or Price range subqueries
    let roomFilter = [];
    if (room_type) {
      roomFilter.push(`r.room_type = $${paramIndex}`);
      params.push(room_type);
      paramIndex++;
    }
    if (min_price) {
      roomFilter.push(`r.monthly_rate >= $${paramIndex}`);
      params.push(parseFloat(min_price));
      paramIndex++;
    }
    if (max_price) {
      roomFilter.push(`r.monthly_rate <= $${paramIndex}`);
      params.push(parseFloat(max_price));
      paramIndex++;
    }

    if (roomFilter.length > 0) {
      whereClauses.push(`EXISTS (
        SELECT 1 FROM rooms r 
        WHERE r.boarding_house_id = bh.id AND ${roomFilter.join(' AND ')}
      )`);
    }

    // Amenities filter
    if (amenities) {
      const amenityIds = amenities.split(',').map((id) => parseInt(id.trim(), 10)).filter(Boolean);
      if (amenityIds.length > 0) {
        whereClauses.push(`(
          SELECT COUNT(DISTINCT amenity_id)
          FROM boarding_house_amenities bha
          WHERE bha.boarding_house_id = bh.id AND bha.amenity_id = ANY($${paramIndex}::int[])
        ) = ${amenityIds.length}`);
        params.push(amenityIds);
        paramIndex++;
      }
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const query = `
      SELECT 
        bh.*,
        u.full_name AS owner_name,
        u.email AS owner_email,
        (SELECT photo_url FROM listing_photos lp WHERE lp.boarding_house_id = bh.id ORDER BY lp.is_cover_photo DESC, lp.uploaded_at ASC LIMIT 1) AS cover_photo,
        (SELECT MIN(monthly_rate) FROM rooms r WHERE r.boarding_house_id = bh.id) AS min_rate,
        (SELECT MAX(monthly_rate) FROM rooms r WHERE r.boarding_house_id = bh.id) AS max_rate,
        (SELECT COUNT(*) FROM rooms r WHERE r.boarding_house_id = bh.id) AS total_rooms
      FROM boarding_houses bh
      JOIN users u ON bh.owner_id = u.id
      ${whereString}
      ORDER BY bh.created_at DESC;
    `;

    const result = await db.query(query, params);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Fetch listings error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving listings.' });
  }
};

// GET /api/listings/:id (Single detailed listing with rooms & amenities)
const getListingById = async (req, res) => {
  try {
    const { id } = req.params;

    const bhRes = await db.query(`
      SELECT 
        bh.*,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.phone_number AS owner_direct_phone,
        (SELECT photo_url FROM listing_photos lp WHERE lp.boarding_house_id = bh.id ORDER BY lp.is_cover_photo DESC, lp.uploaded_at ASC LIMIT 1) AS cover_photo
      FROM boarding_houses bh
      JOIN users u ON bh.owner_id = u.id
      WHERE bh.id = $1;
    `, [id]);

    if (bhRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Boarding house listing not found.' });
    }

    const listing = bhRes.rows[0];

    // Fetch rooms
    const roomsRes = await db.query(
      `SELECT * FROM rooms WHERE boarding_house_id = $1 ORDER BY monthly_rate ASC`,
      [id]
    );

    // Fetch amenities
    const amenitiesRes = await db.query(`
      SELECT a.* FROM amenities a
      JOIN boarding_house_amenities bha ON bha.amenity_id = a.id
      WHERE bha.boarding_house_id = $1
    `, [id]);

    // Fetch photos
    const photosRes = await db.query(
      `SELECT * FROM listing_photos WHERE boarding_house_id = $1 ORDER BY is_cover_photo DESC, uploaded_at ASC`,
      [id]
    );

    return res.json({
      success: true,
      data: {
        ...listing,
        rooms: roomsRes.rows,
        amenities: amenitiesRes.rows,
        photos: photosRes.rows,
      },
    });
  } catch (error) {
    console.error('Get listing details error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving listing details.' });
  }
};

// POST /api/owner/listings (Create listing - strictly verified owners only)
const createListing = async (req, res) => {
  try {
    const ownerId = req.user.id;

    // Check if owner verification is approved (admins bypass this)
    if (req.user.role !== 'admin') {
      const isApproved = await checkOwnerApproval(ownerId);
      if (!isApproved) {
        return res.status(403).json({
          success: false,
          message: 'Action blocked: Your owner verification is not yet approved by an administrator.',
        });
      }
    }

    const {
      title,
      description,
      barangay,
      street_address,
      latitude,
      longitude,
      house_rules,
      contact_phone,
      amenities, // array of amenity IDs
      rooms, // array of room objects [{ room_name_or_number, room_type, monthly_rate, deposit_required, total_slots, available_slots, is_airconditioned, is_furnished }]
    } = req.body;

    if (!title || !barangay || !street_address || !contact_phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required listing information (title, barangay, street address, and contact phone).',
      });
    }

    // Insert boarding house directly as published since owner is already verified & approved
    const insertBH = await db.query(`
      INSERT INTO boarding_houses (
        owner_id, title, description, barangay, street_address,
        latitude, longitude, house_rules, contact_phone, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'published')
      RETURNING *;
    `, [

      ownerId,
      title,
      description || null,
      barangay,
      street_address,
      latitude || null,
      longitude || null,
      house_rules || null,
      contact_phone,
    ]);

    const newBH = insertBH.rows[0];

    // Link amenities
    if (Array.isArray(amenities) && amenities.length > 0) {
      for (const amenityId of amenities) {
        await db.query(
          `INSERT INTO boarding_house_amenities (boarding_house_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [newBH.id, amenityId]
        );
      }
    }

    // Insert rooms if provided
    if (Array.isArray(rooms) && rooms.length > 0) {
      for (const r of rooms) {
        const capacity = normalizeCapacity(r.total_slots);
        const availableSlots = normalizeAvailableSlots(r.available_slots, capacity);
        await db.query(`
          INSERT INTO rooms (
            boarding_house_id, room_name_or_number, room_type, monthly_rate,
            deposit_required, total_slots, available_slots, is_airconditioned, is_furnished
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `, [
          newBH.id,
          r.room_name_or_number || 'Room 1',
          roomTypeForCapacity(capacity),
          r.monthly_rate || 0,
          r.deposit_required || 0,
          capacity,
          availableSlots,
          r.is_airconditioned || false,
          r.is_furnished || false,
        ]);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Boarding house listing published live successfully!',
      data: newBH,
    });

  } catch (error) {
    console.error('Create listing error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating listing.' });
  }
};

// POST /api/owner/listings/:id/photos (Upload photos)
const uploadListingPhotos = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    // Check ownership (admins can upload photos to any listing)
    const bh = req.user.role === 'admin'
      ? await db.query('SELECT * FROM boarding_houses WHERE id = $1', [id])
      : await db.query('SELECT * FROM boarding_houses WHERE id = $1 AND owner_id = $2', [id, ownerId]);
    if (bh.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Boarding house not found or unauthorized.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No photo files provided.' });
    }

    const savedPhotos = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const photoUrl = `/uploads/photos/${file.filename}`;
      const isCover = i === 0 && (await db.query('SELECT 1 FROM listing_photos WHERE boarding_house_id = $1', [id])).rows.length === 0;

      const photoRes = await db.query(
        `INSERT INTO listing_photos (boarding_house_id, photo_url, is_cover_photo) VALUES ($1, $2, $3) RETURNING *`,
        [id, photoUrl, isCover]
      );
      savedPhotos.push(photoRes.rows[0]);
    }

    return res.status(201).json({
      success: true,
      message: 'Photos uploaded successfully.',
      data: savedPhotos,
    });
  } catch (error) {
    console.error('Upload photos error:', error);
    return res.status(500).json({ success: false, message: 'Server error uploading photos.' });
  }
};

// GET /api/amenities (List all master amenities)
const getAmenities = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM amenities ORDER BY name ASC');
    return res.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Get amenities error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving amenities.' });
  }
};

// PUT /api/owner/listings/:id (Update own listing - strictly verified owners only)
const updateListing = async (req, res) => {
  let client = null;
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    // Check if owner verification is approved (admins bypass this)
    if (req.user.role !== 'admin') {
      const isApproved = await checkOwnerApproval(ownerId);
      if (!isApproved) {
        return res.status(403).json({
          success: false,
          message: 'Action blocked: Your owner verification is not yet approved by an administrator.',
        });
      }
    }

    // Ownership check
    const ownership = req.user.role === 'admin'
      ? await db.query('SELECT id FROM boarding_houses WHERE id = $1', [id])
      : await db.query('SELECT id FROM boarding_houses WHERE id = $1 AND owner_id = $2', [id, ownerId]);

    if (ownership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Boarding house not found or you do not have permission to edit it.',
      });
    }

    const {
      title,
      description,
      barangay,
      street_address,
      latitude,
      longitude,
      house_rules,
      contact_phone,
      amenities,
      rooms,
    } = req.body;

    if (!title || !barangay || !street_address || !contact_phone) {
      return res.status(400).json({
        success: false,
        message: 'Missing required listing information (title, barangay, street address, and contact phone).',
      });
    }

    client = await db.pool.connect();
    await client.query('BEGIN');

    const updated = await client.query(`
      UPDATE boarding_houses SET
        title = $1,
        description = $2,
        barangay = $3,
        street_address = $4,
        latitude = $5,
        longitude = $6,
        house_rules = $7,
        contact_phone = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *;
    `, [
      title,
      description || null,
      barangay,
      street_address,
      latitude || null,
      longitude || null,
      house_rules || null,
      contact_phone,
      id,
    ]);

    // Replace amenities when provided
    if (Array.isArray(amenities)) {
      await client.query('DELETE FROM boarding_house_amenities WHERE boarding_house_id = $1', [id]);
      for (const amenityId of amenities) {
        await client.query(
          `INSERT INTO boarding_house_amenities (boarding_house_id, amenity_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, amenityId]
        );
      }
    }

    // Replace rooms when provided
    if (Array.isArray(rooms)) {
      await client.query('DELETE FROM rooms WHERE boarding_house_id = $1', [id]);
      for (const r of rooms) {
        const capacity = normalizeCapacity(r.total_slots);
        const availableSlots = normalizeAvailableSlots(r.available_slots, capacity);
        await client.query(`
          INSERT INTO rooms (
            boarding_house_id, room_name_or_number, room_type, monthly_rate,
            deposit_required, total_slots, available_slots, is_airconditioned, is_furnished
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);
        `, [
          id,
          r.room_name_or_number || 'Room 1',
          roomTypeForCapacity(capacity),
          r.monthly_rate || 0,
          r.deposit_required || 0,
          capacity,
          availableSlots,
          r.is_airconditioned || false,
          r.is_furnished || false,
        ]);
      }
    }

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: 'Boarding house listing updated successfully!',
      data: updated.rows[0],
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) { /* ignore rollback failure */ }
    }
    console.error('Update listing error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating listing.' });
  } finally {
    if (client) client.release();
  }
};

// DELETE /api/owner/listings/:id (Remove own listing)
const deleteListing = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;

    const ownership = req.user.role === 'admin'
      ? await db.query('SELECT id FROM boarding_houses WHERE id = $1', [id])
      : await db.query('SELECT id FROM boarding_houses WHERE id = $1 AND owner_id = $2', [id, ownerId]);

    if (ownership.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Boarding house not found or you do not have permission to delete it.',
      });
    }

    const photos = await db.query('SELECT photo_url FROM listing_photos WHERE boarding_house_id = $1', [id]);

    // Cascades remove rooms, photos, amenities links, favorites, and reports
    await db.query('DELETE FROM boarding_houses WHERE id = $1', [id]);

    // Best-effort cleanup of uploaded photo files (never outside uploads/)
    const uploadsRoot = path.resolve(__dirname, '..', '..', 'uploads');
    for (const photo of photos.rows) {
      const rel = (photo.photo_url || '').replace(/^\/?uploads\//, '');
      if (!rel) continue;
      const abs = path.resolve(uploadsRoot, rel);
      if (abs.startsWith(uploadsRoot + path.sep)) {
        fs.promises.unlink(abs).catch(() => {});
      }
    }

    return res.json({ success: true, message: 'Boarding house listing deleted successfully.' });
  } catch (error) {
    console.error('Delete listing error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting listing.' });
  }
};

// GET /api/owner/my-listings (List all boarding houses created by logged-in owner)
const getMyListings = async (req, res) => {

  try {
    const ownerId = req.user.id;
    const result = await db.query(`
      SELECT 
        bh.*,
        (SELECT photo_url FROM listing_photos lp WHERE lp.boarding_house_id = bh.id ORDER BY lp.is_cover_photo DESC, lp.uploaded_at ASC LIMIT 1) AS cover_photo,
        (SELECT MIN(monthly_rate) FROM rooms r WHERE r.boarding_house_id = bh.id) AS min_rate,
        (SELECT MAX(monthly_rate) FROM rooms r WHERE r.boarding_house_id = bh.id) AS max_rate,
        (SELECT COUNT(*) FROM rooms r WHERE r.boarding_house_id = bh.id) AS total_rooms
      FROM boarding_houses bh
      WHERE bh.owner_id = $1
      ORDER BY bh.created_at DESC;
    `, [ownerId]);

    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Get my listings error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving your listings.' });
  }
};

module.exports = {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  uploadListingPhotos,
  getAmenities,
  getMyListings,
};


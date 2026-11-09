const db = require('../config/db');

// GET /api/admin/stats
const getSystemStats = async (req, res) => {
  try {
    const totalUsers = await db.query("SELECT COUNT(*) FROM users WHERE role = 'user'");
    const totalOwners = await db.query("SELECT COUNT(*) FROM users WHERE role = 'owner'");
    const pendingVerifications = await db.query("SELECT COUNT(*) FROM owner_verifications WHERE status = 'pending'");
    const totalListings = await db.query("SELECT COUNT(*) FROM boarding_houses");
    const publishedListings = await db.query("SELECT COUNT(*) FROM boarding_houses WHERE status = 'published'");
    const pendingListings = await db.query("SELECT COUNT(*) FROM boarding_houses WHERE status = 'pending_approval'");
    const pendingReports = await db.query("SELECT COUNT(*) FROM listing_reports WHERE status = 'pending'");

    return res.json({
      success: true,
      data: {
        users_count: parseInt(totalUsers.rows[0].count, 10),
        owners_count: parseInt(totalOwners.rows[0].count, 10),
        pending_verifications_count: parseInt(pendingVerifications.rows[0].count, 10),
        total_listings_count: parseInt(totalListings.rows[0].count, 10),
        published_listings_count: parseInt(publishedListings.rows[0].count, 10),
        pending_listings_count: parseInt(pendingListings.rows[0].count, 10),
        pending_reports_count: parseInt(pendingReports.rows[0].count, 10),
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving statistics.' });
  }
};

// GET /api/admin/listings (Admin can see all listings, regardless of status)
const getAllListingsForAdmin = async (req, res) => {
  try {
    const { status } = req.query; // pending_approval, published, rejected, archived
    let query = `
      SELECT 
        bh.*,
        u.full_name AS owner_name,
        u.email AS owner_email,
        u.phone_number AS owner_phone,
        (SELECT photo_url FROM listing_photos lp WHERE lp.boarding_house_id = bh.id ORDER BY lp.is_cover_photo DESC, lp.uploaded_at ASC LIMIT 1) AS cover_photo
      FROM boarding_houses bh
      JOIN users u ON bh.owner_id = u.id
    `;
    const params = [];

    if (status) {
      query += ` WHERE bh.status = $1`;
      params.push(status);
    }
    query += ` ORDER BY bh.created_at DESC;`;

    const result = await db.query(query, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Admin listings error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving admin listings.' });
  }
};

// PATCH /api/admin/listings/:id/status (Approve or Reject listing)
const updateListingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_review_notes } = req.body;

    if (!['published', 'rejected', 'archived', 'pending_approval'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid listing status.' });
    }

    const result = await db.query(`
      UPDATE boarding_houses
      SET status = $1, admin_review_notes = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *;
    `, [status, admin_review_notes || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Boarding house not found.' });
    }

    return res.json({
      success: true,
      message: `Listing status updated to ${status}.`,
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Update listing status error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating listing.' });
  }
};

// GET /api/admin/users (List all registered users for admin)
const getAllUsers = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        id, 
        full_name, 
        email, 
        phone_number, 
        role, 
        is_active, 
        created_at, 
        updated_at,
        (SELECT COUNT(*) FROM boarding_houses bh WHERE bh.owner_id = users.id) AS listings_count
      FROM users
      ORDER BY created_at DESC;
    `);

    return res.json({
      success: true,
      count: result.rows.length,
      data: result.rows,
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving users list.' });
  }
};

// PATCH /api/admin/users/:id/status (Toggle user active status)
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deactivating their own account
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own admin account.' });
    }

    const result = await db.query(`
      UPDATE users
      SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, full_name, email, role, is_active;
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updatedUser = result.rows[0];
    return res.json({
      success: true,
      message: `User ${updatedUser.full_name} is now ${updatedUser.is_active ? 'Active' : 'Suspended'}.`,
      data: updatedUser,
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating user status.' });
  }
};

// DELETE /api/admin/users/:id (Admin permanently deletes user account)
const deleteUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting their own account
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own admin account.' });
    }

    const check = await db.query('SELECT id, full_name, role FROM users WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userToDelete = check.rows[0];

    // Clear reviewed_by references in owner_verifications if any
    await db.query('UPDATE owner_verifications SET reviewed_by = NULL WHERE reviewed_by = $1', [id]);

    // Delete user from database (cascades to listings, verifications, favorites, and sets null on reports)
    await db.query('DELETE FROM users WHERE id = $1', [id]);

    return res.json({
      success: true,
      message: `User account "${userToDelete.full_name}" has been permanently deleted.`,
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, message: 'Server error deleting user account.' });
  }
};

module.exports = {
  getSystemStats,
  getAllListingsForAdmin,
  updateListingStatus,
  getAllUsers,
  toggleUserStatus,
  deleteUserByAdmin,
};

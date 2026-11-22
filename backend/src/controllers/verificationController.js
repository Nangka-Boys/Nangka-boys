const db = require('../config/db');

// Submit verification application (Owner)
const submitVerification = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { notes } = req.body;

    if (!req.files || !req.files['valid_id']) {
      return res.status(400).json({ success: false, message: 'Valid Government ID is required for verification.' });
    }

    const validIdUrl = `/uploads/documents/${req.files['valid_id'][0].filename}`;
    const proofUrl = req.files['proof_document']
      ? `/uploads/documents/${req.files['proof_document'][0].filename}`
      : null;

    // Check if there is already a pending or approved application
    const existing = await db.query(
      `SELECT * FROM owner_verifications WHERE owner_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [ownerId]
    );

    if (existing.rows.length > 0 && existing.rows[0].status === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending verification application under review.'
      });
    }

    if (existing.rows.length > 0 && existing.rows[0].status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Your account is already verified.'
      });
    }

    const result = await db.query(
      `INSERT INTO owner_verifications (owner_id, valid_id_url, business_permit_or_proof_url, notes, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [ownerId, validIdUrl, proofUrl, notes || null]
    );

    return res.status(201).json({
      success: true,
      message: 'Verification submitted successfully. An administrator will review your application.',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Submit verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error submitting verification.' });
  }
};

// Check verification status (Owner)
const getMyVerificationStatus = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const result = await db.query(
      `SELECT * FROM owner_verifications WHERE owner_id = $1 ORDER BY submitted_at DESC LIMIT 1`,
      [ownerId]
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: { status: 'not_submitted', message: 'No verification application submitted yet.' },
      });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('Check verification status error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving status.' });
  }
};

// List all verifications (Admin - uses database view vw_owner_verification_queue)
const listVerifications = async (req, res) => {
  try {
    const { status } = req.query; // pending, approved, rejected
    let query = `
      SELECT 
        verification_id AS id,
        owner_id,
        applicant_name AS owner_name,
        applicant_email AS owner_email,
        applicant_phone AS owner_phone,
        valid_id_url,
        business_permit_or_proof_url,
        applicant_notes AS notes,
        verification_status AS status,
        rejection_reason,
        reviewer_admin_id AS reviewed_by,
        reviewer_name,
        reviewed_at,
        submitted_at
      FROM vw_owner_verification_queue
    `;
    const params = [];

    if (status) {
      query += ` WHERE verification_status = $1`;
      params.push(status);
    }
    query += ` ORDER BY submitted_at DESC`;

    const result = await db.query(query, params);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('List verifications error:', error);
    return res.status(500).json({ success: false, message: 'Server error listing verifications.' });
  }
};

// Review verification - Approve or Reject (Admin)
// Utilizes Stored Procedure sp_approve_owner_verification or atomic Transaction
const reviewVerification = async (req, res) => {
  let client = null;
  try {
    const { id } = req.params;
    const { status, rejection_reason } = req.body;
    const adminId = req.user.id;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be either 'approved' or 'rejected'." });
    }

    if (status === 'rejected' && (!rejection_reason || rejection_reason.trim() === '')) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required when rejecting an owner.' });
    }

    const verification = await db.query('SELECT * FROM owner_verifications WHERE id = $1', [id]);
    if (verification.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Verification application not found.' });
    }

    let updatedRecord = null;

    if (status === 'approved') {
      // Execute PostgreSQL Stored Procedure
      await db.query('CALL sp_approve_owner_verification($1, $2, $3)', [
        id,
        adminId,
        'Approved by administrator',
      ]);

      const updated = await db.query('SELECT * FROM owner_verifications WHERE id = $1', [id]);
      updatedRecord = updated.rows[0];
    } else {
      // Rejection managed atomically with BEGIN / COMMIT / ROLLBACK
      client = await db.pool.connect();
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE owner_verifications 
         SET status = $1, rejection_reason = $2, reviewed_by = $3, reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [status, rejection_reason, adminId, id]
      );
      updatedRecord = result.rows[0];

      await client.query('COMMIT');
    }

    return res.json({
      success: true,
      message: `Owner application has been ${status}.`,
      data: updatedRecord,
    });
  } catch (error) {
    if (client) {
      try { await client.query('ROLLBACK'); } catch (_) {}
    }
    console.error('Review verification error:', error);
    return res.status(500).json({ success: false, message: 'Server error processing review.' });
  } finally {
    if (client) client.release();
  }
};

module.exports = {
  submitVerification,
  getMyVerificationStatus,
  listVerifications,
  reviewVerification,
};

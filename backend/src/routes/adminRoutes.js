const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getSystemStats,
  getAllListingsForAdmin,
  updateListingStatus,
  archiveListingViaProcedure,
  getAllUsers,
  toggleUserStatus,
  deleteUserByAdmin,
} = require('../controllers/adminController');
const { getAuditLogs, getAuditLogStats } = require('../controllers/auditController');

// System overview stats (via view vw_system_dashboard_stats)
router.get('/stats', authenticateToken, authorizeRoles('admin'), getSystemStats);

// Listing moderation & archiving (via stored procedure sp_archive_listing)
router.get('/listings', authenticateToken, authorizeRoles('admin'), getAllListingsForAdmin);
router.patch('/listings/:id/status', authenticateToken, authorizeRoles('admin'), updateListingStatus);
router.post('/listings/:id/archive', authenticateToken, authorizeRoles('admin'), archiveListingViaProcedure);

// User account management
router.get('/users', authenticateToken, authorizeRoles('admin'), getAllUsers);
router.patch('/users/:id/status', authenticateToken, authorizeRoles('admin'), toggleUserStatus);
router.delete('/users/:id', authenticateToken, authorizeRoles('admin'), deleteUserByAdmin);

// System Audit Trail & Database Logging
router.get('/audit-logs', authenticateToken, authorizeRoles('admin'), getAuditLogs);
router.get('/audit-logs/stats', authenticateToken, authorizeRoles('admin'), getAuditLogStats);

module.exports = router;

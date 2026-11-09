const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getSystemStats,
  getAllListingsForAdmin,
  updateListingStatus,
  getAllUsers,
  toggleUserStatus,
  deleteUserByAdmin,
} = require('../controllers/adminController');

router.get('/stats', authenticateToken, authorizeRoles('admin'), getSystemStats);
router.get('/listings', authenticateToken, authorizeRoles('admin'), getAllListingsForAdmin);
router.patch('/listings/:id/status', authenticateToken, authorizeRoles('admin'), updateListingStatus);
router.get('/users', authenticateToken, authorizeRoles('admin'), getAllUsers);
router.patch('/users/:id/status', authenticateToken, authorizeRoles('admin'), toggleUserStatus);
router.delete('/users/:id', authenticateToken, authorizeRoles('admin'), deleteUserByAdmin);

module.exports = router;

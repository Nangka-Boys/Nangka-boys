const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
  getListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
  uploadListingPhotos,
  getAmenities,
  getMyListings,
} = require('../controllers/listingController');

// Public listing discovery & amenities
router.get('/listings', getListings);
router.get('/listings/:id', getListingById);
router.get('/amenities', getAmenities);

// Owner listing creation, fetch, and media upload (Strictly Owner role + approved verification)
router.get('/owner/my-listings', authenticateToken, authorizeRoles('owner', 'admin'), getMyListings);
router.post('/owner/listings', authenticateToken, authorizeRoles('owner', 'admin'), createListing);
router.put('/owner/listings/:id', authenticateToken, authorizeRoles('owner', 'admin'), updateListing);
router.delete('/owner/listings/:id', authenticateToken, authorizeRoles('owner', 'admin'), deleteListing);
router.post(
  '/owner/listings/:id/photos',
  authenticateToken,
  authorizeRoles('owner', 'admin'),
  upload.array('photos', 8),
  uploadListingPhotos
);


module.exports = router;

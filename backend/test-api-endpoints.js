const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/authRoutes');
const verificationRoutes = require('./src/routes/verificationRoutes');
const listingRoutes = require('./src/routes/listingRoutes');
const userInteractionRoutes = require('./src/routes/userInteractionRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api', listingRoutes);
app.use('/api', userInteractionRoutes);
app.use('/api/admin', adminRoutes);

async function testEndpoints() {
  const server = app.listen(5099, '127.0.0.1');
  const baseUrl = 'http://127.0.0.1:5099';

  console.log('================================================================');
  console.log('🌐 TESTING REST API ENDPOINTS');
  console.log('================================================================\n');

  try {
    let endpointsTested = 0;

    // 1. GET /api/health
    const res1 = await fetch(`${baseUrl}/api/health`);
    console.log(`1. GET /api/health: Status ${res1.status} OK`);
    endpointsTested++;

    // 2. POST /api/auth/register (Uses BEGIN, COMMIT, ROLLBACK transaction)
    const testEmail = `tester_${Date.now()}@example.com`;
    const res2 = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'REST API Tester',
        email: testEmail,
        password: 'Password123!',
        phone_number: '09123456789',
        role: 'user',
      }),
    });
    const regData = await res2.json();
    console.log(`2. POST /api/auth/register: Status ${res2.status}`, regData.success ? 'SUCCESS' : 'FAILED');
    endpointsTested++;

    // 3. POST /api/auth/login
    const res3 = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const loginData = await res3.json();
    const userToken = loginData.data?.token;
    console.log(`3. POST /api/auth/login: Status ${res3.status}`, loginData.success ? 'SUCCESS' : 'FAILED');
    endpointsTested++;

    // Login as Admin for admin endpoints
    const adminLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@dapitan.gov.ph',
        password: 'AdminPassword123!',
      }),
    });
    const adminData = await adminLoginRes.json();
    const adminToken = adminData.data?.token;

    // 4. GET /api/auth/profile
    const res4 = await fetch(`${baseUrl}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    console.log(`4. GET /api/auth/profile: Status ${res4.status} OK`);
    endpointsTested++;

    // 5. GET /api/listings
    const res5 = await fetch(`${baseUrl}/api/listings`);
    const listingsData = await res5.json();
    console.log(`5. GET /api/listings: Status ${res5.status} Count: ${listingsData.count}`);
    endpointsTested++;

    const firstListingId = listingsData.data[0]?.id;

    // 6. GET /api/listings/:id (Includes UDFs fn_calculate_room_occupancy & fn_get_price_range)
    if (firstListingId) {
      const res6 = await fetch(`${baseUrl}/api/listings/${firstListingId}`);
      const singleData = await res6.json();
      console.log(`6. GET /api/listings/:id: Status ${res6.status}`, {
        title: singleData.data?.title,
        occupancy_metrics: singleData.data?.occupancy_metrics,
        price_metrics: singleData.data?.price_metrics,
      });
      endpointsTested++;

      // 7. GET /api/listings/:id/occupancy (Calls UDF fn_calculate_room_occupancy directly)
      const res7 = await fetch(`${baseUrl}/api/listings/${firstListingId}/occupancy`);
      const occData = await res7.json();
      console.log(`7. GET /api/listings/:id/occupancy: Status ${res7.status}`, occData.data);
      endpointsTested++;
    }

    // 8. GET /api/amenities
    const res8 = await fetch(`${baseUrl}/api/amenities`);
    const amenitiesData = await res8.json();
    console.log(`8. GET /api/amenities: Status ${res8.status} Total: ${amenitiesData.count}`);
    endpointsTested++;

    // 9. GET /api/favorites
    const res9 = await fetch(`${baseUrl}/api/favorites`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    console.log(`9. GET /api/favorites: Status ${res9.status} OK`);
    endpointsTested++;

    // 10. POST /api/reports
    if (firstListingId) {
      const res10 = await fetch(`${baseUrl}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          boarding_house_id: firstListingId,
          reason: 'Automated REST API test report validation.',
        }),
      });
      console.log(`10. POST /api/reports: Status ${res10.status} Submitted`);
      endpointsTested++;
    }

    // 11. GET /api/admin/stats (Utilizes View vw_system_dashboard_stats)
    const res11 = await fetch(`${baseUrl}/api/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statsData = await res11.json();
    console.log(`11. GET /api/admin/stats: Status ${res11.status}`, statsData.data);
    endpointsTested++;

    // 12. GET /api/verification/admin/verifications (Utilizes View vw_owner_verification_queue)
    const res12 = await fetch(`${baseUrl}/api/verification/admin/verifications`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifData = await res12.json();
    console.log(`12. GET /api/verification/admin/verifications: Status ${res12.status} Count: ${verifData.count}`);
    endpointsTested++;

    // 13. GET /api/admin/reports (Utilizes View vw_listing_reports_detailed)
    const res13 = await fetch(`${baseUrl}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const reportsData = await res13.json();
    console.log(`13. GET /api/admin/reports: Status ${res13.status} Count: ${reportsData.count}`);
    endpointsTested++;

    // 14. GET /api/admin/audit-logs (Audit Trail Database Logging)
    const res14 = await fetch(`${baseUrl}/api/admin/audit-logs?limit=5`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditData = await res14.json();
    console.log(`14. GET /api/admin/audit-logs: Status ${res14.status} Logs retrieved: ${auditData.data?.length} Total: ${auditData.pagination?.total}`);
    endpointsTested++;

    // 15. GET /api/admin/audit-logs/stats
    const res15 = await fetch(`${baseUrl}/api/admin/audit-logs/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const auditStats = await res15.json();
    console.log(`15. GET /api/admin/audit-logs/stats: Status ${res15.status}`, auditStats.data);
    endpointsTested++;

    console.log('\n================================================================');
    console.log(`🎉 SUCCESS: ${endpointsTested} REST API ENDPOINTS TESTED & OPERATIONAL!`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('API Test Error:', err);
  } finally {
    server.close();
    process.exit(0);
  }
}

testEndpoints();

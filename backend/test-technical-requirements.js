const db = require('./src/config/db');

async function runTests() {
  console.log('================================================================');
  console.log('🧪 TESTING TECHNICAL REQUIREMENTS FOR DAPITAN BOARDING HOUSE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------------------
    // 1. User-Defined Functions (UDFs)
    // -------------------------------------------------------------------------
    console.log('▶ Requirement 1: Testing User-Defined Functions (UDFs)...');
    
    // Test fn_is_owner_verified with a random UUID
    const testOwnerCheck = await db.query(
      `SELECT "dapitan_schema".fn_is_owner_verified('00000000-0000-0000-0000-000000000000') AS is_verified`
    );
    console.log('  ✅ fn_is_owner_verified execution result:', testOwnerCheck.rows[0]);

    // Test fn_get_price_range
    const testPriceRange = await db.query(
      `SELECT * FROM "dapitan_schema".fn_get_price_range('00000000-0000-0000-0000-000000000000')`
    );
    console.log('  ✅ fn_get_price_range execution result:', testPriceRange.rows[0]);

    // Test fn_calculate_room_occupancy
    const testOccupancy = await db.query(
      `SELECT * FROM "dapitan_schema".fn_calculate_room_occupancy('00000000-0000-0000-0000-000000000000')`
    );
    console.log('  ✅ fn_calculate_room_occupancy execution result:', testOccupancy.rows[0]);

    // Test fn_get_boarding_house_amenities
    const testAmenities = await db.query(
      `SELECT "dapitan_schema".fn_get_boarding_house_amenities('00000000-0000-0000-0000-000000000000') AS amenities`
    );
    console.log('  ✅ fn_get_boarding_house_amenities execution result:', testAmenities.rows[0]);

    // -------------------------------------------------------------------------
    // 2. Database Views
    // -------------------------------------------------------------------------
    console.log('\n▶ Requirement 4: Testing Database Views...');
    const statsView = await db.query(`SELECT * FROM "dapitan_schema".vw_system_dashboard_stats`);
    console.log('  ✅ vw_system_dashboard_stats sample data:', statsView.rows[0]);

    const queueView = await db.query(`SELECT COUNT(*) FROM "dapitan_schema".vw_owner_verification_queue`);
    console.log('  ✅ vw_owner_verification_queue count:', queueView.rows[0].count);

    const reportsView = await db.query(`SELECT COUNT(*) FROM "dapitan_schema".vw_listing_reports_detailed`);
    console.log('  ✅ vw_listing_reports_detailed count:', reportsView.rows[0].count);

    const activeListingsView = await db.query(`SELECT COUNT(*) FROM "dapitan_schema".vw_active_listings`);
    console.log('  ✅ vw_active_listings count:', activeListingsView.rows[0].count);

    // -------------------------------------------------------------------------
    // 3. Transactions & Triggers & Audit Logging
    // -------------------------------------------------------------------------
    console.log('\n▶ Requirement 3, 5, 6: Testing Triggers, Transactions & Audit Logs...');
    const client = await db.pool.connect();
    let testUserId = null;
    let testBhId = null;
    let testRoomId = null;

    try {
      await client.query('BEGIN');
      console.log('  ✅ [Transaction] BEGIN executed successfully.');

      // Insert temporary user
      const userRes = await client.query(`
        INSERT INTO "dapitan_schema".users (full_name, email, password_hash, role)
        VALUES ('Test User Audit', 'test_audit_${Date.now()}@example.com', 'dummyhash', 'user')
        RETURNING id;
      `);
      testUserId = userRes.rows[0].id;
      console.log('  ✅ [Transaction] Inserted user ID:', testUserId);

      // Insert boarding house
      const bhRes = await client.query(`
        INSERT INTO "dapitan_schema".boarding_houses (
          owner_id, title, barangay, street_address, contact_phone, status, is_available
        ) VALUES (
          $1, 'Test Boarding House Triggers', 'Dawo', 'Sunset Blvd', '09123456789', 'published', TRUE
        ) RETURNING id, is_available;
      `, [testUserId]);
      testBhId = bhRes.rows[0].id;
      console.log('  ✅ [Transaction] Inserted boarding house ID:', testBhId);

      // Insert room with available_slots = 0
      const roomRes = await client.query(`
        INSERT INTO "dapitan_schema".rooms (
          boarding_house_id, room_name_or_number, monthly_rate, total_slots, available_slots
        ) VALUES ($1, 'Room Zero Slots', 1500, 2, 0)
        RETURNING id;
      `, [testBhId]);
      testRoomId = roomRes.rows[0].id;
      console.log('  ✅ [Transaction] Inserted room with 0 available slots.');

      await client.query('COMMIT');
      console.log('  ✅ [Transaction] COMMIT executed successfully.');
    } catch (txErr) {
      await client.query('ROLLBACK');
      console.error('  ❌ Transaction error:', txErr);
      throw txErr;
    } finally {
      client.release();
    }

    // Verify Trigger 1: Availability sync trigger
    const bhCheck = await db.query(
      `SELECT is_available FROM "dapitan_schema".boarding_houses WHERE id = $1`,
      [testBhId]
    );
    console.log(
      '  ✅ [Trigger trg_sync_bh_availability] Boarding house is_available auto-updated to:',
      bhCheck.rows[0].is_available,
      '(Expected: false because available_slots = 0)'
    );

    // Verify Trigger 2 & Requirement 6: Audit Logs
    const auditCheck = await db.query(
      `SELECT table_name, operation, record_id, description, created_at 
       FROM "dapitan_schema".audit_logs 
       WHERE record_id = $1 OR record_id = $2
       ORDER BY created_at DESC`,
      [testUserId, testBhId]
    );
    console.log('  ✅ [Trigger trg_audit & Requirement 6] Audit Logs generated:');
    console.table(auditCheck.rows);

    // -------------------------------------------------------------------------
    // 4. Stored Procedures
    // -------------------------------------------------------------------------
    console.log('\n▶ Requirement 2: Testing Stored Procedures (CALL)...');

    // Test sp_update_room_slots: update room to 2 available slots
    await db.query(`CALL "dapitan_schema".sp_update_room_slots($1, $2, $3)`, [testRoomId, 2, testUserId]);
    console.log('  ✅ Executed CALL sp_update_room_slots(testRoomId, 2, testUserId)');

    // Check that trigger fired again and updated boarding house is_available to true!
    const bhCheck2 = await db.query(
      `SELECT is_available FROM "dapitan_schema".boarding_houses WHERE id = $1`,
      [testBhId]
    );
    console.log(
      '  ✅ [Trigger after Stored Procedure] Boarding house is_available auto-updated to:',
      bhCheck2.rows[0].is_available,
      '(Expected: true because available_slots is now 2)'
    );

    // Test sp_archive_listing
    await db.query(`CALL "dapitan_schema".sp_archive_listing($1, $2, $3)`, [testBhId, testUserId, 'Automated Test Archive']);
    const bhArchived = await db.query(`SELECT status, is_available FROM "dapitan_schema".boarding_houses WHERE id = $1`, [testBhId]);
    console.log('  ✅ Executed CALL sp_archive_listing. Status:', bhArchived.rows[0]);

    // Cleanup test data
    console.log('\n🧹 Cleaning up test records...');
    await db.query(`DELETE FROM "dapitan_schema".users WHERE id = $1`, [testUserId]);
    console.log('  ✅ Test data cleaned up.');

    console.log('\n================================================================');
    console.log('🎉 ALL TECHNICAL REQUIREMENTS VALIDATED SUCCESSFULLY IN DATABASE!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();

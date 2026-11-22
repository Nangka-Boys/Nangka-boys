const db = require('../config/db');

async function cleanPublicTables() {
  const publicTables = [
    'listing_reports', 'favorites', 'listing_photos',
    'boarding_house_amenities', 'amenities', 'rooms',
    'boarding_houses', 'owner_verifications', 'users'
  ];

  console.log('Cleaning any leftover tables from public schema...');
  for (const table of publicTables) {
    await db.query(`DROP TABLE IF EXISTS public.${table} CASCADE;`);
  }

  // Also drop enums from public if any
  const publicTypes = ['user_role', 'verification_status', 'listing_status', 'room_type'];
  for (const type of publicTypes) {
    await db.query(`DROP TYPE IF EXISTS public.${type} CASCADE;`);
  }

  const tablesRes = await db.query(`
    SELECT table_name, table_type
    FROM information_schema.tables 
    WHERE table_schema = 'dapitan_schema'
    ORDER BY table_name;
  `);

  console.log('\n✅ Verified Tables & Views under "dapitan_schema":');
  console.table(tablesRes.rows);

  const routinesRes = await db.query(`
    SELECT routine_name, routine_type, data_type
    FROM information_schema.routines 
    WHERE routine_schema = 'dapitan_schema'
    ORDER BY routine_type, routine_name;
  `);

  console.log('\n✅ Verified Routines (Functions & Stored Procedures) under "dapitan_schema":');
  console.table(routinesRes.rows);

  const triggersRes = await db.query(`
    SELECT trigger_name, event_manipulation, event_object_table, action_timing
    FROM information_schema.triggers 
    WHERE trigger_schema = 'dapitan_schema'
    ORDER BY event_object_table, trigger_name;
  `);

  console.log('\n✅ Verified Triggers under "dapitan_schema":');
  console.table(triggersRes.rows);
}

cleanPublicTables().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

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

  const res = await db.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'dapitan_schema'
    ORDER BY table_name;
  `);

  console.log('\n✅ Verified Tables residing strictly under "dapitan_schema":');
  console.table(res.rows);
}

cleanPublicTables().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

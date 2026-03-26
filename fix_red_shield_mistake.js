const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixMistake() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Temporarily disable the trigger to allow modifications
    console.log('Disabling trigger temporarily...');
    await client.query('ALTER TABLE accessibility_policies DISABLE TRIGGER trigger_prevent_irrevocable_accessibility_policies');
    
    // 2. Fix rows that were marked as irrevocable but aren't actually locked
    // This removes the red shield from them so you can normally lock them again via UI
    console.log('Fixing mistaken rows in accessibility_policies...');
    const resAccessibility = await client.query(`
      UPDATE accessibility_policies 
      SET is_irrevocable = FALSE 
      WHERE is_irrevocable = TRUE AND (is_locked = FALSE OR is_locked IS NULL)
      RETURNING *;
    `);
    console.log(`Fixed ${resAccessibility.rowCount} accessibility policies that were shielded without being locked.`);

    // 3. Do the same for apps just in case
    console.log('Fixing mistaken rows in app_policies...');
    await client.query('ALTER TABLE app_policies DISABLE TRIGGER trigger_prevent_irrevocable_app_policies');
    const resApps = await client.query(`
      UPDATE app_policies 
      SET is_irrevocable = FALSE 
      WHERE is_irrevocable = TRUE AND (is_blocked = FALSE OR is_blocked IS NULL)
      RETURNING *;
    `);
    console.log(`Fixed ${resApps.rowCount} app policies that were shielded without being blocked.`);

    // 4. Re-enable triggers
    console.log('Re-enabling triggers...');
    await client.query('ALTER TABLE accessibility_policies ENABLE TRIGGER trigger_prevent_irrevocable_accessibility_policies');
    await client.query('ALTER TABLE app_policies ENABLE TRIGGER trigger_prevent_irrevocable_app_policies');
    
    await client.query('COMMIT');
    console.log('Fix complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error during fix:', err);
  } finally {
    client.release();
    pool.end();
  }
}

fixMistake();

// ultimate_red_shield_lock.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function hardenDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Installing Event Trigger to prevent trigger tampering...');
    
    // Create an event trigger function that blocks DROP TRIGGER and ALTER TABLE DISABLE TRIGGER
    // for our specific red shield triggers.
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_trigger_tampering()
      RETURNS event_trigger
      LANGUAGE plpgsql
      AS $$
      DECLARE
          obj record;
      BEGIN
          FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
          LOOP
              -- If someone tries to drop our function
              IF obj.object_identity = 'prevent_irrevocable_modifications()' THEN
                  RAISE EXCEPTION 'Red Shield: Cannot drop the security trigger function.';
              END IF;
              
              -- We also block any ALTER TABLE commands trying to touch these specific tables' triggers
              IF obj.object_identity IN (
                  'public.url_blacklist', 
                  'public.accessibility_policies', 
                  'public.app_policies'
              ) THEN
                  RAISE EXCEPTION 'Red Shield: Cannot alter tables protected by Red Shield constraints. Schema is locked.';
              END IF;
          END LOOP;
      END;
      $$;
    `);

    // Create the event trigger targeting DDL operations
    await client.query(`
      DROP EVENT TRIGGER IF EXISTS guard_red_shield;
      CREATE EVENT TRIGGER guard_red_shield
      ON ddl_command_start
      WHEN TAG IN ('DROP TRIGGER', 'DROP FUNCTION', 'ALTER TABLE')
      EXECUTE FUNCTION prevent_trigger_tampering();
    `);

    await client.query('COMMIT');
    console.log('Database hardened! Event trigger installed successfully. Tables are now locked.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error hardening database:', err);
  } finally {
    client.release();
    pool.end();
  }
}

hardenDatabase();

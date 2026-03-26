// hard_lock.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function hardLock() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('Building unbypassable locking mechanisms...');
    
    // In PostgreSQL, a table owner can always run ALTER TABLE to disable triggers.
    // The ONLY way to prevent the owner from modifying the trigger is to create an Event Trigger
    // that fires on ANY ALTER TABLE command and strictly prevents it on our protected tables.
    
    await client.query(`
      CREATE OR REPLACE FUNCTION block_alter_table()
      RETURNS event_trigger
      LANGUAGE plpgsql
      AS $$
      DECLARE
          obj record;
      BEGIN
          FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
          LOOP
              IF obj.object_identity IN (
                  'public.accessibility_policies',
                  'public.app_policies',
                  'public.url_blacklist'
              ) THEN
                  RAISE EXCEPTION 'God Mode Lock: The Red Shield architecture is fundamentally locked at the schema level. You cannot disable these triggers.';
              END IF;
          END LOOP;
      END;
      $$;
    `);

    // Attach the event trigger exclusively to ALTER TABLE drops/commands that complete successfully.
    // However, ddl_command_start doesn't populate pg_event_trigger_ddl_commands! 
    // We must use ddl_command_end.
    
    await client.query(`
      DROP EVENT TRIGGER IF EXISTS guard_alter_table;
      CREATE EVENT TRIGGER guard_alter_table
      ON ddl_command_end
      WHEN TAG IN ('ALTER TABLE')
      EXECUTE FUNCTION block_alter_table();
    `);

    await client.query('COMMIT');
    console.log('Absolute lock down complete. ALTER TABLE is now blocked on protected tables.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error locking:', err);
  } finally {
    client.release();
    pool.end();
  }
}

hardLock();

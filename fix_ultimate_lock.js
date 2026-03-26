// fix_ultimate_lock.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fixHarden() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // First, temporarily drop the borked event trigger
    await client.query('DROP EVENT TRIGGER IF EXISTS guard_red_shield;');
    
    console.log('Fixing Event Trigger function...');
    
    // We update the function to work correctly in PostgreSQL based on simple TG_TAG rules
    // because pg_event_trigger_ddl_commands() cannot be called in ddl_command_start for some commands.
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_trigger_tampering()
      RETURNS event_trigger
      LANGUAGE plpgsql
      AS $$
      BEGIN
          IF tg_tag IN ('DROP TRIGGER', 'DROP FUNCTION', 'ALTER TABLE') THEN
              -- Unfortunately, without deep parsing in ddl_command_start, we can't easily filter by specific table.
              -- But we can just use ddl_command_end or simply rely on pg_event_trigger_dropped_objects for drops!
          END IF;
      END;
      $$;
    `);

    // Let's actually use a simpler approach to stop disabling triggers on our specific tables.
    // PostgreSQL owner can always alter tables they own. 
    // If you want absolute strictness such that even YOU (the DB owner) can't disable the trigger via DDL:
    
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_trigger_tampering()
      RETURNS event_trigger
      LANGUAGE plpgsql
      AS $$
      DECLARE
          obj record;
      BEGIN
          -- Only valid in sql_drop
          FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
          LOOP
              IF obj.object_identity = 'prevent_irrevocable_modifications()' THEN
                  RAISE EXCEPTION 'Red Shield Strict Lock: Cannot drop the security trigger function.';
              END IF;
          END LOOP;
      END;
      $$;
    `);

    // Only hook DROP operations
    await client.query(`
      CREATE EVENT TRIGGER guard_red_shield_drop
      ON sql_drop
      EXECUTE FUNCTION prevent_trigger_tampering();
    `);

    await client.query('COMMIT');
    console.log('Event trigger corrected! Function drop protected.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error fixing db:', err);
  } finally {
    client.release();
    pool.end();
  }
}

fixHarden();

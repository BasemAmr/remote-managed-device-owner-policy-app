// lock_drop_trigger.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function lockDrops() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // We update our drop protection again to protect block_alter_table and the event triggers themselves!
    await client.query(`
      CREATE OR REPLACE FUNCTION prevent_trigger_tampering()
      RETURNS event_trigger
      LANGUAGE plpgsql
      AS $$
      DECLARE
          obj record;
      BEGIN
          FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
          LOOP
              IF obj.object_identity = 'prevent_irrevocable_modifications()' THEN
                  RAISE EXCEPTION 'God Mode Lock: Cannot drop the core security trigger function.';
              END IF;
              IF obj.object_identity = 'block_alter_table()' THEN
                  RAISE EXCEPTION 'God Mode Lock: Cannot drop the security schema lock.';
              END IF;
              IF obj.object_identity = 'prevent_trigger_tampering()' THEN
                  RAISE EXCEPTION 'God Mode Lock: Cannot drop the drop protector.';
              END IF;
              -- Also protect the event triggers themselves
              IF obj.object_type = 'event trigger' AND obj.object_identity IN ('guard_alter_table', 'guard_red_shield_drop') THEN
                  RAISE EXCEPTION 'God Mode Lock: Cannot drop core event triggers.';
              END IF;
          END LOOP;
      END;
      $$;
    `);

    await client.query('COMMIT');
    console.log('Drop protection reinforced. It is now basically impossible to revert Red Shield from SQL under normal circumstances.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error locking:', err);
  } finally {
    client.release();
    pool.end();
  }
}

lockDrops();

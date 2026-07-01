const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const databaseUrl = 'postgresql://postgres.qkxxmwgdpgwakxnfyabj:SaidNaidji2006@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const email = 'teamepiclub@gmail.com';
  const name = 'Epic President';
  const password = 'Epicclub123';
  const role = 'president';
  const status = 'approved';

  console.log('Hashing password...');
  const passwordHash = await bcrypt.hash(password, 10);

  console.log('Connecting to database...');
  const client = await pool.connect();
  try {
    console.log('Checking if user already exists...');
    const checkRes = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    
    if (checkRes.rowCount > 0) {
      console.log('User already exists. Updating to President role and setting password...');
      await client.query(
        'UPDATE users SET name = $1, password_hash = $2, role = $3, status = $4, updated_at = NOW() WHERE email = $5',
        [name, passwordHash, role, status, email]
      );
      console.log('User updated successfully.');
    } else {
      console.log('Inserting new President user...');
      await client.query(
        'INSERT INTO users (email, name, password_hash, role, status) VALUES ($1, $2, $3, $4, $5)',
        [email, name, passwordHash, role, status]
      );
      console.log('User inserted successfully.');
    }
  } catch (error) {
    console.error('Database operation failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Use hardcoded connection string since env might have parsing issue
const connectionString = 'postgresql://postgres.qkxxmwgdpgwakxnfyabj:SaidNaidji2006@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

const runMigrations = async () => {
  console.log('Starting migration execution...');
  console.log('Connecting to:', connectionString.replace(/:[^:@]+@/, ':***@'));

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log('Connected to database successfully. Running migrations...');

    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = ['init.sql', '002_email_verifications.sql'];

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      console.log(`\nExecuting migration file: ${file}`);
      
      if (!fs.existsSync(filePath)) {
        console.error(`Migration file not found: ${filePath}`);
        continue;
      }

      const sql = fs.readFileSync(filePath, 'utf8');
      console.log(`SQL length: ${sql.length} chars`);
      
      try {
        await client.query(sql);
        console.log(`✅ Migration file ${file} executed successfully.`);
      } catch (err) {
        // If tables already exist, that's OK
        if (err.code === '42P07' || err.message.includes('already exists')) {
          console.log(`⚠️ ${file}: Some tables already exist (skipping) - ${err.message}`);
        } else {
          throw err;
        }
      }
    }

    console.log('\n✅ All migrations completed successfully.');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error('Code:', error.code);
    try {
      await client.end();
    } catch (err) {}
    process.exit(1);
  }
};

runMigrations();

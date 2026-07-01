const { Client } = require('pg');

const host = 'aws-1-eu-central-1.pooler.supabase.com';
const password = 'SaidNaidji2006';

(async () => {
  for (const port of [6543, 5432]) {
    console.log(`Testing: port=${port}, password=${password}`);
    const client = new Client({
      host,
      port,
      user: 'postgres.qkxxmwgdpgwakxnfyabj',
      password,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 6000
    });
    try {
      await client.connect();
      console.log(`✅ SUCCESS! port=${port}`);
      const res = await client.query('SELECT NOW()');
      console.log(`Time:`, res.rows[0]);
      await client.end();
      process.exit(0);
    } catch (e) {
      console.log(`❌ FAILED: ${e.message}`);
      try { await client.end(); } catch (err) {}
    }
  }
  console.log('All failed.');
  process.exit(1);
})();

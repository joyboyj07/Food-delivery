/**
 * Run once to fix passwords:
 *   node fix-password.js
 */
const bcrypt = require('bcryptjs');
const mysql  = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const db = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    user:     process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'quickbite',
  });
  const hash = await bcrypt.hash('admin123', 10);
  await db.execute('UPDATE users SET password = ?', [hash]);
  console.log('✅ All passwords set to: admin123');
  await db.end();
})();

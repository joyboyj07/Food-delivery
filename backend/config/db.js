const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:             process.env.DB_HOST || 'localhost',
  user:             process.env.DB_USER || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME || 'quickbite',
  waitForConnections: true,
  connectionLimit:  10,
  queueLimit:       0
});

const connectDB = async () => {
  try {
    const conn = await pool.getConnection();
    console.log('✅ MySQL Connected to QuickBite DB');
    conn.release();
  } catch (err) {
    console.error('❌ MySQL Error:', err.message);
    process.exit(1);
  }
};

module.exports = { pool, connectDB };

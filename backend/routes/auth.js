const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { auth } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address, role = 'customer' } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, password required' });
    const [existing] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (existing.length) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO users (name,email,password,phone,address,role) VALUES(?,?,?,?,?,?)',
      [name, email, hashed, phone || '', address || '', role]
    );
    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const [user] = await pool.query('SELECT id,name,email,phone,address,role,avatar,created_at FROM users WHERE id=?', [result.insertId]);
    res.status(201).json({ token, user: user[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const [rows] = await pool.query('SELECT * FROM users WHERE email=? AND is_active=1', [email]);
    if (!rows.length) return res.status(401).json({ error: 'Invalid credentials' });
    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });
    await pool.query('UPDATE users SET last_login=NOW() WHERE id=?', [user.id]);
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });
    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/me', auth, async (req, res) => {
  const { password, ...safe } = req.user;
  res.json(safe);
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    await pool.query('UPDATE users SET name=?,phone=?,address=? WHERE id=?', [name, phone, address, req.user.id]);
    const [updated] = await pool.query('SELECT id,name,email,phone,address,role,avatar FROM users WHERE id=?', [req.user.id]);
    res.json(updated[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { auth, adminAuth } = require('../middleware/auth');

// GET all restaurants
router.get('/', async (req, res) => {
  try {
    const { search = '', cuisine = '', sort = 'rating', page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE r.is_active=1';
    const params = [];
    if (search) { where += ' AND (r.name LIKE ? OR r.cuisine LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (cuisine) { where += ' AND r.cuisine=?'; params.push(cuisine); }
    const orderMap = { rating: 'r.rating DESC', delivery_time: 'r.delivery_time ASC', price: 'r.min_order ASC' };
    const orderBy = orderMap[sort] || 'r.rating DESC';
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM restaurants r ${where}`, params);
    const [rows] = await pool.query(`
      SELECT r.*, COUNT(DISTINCT mi.id) as menu_count
      FROM restaurants r
      LEFT JOIN menu_items mi ON mi.restaurant_id=r.id AND mi.is_available=1
      ${where} GROUP BY r.id ORDER BY ${orderBy} LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    res.json({ restaurants: rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single restaurant with menu
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM restaurants WHERE id=?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Restaurant not found' });
    const [menu] = await pool.query(`
      SELECT mi.*, mc.name as category_name FROM menu_items mi
      LEFT JOIN menu_categories mc ON mc.id=mi.category_id
      WHERE mi.restaurant_id=? AND mi.is_available=1
      ORDER BY mc.sort_order, mi.name
    `, [req.params.id]);
    const [categories] = await pool.query(`
      SELECT DISTINCT mc.* FROM menu_categories mc
      JOIN menu_items mi ON mi.category_id=mc.id
      WHERE mi.restaurant_id=? ORDER BY mc.sort_order
    `, [req.params.id]);
    const [reviews] = await pool.query(`
      SELECT r.*, u.name as user_name FROM reviews r
      JOIN users u ON u.id=r.user_id
      WHERE r.restaurant_id=? ORDER BY r.created_at DESC LIMIT 10
    `, [req.params.id]);
    res.json({ ...rows[0], menu, categories, reviews });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET cuisines list
router.get('/meta/cuisines', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT DISTINCT cuisine FROM restaurants WHERE is_active=1 ORDER BY cuisine');
    res.json(rows.map(r => r.cuisine));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST review
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    await pool.query('INSERT INTO reviews (restaurant_id,user_id,rating,comment) VALUES(?,?,?,?)',
      [req.params.id, req.user.id, rating, comment]);
    await pool.query('UPDATE restaurants SET rating=(SELECT AVG(rating) FROM reviews WHERE restaurant_id=?) WHERE id=?',
      [req.params.id, req.params.id]);
    res.status(201).json({ message: 'Review added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: Create restaurant
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description, cuisine, address, phone, image, delivery_time, delivery_fee, min_order, rating = 4.0 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO restaurants (name,description,cuisine,address,phone,image,delivery_time,delivery_fee,min_order,rating) VALUES(?,?,?,?,?,?,?,?,?,?)',
      [name, description, cuisine, address, phone, image, delivery_time, delivery_fee, min_order, rating]
    );
    const [created] = await pool.query('SELECT * FROM restaurants WHERE id=?', [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: Update restaurant
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, description, cuisine, address, phone, image, delivery_time, delivery_fee, min_order, is_active } = req.body;
    await pool.query(
      'UPDATE restaurants SET name=?,description=?,cuisine=?,address=?,phone=?,image=?,delivery_time=?,delivery_fee=?,min_order=?,is_active=? WHERE id=?',
      [name, description, cuisine, address, phone, image, delivery_time, delivery_fee, min_order, is_active, req.params.id]
    );
    const [updated] = await pool.query('SELECT * FROM restaurants WHERE id=?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: Add menu item
router.post('/:id/menu', adminAuth, async (req, res) => {
  try {
    const { name, description, price, category_id, image, is_veg, is_available = 1 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO menu_items (restaurant_id,name,description,price,category_id,image,is_veg,is_available) VALUES(?,?,?,?,?,?,?,?)',
      [req.params.id, name, description, price, category_id, image, is_veg ? 1 : 0, is_available]
    );
    const [created] = await pool.query('SELECT * FROM menu_items WHERE id=?', [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

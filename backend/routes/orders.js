const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { auth, adminAuth } = require('../middleware/auth');

// GET user orders
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status = '' } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE o.user_id=?';
    const params = [req.user.id];
    if (status) { where += ' AND o.status=?'; params.push(status); }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM orders o ${where}`, params);
    const [orders] = await pool.query(`
      SELECT o.*, r.name as restaurant_name, r.image as restaurant_image, r.address as restaurant_address
      FROM orders o JOIN restaurants r ON r.id=o.restaurant_id
      ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    for (const order of orders) {
      const [items] = await pool.query(`
        SELECT oi.*, mi.name, mi.image FROM order_items oi
        JOIN menu_items mi ON mi.id=oi.menu_item_id WHERE oi.order_id=?
      `, [order.id]);
      order.items = items;
    }
    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single order
router.get('/:id', auth, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT o.*, r.name as restaurant_name, r.image as restaurant_image,
             r.address as restaurant_address, r.phone as restaurant_phone
      FROM orders o JOIN restaurants r ON r.id=o.restaurant_id
      WHERE o.id=? AND o.user_id=?
    `, [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    const [items] = await pool.query(`
      SELECT oi.*, mi.name, mi.image, mi.description FROM order_items oi
      JOIN menu_items mi ON mi.id=oi.menu_item_id WHERE oi.order_id=?
    `, [req.params.id]);
    const [tracking] = await pool.query('SELECT * FROM order_tracking WHERE order_id=? ORDER BY created_at ASC', [req.params.id]);
    res.json({ ...rows[0], items, tracking });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST place order
router.post('/', auth, async (req, res) => {
  try {
    const { restaurant_id, items, delivery_address, payment_method = 'cod', notes = '' } = req.body;
    if (!restaurant_id || !items?.length) return res.status(400).json({ error: 'Restaurant and items required' });
    if (!delivery_address) return res.status(400).json({ error: 'Delivery address required' });

    const [restaurant] = await pool.query('SELECT * FROM restaurants WHERE id=?', [restaurant_id]);
    if (!restaurant.length) return res.status(404).json({ error: 'Restaurant not found' });

    let subtotal = 0;
    const itemDetails = [];
    for (const item of items) {
      const [menuItem] = await pool.query('SELECT * FROM menu_items WHERE id=? AND restaurant_id=?', [item.menu_item_id, restaurant_id]);
      if (!menuItem.length) return res.status(400).json({ error: `Item ${item.menu_item_id} not found` });
      const lineTotal = menuItem[0].price * item.quantity;
      subtotal += lineTotal;
      itemDetails.push({ ...menuItem[0], quantity: item.quantity, line_total: lineTotal });
    }

    const delivery_fee = restaurant[0].delivery_fee || 0;
    const tax = subtotal * 0.05;
    const total = subtotal + delivery_fee + tax;

    // Generate order number
    const order_number = 'QB' + Date.now().toString().slice(-8);

    const [result] = await pool.query(`
      INSERT INTO orders (order_number,user_id,restaurant_id,subtotal,delivery_fee,tax,total,
        delivery_address,payment_method,notes,status,payment_status)
      VALUES(?,?,?,?,?,?,?,?,?,?,'pending','pending')
    `, [order_number, req.user.id, restaurant_id, subtotal, delivery_fee, tax, total,
        delivery_address, payment_method, notes]);

    for (const item of itemDetails) {
      await pool.query('INSERT INTO order_items (order_id,menu_item_id,quantity,price,total) VALUES(?,?,?,?,?)',
        [result.insertId, item.id, item.quantity, item.price, item.line_total]);
    }

    // Initial tracking
    await pool.query('INSERT INTO order_tracking (order_id,status,message) VALUES(?,?,?)',
      [result.insertId, 'pending', 'Order placed successfully']);

    const [order] = await pool.query('SELECT * FROM orders WHERE id=?', [result.insertId]);
    res.status(201).json({ ...order[0], order_number, message: 'Order placed successfully!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT cancel order
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM orders WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!rows.length) return res.status(404).json({ error: 'Order not found' });
    if (!['pending', 'confirmed'].includes(rows[0].status)) return res.status(400).json({ error: 'Cannot cancel this order' });
    await pool.query('UPDATE orders SET status="cancelled" WHERE id=?', [req.params.id]);
    await pool.query('INSERT INTO order_tracking (order_id,status,message) VALUES(?,?,?)',
      [req.params.id, 'cancelled', 'Order cancelled by customer']);
    res.json({ message: 'Order cancelled' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: Get all orders
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '' } = req.query;
    const offset = (page - 1) * limit;
    let where = 'WHERE 1=1'; const params = [];
    if (status) { where += ' AND o.status=?'; params.push(status); }
    const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM orders o ${where}`, params);
    const [orders] = await pool.query(`
      SELECT o.*, u.name as customer_name, u.phone as customer_phone,
             r.name as restaurant_name
      FROM orders o JOIN users u ON u.id=o.user_id JOIN restaurants r ON r.id=o.restaurant_id
      ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    res.json({ orders, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: Update order status
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const messages = {
      confirmed:  'Your order has been confirmed by the restaurant',
      preparing:  'Restaurant is preparing your food',
      picked_up:  'Rider has picked up your order',
      on_the_way: 'Your order is on the way!',
      delivered:  'Order delivered successfully. Enjoy your meal!',
      cancelled:  'Order has been cancelled'
    };
    await pool.query('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
    await pool.query('INSERT INTO order_tracking (order_id,status,message) VALUES(?,?,?)',
      [req.params.id, status, messages[status] || status]);
    if (status === 'delivered') {
      await pool.query('UPDATE orders SET payment_status="paid", delivered_at=NOW() WHERE id=?', [req.params.id]);
    }
    const [updated] = await pool.query('SELECT * FROM orders WHERE id=?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET admin stats
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const [[{ total_orders }]]   = await pool.query('SELECT COUNT(*) as total_orders FROM orders');
    const [[{ total_revenue }]]  = await pool.query("SELECT COALESCE(SUM(total),0) as total_revenue FROM orders WHERE status='delivered'");
    const [[{ pending_orders }]] = await pool.query("SELECT COUNT(*) as pending_orders FROM orders WHERE status IN ('pending','confirmed','preparing')");
    const [[{ total_users }]]    = await pool.query("SELECT COUNT(*) as total_users FROM users WHERE role='customer'");
    const [[{ today_orders }]]   = await pool.query("SELECT COUNT(*) as today_orders FROM orders WHERE DATE(created_at)=CURDATE()");
    const [[{ today_revenue }]]  = await pool.query("SELECT COALESCE(SUM(total),0) as today_revenue FROM orders WHERE DATE(created_at)=CURDATE() AND status='delivered'");
    res.json({ total_orders, total_revenue, pending_orders, total_users, today_orders, today_revenue });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { auth } = require('../middleware/auth');

// GET cart
router.get('/', auth, async (req, res) => {
  try {
    const [items] = await pool.query(`
      SELECT c.*, mi.name, mi.price, mi.image, mi.description, mi.is_veg,
             r.name as restaurant_name, r.id as restaurant_id, r.delivery_fee, r.min_order
      FROM cart c JOIN menu_items mi ON mi.id=c.menu_item_id
      JOIN restaurants r ON r.id=mi.restaurant_id
      WHERE c.user_id=?
    `, [req.user.id]);
    const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const delivery_fee = items.length ? items[0].delivery_fee : 0;
    const tax = subtotal * 0.05;
    const total = subtotal + delivery_fee + tax;
    res.json({ items, subtotal, delivery_fee, tax, total, count: items.reduce((s, i) => s + i.quantity, 0) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { menu_item_id, quantity = 1 } = req.body;
    const [menuItem] = await pool.query('SELECT * FROM menu_items WHERE id=?', [menu_item_id]);
    if (!menuItem.length) return res.status(404).json({ error: 'Item not found' });

    // Check if cart has items from different restaurant
    const [cartItems] = await pool.query(`
      SELECT c.*, mi.restaurant_id FROM cart c
      JOIN menu_items mi ON mi.id=c.menu_item_id WHERE c.user_id=?
    `, [req.user.id]);
    if (cartItems.length && cartItems[0].restaurant_id !== menuItem[0].restaurant_id) {
      return res.status(400).json({ error: 'Cart has items from another restaurant. Clear cart first.', code: 'DIFFERENT_RESTAURANT' });
    }

    const [existing] = await pool.query('SELECT * FROM cart WHERE user_id=? AND menu_item_id=?', [req.user.id, menu_item_id]);
    if (existing.length) {
      await pool.query('UPDATE cart SET quantity=quantity+? WHERE user_id=? AND menu_item_id=?', [quantity, req.user.id, menu_item_id]);
    } else {
      await pool.query('INSERT INTO cart (user_id,menu_item_id,quantity) VALUES(?,?,?)', [req.user.id, menu_item_id, quantity]);
    }
    res.json({ message: 'Added to cart' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update quantity
router.put('/update', auth, async (req, res) => {
  try {
    const { menu_item_id, quantity } = req.body;
    if (quantity <= 0) {
      await pool.query('DELETE FROM cart WHERE user_id=? AND menu_item_id=?', [req.user.id, menu_item_id]);
    } else {
      await pool.query('UPDATE cart SET quantity=? WHERE user_id=? AND menu_item_id=?', [quantity, req.user.id, menu_item_id]);
    }
    res.json({ message: 'Cart updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE clear cart
router.delete('/clear', auth, async (req, res) => {
  try {
    await pool.query('DELETE FROM cart WHERE user_id=?', [req.user.id]);
    res.json({ message: 'Cart cleared' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

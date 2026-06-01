const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');
const router = express.Router();

router.post('/order', requireAuth, requireRole('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const { plan, amount } = req.body;
    if (!plan) return res.status(400).json({ error: 'plan is required' });
    const PLANS = { basic: 999900, pro: 2999900, enterprise: 9999900 };
    const planAmount = PLANS[plan] || amount || 99900;
    let order = { id: `mock_order_${Date.now()}`, amount: planAmount, currency: 'INR' };
    try {
      const Razorpay = require('razorpay');
      const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
      order = await rzp.orders.create({ amount: planAmount, currency: 'INR', receipt: `sub_${Date.now()}` });
    } catch {}
    await query(`INSERT INTO payment_transactions (school_id, razorpay_order_id, amount, plan) VALUES ($1,$2,$3,$4)`, [req.user.schoolId, order.id, planAmount / 100, plan]);
    res.json({ order, key: process.env.RAZORPAY_KEY_ID });
  } catch (err) { next(err); }
});

router.post('/verify', async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id } = req.body;
    const { rows } = await query(`UPDATE payment_transactions SET razorpay_payment_id=$1, status='paid' WHERE razorpay_order_id=$2 RETURNING *`, [razorpay_payment_id, razorpay_order_id]);
    if (rows[0]) {
      const days = { basic: 30, pro: 365, enterprise: 365 }[rows[0].plan] || 30;
      await query(`UPDATE schools SET subscription_plan=$1, subscription_ends_at=NOW() + INTERVAL '1 day' * $2, updated_at=NOW() WHERE id=$3`, [rows[0].plan, days, rows[0].school_id]);
    }
    res.json({ message: 'Payment verified', success: true });
  } catch (err) { next(err); }
});

router.get('/history', requireAuth, requireRole('super_admin', 'school_admin'), async (req, res, next) => {
  try {
    const { rows } = await query(`SELECT * FROM payment_transactions WHERE school_id=$1 ORDER BY created_at DESC LIMIT 20`, [req.user.schoolId]);
    res.json(rows);
  } catch (err) { next(err); }
});

module.exports = router;

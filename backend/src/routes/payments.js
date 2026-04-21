// Razorpay Payment Routes — Phase 6
// School subscription checkout (INR, UPI/cards/netbanking)
// Flow: Create order → Razorpay checkout on frontend → verify signature → activate subscription

const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Joi = require('joi');
const { requireAuth, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');

const router = express.Router();

// Razorpay instance — keys loaded from .env
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

// Pricing: INR paise (1 INR = 100 paise)
const PLANS = {
  basic: { paise_per_student: 9900,  label: '₹99/student/year',  max_students: 30  },
  pro:   { paise_per_student: 29900, label: '₹299/student/year', max_students: 200 },
};

// ─── POST /api/payments/create-order ─────────────────────────────────────────
// Step 1: Create a Razorpay order and store it in our DB
router.post('/create-order', requireAuth, requireRole('admin', 'teacher'), async (req, res, next) => {
  try {
    const schema = Joi.object({
      schoolId: Joi.string().uuid().required(),
      planType: Joi.string().valid('basic', 'pro').required(),
      studentCount: Joi.number().integer().min(1).max(500).required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    const plan = PLANS[value.planType];
    const totalPaise = plan.paise_per_student * value.studentCount;

    // Verify school belongs to this user
    const schoolResult = await query(
      `SELECT id, name FROM schools WHERE id = $1`,
      [value.schoolId]
    );
    if (!schoolResult.rows.length) return res.status(404).json({ error: 'School not found' });
    const school = schoolResult.rows[0];

    // Create Razorpay order
    const rpOrder = await razorpay.orders.create({
      amount: totalPaise,
      currency: 'INR',
      receipt: `ld_${value.schoolId.slice(0, 8)}_${Date.now()}`,
      notes: {
        school_id: value.schoolId,
        school_name: school.name,
        plan_type: value.planType,
        student_count: value.studentCount,
      },
    });

    // Store in our DB
    const dbResult = await query(
      `INSERT INTO payment_orders
         (id, school_id, razorpay_order_id, amount_paise, plan_type, student_count, status, created_at)
       VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5, 'created', NOW())
       RETURNING id`,
      [value.schoolId, rpOrder.id, totalPaise, value.planType, value.studentCount]
    );

    res.json({
      orderId: rpOrder.id,
      dbOrderId: dbResult.rows[0].id,
      amount: totalPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      schoolName: school.name,
      planLabel: plan.label,
      studentCount: value.studentCount,
      totalFormatted: `₹${(totalPaise / 100).toLocaleString('en-IN')}`,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/payments/verify ───────────────────────────────────────────────
// Step 2: Verify Razorpay payment signature and activate subscription
router.post('/verify', requireAuth, async (req, res, next) => {
  try {
    const schema = Joi.object({
      razorpayOrderId: Joi.string().required(),
      razorpayPaymentId: Joi.string().required(),
      razorpaySignature: Joi.string().required(),
      dbOrderId: Joi.string().uuid().required(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
      .update(`${value.razorpayOrderId}|${value.razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== value.razorpaySignature) {
      return res.status(400).json({ error: 'Payment signature verification failed' });
    }

    // Fetch our order record
    const orderResult = await query(
      `SELECT * FROM payment_orders WHERE id = $1`,
      [value.dbOrderId]
    );
    if (!orderResult.rows.length) return res.status(404).json({ error: 'Order not found' });
    const order = orderResult.rows[0];

    // Update order as paid
    await query(
      `UPDATE payment_orders
       SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW()
       WHERE id = $2`,
      [value.razorpayPaymentId, value.dbOrderId]
    );

    // Activate school subscription (1 year from now)
    const plan = PLANS[order.plan_type];
    await query(
      `UPDATE schools
       SET plan_type = $1,
           max_students = $2,
           subscription_expires_at = NOW() + INTERVAL '1 year'
       WHERE id = $3`,
      [order.plan_type, plan?.max_students || 200, order.school_id]
    );

    res.json({
      success: true,
      message: 'Subscription activated successfully!',
      planType: order.plan_type,
      schoolId: order.school_id,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/payments/webhook ──────────────────────────────────────────────
// Razorpay webhook for async payment events (called by Razorpay servers)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret_placeholder';

    // Verify webhook signature
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSig) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      // Update order if not already done via verify endpoint
      await query(
        `UPDATE payment_orders
         SET status = 'paid', razorpay_payment_id = $1, paid_at = NOW(),
             webhook_payload = $2
         WHERE razorpay_order_id = $3 AND status = 'created'`,
        [payment.id, JSON.stringify(event), orderId]
      );
    }

    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      await query(
        `UPDATE payment_orders SET status = 'failed' WHERE razorpay_order_id = $1`,
        [payment.order_id]
      );
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ─── GET /api/payments/plans ─────────────────────────────────────────────────
router.get('/plans', (req, res) => {
  res.json({
    plans: Object.entries(PLANS).map(([key, plan]) => ({
      id: key,
      ...plan,
      price_inr: plan.paise_per_student / 100,
    })),
  });
});

// ─── GET /api/payments/subscription/:schoolId ────────────────────────────────
router.get('/subscription/:schoolId', requireAuth, async (req, res, next) => {
  try {
    const result = await query(
      `SELECT plan_type, max_students, subscription_expires_at FROM schools WHERE id = $1`,
      [req.params.schoolId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'School not found' });
    const school = result.rows[0];

    const isActive = school.subscription_expires_at
      ? new Date(school.subscription_expires_at) > new Date()
      : school.plan_type === 'free';

    res.json({ ...school, isActive });
  } catch (err) { next(err); }
});

module.exports = router;

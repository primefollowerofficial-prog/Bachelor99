'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

const app = express();
const PORT = process.env.PORT || 3000;

/* ============================================
   CORS — restrict to your GitHub Pages origin in production
   ============================================ */
app.use(cors());

/* ============================================
   Firebase Admin SDK (server-side only — never expose this)
   ============================================ */
let db = null;
try {
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey
      })
    });
    db = admin.firestore();
    console.log('Firebase Admin initialized for project:', process.env.FIREBASE_PROJECT_ID);
  } else {
    console.warn('Firebase Admin NOT initialized — missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY env vars.');
  }
} catch (err) {
  console.error('Failed to initialize Firebase Admin:', err.message);
}

const ORDERS_COLLECTION = 'orders';

/* ============================================
   Cashfree config
   ============================================ */
const CASHFREE_ENV = (process.env.CASHFREE_ENV || 'SANDBOX').toUpperCase();
const CASHFREE_BASE_URL = CASHFREE_ENV === 'PRODUCTION'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2023-08-01';

function cashfreeHeaders(){
  return {
    'Content-Type': 'application/json',
    'x-api-version': CASHFREE_API_VERSION,
    'x-client-id': CASHFREE_APP_ID,
    'x-client-secret': CASHFREE_SECRET_KEY
  };
}

/* ============================================
   Product — price is controlled ONLY here, never trusted from the frontend
   ============================================ */
const PRODUCT_NAME = 'Bachelor 99 Survival Cookbook';
const PRODUCT_PRICE_INR = Number(process.env.PRODUCT_PRICE_INR || 99);
const MAX_QTY = 20;

/* ============================================
   Cashfree webhook — MUST be registered before express.json()
   so we can verify the signature against the exact raw request body.
   ============================================ */
function verifyCashfreeSignature(rawBody, timestamp, signature){
  if (!timestamp || !signature) return false;
  try {
    const signedPayload = timestamp + rawBody;
    const expected = crypto.createHmac('sha256', CASHFREE_SECRET_KEY).update(signedPayload).digest('base64');
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    return false;
  }
}

function mapCashfreePaymentStatus(status){
  if (status === 'SUCCESS') return 'SUCCESS';
  if (['FAILED', 'CANCELLED', 'USER_DROPPED', 'VOID', 'NOT_ATTEMPTED'].includes(status)) return 'FAILED';
  return 'PENDING';
}

app.post('/api/webhook/cashfree', express.raw({ type: '*/*' }), async (req, res) => {
  try {
    const rawBody = req.body.toString('utf8');
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];

    if (!verifyCashfreeSignature(rawBody, timestamp, signature)) {
      console.warn('Cashfree webhook: signature verification failed.');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody);
    const orderId = event?.data?.order?.order_id;
    const cfPaymentStatus = event?.data?.payment?.payment_status;
    const cfPaymentId = event?.data?.payment?.cf_payment_id || null;

    if (orderId && db) {
      const status = mapCashfreePaymentStatus(cfPaymentStatus);
      const update = { paymentStatus: status };
      if (status === 'SUCCESS') {
        update.paidAt = admin.firestore.FieldValue.serverTimestamp();
        update.paymentId = cfPaymentId;
      }
      await db.collection(ORDERS_COLLECTION).doc(orderId).set(update, { merge: true });
      console.log(`Webhook: order ${orderId} -> ${status}`);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook processing error:', err);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

/* ============================================
   Everything below this line uses normal JSON body parsing
   ============================================ */
app.use(express.json());

/* ============================================
   Create order: Firestore PENDING order + Cashfree order
   ============================================ */
app.post('/api/orders/create', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Server is not connected to the database yet.' });
    if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
      return res.status(500).json({ error: 'Payments are not configured on the server yet.' });
    }

    const { customerName, email, phone, quantity } = req.body || {};

    if (!customerName || !String(customerName).trim()) {
      return res.status(400).json({ error: 'Please enter your full name.' });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(String(email).trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    const phoneDigits = String(phone || '').replace(/\D/g, '').slice(-10);
    if (phoneDigits.length !== 10) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
    }

    const qty = Math.min(MAX_QTY, Math.max(1, parseInt(quantity, 10) || 1));
    const amount = PRODUCT_PRICE_INR * qty; // <-- price computed server-side ONLY

    const orderId = `b99_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const customerNameClean = String(customerName).trim().slice(0, 100);
    const emailClean = String(email).trim().toLowerCase();

    await db.collection(ORDERS_COLLECTION).doc(orderId).set({
      orderId,
      customerName: customerNameClean,
      email: emailClean,
      phone: phoneDigits,
      product: PRODUCT_NAME,
      quantity: qty,
      amount,
      paymentStatus: 'PENDING',
      paymentId: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      paidAt: null,
      downloadCount: 0
    });

    const siteUrl = process.env.SITE_URL || 'http://localhost:5500';
    const backendUrl = process.env.RAILWAY_PUBLIC_URL || `http://localhost:${PORT}`;

    const cfResponse = await fetch(`${CASHFREE_BASE_URL}/orders`, {
      method: 'POST',
      headers: cashfreeHeaders(),
      body: JSON.stringify({
        order_id: orderId,
        order_amount: amount,
        order_currency: 'INR',
        customer_details: {
          customer_id: orderId,
          customer_name: customerNameClean,
          customer_email: emailClean,
          customer_phone: phoneDigits
        },
        order_meta: {
          return_url: `${siteUrl.replace(/\/$/, '')}/thankyou.html?order_id={order_id}`,
          notify_url: `${backendUrl.replace(/\/$/, '')}/api/webhook/cashfree`
        },
        order_note: `${PRODUCT_NAME} x${qty}`
      })
    });

    const cfData = await cfResponse.json();

    if (!cfResponse.ok || !cfData.payment_session_id) {
      console.error('Cashfree order creation failed:', cfData);
      await db.collection(ORDERS_COLLECTION).doc(orderId).set({ paymentStatus: 'FAILED' }, { merge: true });
      return res.status(502).json({ error: 'Could not start payment. Please try again.' });
    }

    await db.collection(ORDERS_COLLECTION).doc(orderId).set({ cfOrderId: cfData.cf_order_id || null }, { merge: true });

    res.json({
      orderId,
      paymentSessionId: cfData.payment_session_id,
      mode: CASHFREE_ENV.toLowerCase()
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: 'Something went wrong creating your order. Please try again.' });
  }
});

/* ============================================
   Order status — used by the Thank You page.
   Never trust the browser redirect alone: if Firestore still shows PENDING
   (e.g. webhook delayed), double-check directly with Cashfree.
   ============================================ */
app.get('/api/orders/status/:orderId', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Server is not connected to the database yet.' });

    const { orderId } = req.params;
    const docRef = db.collection(ORDERS_COLLECTION).doc(orderId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found.' });

    let order = doc.data();

    if (order.paymentStatus === 'PENDING' && CASHFREE_APP_ID && CASHFREE_SECRET_KEY) {
      try {
        const cfRes = await fetch(`${CASHFREE_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
          headers: cashfreeHeaders()
        });
        const cfData = await cfRes.json();
        if (cfRes.ok) {
          if (cfData.order_status === 'PAID') {
            await docRef.set({ paymentStatus: 'SUCCESS', paidAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
            order.paymentStatus = 'SUCCESS';
          } else if (['EXPIRED', 'TERMINATED'].includes(cfData.order_status)) {
            await docRef.set({ paymentStatus: 'FAILED' }, { merge: true });
            order.paymentStatus = 'FAILED';
          }
        }
      } catch (e) {
        console.warn('Cashfree status re-check failed:', e.message);
      }
    }

    res.json({
      orderId: order.orderId,
      customerName: order.customerName,
      product: order.product,
      quantity: order.quantity,
      amount: order.amount,
      paymentStatus: order.paymentStatus
    });
  } catch (err) {
    console.error('Order status error:', err);
    res.status(500).json({ error: 'Could not fetch order status.' });
  }
});

/* ============================================
   Secure ebook download — only for confirmed SUCCESS orders
   ============================================ */
app.get('/api/download/:orderId', async (req, res) => {
  try {
    if (!db) return res.status(500).json({ error: 'Server is not connected to the database yet.' });

    const { orderId } = req.params;
    const docRef = db.collection(ORDERS_COLLECTION).doc(orderId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: 'Order not found.' });

    const order = doc.data();
    if (order.paymentStatus !== 'SUCCESS') {
      return res.status(403).json({ error: 'Payment has not been confirmed for this order yet.' });
    }

    const filePath = process.env.EBOOK_FILE_PATH || path.join(__dirname, 'private', 'bachelor-99-survival-cookbook.pdf');
    if (!fs.existsSync(filePath)) {
      console.error('Ebook file missing at', filePath);
      return res.status(500).json({ error: 'The ebook file is not configured on the server yet. Please contact support.' });
    }

    await docRef.set({ downloadCount: admin.firestore.FieldValue.increment(1) }, { merge: true });
    res.download(filePath, 'Bachelor-99-Survival-Cookbook.pdf');
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Could not process your download. Please contact support.' });
  }
});

/* ============================================
   AI chat (OpenRouter) — unchanged from previous setup
   ============================================ */
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

const SYSTEM_PROMPT = `You are the friendly AI assistant for the Bachelor 99 Survival Cookbook website.

Your job is to help visitors understand the cookbook, decide whether it is useful for them, and guide them through the website and purchase process.

The cookbook is designed for bachelors, students, beginners, young professionals, and anyone who wants simple, affordable and practical Indian meals.

The current product is:
Bachelor 99 Survival Cookbook

Current promotional price: ₹99
Original price: ₹199

The product is a digital ebook/cookbook.

Be friendly, conversational, helpful and concise. Use natural language and occasional attractive emojis such as ❤️ 🍳 👨‍🍳 🔥 😋 💰 📖 😊, but do not overuse them.

You should be able to answer questions such as: how to buy, what's included, why it's useful for beginners/bachelors, pricing, whether it's a physical or digital product, and how the cart/checkout works.

When comparing this cookbook to other ebooks, never make false claims about specific competitors. Explain its advantages based on its positioning: simple recipes, beginner friendly, practical Indian meals, budget-conscious cooking, bachelor-friendly, quick meal preparation, straightforward instructions.

Never invent features that are not present on the website. Never claim the cookbook contains something unless confirmed.

If asked about payment, explain the customer can use the website's available checkout process (a short form asking name, email and phone, followed by secure Cashfree checkout). If asked something unrelated to the cookbook, politely say you're mainly here to help with the Bachelor 99 cookbook and website. If you don't know the answer from available product information, say so honestly instead of hallucinating.

The goal is not to pressure the user into buying — the goal is to help them make an informed decision. Always be honest, helpful, and friendly.`;

app.post('/api/chat', async (req, res) => {
  try {
    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({ error: 'Server is not configured with an OpenRouter API key yet.' });
    }

    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'A non-empty "messages" array is required.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
        'X-Title': 'Bachelor 99 Survival Cookbook'
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 500
      }),
      signal: controller.signal
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenRouter error:', response.status, errText);
      return res.status(502).json({ error: 'The AI service returned an error. Please try again shortly.' });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(502).json({ error: 'The AI service returned an empty response.' });
    }

    res.json({ reply });
  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'The AI service took too long to respond. Please try again.' });
    }
    console.error('Chat endpoint error:', err);
    res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
  }
});

app.get('/api/health', (req, res) => res.json({
  ok: true,
  firebase: !!db,
  cashfree: !!(CASHFREE_APP_ID && CASHFREE_SECRET_KEY),
  cashfreeEnv: CASHFREE_ENV
}));

app.listen(PORT, () => {
  console.log(`Bachelor 99 backend running on http://localhost:${PORT}`);
});
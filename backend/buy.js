import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ===== ENVIRONMENT VARIABLES =====
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
// Backend URL – must include port for local testing
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

// Supabase client (using service role for backend operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Validate required environment variables
if (!process.env.PAYCHANGU_SECRET_KEY) {
  console.error('❌ PAYCHANGU_SECRET_KEY is missing in .env');
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Supabase credentials missing in .env');
  process.exit(1);
}

// ===== CORS CONFIGURATION =====
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json());

// ===== CREATE ORDER ENDPOINT =====
app.post('/api/paychangu/create-order', async (req, res) => {
  try {
    const { title, price, description, email, first_name, last_name, user_id } = req.body;

    if (!title || !price) return res.status(400).json({ success: false, error: 'Missing title or price' });
    if (!email || !first_name) return res.status(400).json({ success: false, error: 'Missing user info' });

    const tx_ref = uuidv4();

    const { data: order, error: insertError } = await supabase
      .from('bought')
      .insert({
        tx_ref,
        user_id: user_id || null,
        title,
        amount: price,
        currency: 'MWK',
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw new Error('Failed to save order: ' + insertError.message);

    const payload = {
      amount: String(price),
      currency: 'MWK',
      email,
      first_name,
      last_name: last_name || '',
      tx_ref,
      callback_url: `${BACKEND_URL}/api/paychangu/webhook`, // ✅ backend webhook
      return_url: `${BACKEND_URL}/api/paychangu/webhook`,   // ✅ browser redirect
      customization: { title, description: description || 'Payment' },
    };

    console.log('🚀 Sending to PayChangu:', payload);

    const response = await fetch('https://api.paychangu.com/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const rawResponse = await response.text();
    let result = JSON.parse(rawResponse);

    if (!response.ok || !result.data?.checkout_url) throw new Error(result.message || 'Invalid response from PayChangu');

    return res.json({ success: true, paymentUrl: result.data.checkout_url, tx_ref });
  } catch (error) {
    console.error('❌ Error creating order:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ===== WEBHOOK ENDPOINT =====
app.route('/api/paychangu/webhook')
  .post(async (req, res) => {
    try {
      const payload = req.body;
      console.log('📬 PayChangu webhook received:', payload);

      const { tx_ref, status } = payload;

      const { error: updateError } = await supabase
        .from('bought')
        .update({ status: status === 'success' ? 'paid' : 'failed' })
        .eq('tx_ref', tx_ref);

      if (updateError) return res.status(500).send('Database update failed');

      console.log(`✅ Order ${tx_ref} updated to status: ${status}`);
      res.status(200).send('Webhook received');
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      res.status(500).send('Webhook processing failed');
    }
  })
  .get((req, res) => {
    const { tx_ref, status } = req.query;
    console.log(`🔄 Redirecting user after payment (tx_ref: ${tx_ref}, status: ${status})`);

    let redirectUrl = `${FRONTEND_URL}/homescreen`;
    if (status === 'success') redirectUrl += `?payment_success=true&tx_ref=${tx_ref || ''}`;
    else redirectUrl += `?payment_cancelled=true`;

    console.log(`➡️ Redirecting to: ${redirectUrl}`);
    res.redirect(redirectUrl);
  });

// ===== START SERVER =====
app.listen(PORT, () => {
  console.log(`🔥 Server running on http://localhost:${PORT}`);
  console.log(`   Frontend URL: ${FRONTEND_URL}`);
  console.log(`   Backend URL (webhook): ${BACKEND_URL}`);
});

/*
💡 Development Tip:
If you want PayChangu to reach your localhost webhook, use a tunneling tool like ngrok:

ngrok http 3001

This will give you a public URL like:
https://abcdef.ngrok.io/api/paychangu/webhook
Set BACKEND_URL=https://abcdef.ngrok.io in your .env during dev.
*/
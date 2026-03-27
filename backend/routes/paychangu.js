const express = require('express');
const router = express.Router();

router.post('/create-order', async (req, res) => {
  try {
    const { productId, title, price, description } = req.body;

    // Validate input
    if (!title || !price) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Prepare order data for PayChangu
    const orderPayload = {
      amount: price,
      currency: "MWK",
      description: title,
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5173'}/payment-success?productId=${productId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:5173'}/payment-cancel`,
      // webhook_url: 'http://localhost:3001/api/webhooks/paychangu' // optional
    };

    // Call PayChangu API (replace with actual endpoint)
    const response = await fetch('https://api.paychangu.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'PayChangu API error');
    }

    // Return payment URL to frontend
    res.json({
      success: true,
      paymentUrl: result.data.payment_url, // adjust based on actual PayChangu response
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// --------------------
// Configuration & Setup
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

// Environment variables with defaults
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://student-plp2.onrender.com';
const BACKEND_URL = process.env.BACKEND_URL || 'https://student-1-5tjj.onrender.com';
const PAYCHANGU_SECRET_KEY = process.env.PAYCHANGU_SECRET_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (optional)
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// --------------------
// Helper Functions
// --------------------
const validatePhoneNumber = (phone: string): boolean => {
  const cleaned = phone.replace(/\s/g, '');
  return /^(088|099|098|081)\d{7}$/.test(cleaned);
};

const verifyPaymentWithPayChangu = async (reference: string) => {
  try {
    const response = await axios.get(
      `https://api.paychangu.com/transaction/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
          Accept: 'application/json',
        },
        timeout: 10000,
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// --------------------
// Routes
// --------------------

// Health check
app.get('/', (req: Request, res: Response) => {
  res.send('Backend is running successfully!');
});

// PayChangu POST callback (server-to-server notification)
app.post('/paychangu/callback', async (req: Request, res: Response) => {
  console.log('PayChangu POST Callback received:', JSON.stringify(req.body, null, 2));
  
  try {
    const { tx_ref, status, transaction_id } = req.body;
    
    if (!tx_ref) {
      console.error('No transaction reference in callback');
      return res.sendStatus(200); // Always acknowledge to prevent retries
    }
    
    console.log(`Payment ${tx_ref}: status = ${status}, transaction_id = ${transaction_id}`);
    
    if (status === 'successful') {
      // TODO: Update database, mark payment as completed, send email, etc.
      console.log(`✅ Payment ${tx_ref} completed successfully.`);
    } else if (status === 'failed') {
      console.log(`❌ Payment ${tx_ref} failed.`);
    }
    
    res.sendStatus(200);
  } catch (error) {
    console.error('Error processing POST callback:', error);
    res.sendStatus(200); // Always acknowledge
  }
});

// PayChangu GET callback (browser redirect after payment)
app.get('/paychangu/callback', (req: Request, res: Response) => {
  console.log('PayChangu GET Callback hit at:', new Date().toISOString());
  console.log('Query parameters:', req.query);

  // Build redirect URL with all received parameters
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (value) queryParams.set(key, value as string);
  }

  // If PayChangu indicates success, add our custom 'payment=success' parameter
  const status = req.query.status;
  if (status === 'successful' || status === 'completed') {
    queryParams.set('payment', 'success');
  }

  const redirectUrl = `${FRONTEND_URL}/sell?${queryParams.toString()}`;
  console.log(`Redirecting browser to: ${redirectUrl}`);

  // HTML with multiple fallback redirect methods
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Redirecting...</title>
        <meta http-equiv="refresh" content="0; url=${redirectUrl}">
        <script>
          window.location.href = "${redirectUrl}";
        </script>
      </head>
      <body>
        <p>Redirecting to <a href="${redirectUrl}">${redirectUrl}</a>...</p>
      </body>
    </html>
  `;
  res.send(html);
});

// Payment verification endpoint
app.get('/verify-payment/:reference', async (req: Request, res: Response) => {
  const { reference } = req.params;

  if (!reference) {
    return res.status(400).json({ error: 'Payment reference is required' });
  }

  try {
    console.log(`Verifying payment for reference: ${reference}`);
    const data = await verifyPaymentWithPayChangu(reference);
    res.json({ status: 'success', data });
  } catch (err: any) {
    console.error('Verification error:', err.message);

    if (err.response) {
      // PayChangu responded with an error
      return res.status(err.response.status).json({
        status: 'error',
        error: err.response.data?.message || 'Payment verification failed',
        details: err.response.data,
      });
    } else if (err.request) {
      // No response received
      return res.status(503).json({
        status: 'error',
        error: 'Payment service unavailable',
        details: 'Could not reach PayChangu verification service',
      });
    } else {
      // Something else
      return res.status(500).json({
        status: 'error',
        error: 'Internal server error during verification',
        details: err.message,
      });
    }
  }
});

// Create payment endpoint
app.post('/create-payment', async (req: Request, res: Response) => {
  try {
    const { amount, phone, reference } = req.body;

    // --- Input validation ---
    if (!amount || !phone || !reference) {
      return res.status(400).json({
        status: 'error',
        error: 'Missing required fields',
        details: 'Amount, phone, and reference are required',
      });
    }

    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid amount',
        details: 'Amount must be a positive number',
      });
    }

    if (!validatePhoneNumber(phone)) {
      return res.status(400).json({
        status: 'error',
        error: 'Invalid phone number',
        details: 'Please enter a valid Malawian mobile number (e.g., 0888123456)',
      });
    }

    // --- Prepare PayChangu payload ---
    const returnUrl = `${FRONTEND_URL}/sell?payment=success&tx_ref=${reference}`;
    const callbackUrl = `${BACKEND_URL}/paychangu/callback`;

    const paychanguData = {
      amount: amountNumber,
      currency: 'MWK',
      email: 'customer@student-market.com', // Ideally collect from user
      first_name: 'Student',
      last_name: 'Market User',
      phone: phone.replace(/\s/g, ''),
      tx_ref: reference,
      return_url: returnUrl,
      callback_url: callbackUrl,
      title: 'Student Market Upload Fee',
      description: `Product listing fee - Reference: ${reference}`,
      client_ip: req.ip || req.connection.remoteAddress,
    };

    console.log('Initializing payment with PayChangu:', paychanguData);

    // --- Call PayChangu API ---
    const response = await axios.post(
      'https://api.paychangu.com/payment',
      paychanguData,
      {
        headers: {
          Authorization: `Bearer ${PAYCHANGU_SECRET_KEY}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    console.log('PayChangu response:', {
      status: response.status,
      data: response.data,
    });

    // --- Validate PayChangu response ---
    if (response.data.status !== 'success' || !response.data.data?.checkout_url) {
      console.error('Invalid PayChangu response:', response.data);
      return res.status(502).json({
        status: 'error',
        error: 'Payment provider returned an invalid response',
        details: response.data,
      });
    }

    // --- Success: return checkout URL to frontend ---
    res.json({
      status: 'success',
      message: 'Payment initialized successfully',
      data: {
        checkout_url: response.data.data.checkout_url,
        tx_ref: reference,
        raw: response.data,
      },
    });
  } catch (err: any) {
    console.error('PayChangu Error:', {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status,
    });

    let errorMessage = 'Payment initialization failed';
    let statusCode = 500;

    if (err.response) {
      statusCode = err.response.status;
      errorMessage = err.response.data?.message || `Payment service error: ${err.response.status}`;
    } else if (err.request) {
      errorMessage = 'Payment service unavailable. Please try again later.';
    } else if (err.code === 'ECONNABORTED') {
      errorMessage = 'Payment request timeout. Please try again.';
    }

    res.status(statusCode).json({
      status: 'error',
      error: errorMessage,
      details: err.response?.data || err.message,
    });
  }
});

// --------------------
// Error Handling Middleware
// --------------------
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    status: 'error',
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ status: 'error', error: 'Endpoint not found' });
});

// --------------------
// Start Server
// --------------------
app.listen(PORT, HOST, () => {
  console.log(`=================================`);
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`📱 PayChangu Key: ${PAYCHANGU_SECRET_KEY ? '✓ Loaded' : '✗ Missing'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================`);
});

import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// --------------------
// Setup
// --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "./.env") });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------
// Health Check
// --------------------
app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});

// --------------------
// PayChangu Callback
// --------------------
app.post("/paychangu/callback", async (req, res) => {
  console.log("PayChangu Callback Received:", JSON.stringify(req.body, null, 2));
  
  try {
    const { tx_ref, status, transaction_id } = req.body;
    
    if (!tx_ref) {
      console.error("No transaction reference in callback");
      return res.sendStatus(200); // Still return 200 to prevent retries
    }
    
    // Log the payment status
    console.log(`Payment Callback for ${tx_ref}: Status = ${status}, Transaction ID = ${transaction_id}`);
    
    if (status === 'successful') {
      // Here you could:
      // 1. Update your database to mark the payment as completed
      // 2. Send email notifications
      // 3. Trigger other business logic
      console.log(`✅ Payment ${tx_ref} completed successfully`);
      
      // Example database update (you'll need to implement your own DB logic):
      // await updatePaymentStatus(tx_ref, 'paid', transaction_id);
    } else if (status === 'failed') {
      console.log(`❌ Payment ${tx_ref} failed`);
    }
    
    // Always return 200 to acknowledge receipt
    res.sendStatus(200);
    
  } catch (error) {
    console.error("Callback processing error:", error);
    // Still return 200 to prevent PayChangu from retrying
    res.sendStatus(200);
  }
});

// --------------------
// PayChangu Callback (GET - for testing/browser redirects)
// --------------------
app.get("/paychangu/callback", (req, res) => {
  console.log("PayChangu GET Callback:", req.query);
  return res.status(200).json({
    message: "Callback received successfully",
    data: req.query
  });
});

// --------------------
// Payment Verification Endpoint
// --------------------
app.get("/verify-payment/:reference", async (req, res) => {
  try {
    const { reference } = req.params;
    
    if (!reference) {
      return res.status(400).json({ error: "Payment reference is required" });
    }
    
    console.log(`Verifying payment for reference: ${reference}`);
    
    // Call PayChangu API to verify the transaction
    const response = await axios.get(
      `https://api.paychangu.com/transaction/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
          Accept: "application/json",
        },
        timeout: 10000,
      }
    );
    
    // Return the verification data
    res.json({
      status: 'success',
      data: response.data
    });
    
  } catch (err) {
    console.error("Verification error:", err.message);
    
    // If PayChangu API returns an error, provide a helpful response
    if (err.response) {
      // PayChangu API returned an error
      res.status(err.response.status).json({
        status: 'error',
        error: err.response.data?.message || 'Payment verification failed',
        details: err.response.data
      });
    } else if (err.request) {
      // Request was made but no response received
      res.status(503).json({
        status: 'error',
        error: 'Payment service unavailable',
        details: 'Could not reach payment verification service'
      });
    } else {
      // Something else went wrong
      res.status(500).json({
        status: 'error',
        error: 'Internal server error during verification',
        details: err.message
      });
    }
  }
});

// --------------------
// Create Payment
// --------------------
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, phone, reference } = req.body;

    // Validate required fields
    if (!amount || !phone || !reference) {
      return res.status(400).json({ 
        status: 'error',
        error: "Missing required fields",
        details: "Amount, phone, and reference are required" 
      });
    }

    // Validate amount
    const amountNumber = Number(amount);
    if (isNaN(amountNumber) || amountNumber <= 0) {
      return res.status(400).json({ 
        status: 'error',
        error: "Invalid amount",
        details: "Amount must be a positive number" 
      });
    }

    // Validate phone number (Malawian format)
    const phoneRegex = /^(088|099|098|081)\d{7}$/;
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return res.status(400).json({ 
        status: 'error',
        error: "Invalid phone number",
        details: "Please enter a valid Malawian mobile number (e.g., 0888123456)" 
      });
    }

    // --------------------
    // Environment URLs
    // --------------------
    const frontendUrl = process.env.FRONTEND_URL || "https://student-plp2.onrender.com";
    const backendUrl = process.env.BACKEND_URL || "https://student-1-5tjj.onrender.com";

    // Construct return URL - user will be redirected here after payment
    const returnUrl = `${frontendUrl}/sell?payment=success&tx_ref=${reference}`;
    
    // Callback URL for PayChangu server-to-server notifications
    const callbackUrl = `${backendUrl}/paychangu/callback`;

    console.log(`Initializing payment:`, {
      amount: amountNumber,
      phone,
      reference,
      returnUrl,
      callbackUrl
    });

    // --------------------
    // PayChangu Request
    // --------------------
    const paychanguData = {
      amount: amountNumber,
      currency: "MWK",
      email: "customer@student-market.com",
      first_name: "Student",
      last_name: "Market User",
      phone: phone.replace(/\s/g, ''), // Remove spaces from phone
      tx_ref: reference,
      return_url: returnUrl,
      callback_url: callbackUrl,
      title: "Student Market Upload Fee",
      description: `Product listing fee - Reference: ${reference}`,
      // Optional: Add customer IP for fraud detection
      client_ip: req.ip || req.connection.remoteAddress
    };

    console.log("Sending to PayChangu:", paychanguData);

    const response = await axios.post(
      "https://api.paychangu.com/payment",
      paychanguData,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    console.log("PayChangu response:", {
      status: response.status,
      data: response.data
    });

    // Return the payment data to frontend
    res.json({
      status: 'success',
      message: 'Payment initialized successfully',
      data: response.data
    });

  } catch (err) {
    console.error("PayChangu Error:", {
      message: err.message,
      response: err.response?.data,
      status: err.response?.status
    });

    // Determine error type
    let errorMessage = "Payment initialization failed";
    let statusCode = 500;
    
    if (err.response) {
      // PayChangu API returned an error
      statusCode = err.response.status;
      errorMessage = err.response.data?.message || `Payment service error: ${err.response.status}`;
    } else if (err.request) {
      // Request was made but no response received
      errorMessage = "Payment service unavailable. Please try again later.";
    } else if (err.code === 'ECONNABORTED') {
      // Request timeout
      errorMessage = "Payment request timeout. Please try again.";
    }

    res.status(statusCode).json({ 
      status: 'error',
      error: errorMessage,
      details: err.response?.data || err.message
    });
  }
});

// --------------------
// Error Handling Middleware
// --------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    status: 'error',
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// --------------------
// 404 Handler
// --------------------
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    error: 'Endpoint not found'
  });
});

// --------------------
// Start Server
// --------------------
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`=================================`);
  console.log(`🚀 Backend running on port ${PORT}`);
  console.log(`📱 PayChangu Key: ${process.env.PAYCHANGU_SECRET_KEY ? '✓ Loaded' : '✗ Missing'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================`);
});
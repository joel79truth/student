import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, './.env') });

const app = express();
app.use(cors()); 
app.use(express.json());

// Health Check
app.get('/', (req, res) => {
  res.send('Backend is running successfully!');
});

app.post('/create-payment', async (req, res) => {
  try {
    const { amount, phone, reference } = req.body;

    if (!amount || !phone || !reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Dynamic URL logic based on environment
    const frontendUrl = process.env.NODE_ENV === "production"
      ? "https://student-plp2.onrender.com" 
      : "http://localhost:5173";

    // Adding redirect=sell ensures your frontend knows to open the SellScreen
    const returnUrl = `${frontendUrl}?status=success&redirect=sell&tx_ref=${reference}`;

    console.log(`Initializing payment for ${phone}. Redirecting to: ${returnUrl}`);

    // 2. Request to PayChangu
    const response = await axios.post(
      'https://api.paychangu.com/payment',
      {
        amount,
        currency: 'MWK',
        email: 'customer@example.com',
        first_name: 'Customer',
        last_name: 'User',
        phone,
        tx_ref: reference,
        callback_url: "https://webhook.site/test", 
        return_url: returnUrl, 
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json"
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    const errorMsg = err.response?.data || err.message;
    console.error('PayChangu Error Details:', errorMsg); 
    res.status(500).json({ error: 'Payment initialization failed', details: errorMsg });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
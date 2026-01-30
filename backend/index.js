import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path'; // 1. Add this import
import { fileURLToPath } from 'url'; // 2. Add this import

// 3. Add these two lines to handle paths correctly in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 4. Update this line to look in the parent folder
dotenv.config({ path: path.resolve(__dirname, './.env') });

const app = express();
// This should now show your key instead of undefined!
console.log("Using Key:", process.env.PAYCHANGU_SECRET_KEY?.substring(0, 8) + "...");
// Add CORS so your frontend can make requests
app.use(cors({
 origin: ['http://localhost:5173', 'https://student-plp2.onrender.com'], // your frontend URL
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true, // only if you use cookies/auth
}));

app.use(express.json());

app.post('/create-payment', async (req, res) => {
  try {
    const { amount, phone, reference } = req.body;

    if (!amount || !phone || !reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
const response = await axios.post(
  'https://api.paychangu.com/payment', // Updated Endpoint
  {
    amount,
    currency: 'MWK',
    email: 'customer@example.com', // PayChangu often requires an email field
    first_name: 'Customer',        // and basic name fields for /payment
    last_name: 'User',
    phone,
    tx_ref: reference,             // PayChangu uses 'tx_ref' instead of 'reference' in this endpoint
    callback_url: "https://webhook.site/test", // Replace with your actual callback
   // Change this line in your axios call:
return_url: "http://localhost:5173/?status=success&tx_ref=" + reference,
  },
  {
    headers: {
      'Authorization': `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  }
);


    res.json(response.data);
  } catch (err) {
    console.error('PayChangu error:', err.response?.data || err.message);
    res.status(500).json({ error: 'Payment failed', details: err.response?.data || err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

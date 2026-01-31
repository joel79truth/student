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
// 1. Update CORS to be wide open for now
app.use(cors()); 

app.use(express.json());

// 2. ADD THIS: A "Health Check" route
app.get('/', (req, res) => {
  res.send('Backend is running successfully!');
});

app.post('/create-payment', async (req, res) => {
  try {
    const { amount, phone, reference } = req.body;
    console.log("Payment Request Received for:", phone, amount); // Log to Render console

    if (!amount || !phone || !reference) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
        return_url: process.env.NODE_ENV === "production"
            ? `https://student-plp2.onrender.com/?status=success&tx_ref=${reference}` // Use your FRONTEND URL here
            : `http://localhost:5173/?status=success&tx_ref=${reference}`
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
    // 3. Better error logging
    const errorMsg = err.response?.data || err.message;
    console.error('PayChangu Error Details:', errorMsg); 
    res.status(500).json({ error: 'Payment failed', details: errorMsg });
  }
});







const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

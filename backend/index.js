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

// --------------------
// Health Check
// --------------------
app.get("/", (req, res) => {
  res.send("Backend is running successfully!");
});

// --------------------
// PayChangu Callback
// --------------------
app.post("/paychangu/callback", (req, res) => {
  console.log("PayChangu Callback Received:", req.body);

  // TODO:
  // Verify transaction
  // Update database
  // Mark order as paid

  res.sendStatus(200);
});

// --------------------
// Create Payment
// --------------------
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, phone, reference } = req.body;

    if (!amount || !phone || !reference) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // --------------------
    // Environment URLs
    // --------------------
    const frontendUrl =
      process.env.NODE_ENV === "production"
        ? "https://student-plp2.onrender.com" // your frontend
        : "http://localhost:5173";

    const backendUrl =
      process.env.NODE_ENV === "production"
        ? "https://student-1-5tjj.onrender.com" // your backend
        : "http://localhost:5000";

   const returnUrl = `${frontendUrl}/sell?status=success&tx_ref=${reference}`;

    const callbackUrl = `${backendUrl}/paychangu/callback`;

    console.log(
      `Initializing payment for ${phone}. Redirecting to: ${returnUrl}`
    );

    // --------------------
    // PayChangu Request
    // --------------------
    const response = await axios.post(
      "https://api.paychangu.com/payment",
      {
       amount: Number(amount),
        currency: "MWK",
        email: "customer@example.com",
        first_name: "Customer",
        last_name: "User",
        phone,
        tx_ref: reference,
        return_url: returnUrl,
        callback_url: callbackUrl,
       

      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
         timeout: 15000,
      }
    );

    res.json(response.data);
  } catch (err) {
    const errorMsg = err.response?.data || err.message;
    console.error("PayChangu Error Details:", errorMsg);

    res
      .status(500)
      .json({ error: "Payment initialization failed", details: errorMsg });
  }
});

// --------------------
// Start Server
// --------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));

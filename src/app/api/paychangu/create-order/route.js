// app/api/paychangu/create-order/route.js
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. Parse product details from the request
    const { productId, title, price, description } = await request.json();

    // 2. (Optional) Get the authenticated user – adjust to your auth method
    // const session = await getServerSession(); // e.g., with NextAuth.js
    // if (!session) {
    //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    // }

    // 3. Prepare the order payload for PayChangu
    // Replace these fields with the exact ones required by PayChangu's API.
    const orderPayload = {
      amount: price,                     // amount in Malawi Kwacha (Mk)
      currency: "MWK",
      description: title,
      // optional: customer email, phone number, etc.
      callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success?productId=${productId}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancel`,
      // webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/paychangu`, // optional
    };

    // 4. Call PayChangu’s order creation endpoint
    const paychanguResponse = await fetch('https://api.paychangu.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAYCHANGU_SECRET_KEY}`,
      },
      body: JSON.stringify(orderPayload),
    });

    const result = await paychanguResponse.json();

    if (!paychanguResponse.ok) {
      throw new Error(result.message || 'PayChangu API error');
    }

    // 5. (Optional) Store order details in your database for later reference
    // await db.orders.create({ ... });

    // 6. Return the payment URL to the frontend
    return NextResponse.json({
      success: true,
      paymentUrl: result.data.payment_url, // adjust based on actual PayChangu response
    });
  } catch (error) {
    console.error('PayChangu order creation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
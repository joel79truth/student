import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('productId');

  useEffect(() => {
    // Optionally send a confirmation to your backend
    if (productId) {
      fetch('/api/orders/confirm', {
        method: 'POST',
        body: JSON.stringify({ productId, status: 'paid' }),
      }).catch(console.error);
    }
  }, [productId]);

  return (
    <div className="text-center py-10">
      <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
      <p>Thank you for your purchase. You will receive a confirmation email shortly.</p>
      <a href="/" className="text-blue-500 underline">Return to home</a>
    </div>
  );
}
export default function PaymentCancelPage() {
  return (
    <div className="text-center py-10">
      <h1 className="text-2xl font-bold text-red-600">Payment Cancelled</h1>
      <p>Your payment was not completed. You can try again from the product page.</p>
      <a href="/" className="text-blue-500 underline">Go back home</a>
    </div>
  );
}
export async function verifyRazorpayPaymentOnBackend({
  apiUrl,
  bookingId,
  paymentResponse,
  authToken,
  userId,
}) {
  const cleanUrl = String(apiUrl || '').replace(/\/+$/, '');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (userId) {
    headers['x-user-id'] = String(userId);
  }
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const verifyRes = await fetch(`${cleanUrl}/api/booking/verify`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      bookingId,
      razorpay_order_id: paymentResponse.razorpay_order_id,
      razorpay_payment_id: paymentResponse.razorpay_payment_id,
      razorpay_signature: paymentResponse.razorpay_signature,
    }),
  });

  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok || !verifyJson?.success) {
    throw new Error(verifyJson?.message || 'Payment verification failed');
  }

  return verifyJson;
}
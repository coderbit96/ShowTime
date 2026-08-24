import crypto from "node:crypto";
import Razorpay from "razorpay";

export class RazorpayConfigurationError extends Error {}

export function getRazorpayKeyId() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId)
    throw new RazorpayConfigurationError("RAZORPAY_KEY_ID is required.");
  return keyId;
}

export function getRazorpayClient() {
  const keyId = getRazorpayKeyId();
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret)
    throw new RazorpayConfigurationError("RAZORPAY_KEY_SECRET is required.");
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export function verifyRazorpayCheckoutSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret)
    throw new RazorpayConfigurationError("RAZORPAY_KEY_SECRET is required.");
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string | null,
) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret)
    throw new RazorpayConfigurationError(
      "RAZORPAY_WEBHOOK_SECRET is required.",
    );
  if (!signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

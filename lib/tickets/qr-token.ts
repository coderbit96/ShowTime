import crypto from "node:crypto";

type TicketQrClaims = { v: 1; bookingId: string; ticketId: string };

function getQrSecret() {
  const secret = process.env.TICKET_QR_SECRET;
  if (!secret) throw new Error("TICKET_QR_SECRET is required.");
  return secret;
}

function sign(value: string) {
  return crypto
    .createHmac("sha256", getQrSecret())
    .update(value)
    .digest("base64url");
}

export function createTicketQrPayload({
  bookingId,
  ticketId,
}: {
  bookingId: string;
  ticketId: string;
}) {
  const claims: TicketQrClaims = { v: 1, bookingId, ticketId };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyTicketQrPayload(payload: string): TicketQrClaims | null {
  const [encoded, signature, extra] = payload.split(".");
  if (!encoded || !signature || extra) return null;
  const expected = Buffer.from(sign(encoded));
  const received = Buffer.from(signature);
  if (
    expected.length !== received.length ||
    !crypto.timingSafeEqual(expected, received)
  )
    return null;
  try {
    const claims = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as TicketQrClaims;
    if (
      claims.v !== 1 ||
      !/^[a-f\d]{24}$/i.test(claims.bookingId) ||
      !claims.ticketId
    )
      return null;
    return claims;
  } catch {
    return null;
  }
}

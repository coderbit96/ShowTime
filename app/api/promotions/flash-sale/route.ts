import { NextResponse } from "next/server";
import { getActiveFlashSale } from "@/lib/promotions/flash-sale";

export async function GET() {
  const flashSale = await getActiveFlashSale();
  if (!flashSale)
    return NextResponse.json({
      flashSale: null,
      serverNow: new Date().toISOString(),
    });
  return NextResponse.json({ flashSale, serverNow: flashSale.serverNow });
}

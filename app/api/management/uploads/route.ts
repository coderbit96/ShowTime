import { NextRequest, NextResponse } from "next/server";
import {
  managementErrorResponse,
  requireManagementUser,
} from "@/lib/auth/require-management-user";
import { uploadEventImage, uploadVenueImage } from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireManagementUser(request);
    const formData = await request.formData();
    const folder = formData.get("folder") === "events" ? "events" : "venues";
    if (
      folder === "venues" &&
      actor.role === "ORGANIZER" &&
      !actor.canCreateVenues
    )
      throw new Error("Your account cannot upload venue images.");
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Attach an image file.");
    if (!file.type.startsWith("image/"))
      throw new Error("Only image uploads are allowed.");
    if (file.size > 8 * 1024 * 1024)
      throw new Error("Images must be 8 MB or smaller.");
    const uploaded = await (
      folder === "events" ? uploadEventImage : uploadVenueImage
    )(Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(uploaded, { status: 201 });
  } catch (error) {
    return managementErrorResponse(error);
  }
}

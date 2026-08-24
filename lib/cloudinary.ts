import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export function uploadMedia(file: Buffer, folder: "venues" | "events") {
  return new Promise<{ secureUrl: string; publicId: string }>(
    (resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: `show-time/${folder}`, resource_type: "image" },
        (error, result) => {
          if (error || !result) {
            reject(
              error ?? new Error("Cloudinary did not return an upload result."),
            );
            return;
          }
          resolve({ secureUrl: result.secure_url, publicId: result.public_id });
        },
      );
      stream.end(file);
    },
  );
}

export const uploadVenueImage = (file: Buffer) => uploadMedia(file, "venues");
export const uploadEventImage = (file: Buffer) => uploadMedia(file, "events");

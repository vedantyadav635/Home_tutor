import { NextResponse } from "next/server";
import { apiError, dbError, requireRole } from "@/lib/api";
import { photoUrl } from "@/lib/mappers";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" } as const;
type Ext = keyof typeof TYPES;

/** Detect the image type from the file's first bytes; the browser's content type can't be trusted. */
function sniff(b: Uint8Array): Ext | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  return null;
}

// multipart/form-data with the image in a field named "photo".
export async function POST(req: Request) {
  const auth = await requireRole("tutor");
  if (auth.response) return auth.response;
  const { user, supabase } = auth.data;

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024)
    return apiError(413, "too_large", "Photos can be at most 2 MB.", { photo: ["Photos can be at most 2 MB."] });

  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof File) || file.size === 0)
    return apiError(400, "validation_failed", "Please choose a photo.", { photo: ["Please choose a photo."] });
  if (file.size > MAX_BYTES)
    return apiError(413, "too_large", "Photos can be at most 2 MB.", { photo: ["Photos can be at most 2 MB."] });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = sniff(bytes);
  if (!ext) return apiError(400, "invalid_type", "Please upload a JPEG, PNG or WebP image.", { photo: ["Use a JPEG, PNG or WebP image."] });

  const tutor = await supabase.from("tutors").select("id").eq("id", user.id).maybeSingle();
  if (tutor.error) return dbError(tutor.error, "photo.lookup");
  if (!tutor.data) return apiError(404, "not_found", "Save your basic details before adding a photo.");

  const bucket = supabase.storage.from("tutor-photos");
  const path = `${user.id}/avatar.${ext}`;
  const up = await bucket.upload(path, bytes, { contentType: TYPES[ext], upsert: true, cacheControl: "300" });
  if (up.error) {
    console.error("[photo.upload]", up.error);
    return apiError(400, "upload_failed", "We couldn't upload that photo. Please try another one.");
  }
  // Remove an older avatar saved with a different extension.
  const others = (Object.keys(TYPES) as Ext[]).filter((e) => e !== ext).map((e) => `${user.id}/avatar.${e}`);
  await bucket.remove(others);

  const { error } = await supabase.from("tutors").update({ photo_path: path }).eq("id", user.id);
  if (error) return dbError(error, "photo.save");

  // Same path on every upload, so add a version to get past browser/CDN caches.
  return NextResponse.json({ photoUrl: `${photoUrl(path)}?v=${Date.now()}` });
}

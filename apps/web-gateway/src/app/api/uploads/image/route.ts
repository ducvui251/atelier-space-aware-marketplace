import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { IMAGE_UPLOAD_ALLOWED_MIME_TYPES, IMAGE_UPLOAD_MAX_BYTES, ImageUploadResponseSchema } from "@atelier/contracts";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { json, errorResponse } from "@/lib/server/respond";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/**
 * Server-side upload relay (G-05, MICROSERVICE_100_PLAN.md §9.3): the
 * browser never talks to Supabase Storage directly. This route validates
 * the caller, the file's MIME type and size, then writes the bytes using
 * the service-role key (bypassing RLS) so the bucket itself can stay
 * write-server-only. Requires SUPABASE_SERVICE_ROLE_KEY to be configured —
 * see runbooks/image-upload-setup.md for the one-time Supabase dashboard
 * setup (creating the bucket and copying the key). Until that's done this
 * route fails closed with a clear 500 rather than a confusing crash.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  const roleError = requireRole(user, ["artist"]);
  if (roleError) return errorResponse(roleError, user ? 403 : 401);

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) return errorResponse("A 'file' field is required", 400);

  if (!IMAGE_UPLOAD_ALLOWED_MIME_TYPES.includes(file.type as (typeof IMAGE_UPLOAD_ALLOWED_MIME_TYPES)[number])) {
    return errorResponse(`Unsupported image type '${file.type}'. Allowed: ${IMAGE_UPLOAD_ALLOWED_MIME_TYPES.join(", ")}`, 400);
  }
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return errorResponse(`Image exceeds the ${IMAGE_UPLOAD_MAX_BYTES} byte limit`, 400);
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "artwork-images";
  const extension = EXTENSION_BY_MIME[file.type] ?? "bin";
  const path = `artist-${user!.id}/${randomUUID()}.${extension}`;

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch {
    return errorResponse("Image upload is not configured on this deployment", 500);
  }

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, bytes, { contentType: file.type, upsert: false });
  if (uploadError) return errorResponse("Failed to store the uploaded image", 502);

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  const validated = ImageUploadResponseSchema.safeParse({ url: data.publicUrl });
  if (!validated.success) return errorResponse("Upload succeeded but returned an invalid URL", 500);

  return json(validated.data, 201);
}

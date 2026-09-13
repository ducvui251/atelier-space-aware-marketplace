import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { IMAGE_UPLOAD_ALLOWED_MIME_TYPES, IMAGE_UPLOAD_MAX_BYTES, ImageUploadResponseSchema } from "@atelier/contracts";
import { getAuthUser, requireRole } from "@/lib/server/auth";
import { createClient } from "@/lib/supabase/server";
import { json, errorResponse } from "@/lib/server/respond";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
const STORAGE_BUCKET = "artwork-images";
const STORAGE_TIMEOUT_MS = 10_000;

/** Bound Storage network work while keeping the caller's Supabase abort signal. */
async function fetchWithUploadTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const upstreamSignal = init?.signal;
  const abortForCaller = () => controller.abort();
  if (upstreamSignal?.aborted) abortForCaller();
  else upstreamSignal?.addEventListener("abort", abortForCaller, { once: true });
  const timer = setTimeout(() => controller.abort(), STORAGE_TIMEOUT_MS);

  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    // Read a clone before clearing the timer so the Storage response body is
    // covered by the same deadline as the upload request.
    await response.clone().arrayBuffer();
    return response;
  } finally {
    clearTimeout(timer);
    upstreamSignal?.removeEventListener("abort", abortForCaller);
  }
}

/**
 * The browser uploads only to this Gateway route. It validates the artist's
 * Supabase session and account role, then uses the cookie-bound Storage
 * client so `storage.objects` RLS can restrict writes to that auth user's
 * `artist-<uid>/` folder. The public bucket serves completed artwork images.
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
  if (file.size === 0 || file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return errorResponse(`Image must be between 1 and ${IMAGE_UPLOAD_MAX_BYTES} bytes`, 400);
  }

  let supabase;
  try {
    supabase = await createClient(fetchWithUploadTimeout);
  } catch {
    return errorResponse("Image upload is not configured on this deployment", 500);
  }

  let authUserId: string;
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return errorResponse("A signed-in Supabase session is required", 401);
    authUserId = authUser.id;
  } catch (error) {
    const message = error instanceof Error ? `${error.name} ${error.message}` : "";
    return /abort|timeout/i.test(message)
      ? errorResponse("Supabase session validation timed out", 504)
      : errorResponse("Supabase session validation is unavailable", 503);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = EXTENSION_BY_MIME[file.type] ?? "bin";
  // A content-addressed path makes retrying after a lost Gateway response
  // safe: the existing object has the same bytes and can be returned again.
  const digest = createHash("sha256").update(bytes).digest("hex");
  const path = `artist-${authUserId}/${digest}.${extension}`;

  let uploadError;
  try {
    ({ error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false }));
  } catch (error) {
    const message = error instanceof Error ? `${error.name} ${error.message}` : "";
    return /abort|timeout/i.test(message)
      ? errorResponse("Image upload timed out; retry the upload", 504)
      : errorResponse("Failed to store the uploaded image", 502);
  }

  const duplicate = uploadError?.message.toLowerCase().includes("already exists") ?? false;
  if (uploadError && !duplicate) {
    return /abort|timeout/i.test(uploadError.message)
      ? errorResponse("Image upload timed out; retry the upload", 504)
      : errorResponse("Failed to store the uploaded image", 502);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  const validated = ImageUploadResponseSchema.safeParse({ url: data.publicUrl });
  if (!validated.success) return errorResponse("Upload succeeded but returned an invalid URL", 500);
  return json(validated.data, duplicate ? 200 : 201);
}

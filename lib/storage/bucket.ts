import { createClient } from "@supabase/supabase-js";

export const STORAGE_BUCKET = "Personal Finance Assistant-buck";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function uploadUserFile(
  userId: string,
  fileName: string,
  buffer: Buffer | ArrayBuffer,
  contentType: string
): Promise<string | null> {
  try {
    const admin = getAdminClient();
    const path = `${userId}/${Date.now()}-${fileName}`;
    const body =
      buffer instanceof Buffer
        ? buffer
        : Buffer.from(buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer);

    const { error } = await admin.storage.from(STORAGE_BUCKET).upload(path, body, {
      contentType,
      upsert: false,
    });

    if (error) {
      console.warn("[storage] upload skipped:", error.message);
      return null;
    }

    const { data } = admin.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  } catch (err) {
    console.warn("[storage] upload error:", err);
    return null;
  }
}

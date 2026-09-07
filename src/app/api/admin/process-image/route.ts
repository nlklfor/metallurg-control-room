import { createClient } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import sharp from "sharp";
import { checkAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Receives an image (background already removed client-side by
 * @imgly/background-removal), converts it to WebP, and stores it in the
 * `products` Storage bucket. Uploads need the service role because that bucket
 * has no INSERT policy. Progress is streamed back as newline-delimited JSON.
 */

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(request: NextRequest) {
  const { isAdmin } = await checkAdmin();
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    file = formData.get("file") as File | null;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid form data" }), {
      status: 400,
    });
  }

  if (!file) {
    return new Response(JSON.stringify({ error: "No file provided" }), {
      status: 400,
    });
  }
  if (!file.type.startsWith("image/")) {
    return new Response(JSON.stringify({ error: "File is not an image" }), {
      status: 400,
    });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const originalName = file.name || "image.png";
  const buffer = Buffer.from(await file.arrayBuffer());
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        if (!serviceKey) {
          throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local",
          );
        }

        // Step 1: Convert to WebP with sharp (preserving alpha).
        send({
          step: "SHARP",
          msg: "> SHARP_CORE: Converting_to_WebP[Q:90]...",
        });

        const webpBuf = await sharp(buffer)
          .webp({ quality: 90 })
          .toBuffer();

        send({
          step: "SHARP_OK",
          msg: "> SHARP_CORE: Converting_to_WebP[Q:90]... OK",
        });

        // Step 2: Upload to Supabase Storage.
        const baseName = originalName.replace(/\.[^/.]+$/, "");
        const fileName = `uploads/${baseName}_${Date.now()}.webp`;

        send({ step: "STORAGE", msg: `> SP_STOR: Storing_Unit...` });

        const sb = makeServiceClient();
        const { error: upErr } = await sb.storage
          .from("products")
          .upload(fileName, webpBuf, {
            contentType: "image/webp",
            upsert: false,
          });

        if (upErr) throw new Error(`SP_STOR_ERR: ${upErr.message}`);

        const {
          data: { publicUrl },
        } = sb.storage.from("products").getPublicUrl(fileName);

        send({ step: "STORAGE_OK", msg: `> SP_STOR: Storing_Unit... OK` });
        send({
          step: "COMPLETE",
          msg: `[${originalName}: COMPLETE]`,
          publicUrl,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ step: "ERROR", msg: `> ERROR: ${msg}` });
        console.error("[process-image]", err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

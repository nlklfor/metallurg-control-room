import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const PHOTOROOM_URL = "https://sdk.photoroom.com/v1/segment";

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

async function getAdminUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) =>
          list.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Build a multipart/form-data body manually to guarantee correct binary encoding. */
function buildMultipart(
  fieldName: string,
  fileName: string,
  mimeType: string,
  data: Buffer,
): { body: Buffer; contentType: string } {
  const boundary = `----FormBoundary${Date.now()}${Math.random().toString(16).slice(2)}`;
  const crlf = "\r\n";
  const header = Buffer.from(
    `--${boundary}${crlf}` +
      `Content-Disposition: form-data; name="${fieldName}"; filename="${fileName}"${crlf}` +
      `Content-Type: ${mimeType}${crlf}` +
      crlf,
  );
  const footer = Buffer.from(`${crlf}--${boundary}--${crlf}`);
  return {
    body: Buffer.concat([header, data, footer]),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

export async function POST(request: NextRequest) {
  const user = await getAdminUser();
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!user || (adminEmail && user.email !== adminEmail)) {
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

  const photoroomKey = process.env.PHOTOROOM_API_KEY ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const originalName = file.name;
  const buffer = Buffer.from(await file.arrayBuffer());
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + "\n"));
      };

      try {
        // Guard: check env vars before starting
        if (!photoroomKey || photoroomKey === "your_photoroom_api_key_here") {
          throw new Error(
            "PHOTOROOM_API_KEY is not configured in .env.local",
          );
        }
        if (!serviceKey || serviceKey === "your_service_role_key_here") {
          throw new Error(
            "SUPABASE_SERVICE_ROLE_KEY is not configured in .env.local",
          );
        }

        // Step 1: Background removal via Photoroom
        send({ step: "PH_API", msg: "> PH_API: Requesting_BG_Removal..." });

        const { body: phBody, contentType: phCt } = buildMultipart(
          "image_file",
          originalName,
          file.type,
          buffer,
        );

        const phRes = await fetch(PHOTOROOM_URL, {
          method: "POST",
          headers: {
            "x-api-key": photoroomKey,
            "Content-Type": phCt,
          },
          body: new Uint8Array(phBody),
        });

        if (!phRes.ok) {
          const errText = await phRes.text().catch(() => phRes.statusText);
          const hint =
            phRes.status === 403
              ? " — check API key & plan tier at photoroom.com/api"
              : phRes.status === 401
                ? " — invalid API key"
                : "";
          throw new Error(`PH_API_ERR: ${phRes.status}${hint} ${errText}`);
        }

        const removedBgBuf = Buffer.from(await phRes.arrayBuffer());
        send({ step: "PH_API_OK", msg: "> PH_API: BG_Removal... OK" });

        // Step 2: Convert to WebP with sharp
        send({
          step: "SHARP",
          msg: "> SHARP_CORE: Converting_to_WebP[Q:90]...",
        });

        const webpBuf = await sharp(removedBgBuf)
          .webp({ quality: 90 })
          .toBuffer();

        send({
          step: "SHARP_OK",
          msg: "> SHARP_CORE: Converting_to_WebP[Q:90]... OK",
        });

        // Step 3: Upload to Supabase Storage
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

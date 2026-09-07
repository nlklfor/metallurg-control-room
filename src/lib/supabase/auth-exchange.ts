import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "./server";

/** Only allow same-origin relative redirects to avoid an open-redirect. */
function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/";
  return next;
}

/**
 * Completes an email auth redirect. Handles both shapes Supabase can send:
 *  - `?token_hash=…&type=…`  → verifyOtp (no PKCE code-verifier needed; works
 *    across devices and survives a link scanner that hits it first-ish)
 *  - `?code=…`               → exchangeCodeForSession (PKCE / OAuth)
 * On success redirects to `next` (relative), otherwise to /login?error=auth_failed.
 */
export async function completeAuthRedirect(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

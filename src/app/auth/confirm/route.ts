import { type NextRequest } from "next/server";
import { completeAuthRedirect } from "@/lib/supabase/auth-exchange";

// Target of the links in the Supabase email templates
// (docs/email-templates/*): {{ .SiteURL }}/auth/confirm?token_hash=…&type=…
export async function GET(request: NextRequest) {
  return completeAuthRedirect(request);
}

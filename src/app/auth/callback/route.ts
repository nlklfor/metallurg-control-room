import { type NextRequest } from "next/server";
import { completeAuthRedirect } from "@/lib/supabase/auth-exchange";

export async function GET(request: NextRequest) {
  return completeAuthRedirect(request);
}

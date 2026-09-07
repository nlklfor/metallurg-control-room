import type { User } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./shared";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}

/**
 * Authoritative admin check. Source of truth is the DB `public.admins` table
 * via the `is_admin()` SQL function (same predicate every RLS policy uses),
 * not an env var. Fail-closed: any error or falsy result denies access.
 */
export async function checkAdmin(): Promise<{
  user: User | null;
  isAdmin: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };

  const { data, error } = await supabase.rpc("is_admin");
  return { user, isAdmin: !error && data === true };
}

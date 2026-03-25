"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="text-[18px] font-bold text-[#0a0a0a]">METALLURG</p>
          <p className="mt-1 text-[11px] uppercase tracking-widest text-[#6b7280]">
            CONTROL ROOM
          </p>
        </div>
        <div className="border border-black p-10">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-black px-4 py-3 text-sm text-[#0a0a0a] focus:border-black focus:outline-none focus:ring-0"
            />
            <input
              type="password"
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-black px-4 py-3 text-sm text-[#0a0a0a] focus:border-black focus:outline-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black py-3 text-[11px] uppercase tracking-[0.3em] text-white hover:bg-[#222] disabled:opacity-60"
            >
              {loading ? "SIGNING IN..." : "SIGN IN →"}
            </button>
            {error ? (
              <p className="mt-2 text-xs text-red-500">{error}</p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}

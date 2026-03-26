"use client";

import { Suspense, useState, useEffect } from "react";
// import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  // const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  // const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  // Show error if redirected back with ?error= param
  useEffect(() => {
    const urlError = searchParams.get("error");
    const urlErrorDesc = searchParams.get("error_description");
    if (urlError) {
      if (urlErrorDesc) {
        setError(decodeURIComponent(urlErrorDesc.replace(/\+/g, " ")));
      } else if (urlError === "auth_failed") {
        setError("Authentication failed. Please try again.");
      } else {
        setError(
          "Sign-in failed. The link may have expired — request a new one.",
        );
      }
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    // --- Magic link (no password) ---
    const { error: signError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // Redirects to /auth/callback which exchanges the code for a session
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    // --- Password login (commented out until password is set) ---
    // const { error: signError } = await supabase.auth.signInWithPassword({
    //   email,
    //   password,
    // });

    setLoading(false);
    if (signError) {
      setError(signError.message);
      return;
    }

    // --- Password login redirect (commented out) ---
    // router.push("/");
    // router.refresh();

    setSent(true);
  }

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm text-center"
      >
        <p className="text-[18px] font-bold text-[#0a0a0a]">METALLURG</p>
        <p className="mt-1 text-[11px] uppercase tracking-widest text-[#6b7280]">
          CONTROL ROOM
        </p>
        <div className="mt-10 border border-black p-10">
          <p className="text-[13px] text-[#0a0a0a]">
            Check your email — a magic link has been sent to
          </p>
          <p className="mt-2 text-[13px] font-bold text-[#0a0a0a]">{email}</p>
          <p className="mt-4 text-[11px] text-[#6b7280]">
            Click the link in the email to sign in.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-6 text-[11px] text-[#6b7280] underline hover:text-black"
          >
            Send again
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05, ease: [0.25, 0.1, 0.25, 1] }}
        className="mb-10 text-center"
      >
        <p className="text-[18px] font-bold text-[#0a0a0a]">METALLURG</p>
        <p className="mt-1 text-[11px] uppercase tracking-widest text-[#6b7280]">
          CONTROL ROOM
        </p>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
        className="border border-black p-10"
      >
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
          {/* Password input — commented out until password is set */}
          {/* <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-black px-4 py-3 text-sm text-[#0a0a0a] focus:border-black focus:outline-none focus:ring-0"
          /> */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black py-3 text-[11px] uppercase tracking-[0.3em] text-white hover:bg-[#222] disabled:opacity-60"
          >
            {loading ? "SENDING..." : "SEND MAGIC LINK →"}
          </button>
          {error ? (
            <p className="mt-2 text-xs text-red-500">{error}</p>
          ) : null}
        </form>
      </motion.div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4">
      {/* Subtle dot-grid background */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        style={{
          backgroundImage:
            "radial-gradient(circle, #e5e7eb 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

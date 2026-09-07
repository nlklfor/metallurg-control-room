"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN = 45; // seconds

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const autoSubmitted = useRef(false);

  // Surface an error passed back from an /auth/* redirect.
  useEffect(() => {
    const urlError = searchParams.get("error");
    const urlErrorDesc = searchParams.get("error_description");
    if (!urlError) return;
    if (urlErrorDesc) {
      setError(decodeURIComponent(urlErrorDesc.replace(/\+/g, " ")));
    } else if (urlError === "auth_failed") {
      setError("That link didn't work. Request a fresh code below.");
    } else {
      setError("Sign-in failed. Request a fresh code below.");
    }
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const requestCode = useCallback(async () => {
    setError(null);
    setSending(true);
    const supabase = createClient();
    const { error: signError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Admins are added to public.admins out-of-band — never self-provision.
        shouldCreateUser: false,
      },
    });
    setSending(false);
    if (signError) {
      setError(signError.message);
      return;
    }
    autoSubmitted.current = false;
    setStep("code");
    setCooldown(RESEND_COOLDOWN);
  }, [email]);

  const verifyCode = useCallback(async () => {
    setError(null);
    setVerifying(true);
    const supabase = createClient();
    const { error: otpError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (otpError) {
      setVerifying(false);
      autoSubmitted.current = false;
      setError(otpError.message);
      return;
    }
    router.push("/");
    router.refresh();
  }, [email, code, router]);

  // Auto-verify once the 6th digit lands.
  useEffect(() => {
    if (step === "code" && code.length === 6 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void verifyCode();
    }
  }, [step, code, verifyCode]);

  const Wordmark = (
    <div className="mb-10 text-center">
      <p className="text-[18px] font-bold text-[#0a0a0a]">METALLURG</p>
      <p className="mt-1 text-[11px] uppercase tracking-[0.25em] text-[#6b7280]">
        CONTROL ROOM
      </p>
    </div>
  );

  if (step === "code") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-sm"
      >
        {Wordmark}
        <div className="border border-black p-10">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#9ca3af]">
            // CODE SENT
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-[#0a0a0a]">
            Enter the 6-digit code sent to
            <br />
            <span className="font-bold">{email.trim()}</span>
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) void verifyCode();
            }}
            className="mt-6 flex flex-col gap-3"
          >
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              autoFocus
              placeholder="000000"
              value={code}
              disabled={verifying}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-full border border-black px-4 py-3 text-center font-mono text-[22px] tracking-[0.5em] text-[#0a0a0a] focus:border-black focus:outline-none focus:ring-0 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full bg-black py-3 text-[11px] uppercase tracking-[0.3em] text-white hover:bg-[#222] disabled:opacity-40"
            >
              {verifying ? "VERIFYING..." : "VERIFY →"}
            </button>
          </form>

          {error ? (
            <p className="mt-3 text-xs text-red-500">{error}</p>
          ) : null}

          <div className="mt-6 flex items-center justify-between text-[11px] text-[#6b7280]">
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="hover:text-black"
            >
              ← change email
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || sending}
              onClick={() => void requestCode()}
              className="underline hover:text-black disabled:no-underline disabled:opacity-60"
            >
              {cooldown > 0 ? `resend in ${cooldown}s` : "send new code"}
            </button>
          </div>
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
      >
        {Wordmark}
      </motion.div>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
        className="border border-black p-10"
      >
        <p className="mb-4 text-[10px] uppercase tracking-[0.2em] text-[#9ca3af]">
          // SECURE SIGN-IN
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void requestCode();
          }}
          className="flex flex-col gap-4"
        >
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-black px-4 py-3 text-sm text-[#0a0a0a] focus:border-black focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            disabled={sending}
            className="w-full bg-black py-3 text-[11px] uppercase tracking-[0.3em] text-white hover:bg-[#222] disabled:opacity-60"
          >
            {sending ? "SENDING..." : "REQUEST CODE →"}
          </button>
          {error ? (
            <p className="mt-2 text-xs text-red-500">{error}</p>
          ) : null}
        </form>
        <p className="mt-4 text-[11px] leading-relaxed text-[#9ca3af]">
          We&apos;ll email a 6-digit code. No password needed.
        </p>
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

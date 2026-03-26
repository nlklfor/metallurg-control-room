"use client";

import { motion } from "framer-motion";

/**
 * Subtle animated dot-grid background — purely decorative.
 * Renders a CSS dot pattern with a slow breathing pulse.
 */
export function DotGrid() {
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      style={{
        backgroundImage:
          "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    />
  );
}

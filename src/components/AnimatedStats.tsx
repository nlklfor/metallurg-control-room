"use client";

import { motion, type Variants } from "framer-motion";

interface Stat {
  label: string;
  value: string;
}

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
    },
  },
};

const card: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
};

export function AnimatedStats({ stats }: { stats: Stat[] }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="mb-8 grid grid-cols-4 gap-4"
    >
      {stats.map((stat) => (
        <motion.div
          key={stat.label}
          variants={card}
          className="border border-[#e5e5e5] bg-white p-5"
        >
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">
            {stat.label}
          </p>
          <p className="text-[28px] font-bold text-[#0a0a0a]">{stat.value}</p>
        </motion.div>
      ))}
    </motion.div>
  );
}

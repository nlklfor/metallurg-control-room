"use client";

import { Boxes, ShoppingBag, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/inventory", label: "INVENTORY", icon: Boxes },
  { href: "/orders", label: "ORDERS", icon: ShoppingBag },
  { href: "/residents", label: "RESIDENTS", icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen border-r border-border bg-black p-4">
      <div className="border border-border bg-surface p-3 mb-6">
        <p className="text-xs tracking-[0.2em] text-zinc-400">METALLURG</p>
        <p className="text-sm tracking-[0.18em]">CONTROL_ROOM</p>
      </div>
      <nav className="flex flex-col gap-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 border px-3 py-2 text-sm tracking-wider transition-colors ${
                isActive
                  ? "border-white bg-white text-black"
                  : "border-border bg-surface text-white hover:border-white"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

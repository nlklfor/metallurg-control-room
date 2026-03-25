"use client";

import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

const navItems = [
  { href: "/", label: "OVERVIEW", icon: LayoutDashboard },
  { href: "/orders", label: "ORDERS", icon: ShoppingBag },
  { href: "/products", label: "PRODUCTS", icon: Package },
  { href: "/residents", label: "RESIDENTS", icon: Users },
] as const;

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col bg-[#111111] text-white">
      <div className="px-5 pb-4 pt-6">
        <p className="text-[13px] font-bold tracking-widest text-white">METALLURG</p>
        <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-[#6b7280]">
          CONTROL ROOM
        </p>
      </div>
      <div className="mx-3 border-b border-[#222]" />
      <nav className="flex flex-1 flex-col gap-0.5 px-3 pt-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 text-[12px] uppercase tracking-[0.15em] transition-colors",
                isActive
                  ? "border-l-2 border-white bg-[#1a1a1a] pl-[10px] text-white"
                  : "border-l-2 border-transparent pl-[10px] text-[#9ca3af] hover:bg-[#1a1a1a] hover:text-white",
              )}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[#222] px-5 pb-5 pt-4">
        <p className="truncate text-[10px] text-[#6b7280]" title={userEmail ?? ""}>
          {userEmail ?? "—"}
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          className="mt-2 text-[10px] text-[#6b7280] hover:text-white"
        >
          SIGN OUT
        </button>
      </div>
    </aside>
  );
}

"use client";

import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

const navItems = [
  { href: "/", label: "OVERVIEW", icon: LayoutDashboard },
  { href: "/orders", label: "ORDERS", icon: ShoppingBag },
  { href: "/products", label: "PRODUCTS", icon: Package },
  { href: "/residents", label: "RESIDENTS", icon: Users },
] as const;

export function Sidebar({ userEmail }: { userEmail: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between px-5 pb-4 pt-6">
        <div>
          <p className="text-[13px] font-bold tracking-widest text-white">METALLURG</p>
          <p className="mt-0.5 text-[9px] uppercase tracking-[0.2em] text-[#6b7280]">
            CONTROL ROOM
          </p>
        </div>
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="block lg:hidden text-[#6b7280] hover:text-white"
        >
          <X size={18} />
        </button>
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
              onClick={() => setMobileOpen(false)}
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
    </>
  );

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 block lg:hidden rounded bg-[#111111] p-2 text-white"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen w-[220px] flex-col bg-[#111111] text-white transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar (always visible) */}
      <aside className="hidden lg:fixed lg:left-0 lg:top-0 lg:z-40 lg:flex lg:h-screen lg:w-[220px] lg:flex-col lg:bg-[#111111] lg:text-white">
        {sidebarContent}
      </aside>
    </>
  );
}
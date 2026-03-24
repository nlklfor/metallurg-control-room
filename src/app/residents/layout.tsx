import type { ReactNode } from "react";
import { Sidebar } from "@/components/sidebar";

export default function InventoryLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-black text-white flex">
      <Sidebar />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

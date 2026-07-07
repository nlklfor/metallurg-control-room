"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type BotUserRow = {
  tg_username?: string | null;
  chat_id?: number | string | null;
  created_at?: string | null;
};

type OrderCountRow = {
  customer_chat_id?: number | string | null;
};

function formatRegisteredAt(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

function avatarLetter(handle: string): string {
  const clean = handle.replace(/^@/, "");
  return (clean[0] ?? "?").toUpperCase();
}

function avatarColor(handle: string): string {
  const colors = [
    "bg-[#1a1a1a]",
    "bg-[#374151]",
    "bg-[#1e3a5f]",
    "bg-[#3b1f2b]",
    "bg-[#1a3a2a]",
    "bg-[#2d1f3d]",
    "bg-[#3a2a1a]",
    "bg-[#1f2d3a]",
  ];
  let hash = 0;
  for (let i = 0; i < handle.length; i++) {
    hash = (hash * 31 + handle.charCodeAt(i)) & 0xffffffff;
  }
  return colors[Math.abs(hash) % colors.length] ?? colors[0];
}

function ResidentRow({
  row,
  i,
  orderCount,
}: {
  row: BotUserRow;
  i: number;
  orderCount: number;
}) {
  const handle = row.tg_username ?? "";
  const displayHandle = handle ? `@${handle}` : "—";
  const chatId = row.chat_id == null ? null : String(row.chat_id);
  const isVerified = orderCount >= 3;
  const letter = handle ? avatarLetter(handle) : "?";
  const bgColor = handle ? avatarColor(handle) : "bg-[#374151]";

  return (
    <tr
      className={cn(
        i % 2 === 1 ? "border-b border-[#f5f5f5] bg-[#f9fafb]" : "border-b border-[#f5f5f5] bg-white",
        "hover:bg-[#f5f5f5] transition-colors"
      )}
    >
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center text-[11px] font-bold text-white ${bgColor}`}
          >
            {letter}
          </div>
          <span className="font-medium text-[#0a0a0a]">{displayHandle}</span>
        </div>
      </td>

      <td className="px-4 py-3 tabular-nums text-[#6b7280]">{chatId ?? "—"}</td>

      <td className="px-4 py-3 tabular-nums">
        {orderCount > 0 ? (
          <span className="font-medium text-[#0a0a0a]">{orderCount}</span>
        ) : (
          <span className="text-[#d1d5db]">0</span>
        )}
      </td>

      <td className="px-4 py-3">
        {isVerified ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#0a0a0a]">
            <span className="inline-flex h-4 w-4 items-center justify-center bg-black text-white text-[8px]">
              ✓
            </span>
            VERIFIED
          </span>
        ) : (
          <span className="text-[11px] text-[#d1d5db]">—</span>
        )}
      </td>

      <td className="px-4 py-3 text-[#6b7280]">{formatRegisteredAt(row.created_at)}</td>
    </tr>
  );
}

export default function ResidentsPage() {
  const [rows, setRows] = useState<BotUserRow[]>([]);
  const [orderCountMap, setOrderCountMap] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    const [usersRes, ordersRes] = await Promise.all([
      supabase
        .from("bot_users")
        .select("tg_username, chat_id, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("orders").select("customer_chat_id"),
    ]);

    if (usersRes.error) {
      setError(usersRes.error.message);
    } else {
      setRows((usersRes.data as BotUserRow[]) ?? []);
    }

    const map = new Map<string, number>();
    for (const o of (ordersRes.data ?? []) as OrderCountRow[]) {
      if (o.customer_chat_id == null) continue;
      const key = String(o.customer_chat_id);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    setOrderCountMap(map);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">Loading residents...</p>
      </div>
    );
  }

  if (error && rows.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-500">Error: {error}</p>
        <button
          onClick={() => void loadData()}
          className="mt-4 border border-black px-4 py-2 text-[11px] uppercase tracking-[0.15em] hover:bg-black hover:text-white transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
          // TOTAL_RESIDENTS: {rows.length}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto border border-[#e5e5e5] lg:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#f9fafb]">
              {["RESIDENT", "CHAT_ID", "ORDERS", "STATUS", "REGISTERED_AT"].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.15em] text-[#6b7280]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <ResidentRow
                key={`${row.chat_id ?? ""}-${i}`}
                row={row}
                i={i}
                orderCount={orderCountMap.get(String(row.chat_id)) ?? 0}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 lg:hidden">
        {rows.map((row, i) => {
          const handle = row.tg_username ?? "";
          const displayHandle = handle ? `@${handle}` : "—";
          const chatId = row.chat_id == null ? null : String(row.chat_id);
          const oc = orderCountMap.get(String(row.chat_id)) ?? 0;
          const isVerified = oc >= 3;
          const letter = handle ? avatarLetter(handle) : "?";
          const bgColor = handle ? avatarColor(handle) : "bg-[#374151]";

          return (
            <div
              key={`${chatId ?? ""}-${i}`}
              className="border border-[#e5e5e5] bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center text-[12px] font-bold text-white ${bgColor}`}
                >
                  {letter}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium text-[13px] text-[#0a0a0a]">
                      {displayHandle}
                    </span>
                    {isVerified && (
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center bg-black text-white text-[8px]">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#6b7280]">{chatId ?? "—"}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-[12px] tabular-nums font-medium text-[#0a0a0a]">
                    {oc} {oc === 1 ? "order" : "orders"}
                  </span>
                  <span className="block text-[10px] text-[#9ca3af]">
                    {formatRegisteredAt(row.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <div className="border border-[#e5e5e5] py-20 text-center">
          <p className="text-[13px] text-[#6b7280]">No residents found.</p>
        </div>
      )}
    </div>
  );
}

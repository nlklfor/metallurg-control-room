import { createClient } from "@/lib/supabase/server";

type BotUserRow = {
  id?: string;
  tg_username?: string | null;
  username?: string | null;
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

/** Get the first letter of a username for the avatar */
function avatarLetter(handle: string): string {
  const clean = handle.replace(/^@/, "");
  return (clean[0] ?? "?").toUpperCase();
}

/** Deterministic muted color based on username */
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

export default async function ResidentsPage() {
  const supabase = await createClient();

  const [usersRes, ordersRes] = await Promise.all([
    supabase
      .from("bot_users")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("customer_chat_id"),
  ]);

  const rows = (usersRes.data ?? []) as BotUserRow[];
  const orderRows = (ordersRes.data ?? []) as OrderCountRow[];

  // Build a map: chat_id → order count
  const orderCountMap = new Map<string, number>();
  for (const o of orderRows) {
    if (o.customer_chat_id == null) continue;
    const key = String(o.customer_chat_id);
    orderCountMap.set(key, (orderCountMap.get(key) ?? 0) + 1);
  }

  const count = usersRes.error ? 0 : rows.length;

  return (
    <div>
      <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
        // TOTAL_RESIDENTS: {count}
      </p>

      {usersRes.error ? (
        <p className="text-sm text-red-500">{usersRes.error.message}</p>
      ) : (
        <div className="overflow-x-auto border border-[#e5e5e5]">
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
              {rows.map((row, i) => {
                const handle = row.tg_username ?? row.username ?? "";
                const displayHandle = handle ? `@${handle}` : "—";
                const chatId = row.chat_id == null ? null : String(row.chat_id);
                const orderCount = chatId ? (orderCountMap.get(chatId) ?? 0) : 0;
                const isVerified = orderCount >= 3;
                const letter = handle ? avatarLetter(handle) : "?";
                const bgColor = handle ? avatarColor(handle) : "bg-[#374151]";

                return (
                  <tr
                    key={row.id ?? `${chatId ?? ""}-${i}`}
                    className={
                      i % 2 === 1
                        ? "border-b border-[#f5f5f5] bg-[#f9fafb]"
                        : "border-b border-[#f5f5f5] bg-white"
                    }
                  >
                    {/* Avatar + username */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center text-[11px] font-bold text-white ${bgColor}`}
                        >
                          {letter}
                        </div>
                        <span className="font-medium text-[#0a0a0a]">
                          {displayHandle}
                        </span>
                      </div>
                    </td>

                    {/* Chat ID */}
                    <td className="px-4 py-3 tabular-nums text-[#6b7280]">
                      {chatId ?? "—"}
                    </td>

                    {/* Order count */}
                    <td className="px-4 py-3 tabular-nums">
                      {orderCount > 0 ? (
                        <span className="font-medium text-[#0a0a0a]">
                          {orderCount}
                        </span>
                      ) : (
                        <span className="text-[#d1d5db]">0</span>
                      )}
                    </td>

                    {/* Verified badge */}
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

                    {/* Registered at */}
                    <td className="px-4 py-3 text-[#6b7280]">
                      {formatRegisteredAt(row.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

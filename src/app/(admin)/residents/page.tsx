import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

type BotUserRow = {
  id?: string;
  tg_username?: string | null;
  username?: string | null;
  chat_id?: number | string | null;
  created_at?: string | null;
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

export default async function ResidentsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bot_users")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as BotUserRow[];
  const count = error ? 0 : rows.length;

  return (
    <div>
      <p className="mb-6 text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
        // TOTAL_RESIDENTS: {count}
      </p>
      {error ? (
        <p className="text-sm text-red-500">{error.message}</p>
      ) : (
        <div className="overflow-x-auto border border-[#e5e5e5]">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#e5e5e5] bg-[#f9fafb]">
                {["USERNAME", "CHAT_ID", "REGISTERED_AT"].map((h) => (
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
                const handle =
                  row.tg_username ?? row.username ?? "—";
                const chat =
                  row.chat_id == null
                    ? "—"
                    : typeof row.chat_id === "number"
                      ? row.chat_id
                      : String(row.chat_id);
                return (
                  <tr
                    key={row.id ?? `${chat}-${i}`}
                    className={cn(
                      "border-b border-[#f5f5f5]",
                      i % 2 === 1 ? "bg-[#f9fafb]" : "bg-white",
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-[#0a0a0a]">
                      {handle === "—" ? "—" : `@${handle}`}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-[#6b7280]">
                      {chat}
                    </td>
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

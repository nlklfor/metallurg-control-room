import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/StatusBadge";
import { DotGrid } from "@/components/DotGrid";
import { AnimatedStats } from "@/components/AnimatedStats";
import type { OrderStatus } from "@/types";

function formatOrderDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export default async function OverviewPage() {
  const supabase = await createClient();

  const [
    ordersCountRes,
    ordersPricesRes,
    productsCountRes,
    residentsCountRes,
    recentOrdersRes,
  ] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }),
    supabase.from("orders").select("total_price"),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("bot_users").select("*", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, contact, total_price, status, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const ordersCount = ordersCountRes.count ?? 0;
  const revenue =
    ordersPricesRes.data?.reduce((sum, row) => sum + (row.total_price ?? 0), 0) ??
    0;
  const productsCount = productsCountRes.count ?? 0;
  const residentsCount = residentsCountRes.count ?? 0;
  const recentOrders = recentOrdersRes.data ?? [];

  const stats = [
    { label: "TOTAL ORDERS", value: String(ordersCount) },
    { label: "REVENUE (UAH)", value: revenue.toLocaleString("uk-UA") },
    { label: "PRODUCTS", value: String(productsCount) },
    { label: "RESIDENTS", value: String(residentsCount) },
  ];

  return (
    <div className="relative">
      {/* Subtle dot-grid background */}
      <DotGrid />

      {/* Content sits above the grid */}
      <div className="relative z-10">
        <AnimatedStats stats={stats} />

        <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
          // RECENT ORDERS
        </p>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto border border-[#e5e5e5] bg-white lg:block">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[#e5e5e5] bg-[#f9fafb]">
                {[
                  "ORDER ID",
                  "CUSTOMER",
                  "CONTACT",
                  "TOTAL",
                  "STATUS",
                  "DATE",
                ].map((h) => (
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
              {recentOrders.map((row) => (
                <tr
                  key={String(row.id)}
                  className="border-b border-[#f5f5f5] hover:bg-[#fafafa]"
                >
                  <td className="px-4 py-3 font-mono text-[12px] text-[#0a0a0a]">
                    {row.order_number}
                  </td>
                  <td className="px-4 py-3 text-[#0a0a0a]">{row.customer_name}</td>
                  <td className="px-4 py-3 text-[#6b7280]">{row.contact}</td>
                  <td className="px-4 py-3 tabular-nums text-[#0a0a0a]">
                    {(row.total_price ?? 0).toLocaleString("uk-UA")} UAH
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      variant="order"
                      status={(row.status as OrderStatus) ?? null}
                    />
                  </td>
                  <td className="px-4 py-3 text-[#6b7280]">
                    {formatOrderDate(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card list */}
        <div className="flex flex-col gap-3 lg:hidden">
          {recentOrders.map((row) => (
            <div
              key={String(row.id)}
              className="border border-[#e5e5e5] bg-white p-4"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[12px] font-medium text-[#0a0a0a]">
                  {row.order_number}
                </span>
                <StatusBadge
                  variant="order"
                  status={(row.status as OrderStatus) ?? null}
                />
              </div>
              <p className="mt-1 text-[13px] text-[#0a0a0a]">{row.customer_name}</p>
              <div className="mt-2 flex items-center justify-between text-[12px] text-[#6b7280]">
                <span className="tabular-nums">
                  {(row.total_price ?? 0).toLocaleString("uk-UA")} UAH
                </span>
                <span>{formatOrderDate(row.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

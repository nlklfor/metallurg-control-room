"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "@/components/StatusBadge";
import type { Order, OrderItem, OrderStatus } from "@/types";

const ORDER_STATUSES: OrderStatus[] = [
  "waiting_for_payment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

function statusIndex(status: OrderStatus): number {
  return ORDER_STATUSES.indexOf(status);
}

function parseItems(raw: unknown): OrderItem[] {
  if (Array.isArray(raw)) return raw as OrderItem[];
  if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw) as unknown;
      return Array.isArray(j) ? (j as OrderItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function coerceStatus(s: unknown): OrderStatus {
  if (typeof s === "string" && ORDER_STATUSES.includes(s as OrderStatus)) {
    return s as OrderStatus;
  }
  return "waiting_for_payment";
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    order_number: String(row.order_number ?? ""),
    total_price: Number(row.total_price ?? 0),
    status: coerceStatus(row.status),
    customer_name: String(row.customer_name ?? ""),
    contact: String(row.contact ?? ""),
    shipping_zone: String(row.shipping_zone ?? ""),
    items: parseItems(row.items),
    current_status_index: Number(row.current_status_index ?? 0),
    is_international: Boolean(row.is_international),
    tracking_number:
      row.tracking_number == null ? null : String(row.tracking_number),
    customer_chat_id:
      row.customer_chat_id == null
        ? null
        : typeof row.customer_chat_id === "number"
          ? row.customer_chat_id
          : Number(row.customer_chat_id),
  };
}

function formatOrderDate(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}.${mm}.${yyyy} ${hh}:${min}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const [panelStatus, setPanelStatus] = useState<OrderStatus>(
    "waiting_for_payment",
  );
  const [panelTracking, setPanelTracking] = useState("");

  const loadOrders = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      return;
    }
    setOrders((data ?? []).map((r) => rowToOrder(r as Record<string, unknown>)));
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (selectedOrder) {
      setPanelStatus(selectedOrder.status);
      setPanelTracking(selectedOrder.tracking_number ?? "");
      setDeleteConfirm(false);
    }
  }, [selectedOrder]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orders.filter((o) => {
      if (filterStatus !== "ALL" && o.status !== filterStatus) return false;
      if (!q) return true;
      return (
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.contact.toLowerCase().includes(q)
      );
    });
  }, [orders, filterStatus, searchQuery]);

  async function saveChanges() {
    if (!selectedOrder) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({
        status: panelStatus,
        tracking_number: panelTracking || null,
        current_status_index: statusIndex(panelStatus),
      })
      .eq("id", selectedOrder.id);
    setSaving(false);
    if (error) return;
    await loadOrders();
    setSelectedOrder((prev) =>
      prev && prev.id === selectedOrder.id
        ? {
            ...prev,
            status: panelStatus,
            tracking_number: panelTracking || null,
            current_status_index: statusIndex(panelStatus),
          }
        : prev,
    );
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  async function confirmDelete() {
    if (!selectedOrder) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", selectedOrder.id);
    setDeleting(false);
    if (error) return;
    setSelectedOrder(null);
    await loadOrders();
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setFilterStatus("ALL")}
          className={cn(
            "border px-3 py-2 text-[11px] uppercase tracking-[0.15em]",
            filterStatus === "ALL"
              ? "border-black bg-black text-white"
              : "border-[#e5e5e5] bg-white text-[#6b7280] hover:border-black",
          )}
        >
          ALL
        </button>
        {ORDER_STATUSES.map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setFilterStatus(st)}
            className={cn(
              "border px-3 py-2 text-[11px] uppercase tracking-[0.15em]",
              filterStatus === st
                ? "border-black bg-black text-white"
                : "border-[#e5e5e5] bg-white text-[#6b7280] hover:border-black",
            )}
          >
            {st.replace(/_/g, " ")}
          </button>
        ))}
        <input
          type="search"
          placeholder="Search order or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ml-auto w-64 border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
        />
      </div>

      <div className="overflow-x-auto border border-[#e5e5e5]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#f9fafb]">
              {[
                "ORDER ID",
                "CUSTOMER",
                "CONTACT",
                "ZONE",
                "ITEMS",
                "TOTAL",
                "STATUS",
                "DATE",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.15em] text-[#6b7280]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order, i) => {
              const selected = selectedOrder?.id === order.id;
              return (
                <tr
                  key={order.id}
                  onClick={() => setSelectedOrder(order)}
                  className={cn(
                    "cursor-pointer border-b border-[#f5f5f5] hover:bg-[#f9fafb]",
                    i % 2 === 1 ? "bg-[#f9fafb]" : "bg-white",
                    selected && "bg-[#f5f5f5]",
                  )}
                >
                  <td className="px-3 py-2 font-mono text-[12px]">
                    {order.order_number}
                  </td>
                  <td className="px-3 py-2">{order.customer_name}</td>
                  <td className="px-3 py-2 text-[#6b7280]">{order.contact}</td>
                  <td className="px-3 py-2">{order.shipping_zone}</td>
                  <td className="px-3 py-2 tabular-nums">{order.items.length}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {order.total_price.toLocaleString("uk-UA")} UAH
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge variant="order" status={order.status} />
                  </td>
                  <td className="px-3 py-2 text-[#6b7280]">
                    {formatOrderDate(order.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[480px] border-l border-[#e5e5e5] bg-white transition-transform duration-200",
          selectedOrder ? "translate-x-0" : "translate-x-full",
        )}
        aria-hidden={!selectedOrder}
      >
        {selectedOrder ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] px-6 py-4">
              <span className="font-bold text-[#0a0a0a]">
                {selectedOrder.order_number}
              </span>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="text-[#6b7280] hover:text-black"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
              <section>
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">
                  // ORDER DETAILS
                </p>
                <dl className="space-y-2">
                  {[
                    ["Order number", selectedOrder.order_number],
                    ["Date", formatOrderDate(selectedOrder.created_at)],
                    ["Customer", selectedOrder.customer_name],
                    ["Contact", selectedOrder.contact],
                    ["Shipping zone", selectedOrder.shipping_zone],
                    [
                      "International",
                      selectedOrder.is_international ? "Yes" : "No",
                    ],
                    [
                      "Total price",
                      `${selectedOrder.total_price.toLocaleString("uk-UA")} UAH`,
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className="flex gap-4 text-[13px]">
                      <dt className="w-32 shrink-0 text-[10px] uppercase text-[#6b7280]">
                        {k}
                      </dt>
                      <dd className="text-[#0a0a0a]">{v}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">
                  // ITEMS
                </p>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-[#e5e5e5] text-left text-[10px] uppercase text-[#6b7280]">
                      <th className="pb-2">PRODUCT</th>
                      <th className="pb-2">SIZE</th>
                      <th className="pb-2">QTY</th>
                      <th className="pb-2">PRICE</th>
                      <th className="pb-2">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items.map((item, idx) => {
                      const line =
                        item.price * (item.cart_quantity ?? 1);
                      return (
                        <tr
                          key={`${item.name}-${idx}`}
                          className="border-b border-[#f5f5f5]"
                        >
                          <td className="py-2">{item.name}</td>
                          <td className="py-2 tabular-nums">
                            {item.selectedSize}
                          </td>
                          <td className="py-2 tabular-nums">
                            {item.cart_quantity}
                          </td>
                          <td className="py-2 tabular-nums">
                            {item.price.toLocaleString("uk-UA")}
                          </td>
                          <td className="py-2 tabular-nums">
                            {line.toLocaleString("uk-UA")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>

              <section className="border-t border-[#e5e5e5] pt-6">
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">
                  // UPDATE ORDER
                </p>
                <select
                  value={panelStatus}
                  onChange={(e) =>
                    setPanelStatus(e.target.value as OrderStatus)
                  }
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                >
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={panelTracking}
                  onChange={(e) => setPanelTracking(e.target.value)}
                  placeholder="Tracking number"
                  className="mt-3 w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void saveChanges()}
                  className="mt-4 w-full bg-black py-3 text-[11px] uppercase tracking-[0.3em] text-white hover:bg-[#222] disabled:opacity-50"
                >
                  {saving ? "SAVING..." : "SAVE CHANGES"}
                </button>
                {savedFlash ? (
                  <p className="mt-2 text-xs text-green-600">✓ Saved</p>
                ) : null}
              </section>

              <section className="mt-8 border-t border-[#e5e5e5] pt-6">
                {!deleteConfirm ? (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="w-full border border-red-200 py-3 text-[11px] uppercase tracking-[0.3em] text-red-500 hover:bg-red-50"
                  >
                    DELETE ORDER
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-red-500">
                      Are you sure? This cannot be undone.
                    </p>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => void confirmDelete()}
                      className="w-full border border-red-500 py-3 text-[11px] uppercase tracking-[0.3em] text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {deleting ? "..." : "CONFIRM DELETE"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="w-full border border-[#e5e5e5] py-2 text-[11px] uppercase text-[#6b7280] hover:border-black"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

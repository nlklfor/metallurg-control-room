"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { Order, OrderItem, OrderStatus } from "@/types";
import { clampStage, routeFor } from "@/lib/orders/routes";
import { TtnDialog } from "@/components/TtnDialog";

const ORDER_STATUSES: OrderStatus[] = [
  "waiting_for_payment",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
];

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
    city: row.city == null ? null : String(row.city),
    np_branch: row.np_branch == null ? null : String(row.np_branch),
    country: row.country == null ? null : String(row.country),
    customer_email:
      row.customer_email == null ? null : String(row.customer_email),
    delivery_cost: Number(row.delivery_cost ?? 0),
    city_ref: row.city_ref == null ? null : String(row.city_ref),
    warehouse_ref: row.warehouse_ref == null ? null : String(row.warehouse_ref),
    recipient_phone:
      row.recipient_phone == null ? null : String(row.recipient_phone),
  };
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [panelStatus, setPanelStatus] = useState<OrderStatus>(
    "waiting_for_payment",
  );
  const [panelTracking, setPanelTracking] = useState("");
  // Delivery stage shown to the customer on the site and in the bot — an
  // index into the order's route, independent of the payment status.
  const [panelStage, setPanelStage] = useState(0);
  const [ttnOpen, setTtnOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setLoadError(null);
    setOrders((data ?? []).map((r) => rowToOrder(r as Record<string, unknown>)));
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (selectedOrder) {
      setPanelStatus(selectedOrder.status);
      setPanelTracking(selectedOrder.tracking_number ?? "");
      setPanelStage(
        clampStage(
          selectedOrder.current_status_index,
          routeFor(selectedOrder.shipping_zone),
        ),
      );
      setDeleteConfirm(false);
      setActionError(null);
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
        o.contact.toLowerCase().includes(q) ||
        (o.tracking_number ?? "").includes(q) ||
        (o.city ?? "").toLowerCase().includes(q)
      );
    });
  }, [orders, filterStatus, searchQuery]);

  async function saveChanges() {
    if (!selectedOrder) return;
    setSaving(true);
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .update({
        status: panelStatus,
        tracking_number: panelTracking.trim() || null,
        current_status_index: panelStage,
      })
      .eq("id", selectedOrder.id);
    setSaving(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    await loadOrders();
    setSelectedOrder((prev) =>
      prev && prev.id === selectedOrder.id
        ? {
            ...prev,
            status: panelStatus,
            tracking_number: panelTracking.trim() || null,
            current_status_index: panelStage,
          }
        : prev,
    );
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  async function confirmDelete() {
    // Only cancelled orders can be deleted: cancelling is what returns the
    // items to stock (DB trigger), deleting an active order would lose them.
    if (!selectedOrder || selectedOrder.status !== "cancelled") return;
    setDeleting(true);
    setActionError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("orders")
      .delete()
      .eq("id", selectedOrder.id);
    setDeleting(false);
    if (error) {
      setActionError(error.message);
      return;
    }
    setSelectedOrder(null);
    await loadOrders();
  }

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
          Loading orders...
        </p>
      </div>
    );
  }

  if (loadError && orders.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-red-500">Error: {loadError}</p>
        <button
          onClick={() => void loadOrders()}
          className="mt-4 border border-black px-4 py-2 text-[11px] uppercase tracking-[0.15em] transition-colors hover:bg-black hover:text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {loadError ? (
        <div className="mb-4 border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {loadError}
        </div>
      ) : null}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilterStatus("ALL")}
            className={cn(
              "border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.15em] lg:px-3 lg:py-2 lg:text-[11px]",
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
                "border px-2.5 py-1.5 text-[10px] uppercase tracking-[0.15em] lg:px-3 lg:py-2 lg:text-[11px]",
                filterStatus === st
                  ? "border-black bg-black text-white"
                  : "border-[#e5e5e5] bg-white text-[#6b7280] hover:border-black",
              )}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Search order or customer..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0 lg:ml-auto lg:w-64"
        />
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto border border-[#e5e5e5] lg:block">
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
                    {formatDateTime(order.created_at)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="flex flex-col gap-3 lg:hidden">
        {filtered.map((order) => (
          <div
            key={order.id}
            onClick={() => setSelectedOrder(order)}
            className={cn(
              "cursor-pointer border border-[#e5e5e5] bg-white p-4 transition-colors hover:bg-[#f9fafb]",
              selectedOrder?.id === order.id && "bg-[#f5f5f5]",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-mono text-[12px] font-medium text-[#0a0a0a]">
                {order.order_number}
              </span>
              <StatusBadge variant="order" status={order.status} />
            </div>
            <p className="text-[13px] text-[#0a0a0a]">{order.customer_name}</p>
            <div className="mt-2 flex items-center justify-between text-[12px] text-[#6b7280]">
              <span>{order.total_price.toLocaleString("uk-UA")} UAH</span>
              <span>{formatDateTime(order.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full border-l border-[#e5e5e5] bg-white transition-transform duration-200 lg:w-[480px]",
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
                    ["Date", formatDateTime(selectedOrder.created_at)],
                    ["Customer", selectedOrder.customer_name],
                    ["Contact", selectedOrder.contact],
                    ["Email", selectedOrder.customer_email ?? "—"],
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
                  // SHIPPING
                </p>
                <dl className="space-y-2">
                  {(selectedOrder.shipping_zone === "Ukraine"
                    ? [
                        ["Zone", "Ukraine — Nova Poshta"],
                        ["City", selectedOrder.city ?? "—"],
                        ["Branch", selectedOrder.np_branch ?? "—"],
                        [
                          "Phone",
                          selectedOrder.recipient_phone
                            ? `+${selectedOrder.recipient_phone}`
                            : "—",
                        ],
                        ["TTN", selectedOrder.tracking_number ?? "—"],
                      ]
                    : [
                        ["Zone", "International"],
                        ["Country", selectedOrder.country ?? "—"],
                        ["City", selectedOrder.city ?? "—"],
                        ["TTN", selectedOrder.tracking_number ?? "—"],
                      ]
                  ).map(([k, v]) => (
                    <div key={k} className="flex gap-4 text-[13px]">
                      <dt className="w-32 shrink-0 text-[10px] uppercase text-[#6b7280]">
                        {k}
                      </dt>
                      <dd className="select-all text-[#0a0a0a]">{v}</dd>
                    </div>
                  ))}
                </dl>
                {selectedOrder.shipping_zone === "Ukraine" &&
                !selectedOrder.tracking_number &&
                selectedOrder.status !== "cancelled" ? (
                  <button
                    type="button"
                    onClick={() => setTtnOpen(true)}
                    className="mt-4 w-full border border-black py-3 text-[11px] uppercase tracking-[0.3em] text-black hover:bg-black hover:text-white"
                  >
                    CREATE NOVA POSHTA TTN
                  </button>
                ) : null}
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
                <dl className="mt-3 space-y-1 text-[12px]">
                  <div className="flex justify-between text-[#6b7280]">
                    <dt>Items</dt>
                    <dd className="tabular-nums">
                      {(
                        selectedOrder.total_price - selectedOrder.delivery_cost
                      ).toLocaleString("uk-UA")}{" "}
                      UAH
                    </dd>
                  </div>
                  {selectedOrder.shipping_zone === "Ukraine" ? (
                    <div className="flex justify-between text-[#6b7280]">
                      <dt>Delivery (Nova Poshta)</dt>
                      <dd className="tabular-nums">
                        {selectedOrder.delivery_cost.toLocaleString("uk-UA")} UAH
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-bold text-[#0a0a0a]">
                    <dt>Total</dt>
                    <dd className="tabular-nums">
                      {selectedOrder.total_price.toLocaleString("uk-UA")} UAH
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="border-t border-[#e5e5e5] pt-6">
                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">
                  // DELIVERY STAGE — what the customer sees
                </p>
                <ol className="mb-6 flex flex-col">
                  {routeFor(selectedOrder.shipping_zone).map((step, i) => (
                    <li key={step}>
                      <button
                        type="button"
                        onClick={() => setPanelStage(i)}
                        aria-pressed={panelStage === i}
                        className={cn(
                          "flex w-full items-center gap-3 border-b border-[#f5f5f5] px-2 py-2 text-left font-mono text-[12px] transition-colors",
                          i === panelStage
                            ? "bg-black text-white"
                            : i < panelStage
                              ? "text-[#6b7280] line-through hover:bg-[#f9fafb]"
                              : "text-[#0a0a0a] hover:bg-[#f9fafb]",
                        )}
                      >
                        <span className="w-5 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                        {step}
                      </button>
                    </li>
                  ))}
                </ol>

                <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">
                  // PAYMENT / ORDER STATUS
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
                {panelStatus === "cancelled" &&
                selectedOrder.status !== "cancelled" ? (
                  <p className="mt-2 text-xs text-[#6b7280]">
                    Saving as cancelled returns the items to stock.
                  </p>
                ) : null}
                {actionError ? (
                  <p className="mt-2 text-xs text-red-500">{actionError}</p>
                ) : null}
              </section>

              <section className="mt-8 border-t border-[#e5e5e5] pt-6">
                {selectedOrder.status !== "cancelled" ? (
                  <p className="text-[11px] leading-relaxed text-[#6b7280]">
                    To delete an order, cancel it first (status → cancelled,
                    save). Cancelling returns the items to stock; deleting an
                    active order would lose them.
                  </p>
                ) : !deleteConfirm ? (
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
      {ttnOpen && selectedOrder ? (
        <TtnDialog
          order={selectedOrder}
          onClose={() => setTtnOpen(false)}
          onCreated={async (ttn) => {
            setTtnOpen(false);
            await loadOrders();
            setSelectedOrder((prev) =>
              prev
                ? {
                    ...prev,
                    tracking_number: ttn,
                    status: "shipped",
                    current_status_index: 2,
                  }
                : prev,
            );
          }}
        />
      ) : null}
    </div>
  );
}

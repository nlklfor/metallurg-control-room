"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  created_at: string;
  status: string | null;
  tracking_number: string | null;
  resident_id: string | null;
};

const STATUSES = ["New", "Authentication", "Packaging", "In Transit", "Delivered"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);

  async function loadOrders() {
    const response = await fetch("/api/orders");
    const data = await response.json();
    setOrders(data.orders ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrders();
  }, []);

  async function updateOrder(id: string, payload: Partial<Order>) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await loadOrders();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl tracking-[0.2em]">[ ORDERS ]</h1>
      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Created</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Tracking Number</th>
              <th className="text-left p-2">Resident ID</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border">
                <td className="p-2">{order.id}</td>
                <td className="p-2">{new Date(order.created_at).toLocaleString()}</td>
                <td className="p-2">
                  <select
                    value={order.status ?? "New"}
                    onChange={(e) => updateOrder(order.id, { status: e.target.value })}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="p-2">
                  <input
                    defaultValue={order.tracking_number ?? ""}
                    onBlur={(e) => updateOrder(order.id, { tracking_number: e.target.value })}
                  />
                </td>
                <td className="p-2">{order.resident_id ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

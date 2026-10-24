"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Order } from "@/types";

// Creates a Nova Poshta waybill through the `nova-poshta-ttn` edge function
// (Supabase). The function checks is_admin() on the caller's session, builds
// the waybill from the shop's NP account, and saves the TTN on the order
// (status → shipped, stage → READY_FOR_PICKUP).

interface Props {
  order: Order;
  onClose: () => void;
  onCreated: (ttn: string) => void;
}

interface SenderInfo {
  name: string;
  contact: string;
  phone: string;
  warehouse: string;
}

const LATIN = /[A-Za-z]/;

function splitName(full: string): { first: string; last: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function guessPhone(order: Order): string {
  if (order.recipient_phone) return `+${order.recipient_phone}`;
  // Older orders: the contact field sometimes holds a phone number.
  const digits = order.contact.replace(/\D/g, "");
  return digits.length >= 9 ? order.contact : "";
}

const inputClass =
  "w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0";
const labelClass = "mb-1 block text-[10px] uppercase text-[#6b7280]";

export function TtnDialog({ order, onClose, onCreated }: Props) {
  const initialName = useMemo(() => splitName(order.customer_name), [order.customer_name]);
  const [firstName, setFirstName] = useState(initialName.first);
  const [lastName, setLastName] = useState(initialName.last);
  const [middleName, setMiddleName] = useState("");
  const [phone, setPhone] = useState(guessPhone(order));
  const [weight, setWeight] = useState("");
  const [declared, setDeclared] = useState(String(order.total_price));
  // Cash on delivery: on unless the order is already paid. NP collects the
  // goods amount; the recipient pays the delivery to NP separately.
  const itemsAmount = order.total_price - order.delivery_cost;
  const [codOn, setCodOn] = useState(order.status !== "paid");
  const [codAmount, setCodAmount] = useState(String(itemsAmount));
  const [description, setDescription] = useState(
    `Одяг та взуття, замовлення ${order.order_number}`,
  );

  const [sender, setSender] = useState<SenderInfo | null>(null);
  const [senderError, setSenderError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sender profile (proves the NP config works before you fill anything in)
  // and the parcel weight from the products' weights.
  useEffect(() => {
    const supabase = createClient();
    void supabase.functions
      .invoke("nova-poshta-ttn", { body: { action: "sender" } })
      .then(async ({ data, error: fnErr }) => {
        if (fnErr) {
          const ctx = (fnErr as { context?: Response }).context;
          const detail = ctx ? await ctx.json().catch(() => null) : null;
          setSenderError(detail?.error ?? fnErr.message);
          return;
        }
        setSender(data.sender as SenderInfo);
      });

    const ids = order.items.map((i) => i.product_id).filter(Boolean) as string[];
    if (ids.length === 0) {
      setWeight(String(order.items.reduce((s, i) => s + 0.5 * (i.cart_quantity ?? 1), 0)));
      return;
    }
    void supabase
      .from("products")
      .select("id, weight")
      .in("id", ids)
      .then(({ data }) => {
        const byId = new Map((data ?? []).map((p) => [p.id as string, Number.parseFloat(String(p.weight))]));
        const kg = order.items.reduce((sum, i) => {
          const w = byId.get(i.product_id ?? "");
          return sum + (Number.isFinite(w) && (w as number) > 0 ? (w as number) : 0.5) * (i.cart_quantity ?? 1);
        }, 0);
        setWeight(String(Math.round(kg * 100) / 100));
      });
  }, [order]);

  const latinWarning = LATIN.test(firstName + lastName + middleName);

  async function submit() {
    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { data, error: fnErr } = await supabase.functions.invoke("nova-poshta-ttn", {
      body: {
        action: "create",
        order_id: order.id,
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName,
        phone,
        weight_kg: Number(weight.replace(",", ".")),
        declared_value: Number(declared),
        cod_amount: codOn ? Number(codAmount) : null,
        description,
      },
    });
    setSubmitting(false);
    if (fnErr) {
      const ctx = (fnErr as { context?: Response }).context;
      const detail = ctx ? await ctx.json().catch(() => null) : null;
      setError(detail?.error ?? fnErr.message);
      return;
    }
    if (data?.warning) setError(data.warning);
    onCreated(String(data.ttn));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 lg:items-center">
      <div className="flex max-h-full w-full flex-col bg-white lg:max-h-[90vh] lg:w-[520px] lg:border lg:border-black">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-6 py-4">
          <span className="font-bold text-[#0a0a0a]">CREATE TTN — {order.order_number}</span>
          <button type="button" onClick={onClose} className="text-[#6b7280] hover:text-black" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-6 py-6">
          <div className="border border-[#e5e5e5] bg-[#f9fafb] px-3 py-2 text-[11px] leading-relaxed text-[#6b7280]">
            {sender ? (
              <>
                <span className="text-[#0a0a0a]">FROM:</span> {sender.contact} · +{sender.phone}
                <br />
                {sender.warehouse}
              </>
            ) : senderError ? (
              <span className="text-red-500">Nova Poshta: {senderError}</span>
            ) : (
              "Loading sender…"
            )}
            <br />
            <span className="text-[#0a0a0a]">TO:</span> {order.city} — {order.np_branch}
          </div>

          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">// RECIPIENT (кирилицею)</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>last name / прізвище</span>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>first name / ім&apos;я</span>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>middle name / по батькові (optional)</span>
            <input value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={inputClass} />
          </label>
          {latinWarning ? (
            <p className="-mt-2 text-[11px] text-[#b45309]">
              Nova Poshta only accepts names in Cyrillic — e.g. &quot;Слєпцов Микита&quot;.
            </p>
          ) : null}
          <label className="block">
            <span className={labelClass}>phone</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+380 67 123 45 67"
              className={inputClass}
            />
          </label>

          <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">// PARCEL</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className={labelClass}>weight, kg</span>
              <input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputClass} />
            </label>
            <label className="block">
              <span className={labelClass}>declared value, UAH</span>
              <input inputMode="numeric" value={declared} onChange={(e) => setDeclared(e.target.value)} className={inputClass} />
            </label>
          </div>
          <label className="block">
            <span className={labelClass}>description</span>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} />
          </label>

          <label className="flex items-center gap-3 text-[13px]">
            <input type="checkbox" checked={codOn} onChange={(e) => setCodOn(e.target.checked)} className="h-4 w-4" />
            Cash on delivery (наложений платіж)
          </label>
          {codOn ? (
            <label className="block">
              <span className={labelClass}>amount to collect, UAH</span>
              <input inputMode="numeric" value={codAmount} onChange={(e) => setCodAmount(e.target.value)} className={inputClass} />
              <span className="mt-1 block text-[11px] text-[#9ca3af]">
                Goods only ({itemsAmount.toLocaleString("uk-UA")} UAH) — the recipient pays the delivery to Nova Poshta.
              </span>
            </label>
          ) : null}

          <p className="text-[11px] text-[#9ca3af]">Delivery is paid by the recipient · branch → branch.</p>

          {error ? <p className="text-[12px] text-red-500">{error}</p> : null}
        </div>

        <div className="border-t border-[#e5e5e5] px-6 py-4">
          <button
            type="button"
            disabled={submitting || !sender}
            onClick={() => void submit()}
            className="w-full bg-black py-3 text-[11px] uppercase tracking-[0.3em] text-white hover:bg-[#222] disabled:opacity-50"
          >
            {submitting ? "CREATING…" : "CREATE TTN"}
          </button>
        </div>
      </div>
    </div>
  );
}

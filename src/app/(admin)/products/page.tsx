"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { StatusBadge } from "@/components/StatusBadge";
import type { Product } from "@/types";

type StockStatus = NonNullable<Product["stock_status"]>;

/** Convert a product name to a URL-safe slug */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // remove non-word chars (except spaces and hyphens)
    .replace(/[\s_]+/g, "-")    // spaces/underscores → hyphens
    .replace(/-+/g, "-")        // collapse multiple hyphens
    .replace(/^-+|-+$/g, "");   // trim leading/trailing hyphens
}

function rowToProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    created_at: String(row.created_at),
    name: row.name == null ? null : String(row.name),
    price: row.price == null ? null : Number(row.price),
    description: row.description == null ? null : String(row.description),
    image_url: Array.isArray(row.image_url)
      ? (row.image_url as string[])
      : null,
    model_3d_url:
      row.model_3d_url == null ? null : String(row.model_3d_url),
    sizes: Array.isArray(row.sizes)
      ? (row.sizes as number[])
      : null,
    is_new: row.is_new == null ? null : Boolean(row.is_new),
    stock_status: (row.stock_status as StockStatus) ?? null,
    slug: row.slug == null ? null : String(row.slug),
    quantity: row.quantity == null ? null : Number(row.quantity),
    materials: row.materials == null ? null : String(row.materials),
    weight: row.weight == null ? null : String(row.weight),
    box: row.box == null ? null : String(row.box),
    condition: row.condition == null ? null : String(row.condition),
  };
}

const STOCK_OPTIONS: StockStatus[] = [
  "in_stock",
  "out_of_stock",
  "pre_order",
];

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [panelMode, setPanelMode] = useState<"edit" | "create">("edit");
  const [panelOpen, setPanelOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toast, setToast] = useState(false);

  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [formPrice, setFormPrice] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formMaterials, setFormMaterials] = useState("");
  const [formWeight, setFormWeight] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formStock, setFormStock] = useState<StockStatus>("in_stock");
  const [formIsNew, setFormIsNew] = useState(false);
  const [formSizes, setFormSizes] = useState("");
  const [formImages, setFormImages] = useState("");
  const [formBox, setFormBox] = useState("");
  const [formCondition, setFormCondition] = useState("");

  const loadProducts = useCallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) return;
    setProducts((data ?? []).map((r) => rowToProduct(r as Record<string, unknown>)));
  }, []);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  // Auto-update slug when name changes (only if not manually edited)
  function handleNameChange(value: string) {
    setFormName(value);
    if (!slugManuallyEdited) {
      setFormSlug(toSlug(value));
    }
  }

  function handleSlugChange(value: string) {
    setFormSlug(value);
    setSlugManuallyEdited(true);
  }

  function openCreate() {
    setSelectedProduct(null);
    setPanelMode("create");
    setFormName("");
    setFormSlug("");
    setSlugManuallyEdited(false);
    setFormPrice("");
    setFormDescription("");
    setFormMaterials("");
    setFormWeight("");
    setFormQuantity("");
    setFormStock("in_stock");
    setFormIsNew(false);
    setFormSizes("");
    setFormImages("");
    setFormBox("");
    setFormCondition("");
    setPanelOpen(true);
  }

  function openEdit(p: Product) {
    setSelectedProduct(p);
    setPanelMode("edit");
    setFormName(p.name ?? "");
    setFormSlug(p.slug ?? toSlug(p.name ?? ""));
    setSlugManuallyEdited(true); // in edit mode, don't auto-overwrite existing slug
    setFormPrice(p.price != null ? String(p.price) : "");
    setFormDescription(p.description ?? "");
    setFormMaterials(p.materials ?? "");
    setFormWeight(p.weight ?? "");
    setFormQuantity(p.quantity != null ? String(p.quantity) : "");
    setFormStock(p.stock_status ?? "in_stock");
    setFormIsNew(Boolean(p.is_new));
    setFormSizes((p.sizes ?? []).join(", "));
    setFormImages((p.image_url ?? []).join("\n"));
    setFormBox(p.box ?? "");
    setFormCondition(p.condition ?? "");
    setPanelOpen(true);
  }

  function parseSizes(): number[] {
    return formSizes
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => !Number.isNaN(n) && n !== 0);
  }

  function parseImages(): string[] {
    return formImages
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  async function saveProduct() {
    setSaving(true);
    const supabase = createClient();

    // Final slug: use formSlug if set, otherwise auto-generate from name
    const finalSlug = formSlug.trim() || toSlug(formName);

    const payload = {
      name: formName || null,
      slug: finalSlug || null,
      price: formPrice === "" ? null : Number(formPrice),
      description: formDescription || null,
      materials: formMaterials || null,
      weight: formWeight || null,
      quantity: formQuantity === "" ? null : Number(formQuantity),
      stock_status: formStock,
      is_new: formIsNew,
      sizes: parseSizes(),
      image_url: parseImages(),
      box: formBox || null,
      condition: formCondition || null,
    };

    let error = null;
    if (panelMode === "create") {
      const res = await supabase.from("products").insert(payload);
      error = res.error;
    } else if (selectedProduct) {
      const res = await supabase
        .from("products")
        .update(payload)
        .eq("id", selectedProduct.id);
      error = res.error;
    }
    setSaving(false);
    if (error) return;
    await loadProducts();
    setPanelOpen(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  async function deleteProduct(id: string) {
    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return;
    setDeleteConfirmId(null);
    await loadProducts();
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      <div className="mb-6 flex justify-between">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#6b7280]">
          // PRODUCTS
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="bg-black px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-white hover:bg-[#222]"
        >
          ADD PRODUCT +
        </button>
      </div>

      <div className="overflow-x-auto border border-[#e5e5e5]">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[#e5e5e5] bg-[#f9fafb]">
              {[
                "IMG",
                "NAME",
                "PRICE",
                "STATUS",
                "QTY",
                "IS_NEW",
                "SLUG",
                "",
              ].map((h) => (
                <th
                  key={h || "del"}
                  className="px-3 py-2 text-left text-[10px] uppercase tracking-[0.15em] text-[#6b7280]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => openEdit(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openEdit(p);
                  }
                }}
                className={cn(
                  "cursor-pointer border-b border-[#f5f5f5]",
                  i % 2 === 1 ? "bg-[#f9fafb]" : "bg-white",
                )}
              >
                <td className="px-3 py-2">
                  <div className="pointer-events-none flex h-10 w-10 items-center justify-center overflow-hidden border border-[#e5e5e5] bg-[#f9fafb]">
                    {p.image_url?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.image_url[0]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[9px] text-[#d1d5db]">—</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <span className="font-medium text-[13px] text-[#0a0a0a]">
                    {p.name ?? "—"}
                  </span>
                  {deleteConfirmId === p.id ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-red-500">
                        Confirm delete?
                      </span>
                      <button
                        type="button"
                        onClick={() => void deleteProduct(p.id)}
                        className="text-[11px] uppercase text-red-600"
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-[11px] uppercase text-[#6b7280]"
                      >
                        NO
                      </button>
                    </div>
                  ) : null}
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {p.price != null ? `${p.price.toLocaleString("uk-UA")} UAH` : "—"}
                </td>
                <td className="px-3 py-2">
                  <StatusBadge variant="stock" status={p.stock_status} />
                </td>
                <td className="px-3 py-2 tabular-nums">{p.quantity ?? "—"}</td>
                <td className="px-3 py-2">
                  {p.is_new ? (
                    <span className="bg-black px-1.5 py-0.5 text-[9px] text-white">
                      NEW
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-[11px] text-[#9ca3af]">
                  {p.slug ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(p.id);
                    }}
                    className="text-[#d1d5db] hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-[480px] border-l border-[#e5e5e5] bg-white transition-transform duration-200",
          panelOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {panelOpen ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] px-6 py-4">
              <span className="font-bold text-[#0a0a0a]">
                {panelMode === "create"
                  ? "NEW PRODUCT"
                  : (formName || "Product")}
              </span>
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="text-[#6b7280] hover:text-black"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6">
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  name
                </span>
                <input
                  value={formName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
              </label>

              {/* Slug field — auto-generated from name, manually overridable */}
              <label className="block">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] uppercase text-[#6b7280]">
                    slug
                  </span>
                  {slugManuallyEdited && formName && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormSlug(toSlug(formName));
                        setSlugManuallyEdited(false);
                      }}
                      className="text-[10px] text-[#9ca3af] underline hover:text-black"
                    >
                      reset to auto
                    </button>
                  )}
                </div>
                <input
                  value={formSlug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="auto-generated from name"
                  className="w-full border border-[#e5e5e5] px-3 py-2 font-mono text-[12px] text-[#6b7280] focus:border-black focus:outline-none focus:ring-0"
                />
                <span className="mt-1 block text-[11px] text-[#9ca3af]">
                  Auto-generated from name. Edit to override.
                </span>
              </label>

              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  price (UAH)
                </span>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  description
                </span>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  materials
                </span>
                <input
                  value={formMaterials}
                  onChange={(e) => setFormMaterials(e.target.value)}
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  weight
                </span>
                <input
                  value={formWeight}
                  onChange={(e) => setFormWeight(e.target.value)}
                  placeholder="e.g. 1.2 kg"
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  quantity
                </span>
                <input
                  type="number"
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  stock_status
                </span>
                <select
                  value={formStock}
                  onChange={(e) => setFormStock(e.target.value as StockStatus)}
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                >
                  {STOCK_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={formIsNew}
                  onChange={(e) => setFormIsNew(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-[10px] uppercase text-[#6b7280]">
                  Mark as NEW arrival
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  sizes
                </span>
                <input
                  value={formSizes}
                  onChange={(e) => setFormSizes(e.target.value)}
                  placeholder="40, 41, 42, 43, 44"
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
                <span className="mt-1 block text-[11px] text-[#9ca3af]">
                  Comma-separated numbers
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  image_url
                </span>
                <textarea
                  rows={3}
                  value={formImages}
                  onChange={(e) => setFormImages(e.target.value)}
                  placeholder="One URL per line"
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
                <span className="mt-1 block text-[11px] text-[#9ca3af]">
                  Each line = one image URL
                </span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  box
                </span>
                <input
                  value={formBox}
                  onChange={(e) => setFormBox(e.target.value)}
                  placeholder="e.g. Box A"
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10px] uppercase text-[#6b7280]">
                  condition
                </span>
                <input
                  value={formCondition}
                  onChange={(e) => setFormCondition(e.target.value)}
                  placeholder="e.g. New, Used"
                  className="w-full border border-[#e5e5e5] px-3 py-2 text-[13px] focus:border-black focus:outline-none focus:ring-0"
                />
              </label>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveProduct()}
                className="mt-6 w-full bg-black py-3 text-[11px] uppercase tracking-[0.3em] text-white hover:bg-[#222] disabled:opacity-50"
              >
                {saving ? "SAVING..." : "SAVE PRODUCT"}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-[60] border border-[#e5e5e5] bg-white px-4 py-3 text-[13px] text-[#0a0a0a]">
          Saved
        </div>
      ) : null}
    </div>
  );
}

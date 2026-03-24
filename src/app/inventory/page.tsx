"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/shared";

type Product = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string[] | null;
  model_3d_url: string | null;
  sizes: string[] | null;
  is_new: boolean | null;
  stock_status: string | null;
  slug: string | null;
  quantity: number | null;
  materials: string | null;
  weight: string | null;
};

function toSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [description, setDescription] = useState("");
  const [materials, setMaterials] = useState("");
  const [weight, setWeight] = useState("");
  const [model3dUrl, setModel3dUrl] = useState("");
  const [sizes, setSizes] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [stockStatus, setStockStatus] = useState("available");
  const [isNew, setIsNew] = useState(false);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const slug = useMemo(() => toSlug(name), [name]);

  async function loadProducts() {
    const response = await fetch("/api/products");
    const data = await response.json();
    setProducts(data.products ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProducts();
  }, []);

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!isSupabaseConfigured) return;

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const filePath = `${Date.now()}-${file.name.replaceAll(" ", "-")}`;
      const { error } = await supabase.storage
        .from("product-image")
        .upload(filePath, file, { upsert: false });

      if (!error) {
        const { data } = supabase.storage.from("product-image").getPublicUrl(filePath);
        urls.push(data.publicUrl);
      }
    }

    setUploadedImageUrls((prev) => [...prev, ...urls]);
    setLoading(false);
  }

  async function handleCreateProduct(event: FormEvent) {
    event.preventDefault();
    const payload = {
      name,
      price: Number(price),
      description,
      image_url: uploadedImageUrls,
      model_3d_url: model3dUrl || null,
      sizes: sizes
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      is_new: isNew,
      stock_status: stockStatus,
      slug,
      quantity: Number(quantity),
      materials,
      weight,
    };

    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      setName("");
      setPrice("0");
      setDescription("");
      setUploadedImageUrls([]);
      setModel3dUrl("");
      setSizes("");
      setStockStatus("available");
      setQuantity("0");
      setMaterials("");
      setWeight("");
      setIsNew(false);
      await loadProducts();
    }
  }

  async function archiveProduct(id: string) {
    await fetch(`/api/products/${id}/archive`, { method: "POST" });
    await loadProducts();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl tracking-[0.2em]">[ INVENTORY ]</h1>

      <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-border bg-surface p-4">
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input placeholder="Slug (auto)" value={slug} disabled />
        <input type="number" step="0.01" placeholder="Price" value={price} onChange={(e) => setPrice(e.target.value)} required />
        <input placeholder="Stock Status" value={stockStatus} onChange={(e) => setStockStatus(e.target.value)} />
        <input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        <input placeholder="Materials" value={materials} onChange={(e) => setMaterials(e.target.value)} />
        <input placeholder="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
        <input placeholder="3D Model URL" value={model3dUrl} onChange={(e) => setModel3dUrl(e.target.value)} />
        <input placeholder="Sizes (comma separated)" value={sizes} onChange={(e) => setSizes(e.target.value)} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} />
          Mark as New
        </label>
        <textarea className="md:col-span-2 p-2" rows={3} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="md:col-span-2">
          <input type="file" multiple onChange={(e) => handleUpload(e.target.files)} />
          <p className="text-xs mt-1 text-zinc-400">
            Uploaded: {uploadedImageUrls.length} {loading ? "(uploading...)" : ""}
          </p>
        </div>
        <button type="submit" className="md:col-span-2 border border-white bg-black px-3 py-2 hover:bg-white hover:text-black">
          CREATE PRODUCT
        </button>
      </form>

      <div className="border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-surface border-b border-border">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Price</th>
              <th className="text-left p-2">Stock</th>
              <th className="text-left p-2">Qty</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border">
                <td className="p-2">{product.name}</td>
                <td className="p-2">{product.price}</td>
                <td className="p-2">{product.stock_status ?? "-"}</td>
                <td className="p-2">{product.quantity ?? 0}</td>
                <td className="p-2">
                  <button onClick={() => archiveProduct(product.id)} className="border border-border px-2 py-1 hover:border-white">
                    ARCHIVE
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

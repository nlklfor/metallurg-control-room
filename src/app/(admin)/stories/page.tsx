"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import {
  drawStory,
  FORMATS,
  type StoryFormat,
  type StoryLayers,
  type StoryTemplate,
} from "@/lib/story/draw";
import { loadImage, loadStoryFonts } from "@/lib/story/fonts";

type Row = {
  id: string;
  name: string | null;
  sku: string | null;
  price: number | null;
  stock_status: "in_stock" | "out_of_stock" | "pre_order" | null;
  size_stock: Record<string, number> | null;
  sizes: (string | number)[] | null;
  image_url: string[] | null;
  slug: string | null;
};

const TEMPLATES: { id: StoryTemplate; label: string }[] = [
  { id: "object", label: "OBJECT_CARD" },
  { id: "drop", label: "DROP_TEASER" },
  { id: "restock", label: "RESTOCK" },
];

function inStockSizes(p: Row): string[] {
  const stock = p.size_stock ?? {};
  const keys = Object.keys(stock);
  if (keys.length > 0) return keys.filter((k) => (stock[k] ?? 0) > 0);
  return (p.sizes ?? []).map(String);
}

// Defaults for the editable text, matching how the posts are written:
//   [ ITEM_591 ] // FEAR_OF_GOD   ·   title without the "(colour)" part
function defaultItemId(p: Row): string {
  const digits = (p.sku ?? "").replace(/\D/g, "");
  return digits ? digits.slice(-3) : "000";
}
function defaultHeaderProduct(p: Row): string {
  return (p.name ?? "")
    .replace(/\(.*?\)/g, " ")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join("_");
}
function defaultTitle(p: Row): string {
  return (p.name ?? "").replace(/\s*\(.*?\)\s*/g, " ").trim();
}

const inputClass =
  "h-10 w-full border border-[#e5e5e5] px-3 font-mono text-[13px] focus:border-black focus:outline-none";
const label = "text-[10px] uppercase tracking-[0.25em] text-[#6b7280]";

export default function StoriesPage() {
  const [products, setProducts] = useState<Row[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [format, setFormat] = useState<StoryFormat>("story");
  const [template, setTemplate] = useState<StoryTemplate>("object");
  const [layers, setLayers] = useState<StoryLayers>({ sizes: true, value: true, watermark: true });
  const [itemId, setItemId] = useState("");
  const [headerProduct, setHeaderProduct] = useState("");
  const [title, setTitle] = useState("");
  const [fontsReady, setFontsReady] = useState(false);
  const [mark, setMark] = useState<HTMLImageElement | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    void loadStoryFonts().then(() => setFontsReady(true));
    void loadImage("/brand/mtl-mark.png", false).then(setMark);
    void createClient()
      .from("products")
      .select("id, name, sku, price, stock_status, size_stock, sizes, image_url, slug")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          setLoadError(error.message);
          return;
        }
        const rows = (data ?? []) as Row[];
        setProducts(rows);
        if (rows[0]) setSelectedId(rows[0].id);
      });
  }, []);

  const selected = products.find((p) => p.id === selectedId) ?? null;
  const images = useMemo(() => selected?.image_url ?? [], [selected]);

  // New product → reset photo and the editable text to its defaults
  useEffect(() => {
    setImageIndex(0);
    if (!selected) return;
    setItemId(defaultItemId(selected));
    setHeaderProduct(defaultHeaderProduct(selected));
    setTitle(defaultTitle(selected));
  }, [selected]);

  useEffect(() => {
    setImage(null);
    setImageError(null);
    const url = images[imageIndex];
    if (!url) return;
    let cancelled = false;
    loadImage(url)
      .then((img) => !cancelled && setImage(img))
      .catch((e: Error) => !cancelled && setImageError(e.message));
    return () => {
      cancelled = true;
    };
  }, [images, imageIndex]);

  const { w: W, h: H } = FORMATS[format];

  useEffect(() => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !selected || !fontsReady) return;
    drawStory(
      ctx,
      format,
      {
        itemId,
        headerProduct,
        title,
        price: selected.price,
        sizes: inStockSizes(selected),
        image,
      },
      template,
      layers,
      { mark },
    );
  }, [selected, image, template, layers, fontsReady, mark, format, itemId, headerProduct, title, W, H]);

  const download = useCallback(() => {
    setExportError(null);
    const canvas = canvasRef.current;
    if (!canvas || !selected) return;
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          setExportError("Could not export the image.");
          return;
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `${format}-${selected.slug ?? selected.id}-${template}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      }, "image/png");
    } catch {
      setExportError("This photo blocks export (no CORS). Pick another photo.");
    }
  }, [selected, template, format]);

  const filtered = products.filter((p) =>
    (p.name ?? "").toLowerCase().includes(query.trim().toLowerCase()),
  );
  const previewWidth = 405;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_480px]">
      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <p className={label}>// STORY_GENERATOR</p>
          <h1 className="mt-2 text-3xl font-black uppercase italic tracking-tight">Story</h1>
          <div className="mt-3 h-px bg-black" />
        </div>

        <p className={label}>// 01 PICK_OBJECT</p>
        <label className="flex h-11 items-center gap-2 border border-[#e5e5e5] px-3 text-[13px]">
          <Search size={15} className="text-[#9ca3af]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter objects"
            className="w-full bg-transparent focus:outline-none"
          />
        </label>
        {loadError ? <p className="text-sm text-red-500">{loadError}</p> : null}
        <div className="max-h-[300px] overflow-y-auto border-t border-black">
          {filtered.map((p) => {
            const active = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "flex h-[52px] w-full items-center gap-3 border-b border-[#e5e5e5] px-3 text-left font-mono text-[12px]",
                  active ? "bg-black text-white" : "hover:bg-[#f9fafb]",
                )}
              >
                <span className="flex h-3.5 w-3.5 items-center justify-center border border-current text-[9px]">
                  {active ? "✓" : ""}
                </span>
                <span className="flex-1 truncate uppercase">{p.name}</span>
                <span className="tabular-nums">{p.price?.toLocaleString("en-US") ?? "—"}</span>
                <span className="w-24 text-right text-[10px] uppercase tracking-[0.1em]">
                  {p.stock_status ?? ""}
                </span>
              </button>
            );
          })}
        </div>

        {images.length > 1 ? (
          <>
            <p className={label}>// PHOTO</p>
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setImageIndex(i)}
                  className={cn(
                    "h-16 w-16 overflow-hidden border bg-black",
                    i === imageIndex ? "border-black ring-1 ring-black" : "border-[#e5e5e5]",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-full w-full object-contain" />
                </button>
              ))}
            </div>
          </>
        ) : null}

        <p className={label}>// 02 TEXT</p>
        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
          <input value={itemId} onChange={(e) => setItemId(e.target.value.toUpperCase())} className={inputClass} aria-label="Item number" placeholder="391" />
          <input value={headerProduct} onChange={(e) => setHeaderProduct(e.target.value.toUpperCase())} className={inputClass} aria-label="Header" placeholder="AIR_JORDAN_4" />
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} aria-label="Title" placeholder="Air Jordan 4 Rare Air" />

        <p className={label}>// 03 FORMAT · TEMPLATE</p>
        <div className="grid h-11 grid-cols-2 border border-black font-mono text-[11px] tracking-[0.12em]">
          {(Object.keys(FORMATS) as StoryFormat[]).map((f, i) => (
            <button
              key={f}
              type="button"
              onClick={() => setFormat(f)}
              className={cn(i > 0 && "border-l border-black", format === f && "bg-black text-white")}
            >
              {FORMATS[f].label}
            </button>
          ))}
        </div>
        <div className="grid h-11 grid-cols-3 border border-black font-mono text-[11px] tracking-[0.12em]">
          {TEMPLATES.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTemplate(t.id)}
              className={cn(i > 0 && "border-l border-black", template === t.id && "bg-black text-white")}
            >
              {t.label}
            </button>
          ))}
        </div>

        <p className={label}>// 04 LAYERS</p>
        <div className="grid grid-cols-2 gap-2 font-mono text-[12px]">
          {(
            [
              ["sizes", "SIZES"],
              ["value", "VALUE"],
              ["watermark", "LOGO_WATERMARK"],
            ] as const
          ).map(([key, text]) => (
            <label key={key} className="flex h-9 cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={(e) => setLayers((l) => ({ ...l, [key]: e.target.checked }))}
                className="h-3.5 w-3.5 accent-black"
              />
              {text}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 bg-[#f4f4f5] p-6 lg:p-8">
        <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-[#6b7280]">
          <span>// PREVIEW {W}×{H}</span>
          <span>{fontsReady ? "" : "LOADING_FONTS…"}</span>
        </div>
        <canvas
          ref={canvasRef}
          width={W}
          height={H}
          className="self-center bg-black"
          style={{ width: previewWidth, height: (previewWidth * H) / W }}
        />
        {imageError ? <p className="text-[12px] text-red-500">{imageError}</p> : null}
        {selected && !selected.image_url?.length ? (
          <p className="text-[12px] text-[#6b7280]">This product has no photo yet.</p>
        ) : null}
        {exportError ? <p className="text-[12px] text-red-500">{exportError}</p> : null}
        <button
          type="button"
          onClick={download}
          disabled={!selected || !fontsReady}
          className="mt-auto flex h-[52px] items-center justify-center gap-2 bg-black font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-white hover:bg-[#222] disabled:opacity-40"
        >
          <Download size={14} /> DOWNLOAD_PNG
        </button>
      </div>
    </div>
  );
}

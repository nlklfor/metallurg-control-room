// Story / post renderer in the shop's existing Instagram & Telegram style:
// black canvas, Space Mono Bold, everything centred —
//
//   [ ITEM_391 ] // AIR_JORDAN_4
//   (photo over a large dark MTL monogram)
//   Air Jordan 4 Rare Air
//   [ 44 / 45 ]
//   VALUE: 7,299 UAH
//   (white MTL monogram)
//
// Pure canvas, so the same function draws the preview and the PNG.

export type StoryFormat = "story" | "post";
export type StoryTemplate = "object" | "drop" | "restock";

export const FORMATS: Record<StoryFormat, { w: number; h: number; label: string }> = {
  story: { w: 1080, h: 1920, label: "STORY 1080×1920" },
  post: { w: 1080, h: 1350, label: "POST 1080×1350" },
};

// Vertical layout per format (px on the final image).
const LAYOUT: Record<
  StoryFormat,
  {
    header: number; // header baseline
    imgTop: number;
    imgBottom: number;
    imgWidth: number;
    markCenter: number; // watermark centre
    markWidth: number;
    name: number; // name baseline
    sizes: number;
    value: number;
    footerCenter: number;
    footerWidth: number;
  }
> = {
  story: {
    header: 146,
    imgTop: 250,
    imgBottom: 1290,
    imgWidth: 880,
    markCenter: 964,
    markWidth: 855,
    name: 1395,
    sizes: 1495,
    value: 1600,
    footerCenter: 1763,
    footerWidth: 152,
  },
  post: {
    header: 104,
    imgTop: 160,
    imgBottom: 900,
    imgWidth: 820,
    markCenter: 640,
    markWidth: 760,
    name: 1002,
    sizes: 1080,
    value: 1160,
    footerCenter: 1262,
    footerWidth: 130,
  },
};

export interface StoryData {
  itemId: string; // "391" → [ ITEM_391 ]
  headerProduct: string; // "AIR_JORDAN_4"
  title: string; // "Air Jordan 4 Rare Air" (shown as typed)
  price: number | null;
  sizes: string[];
  image: CanvasImageSource | null;
}

export interface StoryLayers {
  sizes: boolean;
  value: boolean;
  watermark: boolean;
}

export interface StoryAssets {
  mark: HTMLImageElement | null; // white MTL monogram (transparent PNG)
}

export const FONT_FAMILY = "MTL Space Mono";
const font = (size: number) => `700 ${size}px "${FONT_FAMILY}"`;

type Ctx = CanvasRenderingContext2D;

function tinted(img: HTMLImageElement, color: string, w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.round(w);
  c.height = Math.round(h);
  const g = c.getContext("2d")!;
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}

function drawMark(ctx: Ctx, mark: HTMLImageElement, cx: number, cy: number, width: number, color: string) {
  const h = (width * mark.naturalHeight) / mark.naturalWidth;
  ctx.drawImage(tinted(mark, color, width, h), cx - width / 2, cy - h / 2, width, h);
}

function drawContained(ctx: Ctx, img: CanvasImageSource, x: number, y: number, w: number, h: number) {
  const iw = (img as HTMLImageElement).naturalWidth || (img as HTMLCanvasElement).width;
  const ih = (img as HTMLImageElement).naturalHeight || (img as HTMLCanvasElement).height;
  if (!iw || !ih) return;
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

/** Largest font size ≤ max that fits the text into maxWidth. */
function fitSize(ctx: Ctx, text: string, max: number, min: number, maxWidth: number): number {
  for (let s = max; s > min; s -= 2) {
    ctx.font = font(s);
    if (ctx.measureText(text).width <= maxWidth) return s;
  }
  return min;
}

export function drawStory(
  ctx: Ctx,
  format: StoryFormat,
  d: StoryData,
  template: StoryTemplate,
  layers: StoryLayers,
  assets: StoryAssets,
): void {
  const { w: W, h: H } = FORMATS[format];
  const L = LAYOUT[format];
  const textW = W - 120;

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Large dark monogram behind the photo
  if (layers.watermark && assets.mark) {
    drawMark(ctx, assets.mark, W / 2, L.markCenter, L.markWidth, "#1E1E1E");
  }

  // Photo
  if (d.image) {
    ctx.save();
    if (template === "drop") ctx.filter = "blur(26px) brightness(0.5)";
    drawContained(ctx, d.image, (W - L.imgWidth) / 2, L.imgTop, L.imgWidth, L.imgBottom - L.imgTop);
    ctx.restore();
  }

  ctx.fillStyle = "#fff";

  // Header
  const head =
    template === "drop"
      ? `[ INCOMING_DROP ] // ${d.headerProduct}`
      : template === "restock"
        ? `[ BACK_IN_ARCHIVE ] // ${d.headerProduct}`
        : `[ ITEM_${d.itemId} ] // ${d.headerProduct}`;
  ctx.font = font(fitSize(ctx, head, 34, 22, textW));
  ctx.fillText(head, W / 2, L.header);

  if (template === "drop") {
    ctx.save();
    ctx.font = font(30);
    ctx.fillStyle = "#9CA3AF";
    ctx.fillText("[ CLASSIFIED ]", W / 2, (L.imgTop + L.imgBottom) / 2);
    ctx.restore();
  }

  // Title
  ctx.font = font(fitSize(ctx, d.title, 48, 30, textW));
  ctx.fillText(d.title, W / 2, L.name);

  // Sizes
  if (template === "drop") {
    ctx.font = font(40);
    ctx.fillStyle = "#D6D3D1";
    ctx.fillText("[ SOON ]", W / 2, L.sizes);
  } else if (layers.sizes && d.sizes.length > 0) {
    const t = `[ ${d.sizes.join(" / ")} ]`;
    ctx.font = font(fitSize(ctx, t, 40, 26, textW));
    ctx.fillStyle = "#D6D3D1";
    ctx.fillText(t, W / 2, L.sizes);
  }

  // Value — "VALUE:" a step smaller than the amount, like the posts
  if (layers.value && d.price != null) {
    const label = "VALUE: ";
    const amount = `${d.price.toLocaleString("en-US")} UAH`;
    ctx.fillStyle = "#fff";
    ctx.font = font(42);
    const lw = ctx.measureText(label).width;
    ctx.font = font(50);
    const aw = ctx.measureText(amount).width;
    const x0 = W / 2 - (lw + aw) / 2;
    ctx.textAlign = "left";
    ctx.font = font(42);
    ctx.fillText(label, x0, L.value);
    ctx.font = font(50);
    ctx.fillText(amount, x0 + lw, L.value);
    ctx.textAlign = "center";
  }

  // Footer monogram
  if (assets.mark) drawMark(ctx, assets.mark, W / 2, L.footerCenter, L.footerWidth, "#fff");

  ctx.restore();
}

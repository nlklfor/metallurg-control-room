import { FONT_FAMILY } from "./draw";

// Space Mono Bold (SIL Open Font License, via @fontsource) — the font of the
// shop's Instagram/Telegram posts — self-hosted in /public/fonts.
let fontLoading: Promise<void> | null = null;

export function loadStoryFonts(): Promise<void> {
  if (!fontLoading) {
    const face = new FontFace(FONT_FAMILY, 'url(/fonts/SpaceMono-700.woff2) format("woff2")', {
      weight: "700",
    });
    fontLoading = face.load().then((f) => {
      document.fonts.add(f);
    });
  }
  return fontLoading;
}

export function loadImage(url: string, crossOrigin = true): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Supabase Storage serves public files with CORS, so the canvas stays
    // exportable (an untainted canvas is required for toBlob).
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not load image ${url}`));
    img.src = url;
  });
}

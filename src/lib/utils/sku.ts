// SKU in the shop's existing format: MTL-<4 letters>-<digits>
// e.g. "Air Jordan 4 Cave Stone" → MTL-JRCV-482913,
//      "Nike Mind 001 Slide"     → MTL-NKMN-731024.
// Letters: a 2-letter brand code + 2 consonants of the first model word.

const BRANDS: [RegExp, string][] = [
  [/^air jordan\b|^jordan\b/, "JR"],
  [/^nike\b/, "NK"],
  [/^new balance\b/, "NB"],
  [/^adidas\b/, "AD"],
  [/^yeezy\b/, "YZ"],
  [/^asics\b/, "AS"],
  [/^salomon\b/, "SL"],
  [/^fear of god\b/, "FG"],
  [/^essentials\b/, "ES"],
  [/^stone island\b/, "SI"],
  [/^stussy\b|^stüssy\b/, "ST"],
  [/^supreme\b/, "SP"],
  [/^carhartt\b/, "CH"],
  [/^nocta\b/, "NC"],
  [/^puma\b/, "PM"],
  [/^converse\b/, "CV"],
  [/^vans\b/, "VN"],
];

const STOP = new Set(["air", "the", "x", "of", "and", "low", "high", "mid", "og"]);

function consonants(word: string): string {
  const letters = word.toUpperCase().replace(/[^A-Z]/g, "");
  const cons = letters.replace(/[AEIOUY]/g, "");
  return (letters[0] ?? "") + cons.slice(letters[0] && !/[AEIOUY]/.test(letters[0]) ? 1 : 0);
}

export function skuLetters(name: string): string {
  const clean = name.toLowerCase().replace(/[()\/]/g, " ").replace(/\s+/g, " ").trim();
  let brand = "";
  let rest = clean;
  for (const [re, code] of BRANDS) {
    const m = clean.match(re);
    if (m) {
      brand = code;
      rest = clean.slice(m[0].length).trim();
      break;
    }
  }
  const all = rest.split(" ").filter((w) => w && !STOP.has(w) && /[a-z]/.test(w));
  // Prefer real words over model numbers like "1906r" or "001".
  const words = [...all.filter((w) => !/\d/.test(w)), ...all.filter((w) => /\d/.test(w))];
  if (!brand) {
    // Unknown brand: first two letters of the first word.
    const first = words.shift() ?? "";
    brand = consonants(first).slice(0, 2);
  }
  const model = consonants(words[0] ?? "").slice(0, 2);
  return (brand + model).padEnd(4, "X").slice(0, 4);
}

export function generateSku(name: string, taken: Iterable<string | null | undefined>): string {
  const used = new Set([...taken].filter(Boolean).map((s) => String(s).toUpperCase()));
  const letters = skuLetters(name || "item");
  for (let i = 0; i < 50; i++) {
    const digits = String(Math.floor(100000 + Math.random() * 900000));
    const sku = `MTL-${letters}-${digits}`;
    if (!used.has(sku)) return sku;
  }
  return `MTL-${letters}-${Date.now()}`;
}

/**
 * Weight in kg as a plain number string ("1.2"). Accepts "1,2", "1.2 kg",
 * "1200 g". Returns null when empty, or an error message.
 */
export function parseWeightKg(input: string): { value: string | null; error?: string } {
  const raw = input.trim().toLowerCase().replace(",", ".");
  if (!raw) return { value: null };
  const m = raw.match(/^(\d+(?:\.\d+)?)\s*(kg|g)?$/);
  if (!m) return { value: null, error: "Weight: enter kg, e.g. 1.2" };
  let kg = Number(m[1]);
  if (m[2] === "g") kg = kg / 1000;
  if (!(kg > 0 && kg <= 30)) {
    return { value: null, error: "Weight must be between 0 and 30 kg" };
  }
  return { value: String(Math.round(kg * 1000) / 1000) };
}

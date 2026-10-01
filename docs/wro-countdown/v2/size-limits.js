export const SIZE_LIMITS = {
  clockSize: { minimum: 20, maximum: 280 },
  dateSize: { minimum: 10, maximum: 48 },
  // Large projectors, 4K/8K displays and wall screens can use much larger
  // timer digits. Only automatic mode fits the rendered value to the viewport.
  timerSize: { minimum: 36, maximum: Infinity },
  completionTextSize: { minimum: 20, maximum: 320 },
  targetSize: { minimum: 12, maximum: 180 },
  subSize: { minimum: 12, maximum: 140 },
  timerTextSize: { minimum: 12, maximum: 180 },
  wroTitleSize: { minimum: 12, maximum: 180 },
  wroDateSuffixSize: { minimum: 12, maximum: 140 }
};

export function applySizeLimits() {
  for (const [key, limits] of Object.entries(SIZE_LIMITS)) {
    const number = document.getElementById(key);
    const range = document.getElementById(`${key}Range`);

    for (const input of [number, range]) {
      if (!input) continue;
      input.min = String(limits.minimum);
      if (key === "timerSize") {
        if (input.type === "number") {
          // Number input: no upper bound.
          input.removeAttribute("max");
        } else {
          // Range input: browsers require a finite max. Expand this range
          // dynamically when a larger value is entered.
          input.max = "10000";
        }
      } else {
        input.max = String(limits.maximum);
      }
      input.step = "1";
    }
  }
}

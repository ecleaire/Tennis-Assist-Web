export const SIZE_LIMITS = {
  clockSize: { minimum: 20, maximum: 280 },
  dateSize: { minimum: 10, maximum: 48 },
  // Large projectors, 4K/8K displays and wall screens can use much larger
  // timer digits. The rendered value is still fitted safely to the viewport.
  timerSize: { minimum: 36, maximum: 3000 },
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
      input.max = String(limits.maximum);
      input.step = "1";
    }
  }
}

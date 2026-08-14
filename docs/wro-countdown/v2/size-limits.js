export const SIZE_LIMITS = {
  clockSize: { minimum: 20, maximum: 280 },
  timerSize: { minimum: 36, maximum: 520 },
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

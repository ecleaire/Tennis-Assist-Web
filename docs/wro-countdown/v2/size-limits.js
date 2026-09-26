export const TIMER_RANGE_DEFAULT_MAX = 1_000_000;

export const SIZE_LIMITS = {
  clockSize: { minimum: 20, maximum: 280 },
  dateSize: { minimum: 10, maximum: 48 },
  // Timer numeric input has no upper limit. Auto-size mode still fits the
  // display, while manual mode intentionally honors the configured px value.
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
          // Number input: truly unlimited above the minimum.
          input.removeAttribute("max");
          input.setCustomValidity("");
        } else {
          // A range input needs a finite max. Start very high and allow the
          // settings controller to expand it further when necessary.
          input.max = String(TIMER_RANGE_DEFAULT_MAX);
        }
      } else {
        input.max = String(limits.maximum);
      }
      input.step = "1";
    }
  }
}

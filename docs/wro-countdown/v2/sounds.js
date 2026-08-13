import { SOUND_PATTERNS } from "./sound-data.js";

export function playTemplate(context, type, volume) {
  const events = SOUND_PATTERNS[type] || SOUND_PATTERNS.bell;
  const baseTime = context.currentTime + 0.035;

  for (const event of events) {
    const [delay, frequency, duration, wave, gainLevel, endFrequency] = event;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const level = volume / 100 * gainLevel;
    const start = baseTime + delay;

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        start + duration
      );
    }

    gain.gain.setValueAtTime(Math.max(0.0001, level), start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  }
}

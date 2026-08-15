import { SOUND_PATTERNS } from "./sound-data.js?v=20260814r";

const VOLUME_BOOST = 40;

function createLimiter(context) {
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -1;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.12;
  return limiter;
}

export function playTemplate(context, type, volume) {
  const events = SOUND_PATTERNS[type] || SOUND_PATTERNS.bell;
  const baseTime = context.currentTime + 0.035;
  const masterGain = context.createGain();
  const limiter = createLimiter(context);
  let activeOscillators = events.length;

  masterGain.gain.setValueAtTime(VOLUME_BOOST, baseTime);
  masterGain.connect(limiter).connect(context.destination);

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
    oscillator.connect(gain).connect(masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
    oscillator.onended = () => {
      activeOscillators -= 1;
      if (activeOscillators === 0) {
        masterGain.disconnect();
        limiter.disconnect();
      }
    };
  }
}

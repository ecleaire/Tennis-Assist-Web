import { SOUND_PATTERNS } from "./sound-data.js?v=20260814q";

const VOLUME_BOOST = 10;
const PATTERN_OFFSET = 0.48;

// Every selectable sound starts with the same sharp attention signal, then
// continues into its own pattern. This makes even the gentler templates easy
// to notice in a noisy room without changing the user's saved sound choice.
const ATTENTION_PREAMBLE = [
  [0, 1320, 0.09, "square", 0.055],
  [0.13, 1320, 0.09, "square", 0.055],
  [0.27, 1760, 0.16, "square", 0.07]
];

function createLimiter(context) {
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.16;
  return limiter;
}

function shiftedPattern(type) {
  const selected = SOUND_PATTERNS[type] || SOUND_PATTERNS.bell;
  return [
    ...ATTENTION_PREAMBLE,
    ...selected.map(event => {
      const shifted = [...event];
      shifted[0] += PATTERN_OFFSET;
      return shifted;
    })
  ];
}

export function playTemplate(context, type, volume) {
  const events = shiftedPattern(type);
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
    const level = Math.max(0.0001, volume / 100 * gainLevel);
    const start = baseTime + delay;
    const attackEnd = start + Math.min(0.008, duration * 0.2);

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(
        endFrequency,
        start + duration
      );
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(level, attackEnd);
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

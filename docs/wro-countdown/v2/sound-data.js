// Ten attention-focused timer sound patterns.
// Each pattern is intentionally rhythmic and uses frequencies that remain
// audible on phone and laptop speakers.

const alternating = (count, step, low, high, duration, wave, gain) =>
  Array.from({ length: count }, (_, index) => [
    index * step,
    index % 2 ? high : low,
    duration,
    wave,
    gain
  ]);

const rising = (frequencies, step, duration, wave, gain, start = 0) =>
  frequencies.map((frequency, index) => [
    start + index * step,
    frequency,
    duration,
    wave,
    gain
  ]);

export const SOUND_PATTERNS = {
  // Three attention groups followed by a longer resolving bell.
  bell: [
    [0, 880, 0.16, "square", 0.082],
    [0, 1760, 0.12, "triangle", 0.025],
    [0.2, 880, 0.16, "square", 0.082],
    [0.4, 1320, 0.28, "square", 0.09],
    [1.05, 880, 0.16, "square", 0.082],
    [1.05, 1760, 0.12, "triangle", 0.025],
    [1.25, 880, 0.16, "square", 0.082],
    [1.45, 1320, 0.28, "square", 0.09],
    [2.1, 880, 0.16, "square", 0.082],
    [2.1, 1760, 0.12, "triangle", 0.025],
    [2.3, 880, 0.16, "square", 0.082],
    [2.5, 1320, 0.28, "square", 0.09],
    [3.08, 1046.5, 0.9, "sine", 0.145],
    [3.08, 1569.75, 0.66, "triangle", 0.045]
  ],

  // A rising chime plays twice, then ends on a high sustained note.
  chime: [
    ...rising([523.25, 659.25, 783.99, 1046.5], 0.18, 0.5, "triangle", 0.105),
    ...rising([659.25, 783.99, 1046.5, 1318.5], 0.18, 0.5, "triangle", 0.11, 1.18),
    [2.16, 1046.5, 0.18, "square", 0.065],
    [2.38, 1318.5, 0.18, "square", 0.07],
    [2.62, 1567.98, 0.82, "sine", 0.13]
  ],

  // Three clearly separated triple-beep groups.
  digital: [
    [0, 1120, 0.12, "square", 0.085],
    [0.16, 1120, 0.12, "square", 0.085],
    [0.32, 1580, 0.2, "square", 0.1],
    [0.92, 1120, 0.12, "square", 0.085],
    [1.08, 1120, 0.12, "square", 0.085],
    [1.24, 1580, 0.2, "square", 0.1],
    [1.84, 1120, 0.12, "square", 0.085],
    [2.0, 1120, 0.12, "square", 0.085],
    [2.16, 1580, 0.2, "square", 0.1],
    [2.72, 1320, 0.58, "square", 0.115]
  ],

  // A persistent two-tone alarm that is hard to miss.
  alarm: [
    ...alternating(18, 0.17, 660, 990, 0.135, "sawtooth", 0.068),
    [3.18, 720, 0.28, "square", 0.085],
    [3.5, 1080, 0.28, "square", 0.09],
    [3.84, 1440, 0.58, "square", 0.105]
  ],

  // Distinct low/high bell pairs repeated three times.
  doubleBell: [
    [0, 740, 0.34, "triangle", 0.115],
    [0, 1480, 0.23, "sine", 0.035],
    [0.27, 1040, 0.34, "triangle", 0.13],
    [0.92, 740, 0.34, "triangle", 0.115],
    [0.92, 1480, 0.23, "sine", 0.035],
    [1.19, 1040, 0.34, "triangle", 0.13],
    [1.84, 740, 0.34, "triangle", 0.115],
    [1.84, 1480, 0.23, "sine", 0.035],
    [2.11, 1040, 0.34, "triangle", 0.13],
    [2.72, 880, 0.82, "sine", 0.14]
  ],

  // A longer school-style chime with a second phrase.
  school: [
    ...rising([659.25, 523.25, 587.33, 392], 0.34, 0.76, "sine", 0.105),
    ...rising([523.25, 587.33, 659.25, 523.25], 0.34, 0.76, "sine", 0.11, 1.72),
    [3.3, 783.99, 0.72, "triangle", 0.11]
  ],

  // A cleaner, brighter ping sequence that still feels less urgent.
  softPing: [
    [0, 1174.66, 0.62, "sine", 0.12],
    [0, 1760, 0.42, "triangle", 0.04],
    [0.58, 1318.5, 0.62, "sine", 0.125],
    [0.58, 1975.5, 0.42, "triangle", 0.04],
    [1.16, 1567.98, 0.7, "sine", 0.13],
    [1.16, 2351.97, 0.42, "triangle", 0.035],
    [2.05, 1174.66, 0.88, "sine", 0.13],
    [2.05, 1760, 0.56, "triangle", 0.04]
  ],

  // Repeating up/down sweeps for emergency-style recognition.
  siren: [
    [0, 560, 0.54, "sawtooth", 0.072, 1080],
    [0.58, 1080, 0.54, "sawtooth", 0.072, 560],
    [1.16, 560, 0.54, "sawtooth", 0.076, 1080],
    [1.74, 1080, 0.54, "sawtooth", 0.076, 560],
    [2.32, 560, 0.54, "sawtooth", 0.08, 1080],
    [2.9, 1080, 0.54, "sawtooth", 0.08, 560],
    [3.5, 920, 0.62, "square", 0.095]
  ],

  // Rapid rising pulses followed by two strong confirmation tones.
  pulse: [
    ...rising(
      [520, 580, 640, 700, 760, 820, 880, 940, 1000, 1060, 1120, 1180],
      0.105,
      0.072,
      "square",
      0.068
    ),
    [1.52, 1046.5, 0.24, "square", 0.095],
    [1.82, 1396.91, 0.24, "square", 0.1],
    [2.18, 1760, 0.72, "sine", 0.125]
  ],

  // Mechanical alternating tones and a final upward sweep.
  robot: [
    [0, 440, 0.12, "square", 0.075],
    [0.15, 720, 0.12, "triangle", 0.08],
    [0.3, 560, 0.12, "square", 0.075],
    [0.45, 920, 0.12, "triangle", 0.085],
    [0.75, 440, 0.12, "square", 0.075],
    [0.9, 720, 0.12, "triangle", 0.08],
    [1.05, 560, 0.12, "square", 0.075],
    [1.2, 920, 0.12, "triangle", 0.085],
    [1.52, 520, 0.18, "square", 0.085],
    [1.74, 780, 0.18, "square", 0.09],
    [1.98, 1040, 0.18, "square", 0.095],
    [2.3, 360, 0.72, "sawtooth", 0.07, 1440],
    [3.08, 1320, 0.56, "square", 0.1]
  ]
};

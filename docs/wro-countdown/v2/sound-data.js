// Twenty synthesized timer sound patterns.
export const SOUND_PATTERNS = {
  bell: [
    [0, 880, 1.15, "sine", 0.17],
    [0, 1320, 0.92, "sine", 0.07],
    [0.72, 880, 1.15, "sine", 0.17],
    [0.72, 1320, 0.92, "sine", 0.07]
  ],
  chime: [
    [0, 523.25, 0.75, "sine", 0.15],
    [0.18, 659.25, 0.75, "sine", 0.15],
    [0.36, 783.99, 0.75, "sine", 0.15],
    [0.54, 1046.5, 0.75, "sine", 0.15]
  ],
  digital: [
    [0, 1046.5, 0.105, "square", 0.09],
    [0.16, 1318.5, 0.105, "square", 0.09],
    [0.32, 1046.5, 0.105, "square", 0.09],
    [0.48, 1318.5, 0.105, "square", 0.09],
    [0.64, 1046.5, 0.105, "square", 0.09]
  ],
  alarm: [
    [0, 698.46, 0.15, "sawtooth", 0.075],
    [0.19, 932.33, 0.15, "sawtooth", 0.075],
    [0.38, 698.46, 0.15, "sawtooth", 0.075],
    [0.57, 932.33, 0.15, "sawtooth", 0.075],
    [0.76, 698.46, 0.15, "sawtooth", 0.075],
    [0.95, 932.33, 0.15, "sawtooth", 0.075]
  ],
  doubleBell: [
    [0, 740, 0.62, "sine", 0.15],
    [0.34, 990, 0.62, "sine", 0.15],
    [1.05, 740, 0.62, "sine", 0.15],
    [1.39, 990, 0.62, "sine", 0.15]
  ],
  school: [
    [0, 659.25, 0.86, "sine", 0.14],
    [0.36, 523.25, 0.86, "sine", 0.14],
    [0.72, 587.33, 0.86, "sine", 0.14],
    [1.08, 392, 0.86, "sine", 0.14]
  ],
  softPing: [
    [0, 1174.66, 1.05, "sine", 0.11],
    [0, 1760, 0.7, "triangle", 0.025],
    [0.75, 1174.66, 1.05, "sine", 0.11]
  ],
  siren: [
    [0, 540, 0.56, "sawtooth", 0.07, 980],
    [0.62, 980, 0.56, "sawtooth", 0.07, 540],
    [1.24, 540, 0.56, "sawtooth", 0.07, 980]
  ],
  pulse: [
    [0, 520, 0.075, "square", 0.065],
    [0.12, 575, 0.075, "square", 0.065],
    [0.24, 630, 0.075, "square", 0.065],
    [0.36, 685, 0.075, "square", 0.065],
    [0.48, 740, 0.075, "square", 0.065],
    [0.6, 795, 0.075, "square", 0.065],
    [0.72, 850, 0.075, "square", 0.065],
    [0.84, 905, 0.075, "square", 0.065],
    [1.32, 1046.5, 0.55, "sine", 0.13]
  ],
  robot: [
    [0, 440, 0.11, "triangle", 0.075],
    [0.14, 660, 0.11, "square", 0.075],
    [0.28, 550, 0.11, "triangle", 0.075],
    [0.42, 880, 0.11, "square", 0.075],
    [0.56, 660, 0.11, "triangle", 0.075],
    [0.7, 1100, 0.11, "square", 0.075],
    [0.9, 330, 0.42, "square", 0.045, 1320]
  ],

  // Two short horn blasts with strong harmonics for small speakers.
  stadiumHorn: [
    [0, 220, 0.54, "sawtooth", 0.052, 330],
    [0, 440, 0.54, "square", 0.018, 660],
    [0.68, 247, 0.54, "sawtooth", 0.055, 370],
    [0.68, 494, 0.54, "square", 0.018, 740]
  ],

  // A deliberately rough competition buzzer.
  matchBuzzer: [
    [0, 185, 0.48, "square", 0.058],
    [0, 370, 0.48, "sawtooth", 0.026],
    [0.62, 185, 0.48, "square", 0.058],
    [0.62, 370, 0.48, "sawtooth", 0.026],
    [1.24, 220, 0.68, "square", 0.065],
    [1.24, 440, 0.68, "sawtooth", 0.028]
  ],

  // Inharmonic partials create a brighter metallic bell character.
  metallicBell: [
    [0, 880, 0.94, "sine", 0.12],
    [0, 1317, 0.76, "sine", 0.052],
    [0, 1876, 0.58, "triangle", 0.032],
    [0.72, 988, 0.94, "sine", 0.12],
    [0.72, 1479, 0.76, "sine", 0.052],
    [0.72, 2104, 0.58, "triangle", 0.032]
  ],

  // Two ascending three-note chime phrases.
  tripleChime: [
    [0, 523.25, 0.5, "sine", 0.115],
    [0.2, 659.25, 0.5, "sine", 0.12],
    [0.4, 783.99, 0.72, "sine", 0.13],
    [0.98, 659.25, 0.5, "sine", 0.115],
    [1.18, 783.99, 0.5, "sine", 0.12],
    [1.38, 1046.5, 0.78, "sine", 0.135]
  ],

  // Alternating warning tones in the most audible mid/high range.
  warningBeep: [
    [0, 1040, 0.12, "square", 0.075],
    [0.17, 1560, 0.12, "square", 0.078],
    [0.34, 1040, 0.12, "square", 0.075],
    [0.68, 1040, 0.12, "square", 0.075],
    [0.85, 1560, 0.12, "square", 0.078],
    [1.02, 1040, 0.12, "square", 0.075],
    [1.36, 1040, 0.12, "square", 0.075],
    [1.53, 1560, 0.12, "square", 0.078],
    [1.7, 1040, 0.3, "square", 0.085]
  ],

  // Low alternating alarm for external speakers and larger rooms.
  lowAlarm: [
    [0, 220, 0.18, "sawtooth", 0.052],
    [0.23, 330, 0.18, "sawtooth", 0.055],
    [0.46, 220, 0.18, "sawtooth", 0.052],
    [0.69, 330, 0.18, "sawtooth", 0.055],
    [0.92, 220, 0.18, "sawtooth", 0.052],
    [1.15, 330, 0.18, "sawtooth", 0.055],
    [1.38, 220, 0.18, "sawtooth", 0.052],
    [1.61, 330, 0.42, "sawtooth", 0.06]
  ],

  // High alternating alarm intended to cut through conversation.
  highAlarm: [
    [0, 1450, 0.12, "square", 0.042],
    [0.17, 2100, 0.12, "square", 0.045],
    [0.34, 1450, 0.12, "square", 0.042],
    [0.51, 2100, 0.12, "square", 0.045],
    [0.68, 1450, 0.12, "square", 0.042],
    [0.85, 2100, 0.12, "square", 0.045],
    [1.02, 1450, 0.12, "square", 0.042],
    [1.19, 2100, 0.36, "square", 0.05]
  ],

  // Three frequency sweeps for a science-fiction alert.
  sciFi: [
    [0, 320, 0.48, "sawtooth", 0.04, 1280],
    [0.52, 1280, 0.44, "triangle", 0.048, 480],
    [1.02, 480, 0.58, "square", 0.032, 1800],
    [1.66, 900, 0.5, "sine", 0.09]
  ],

  // Square-wave game-console arpeggio.
  retroGame: [
    [0, 523.25, 0.1, "square", 0.05],
    [0.13, 659.25, 0.1, "square", 0.05],
    [0.26, 783.99, 0.1, "square", 0.052],
    [0.39, 1046.5, 0.18, "square", 0.058],
    [0.68, 1046.5, 0.1, "square", 0.052],
    [0.81, 783.99, 0.1, "square", 0.05],
    [0.94, 659.25, 0.1, "square", 0.05],
    [1.07, 523.25, 0.3, "square", 0.058]
  ],

  // Short calls followed by a long final confirmation tone.
  finalCall: [
    [0, 880, 0.12, "square", 0.072],
    [0.17, 880, 0.12, "square", 0.072],
    [0.34, 880, 0.12, "square", 0.072],
    [0.56, 1320, 0.5, "sine", 0.12],
    [1.2, 1046.5, 0.12, "square", 0.075],
    [1.37, 1046.5, 0.12, "square", 0.075],
    [1.54, 1046.5, 0.12, "square", 0.075],
    [1.76, 1760, 0.82, "sine", 0.13]
  ]
};

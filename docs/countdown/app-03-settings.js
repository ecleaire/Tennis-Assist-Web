"use strict";

  function sanitizeOffsets(value) {
    const offsets = Array.isArray(value) ? value : DEFAULTS.alarmOffsets;
    const cleaned = offsets
      .map((item) => Math.round(clamp(item, 0, 1440)))
      .filter((item, index, array) => array.indexOf(item) === index);
    if (!cleaned.includes(0)) cleaned.push(0);
    return cleaned.sort((a, b) => b - a);
  }

  function sanitizeSettings(raw) {
    const source = raw && typeof raw === "object" ? raw : {};
    const soundTemplates = ["bell", "chime", "digital", "alarm", "soft", "custom"];
    const noisePatterns = ["random", ...PATTERNS];

    return {
      mode: source.mode === "wro" ? "wro" : "timer",
      targetTime: /^([01]\d|2[0-3]):[0-5]\d$/.test(source.targetTime) ? source.targetTime : DEFAULTS.targetTime,
      showTarget: source.showTarget !== false,
      theme: source.theme === "light" ? "light" : "dark",
      currentTimeSize: Math.round(clamp(source.currentTimeSize ?? DEFAULTS.currentTimeSize, 20, 220)),
      countdownSize: Math.round(clamp(source.countdownSize ?? DEFAULTS.countdownSize, 32, 360)),
      targetSize: Math.round(clamp(source.targetSize ?? DEFAULTS.targetSize, 12, 120)),
      detailSize: Math.round(clamp(source.detailSize ?? DEFAULTS.detailSize, 12, 120)),
      alarmEnabled: source.alarmEnabled !== false,
      alarmOffsets: sanitizeOffsets(source.alarmOffsets),
      soundTemplate: soundTemplates.includes(source.soundTemplate) ? source.soundTemplate : DEFAULTS.soundTemplate,
      volume: Math.round(clamp(source.volume ?? DEFAULTS.volume, 0, 100)),
      customAudioName: typeof source.customAudioName === "string" ? source.customAudioName.slice(0, 200) : "",
      noiseStrength: Math.round(clamp(source.noiseStrength ?? DEFAULTS.noiseStrength, 0, 100)),
      noisePattern: noisePatterns.includes(source.noisePattern) ? source.noisePattern : DEFAULTS.noisePattern,
      noiseGap: Math.round(clamp(source.noiseGap ?? DEFAULTS.noiseGap, 2, 30)),
      noiseDuration: Math.round(clamp(source.noiseDuration ?? DEFAULTS.noiseDuration, 180, 2400)),
      noiseSequenceGap: Math.round(clamp(source.noiseSequenceGap ?? DEFAULTS.noiseSequenceGap, 0, 1200))
    };
  }

  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return sanitizeSettings(raw);
    } catch {
      return sanitizeSettings(DEFAULTS);
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

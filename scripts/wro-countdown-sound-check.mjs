import { readFile } from "node:fs/promises";

async function importSource(path) {
  const source = await readFile(path, "utf8");
  const encoded = Buffer.from(source).toString("base64");
  return import(`data:text/javascript;base64,${encoded}`);
}

const { SOUND_CATALOG, BUILT_IN_SOUND_KEYS } = await importSource(
  "docs/wro-countdown/v2/sound-catalog.js"
);
const { SOUND_PATTERNS } = await importSource(
  "docs/wro-countdown/v2/sound-data.js"
);

const failures = [];
const allowedWaves = new Set(["sine", "square", "sawtooth", "triangle"]);
const catalogKeys = SOUND_CATALOG.map(sound => sound.key);
const patternKeys = Object.keys(SOUND_PATTERNS);

if (SOUND_CATALOG.length !== 20) {
  failures.push(`expected 20 built-in sounds, found ${SOUND_CATALOG.length}`);
}

if (new Set(catalogKeys).size !== catalogKeys.length) {
  failures.push("sound catalog contains duplicate keys");
}

if (new Set(SOUND_CATALOG.map(sound => sound.label)).size !== SOUND_CATALOG.length) {
  failures.push("sound catalog contains duplicate labels");
}

if (JSON.stringify(catalogKeys) !== JSON.stringify(BUILT_IN_SOUND_KEYS)) {
  failures.push("BUILT_IN_SOUND_KEYS does not match catalog order");
}

for (const key of catalogKeys) {
  if (!SOUND_PATTERNS[key]) {
    failures.push(`missing synthesized pattern for ${key}`);
  }
}

for (const key of patternKeys) {
  if (!catalogKeys.includes(key)) {
    failures.push(`sound pattern ${key} is not present in the catalog`);
  }
}

for (const [key, events] of Object.entries(SOUND_PATTERNS)) {
  if (!Array.isArray(events) || events.length === 0) {
    failures.push(`${key} has no sound events`);
    continue;
  }

  events.forEach((event, index) => {
    if (!Array.isArray(event) || (event.length !== 5 && event.length !== 6)) {
      failures.push(`${key}[${index}] must contain 5 or 6 values`);
      return;
    }

    const [delay, frequency, duration, wave, gain, endFrequency] = event;
    if (!Number.isFinite(delay) || delay < 0) {
      failures.push(`${key}[${index}] has an invalid delay`);
    }
    if (!Number.isFinite(frequency) || frequency <= 0) {
      failures.push(`${key}[${index}] has an invalid frequency`);
    }
    if (!Number.isFinite(duration) || duration <= 0) {
      failures.push(`${key}[${index}] has an invalid duration`);
    }
    if (!allowedWaves.has(wave)) {
      failures.push(`${key}[${index}] uses unsupported wave ${wave}`);
    }
    if (!Number.isFinite(gain) || gain <= 0) {
      failures.push(`${key}[${index}] has an invalid gain`);
    }
    if (endFrequency !== undefined &&
        (!Number.isFinite(endFrequency) || endFrequency <= 0)) {
      failures.push(`${key}[${index}] has an invalid end frequency`);
    }
  });
}

if (failures.length) {
  console.error("WRO timer sound check failed:");
  failures.forEach(failure => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `WRO timer sound check passed ${SOUND_CATALOG.length} built-in sounds ` +
  `and ${patternKeys.length} synthesized patterns.`
);

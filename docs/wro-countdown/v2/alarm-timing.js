import { jstParts, jstStamp } from "./config-time.js?v=20260815d";

export const MAX_ALARM_OFFSET_SEC = 86400;
const DAY_MS = 86400000;
const alarmTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo", month: "numeric", day: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
});

export function normalizeAlarmOffsets(values) {
  return [...new Set(values.filter(value =>
    typeof value === "number" && Number.isFinite(value) &&
    Number.isInteger(value) && Math.abs(value) <= MAX_ALARM_OFFSET_SEC
  ))].sort((a, b) => a - b);
}

export function alarmOffsets(settings) {
  if (Array.isArray(settings.alarmOffsetsSec)) return normalizeAlarmOffsets(settings.alarmOffsetsSec);
  return normalizeAlarmOffsets([
    ...(settings.leadTimes || []).map(minutes => -minutes * 60),
    ...(settings.atTarget ? [0] : [])
  ]);
}

export function legacyAlarmFields(offsets) {
  return {
    atTarget: offsets.includes(0),
    leadTimes: offsets.filter(value => value < 0 && value % 60 === 0)
      .map(value => -value / 60).sort((a, b) => a - b)
  };
}

export function mergeAlarmTimingPatch(settings, patch) {
  if (Object.hasOwn(patch, "alarmOffsetsSec")) return patch;
  let offsets = alarmOffsets(settings);
  if (Object.hasOwn(patch, "leadTimes")) {
    offsets = offsets.filter(value => value >= 0 || value % 60 !== 0);
    offsets.push(...patch.leadTimes.map(minutes => -Number(minutes) * 60));
  }
  if (Object.hasOwn(patch, "atTarget")) {
    offsets = offsets.filter(value => value !== 0);
    if (patch.atTarget) offsets.push(0);
  }
  return { ...patch, alarmOffsetsSec: normalizeAlarmOffsets(offsets) };
}

export function describeAlarmOffset(offset) {
  if (offset === 0) return "指定時刻ちょうど";
  const total = Math.abs(offset);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor(total % 3600 / 60);
  const seconds = total % 60;
  return `${hours ? `${hours}時間` : ""}${minutes ? `${minutes}分` : ""}` +
    `${seconds ? `${seconds}秒` : ""}${offset < 0 ? "前" : "後"}`;
}

export function dailyTargetStamp(targetTime, now) {
  const parts = jstParts(new Date(now));
  const [hour, minute] = targetTime.split(":").map(Number);
  return jstStamp(Number(parts.year), Number(parts.month), Number(parts.day), hour, minute);
}

export function nextAlarmStamp(targetTime, offset, now = Date.now()) {
  let at = dailyTargetStamp(targetTime, now) + offset * 1000;
  while (at < now) at += DAY_MS;
  while (at - DAY_MS >= now) at -= DAY_MS;
  return at;
}

export function formatAlarmStamp(at) {
  return alarmTimeFormatter.format(new Date(at));
}

// Every point belongs to a daily target, independent of completion-message length.
export function createAlarmSchedule(getSettings, onAlarm) {
  let previous = null;
  let signature = "";
  let previousOffsets = null;
  const fired = new Map();
  function reset(now = Date.now()) {
    previous = now;
    signature = "";
    previousOffsets = null;
    fired.clear();
  }
  function check(now) {
    const settings = getSettings();
    const offsets = alarmOffsets(settings);
    const nextSignature = JSON.stringify([settings.targetTime, settings.alarmEnabled, settings.mode]);
    if (previous === null || (signature && signature !== nextSignature) || now < previous) {
      previous = now;
      signature = nextSignature;
      previousOffsets = new Set(offsets);
      return;
    }
    signature = nextSignature;
    // New points begin at this observation. Unchanged points keep their prior
    // baseline so editing another point cannot suppress an imminent alert.
    const eligibleOffsets = previousOffsets ? offsets.filter(value => previousOffsets.has(value)) : offsets;
    previousOffsets = new Set(offsets);
    const due = [];
    if (settings.alarmEnabled && settings.mode === "timer") {
      const today = dailyTargetStamp(settings.targetTime, now);
      const grace = Math.max(1, Math.min(300, settings.alarmCatchUpSec ?? 20)) * 1000;
      for (const day of [-1, 0, 1]) {
        const target = today + day * DAY_MS;
        for (const offset of eligibleOffsets) {
          const at = target + offset * 1000;
          const key = `${target}:${offset}`;
          if (previous < at && at <= now && now - at <= grace && !fired.has(key)) {
            fired.set(key, at);
            due.push({ at, offset });
          }
        }
      }
    }
    previous = now;
    for (const [key, at] of fired) if (at < now - 2 * DAY_MS) fired.delete(key);
    if (due.length) {
      // A short resume can cross several points: play once rather than overlap sounds.
      const labels = [...new Set(due.sort((a, b) => a.at - b.at).map(event => describeAlarmOffset(event.offset)))];
      onAlarm(`通知：${labels.join("・")}`);
    }
  }
  return { reset, check };
}

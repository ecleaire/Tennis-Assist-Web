import { duration, pad, WRO_DATE } from "./config.js";

let currentSettings = null;

export function renderCurrentTime(refs, date) {
  refs.clock.textContent = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).format(date);

  refs.date.textContent = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

function timerValues(remaining) {
  const value = duration(Math.max(0, remaining));
  const totalHours = value.days * 24 + value.hours;
  return {
    value,
    full: `${pad(totalHours)}:${pad(value.minutes)}:${pad(value.seconds)}`,
    hourMinute: `${pad(totalHours)}時間${pad(value.minutes)}分`
  };
}

function renderTimerText(refs, settings, values) {
  const template = String(settings.timerText || "").trim();
  if (!template) {
    refs.timerText.hidden = true;
    refs.timerText.textContent = "";
    return;
  }

  refs.timerText.textContent = template
    .replaceAll("{残り時間}", values.full)
    .replaceAll("{時分}", values.hourMinute)
    .replaceAll("{目標時刻}", settings.targetTime);
  refs.timerText.hidden = false;
}

export function renderTimer(refs, remaining, suppliedSettings) {
  const settings = suppliedSettings || currentSettings || {
    showHourMinute: true,
    timerText: "",
    targetTime: ""
  };
  const values = timerValues(remaining);
  renderTimerText(refs, settings, values);
  refs.subValue.hidden = !settings.showHourMinute;

  if (remaining <= 0) {
    refs.mainValue.textContent = "00:00:00";
    refs.subValue.textContent = "指定時刻です";
    return;
  }

  refs.mainValue.textContent = values.full;
  refs.subValue.textContent = values.value.days
    ? `あと ${values.value.days}日 ${pad(values.value.hours)}時間 ${pad(values.value.minutes)}分`
    : `あと ${values.value.hours}時間 ${pad(values.value.minutes)}分`;
}

export function renderWro(refs, remaining) {
  refs.timerText.hidden = true;
  refs.timerText.textContent = "";
  refs.subValue.hidden = false;

  if (remaining <= 0) {
    refs.mainValue.textContent = "START";
    refs.subValue.textContent = "WRO 2026 Japan 決勝大会";
    return;
  }

  const value = duration(remaining);
  refs.mainValue.textContent = `${value.days} DAYS`;
  refs.subValue.textContent =
    `${pad(value.hours)}:${pad(value.minutes)}:${pad(value.seconds)}`;
}

export function renderLabels(refs, settings, temporaryWro) {
  currentSettings = settings;

  if (settings.mode === "timer" && !temporaryWro) {
    refs.modeLabel.textContent = "COUNTDOWN TIMER";
    refs.targetLabel.textContent = `${settings.targetTime} まで`;
    refs.targetLabel.hidden = !settings.showTarget;
    return;
  }

  refs.modeLabel.textContent = temporaryWro
    ? "WRO JAPAN FINAL / AUTO DISPLAY"
    : "WRO JAPAN FINAL 2026";
  refs.targetLabel.textContent = WRO_DATE;
  refs.targetLabel.hidden = false;
}

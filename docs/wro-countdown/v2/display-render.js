import { duration, pad, WRO_DATE } from "./config.js";

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

export function renderTimer(refs, remaining) {
  if (remaining <= 0) {
    refs.mainValue.textContent = "00:00:00";
    refs.subValue.textContent = "指定時刻です";
    return;
  }

  const value = duration(remaining);
  const totalHours = value.days * 24 + value.hours;
  refs.mainValue.textContent =
    `${pad(totalHours)}:${pad(value.minutes)}:${pad(value.seconds)}`;
  refs.subValue.textContent = value.days
    ? `あと ${value.days}日 ${pad(value.hours)}時間 ${pad(value.minutes)}分`
    : `あと ${value.hours}時間 ${pad(value.minutes)}分`;
}

export function renderWro(refs, remaining) {
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

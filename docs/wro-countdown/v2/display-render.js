import { duration, pad, WRO_DATE } from "./config.js?v=20260814f";

function timerValues(remaining) {
  const value = duration(Math.max(0, remaining));
  const totalHours = value.days * 24 + value.hours;
  const full = `${pad(totalHours)}:${pad(value.minutes)}:${pad(value.seconds)}`;
  const minuteOnly = `${pad(totalHours)}:${pad(value.minutes)}`;

  return {
    value,
    totalHours,
    full,
    minuteOnly
  };
}

function formatCustomText(source, settings, values) {
  const replacements = {
    "残り時間:分": values.minuteOnly,
    "残り時間": values.full,
    "時刻": settings.targetTime,
    "日": String(values.value.days),
    "時間": pad(values.totalHours),
    "分": pad(values.value.minutes),
    "秒": pad(values.value.seconds),
    "time": values.full,
    "time-short": values.minuteOnly,
    "target": settings.targetTime,
    "days": String(values.value.days),
    "hours": pad(values.totalHours),
    "minutes": pad(values.value.minutes),
    "seconds": pad(values.value.seconds)
  };

  return source.replace(
    /\{(残り時間:分|残り時間|時刻|日|時間|分|秒|time-short|time|target|days|hours|minutes|seconds)\}/g,
    (_, key) => replacements[key] ?? ""
  );
}

function renderCustomMessage(refs, settings, values) {
  const source = settings.customText.trim();
  refs.customMessage.hidden = !source;

  if (!source) {
    refs.customMessage.textContent = "";
    return;
  }

  refs.customMessage.textContent = formatCustomText(
    source,
    settings,
    values
  );
}

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

export function renderTimer(refs, remaining, settings) {
  const values = timerValues(remaining);

  refs.mainValue.textContent = values.full;
  refs.subValue.hidden = !settings.showTimerDetails;

  if (settings.showTimerDetails) {
    refs.subValue.textContent = remaining <= 0
      ? "指定時刻です"
      : values.value.days
        ? `あと ${values.value.days}日 ${pad(values.value.hours)}時間 ${pad(values.value.minutes)}分`
        : `あと ${values.value.hours}時間 ${pad(values.value.minutes)}分`;
  }

  renderCustomMessage(refs, settings, values);
}

export function renderWro(refs, remaining) {
  refs.customMessage.hidden = true;
  refs.customMessage.textContent = "";
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

import {
  calendarDaysUntilJst,
  completionMessageAt,
  duration,
  pad,
  WRO_DATE,
  WRO_TARGET
} from "./config.js?v=20260821b";

let currentSettings = null;

export function renderCurrentTime(refs, date, settings) {
  refs.currentBlock.hidden = !settings.showCurrentTime;
  if (!settings.showCurrentTime) return;

  const label = String(settings.currentTimeLabel || "").trim();
  refs.currentTimeLabel.hidden = !label;
  refs.currentTimeLabel.textContent = label;

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
    totalHours,
    full: `${pad(totalHours)}:${pad(value.minutes)}:${pad(value.seconds)}`,
    hourMinuteClock: `${pad(totalHours)}:${pad(value.minutes)}`,
    hourMinuteText: `${pad(totalHours)}時間${pad(value.minutes)}分`
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
    .replaceAll("{time}", values.full)
    .replaceAll("{残り時分}", values.hourMinuteClock)
    .replaceAll("{hhmm}", values.hourMinuteClock)
    .replaceAll("{時分}", values.hourMinuteText)
    .replaceAll("{hm}", values.hourMinuteText)
    .replaceAll("{目標時刻}", settings.targetTime)
    .replaceAll("{target}", settings.targetTime);
  refs.timerText.hidden = false;
}

function normalizeTimerState(value) {
  if (typeof value === "number") {
    return {
      phase: "countdown",
      remaining: value,
      completionElapsed: 0,
      completionRemaining: 0
    };
  }

  return value || {
    phase: "countdown",
    remaining: 0,
    completionElapsed: 0,
    completionRemaining: 0
  };
}

function animateCompletionMessage(refs, index, count) {
  const nextIndex = String(index);
  const changed = refs.app.dataset.completionMessageIndex !== nextIndex;

  refs.app.dataset.completionMessageIndex = nextIndex;
  refs.app.dataset.completionMessageCount = String(count);
  if (!changed) return;

  refs.mainValue.classList.remove("completionMessageSwitch");
  void refs.mainValue.offsetWidth;
  refs.mainValue.classList.add("completionMessageSwitch");
}

function clearCompletionMessageState(refs) {
  delete refs.app.dataset.completionMessageIndex;
  delete refs.app.dataset.completionMessageCount;
  refs.mainValue.classList.remove("completionMessageSwitch");
}

function renderCompletion(refs, state, settings) {
  const selected = completionMessageAt(
    settings.completionMessages || [settings.completionText],
    state.completionElapsed,
    settings.completionMessageIntervalSec
  );
  const switchValues = timerValues(state.completionRemaining);

  refs.timerText.hidden = true;
  refs.timerText.textContent = "";
  refs.mainValue.textContent = selected.text;
  animateCompletionMessage(refs, selected.index, selected.count);
  refs.subValue.hidden = !settings.showHourMinute;
  refs.subValue.textContent =
    `次の${settings.targetTime}までのタイマーを ` +
    `${switchValues.full} 後に開始します`;
}

export function renderTimer(refs, suppliedState, suppliedSettings) {
  const settings = suppliedSettings || currentSettings || {
    showHourMinute: true,
    timerText: "",
    targetTime: "",
    completionText: "お疲れ様でした",
    completionMessages: ["お疲れ様でした"],
    completionMessageIntervalSec: 10
  };
  const state = normalizeTimerState(suppliedState);

  refs.app.dataset.timerPhase = state.phase;

  if (state.phase === "completion") {
    renderCompletion(refs, state, settings);
    return;
  }

  clearCompletionMessageState(refs);
  const values = timerValues(state.remaining);
  renderTimerText(refs, settings, values);

  refs.mainValue.textContent = values.full;
  refs.subValue.hidden = !settings.showHourMinute;
  refs.subValue.textContent = values.value.days
    ? `あと ${values.value.days}日 ${pad(values.value.hours)}時間 ${pad(values.value.minutes)}分`
    : `あと ${values.value.hours}時間 ${pad(values.value.minutes)}分`;
}

export function renderWro(refs, remaining, nowDate = new Date()) {
  refs.app.dataset.timerPhase = "wro";
  clearCompletionMessageState(refs);
  refs.timerText.hidden = true;
  refs.timerText.textContent = "";
  refs.subValue.hidden = false;

  if (remaining <= 0) {
    refs.mainValue.textContent = "START";
    refs.subValue.textContent = "WRO 2026 Japan 決勝大会";
    return;
  }

  const value = duration(remaining);
  const calendarDays = calendarDaysUntilJst(WRO_TARGET, nowDate);
  const dayLabel = calendarDays === 1 ? "DAY" : "DAYS";
  const totalHours = value.days * 24 + value.hours;

  refs.mainValue.textContent = `${calendarDays} ${dayLabel}`;
  refs.subValue.textContent =
    `開始まで ${pad(totalHours)}:${pad(value.minutes)}:${pad(value.seconds)}`;
}

export function renderLabels(refs, settings, temporaryWro, timerState = null) {
  currentSettings = settings;
  const wroMode = settings.mode === "wro" || temporaryWro;
  const completionMode =
    !wroMode && timerState?.phase === "completion";

  refs.modeLabel.classList.toggle("wroTitle", wroMode);

  if (!wroMode) {
    refs.modeLabel.textContent = completionMode
      ? "TIMER COMPLETE"
      : "COUNTDOWN TIMER";
    refs.targetLabel.textContent = completionMode
      ? `${settings.targetTime} 終了`
      : `${settings.targetTime} まで`;
    refs.targetLabel.hidden = !settings.showTarget;
    refs.wroSuffix.hidden = true;
    refs.wroSuffix.textContent = "";
    return;
  }

  refs.modeLabel.textContent = temporaryWro
    ? "WRO JAPAN FINAL / AUTO DISPLAY"
    : "WRO JAPAN FINAL 2026";
  refs.targetLabel.textContent = WRO_DATE;
  refs.targetLabel.hidden = false;

  const suffix = String(settings.wroDateSuffix || "").trim();
  refs.wroSuffix.textContent = suffix;
  refs.wroSuffix.hidden = !suffix;
}

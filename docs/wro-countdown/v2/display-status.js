import { pad } from "./config.js?v=20260820b";

function timerStatus(settings) {
  if (!settings.alarmEnabled) return "アラームはオフです";

  const labels = [
    settings.atTarget ? "指定時刻" : null,
    ...settings.leadTimes.map(minutes => `${minutes}分前`)
  ].filter(Boolean);

  return `アラーム: ${labels.length ? labels.join("・") : "通知時刻なし"}`;
}

function completionStatus(settings, timerState) {
  const seconds = Math.max(
    0,
    Math.ceil(timerState.completionRemaining / 1000)
  );
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const secondsPart = seconds % 60;
  const remaining = hours
    ? `${hours}:${pad(minutes)}:${pad(secondsPart)}`
    : `${minutes}:${pad(secondsPart)}`;

  return `終了メッセージ表示中・${remaining}後に` +
    `次の${settings.targetTime}までのタイマーを開始します`;
}

export function renderStatus(
  refs,
  settings,
  autoWro,
  now,
  timerState = null
) {
  if (autoWro.active()) {
    const seconds = Math.max(
      0,
      Math.ceil((autoWro.endAt() - now) / 1000)
    );
    const elapsedLabel =
      `全国大会表示中・${Math.floor(seconds / 60)}:${pad(seconds % 60)}`;

    refs.status.textContent =
      settings.mode === "timer" && timerState?.phase === "completion"
        ? elapsedLabel
        : `${elapsedLabel}後にタイマーへ戻ります`;
    return;
  }

  if (
    settings.mode === "timer" &&
    timerState?.phase === "completion"
  ) {
    refs.status.textContent = completionStatus(settings, timerState);
    return;
  }

  if (settings.mode === "wro") {
    refs.status.textContent = "WRO Japan決勝大会まで";
    return;
  }

  refs.status.textContent = timerStatus(settings) + (
    settings.autoWroEnabled
      ? ` / 大会表示: ${settings.autoWroIntervalMin}分ごと・` +
        `${settings.autoWroDurationMin}分間`
      : ""
  );
}

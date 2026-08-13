import { pad } from "./config.js";

function timerStatus(settings) {
  if (!settings.alarmEnabled) return "アラームはオフです";

  const labels = [
    settings.atTarget ? "指定時刻" : null,
    ...settings.leadTimes.map(minutes => `${minutes}分前`)
  ].filter(Boolean);

  return `アラーム: ${labels.length ? labels.join("・") : "通知時刻なし"}`;
}

export function renderStatus(refs, settings, autoWro, now) {
  if (autoWro.active()) {
    const seconds = Math.max(
      0,
      Math.ceil((autoWro.endAt() - now) / 1000)
    );
    refs.status.textContent =
      `全国大会表示中・${Math.floor(seconds / 60)}:${pad(seconds % 60)}` +
      "後にタイマーへ戻ります";
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

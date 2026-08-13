import { jstParts, jstStamp } from "./config.js";

export function createTimerTarget(getSettings, onAlarm) {
  let target = 0;
  let previous = null;
  let fired = new Set();

  function reset(now = Date.now()) {
    const settings = getSettings();
    const [hour, minute] = settings.targetTime.split(":").map(Number);
    const parts = jstParts(new Date(now));

    let next = jstStamp(
      Number(parts.year),
      Number(parts.month),
      Number(parts.day),
      hour,
      minute
    );
    if (next <= now) next += 86400000;

    target = next;
    previous = next - now;
    fired = new Set();
  }

  function checkAlerts(remaining) {
    const settings = getSettings();
    if (!settings.alarmEnabled || previous === null) return;

    const alertMinutes = [...settings.leadTimes];
    if (settings.atTarget) alertMinutes.push(0);

    for (const minutes of alertMinutes) {
      const threshold = minutes * 60000;
      const key = `${target}:${minutes}`;
      const crossed =
        previous > threshold &&
        remaining <= threshold &&
        remaining > threshold - 20000;

      if (crossed && !fired.has(key)) {
        fired.add(key);
        onAlarm(
          minutes
            ? `指定時刻の${minutes}分前です`
            : "指定時刻です"
        );
      }
    }
  }

  function remaining(now = Date.now()) {
    if (!target) reset(now);
    let value = target - now;
    checkAlerts(value);

    if (value < -8000) {
      reset(now);
      value = target - now;
    }

    previous = value;
    return value;
  }

  return {
    reset,
    remaining
  };
}

import { jstParts, jstStamp } from "./config.js?v=20260820a";

const DAY_MS = 86400000;

export function createTimerTarget(getSettings, onAlarm) {
  let alertTarget = 0;
  let previous = null;
  let fired = new Set();

  function targetForToday(now) {
    const settings = getSettings();
    const [hour, minute] = settings.targetTime.split(":").map(Number);
    const parts = jstParts(new Date(now));

    return jstStamp(
      Number(parts.year),
      Number(parts.month),
      Number(parts.day),
      hour,
      minute
    );
  }

  function resolveCycle(now) {
    const settings = getSettings();
    const completedTarget = targetForToday(now);
    const completionEnd =
      completedTarget + settings.completionDurationMin * 60000;

    if (now < completedTarget) {
      return {
        phase: "countdown",
        target: completedTarget,
        completedTarget: 0,
        nextTarget: completedTarget,
        completionEnd: 0
      };
    }

    if (now < completionEnd) {
      return {
        phase: "completion",
        target: completedTarget + DAY_MS,
        completedTarget,
        nextTarget: completedTarget + DAY_MS,
        completionEnd
      };
    }

    return {
      phase: "countdown",
      target: completedTarget + DAY_MS,
      completedTarget: 0,
      nextTarget: completedTarget + DAY_MS,
      completionEnd: 0
    };
  }

  function reset(now = Date.now()) {
    const cycle = resolveCycle(now);
    const target = cycle.phase === "completion"
      ? cycle.completedTarget
      : cycle.target;

    alertTarget = target;
    previous = target - now;
    fired = new Set();
  }

  function checkAlerts(remaining, target) {
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

  function state(now = Date.now()) {
    const cycle = resolveCycle(now);
    const targetForAlerts = cycle.phase === "completion"
      ? cycle.completedTarget
      : cycle.target;
    const alertRemaining = targetForAlerts - now;

    if (!alertTarget) {
      alertTarget = targetForAlerts;
      previous = alertRemaining;
    } else if (targetForAlerts !== alertTarget) {
      alertTarget = targetForAlerts;
      previous = alertRemaining;
      fired = new Set();
    } else {
      checkAlerts(alertRemaining, targetForAlerts);
    }

    previous = alertRemaining;

    if (cycle.phase === "completion") {
      return {
        phase: "completion",
        remaining: 0,
        target: cycle.nextTarget,
        completedTarget: cycle.completedTarget,
        nextTarget: cycle.nextTarget,
        completionEnd: cycle.completionEnd,
        completionRemaining: Math.max(0, cycle.completionEnd - now)
      };
    }

    return {
      phase: "countdown",
      remaining: Math.max(0, cycle.target - now),
      target: cycle.target,
      completedTarget: 0,
      nextTarget: cycle.target,
      completionEnd: 0,
      completionRemaining: 0
    };
  }

  return {
    reset,
    state,
    remaining: now => state(now).remaining
  };
}

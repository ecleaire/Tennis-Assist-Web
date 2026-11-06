import { createAlarmSchedule } from "./alarm-timing.js?v=20261106a";
import { jstParts, jstStamp } from "./config.js?v=20260821b";

const DAY_MS = 86400000;

export function createTimerTarget(getSettings, onAlarm) {
  const alarms = createAlarmSchedule(getSettings, onAlarm);

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

  function completionCycle(completedTarget, nextTarget, completionEnd) {
    return {
      phase: "completion",
      target: nextTarget,
      completedTarget,
      nextTarget,
      completionEnd
    };
  }

  function countdownCycle(target) {
    return {
      phase: "countdown",
      target,
      completedTarget: 0,
      nextTarget: target,
      completionEnd: 0
    };
  }

  function resolveCycle(now) {
    const settings = getSettings();
    const todayTarget = targetForToday(now);
    const completionDuration = settings.completionDurationMin * 60000;

    if (now < todayTarget) {
      const previousTarget = todayTarget - DAY_MS;
      const previousCompletionEnd = previousTarget + completionDuration;

      // A late target time or a long completion duration may carry the
      // previous day's message past midnight. Preserve that message until its
      // configured end instead of starting today's countdown too early.
      if (now < previousCompletionEnd) {
        return completionCycle(
          previousTarget,
          todayTarget,
          previousCompletionEnd
        );
      }

      return countdownCycle(todayTarget);
    }

    const completionEnd = todayTarget + completionDuration;
    if (now < completionEnd) {
      return completionCycle(
        todayTarget,
        todayTarget + DAY_MS,
        completionEnd
      );
    }

    return countdownCycle(todayTarget + DAY_MS);
  }

  function reset(now = Date.now()) {
    alarms.reset(now);
  }

  function state(now = Date.now()) {
    const cycle = resolveCycle(now);
    alarms.check(now);

    if (cycle.phase === "completion") {
      return {
        phase: "completion",
        remaining: 0,
        target: cycle.nextTarget,
        completedTarget: cycle.completedTarget,
        nextTarget: cycle.nextTarget,
        completionEnd: cycle.completionEnd,
        completionElapsed: Math.max(0, now - cycle.completedTarget),
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
      completionElapsed: 0,
      completionRemaining: 0
    };
  }

  return {
    reset,
    state,
    remaining: now => state(now).remaining
  };
}

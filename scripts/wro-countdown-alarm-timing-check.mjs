import assert from "node:assert/strict";
import { chromium } from "playwright";
import { normalize } from "../docs/wro-countdown/v2/config-normalize-timer.js";
import { createTimerTarget } from "../docs/wro-countdown/v2/display-target.js";
import {
  alarmOffsets, mergeAlarmTimingPatch, createAlarmSchedule, nextAlarmStamp,
  describeAlarmOffset, normalizeAlarmOffsets
} from "../docs/wro-countdown/v2/alarm-timing.js";

const KEY = "wro-countdown-settings-v4";
const BASE_URL = process.env.WRO_BASE_URL || "http://127.0.0.1:4173/docs/wro-countdown/";
const stamp = text => Date.parse(text);
const target = stamp("2026-11-06T11:30:00Z"); // 20:30 JST
assert.deepEqual(normalize().alarmOffsetsSec, [-3600, -1800, -600, -300, 0]);
const legacy = normalize({ leadTimes: [15, 60], atTarget: false, timerSize: 99999 });
assert.deepEqual(legacy.alarmOffsetsSec, [-3600, -900]);
assert.equal(legacy.timerSize, 99999);
assert.deepEqual(normalize({ alarmOffsetsSec: [] }).leadTimes, []);
assert.equal(normalize({ alarmOffsetsSec: [] }).atTarget, false);
assert.deepEqual(normalizeAlarmOffsets([-30, -30, 0, 90, 86401, NaN, "30", 1.5]), [-30, 0, 90]);
let mixed = normalize({ alarmOffsetsSec: [-300, -30, 0, 90] });
mixed = normalize({ ...mixed, ...mergeAlarmTimingPatch(mixed, { leadTimes: [10] }) });
assert.deepEqual(mixed.alarmOffsetsSec, [-600, -30, 0, 90]);
mixed = normalize({ ...mixed, ...mergeAlarmTimingPatch(mixed, { atTarget: false }) });
assert.deepEqual(mixed.alarmOffsetsSec, [-600, -30, 90]);
assert.equal(describeAlarmOffset(-3630), "1時間30秒前");
assert.equal(describeAlarmOffset(90), "1分30秒後");
assert.equal(nextAlarmStamp("00:01", -120, stamp("2026-11-06T14:58:00Z")), stamp("2026-11-06T14:59:00Z"));
assert.equal(nextAlarmStamp("23:59", 120, stamp("2026-11-06T14:58:00Z")), stamp("2026-11-06T15:01:00Z"));

function scheduleFixture(extra = {}) {
  let settings = normalize({ targetTime: "20:30", alarmEnabled: true,
    alarmOffsetsSec: [-30, 0, 90, 600], completionDurationMin: 1, ...extra });
  const calls = [];
  const timer = createTimerTarget(() => settings, message => calls.push(message));
  return { timer, calls, settings: () => settings, update: patch => {
    settings = normalize({ ...settings, ...patch });
  } };
}
{
  const { timer, calls } = scheduleFixture();
  timer.reset(target - 31000);
  timer.state(target - 30000); assert.equal(calls.length, 1);
  timer.state(target - 29900); assert.equal(calls.length, 1);
  timer.state(target - 1);
  assert.equal(timer.state(target).phase, "completion"); assert.equal(calls.length, 2);
  timer.state(target + 89000);
  assert.equal(timer.state(target + 90000).phase, "countdown"); assert.equal(calls.length, 3);
  timer.state(target + 599000); timer.state(target + 600000); assert.equal(calls.length, 4);
  timer.state(target + 600001); assert.equal(calls.length, 4);
}
for (const [time, offset, before, at] of [
  ["00:01", -120, "2026-11-06T14:58:59Z", "2026-11-06T14:59:00Z"],
  ["23:59", 120, "2026-11-06T15:00:59Z", "2026-11-06T15:01:00Z"]
]) {
  const { timer, calls } = scheduleFixture({ targetTime: time, alarmOffsetsSec: [offset] });
  timer.reset(stamp(before)); timer.state(stamp(at)); assert.equal(calls.length, 1);
  timer.state(stamp(at) + 1); assert.equal(calls.length, 1);
}
{
  const { timer, calls, update } = scheduleFixture({ alarmOffsetsSec: [0], alarmCatchUpSec: 5 });
  timer.reset(target - 1000); timer.state(target + 6000); assert.equal(calls.length, 0);
  timer.reset(target - 1000); timer.state(target + 4000); assert.equal(calls.length, 1);
  timer.state(target - 1000); timer.state(target); assert.equal(calls.length, 1, "clock rollback repeated an alarm");
  update({ alarmEnabled: false }); timer.state(target + 1000);
  update({ alarmEnabled: true }); timer.state(target + 1100); assert.equal(calls.length, 1);
  update({ alarmOffsetsSec: [1, 2] }); timer.state(target + 2100); assert.equal(calls.length, 1, "edit replayed a past alarm");
}
{
  const { timer, calls } = scheduleFixture({ alarmOffsetsSec: [-1, 0, 1] });
  timer.reset(target - 2000); timer.state(target + 2000); assert.equal(calls.length, 1, "resume overlapped several sounds");
  assert.match(calls[0], /1秒前/); assert.match(calls[0], /1秒後/);
}
{
  const { timer, calls } = scheduleFixture({ alarmOffsetsSec: [-86400, 0, 86400] });
  timer.reset(target - 1000); timer.state(target); assert.equal(calls.length, 1);
  const next = target + 86400000; timer.state(next - 1000); timer.state(next); assert.equal(calls.length, 2);
}
console.log("WRO alarm schedule passed legacy migration, second precision, before/at/after, midnight, next-day countdown, duplicate suppression, clock rollback and configurable catch-up.");

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1366, height: 768 }]) {
    const context = await browser.newContext({ viewport, serviceWorkers: "block", reducedMotion: "reduce" });
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-11-06T10:00:00Z") });
    await page.addInitScript(key => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
        mode: "timer", targetTime: "20:30", leadTimes: [5, 10, 30, 60], atTarget: true,
        noiseStrength: 0, autoWroEnabled: false, timerSize: 116, currentTimeLabel: "通知設定保持"
      }));
    }, KEY);
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.getElementById("app")?.dataset.timerPhase === "countdown");
    await page.click("#gear");
    await page.getByRole("button", { name: "通知タイミングを編集", exact: true }).click();
    assert.equal(await page.locator(".alarmTimingRow").count(), 5);
    await page.fill("#alarmTimingMinutes", "0"); await page.fill("#alarmTimingSeconds", "30");
    await page.click("#addAlarmTiming");
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).alarmOffsetsSec.includes(-30), KEY);
    const added = page.locator('[data-offset-sec="-30"]');
    assert.match(await added.locator("output").textContent(), /20:29:30/);
    await page.selectOption("#alarmTimingDirection", "after");
    await page.fill("#alarmTimingMinutes", "1"); await page.fill("#alarmTimingSeconds", "30"); await page.click("#addAlarmTiming");
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).alarmOffsetsSec.includes(90), KEY);
    assert.match(await page.locator('[data-offset-sec="90"] output').textContent(), /20:31:30/);
    // Defaults are editable too, and changes remain reflected in the quick controls.
    await page.locator('[data-offset-sec="-300"] [data-field="minutes"]').fill("6");
    await page.locator('[data-offset-sec="-300"] [data-field="minutes"]').press("Tab");
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).alarmOffsetsSec.includes(-360), KEY);
    assert(!await page.locator('.leadPreset[value="5"]').isChecked());
    await page.locator('[data-offset-sec="0"] .alarmTimingRemove').click();
    assert(!await page.locator("#atTarget").isChecked());
    await page.click("#addAlarmTiming"); assert.match(await page.locator("#alarmTimingError").textContent(), /同じ/);
    await page.fill("#alarmCatchUpSec", "8"); await page.locator("#alarmCatchUpSec").press("Tab");
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).alarmCatchUpSec === 8, KEY);
    const bounds = await page.locator("#alarmTimingEditor").boundingBox();
    assert(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForFunction(() => document.getElementById("app")?.dataset.timerPhase === "countdown");
    const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    assert(stored.alarmOffsetsSec.includes(-30) && stored.alarmOffsetsSec.includes(90) && stored.alarmOffsetsSec.includes(-360));
    assert(!stored.alarmOffsetsSec.includes(0)); assert.equal(stored.alarmCatchUpSec, 8);
    assert.equal(stored.currentTimeLabel, "通知設定保持"); assert.equal(stored.timerSize, 116);
    await page.click("#gear");
    await page.getByRole("button", { name: "通知タイミングを編集", exact: true }).click();
    // A legacy shortcut updates whole-minute points without deleting second/after rules.
    await page.locator('.leadPreset[value="5"]').check({ force: true });
    const compatible = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).alarmOffsetsSec, KEY);
    assert(compatible.includes(-300) && compatible.includes(-30) && compatible.includes(90));
    await page.locator("#alarmEnabled").uncheck({ force: true });
    assert.match(await page.locator("#alarmTimingSummary").textContent(), /オフ/);
    assert.deepEqual(errors, []);
    await context.close();
  }
  // Verify actual application alarm calls through Web Audio, including auto-WRO.
  {
    const context = await browser.newContext({ serviceWorkers: "block", reducedMotion: "reduce" });
    const page = await context.newPage(); const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.clock.install({ time: new Date("2026-11-06T11:28:58Z") });
    await page.addInitScript(key => {
      localStorage.setItem(key, JSON.stringify({ mode: "timer", targetTime: "20:30",
        alarmEnabled: true, alarmOffsetsSec: [-30, 0, 90], completionDurationMin: 1,
        autoWroEnabled: true, autoWroDuringCompletion: true, autoWroIntervalMin: 1,
        autoWroDurationMin: 1, noiseStrength: 0, soundType: "bell", volume: 5 }));
      window.toneStarts = 0;
      const start = OscillatorNode.prototype.start;
      OscillatorNode.prototype.start = function(...args) { window.toneStarts++; return start.apply(this, args); };
    }, KEY);
    await page.goto(BASE_URL, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.getElementById("app")?.dataset.timerPhase === "countdown");
    await page.click("#gear");
    await page.waitForFunction(() => document.getElementById("soundBadge").textContent === "SOUND READY");
    await page.click("#done");
    await page.clock.runFor(33000);
    await page.waitForFunction(() => window.toneStarts > 0);
    assert.match(await page.locator("#audioStatus").textContent(), /30秒前/);
    const beforeTarget = await page.evaluate(() => window.toneStarts);
    await page.clock.runFor(28000);
    assert.equal(await page.locator("#app").getAttribute("data-timer-phase"), "wro");
    await page.clock.runFor(2000);
    await page.waitForFunction(before => window.toneStarts > before, beforeTarget);
    assert.match(await page.locator("#audioStatus").textContent(), /指定時刻ちょうど/);
    const beforeAfter = await page.evaluate(() => window.toneStarts);
    await page.clock.runFor(90000);
    await page.waitForFunction(before => window.toneStarts > before, beforeAfter);
    assert.match(await page.locator("#audioStatus").textContent(), /1分30秒後/);
    const beforeModeChange = await page.evaluate(() => window.toneStarts);
    await page.click("#gear"); await page.locator("#modeWro").check({ force: true }); await page.click("#done");
    await page.clock.fastForward(86400000);
    assert.equal(await page.evaluate(() => window.toneStarts), beforeModeChange, "WRO-only mode sounded a timer alarm");
    assert.deepEqual(errors, []); await context.close();
  }
  console.log("WRO alarm timing UI passed add/edit/delete, actual JST times, duplicate validation, quick-control compatibility, catch-up settings, reload persistence and phone/desktop layout.");
} finally { await browser.close(); }

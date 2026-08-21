import {
  PRESET_LEADS,
  load,
  normalize,
  save
} from "./config.js?v=20260821e";
import { buildSettings, refs as makeRefs } from "./ui.js?v=20260814m";
import { installSoundOptions } from "./sound-options.js?v=20260815h";
import {
  installDefaultSettingsUi
} from "./default-settings-ui.js?v=20260815i";
import {
  installBackgroundSettings,
  createBackgroundSettingsController
} from "./background-settings.js?v=20260815l";
import {
  installCompletionAutoWroSetting
} from "./completion-auto-wro-setting.js?v=20260820b";
import {
  installTextAutoSizeSettings,
  createTextAutoSizeController
} from "./text-auto-size-settings.js?v=20260821e";
import { installSettingsLayout } from "./settings-layout.js?v=20260821b";
import { controls as makeControls } from "./controls.js?v=20260820b";
import { renderSettings } from "./render-settings.js?v=20260820b";
import { applySizeLimits } from "./size-limits.js?v=20260821d";
import {
  installExtraSettings,
  createExtraSettingsController
} from "./extra-settings.js?v=20260821c";
import {
  createSettingsControlAudit
} from "./settings-control-audit.js?v=20260821c";
import { createNoise } from "./noise.js?v=20260814m";
import { createAudio } from "./audio.js?v=20260815h";
import { createDisplay } from "./display.js?v=20260821e";
import { bindEvents } from "./events.js?v=20260820b";

buildSettings();
installSoundOptions();
installExtraSettings();
installTextAutoSizeSettings();
installDefaultSettingsUi();
installBackgroundSettings();
installCompletionAutoWroSetting();
installSettingsLayout();
applySizeLimits();

const refs = makeRefs();
refs.currentTimeLabel = document.getElementById("currentTimeLabel");
refs.wroSuffix = document.getElementById("wroSuffix");

const controls = makeControls();
let settings = load();
let audio;
let display;
let settingsAudit = null;
let textAutoSizeController = null;

const getSettings = () => settings;
const noise = createNoise(refs, getSettings);
const extraSettings = createExtraSettingsController({
  getSettings,
  setSettings
});
const backgroundSettings = createBackgroundSettingsController({
  getSettings,
  setSettings
});

function alarmVisual() {
  refs.app.classList.remove("flash");
  void refs.app.offsetWidth;
  refs.app.classList.add("flash");
  window.setTimeout(() => refs.app.classList.remove("flash"), 800);
  noise.play();
}

display = createDisplay(
  refs,
  getSettings,
  message => audio.alarm(message),
  noise.play
);

audio = createAudio(
  refs,
  getSettings,
  setSettings,
  alarmVisual
);

function render() {
  renderSettings(controls, settings, setSettings, audio);
  extraSettings.render();
  backgroundSettings.render();
  settingsAudit?.render();
  textAutoSizeController?.render();
}

function reportSaveResult(saved) {
  if (saved) {
    settingsAudit?.markSaved();
    return;
  }

  const status = document.getElementById("settingsSaveStatus");
  if (status) {
    status.dataset.state = "error";
    status.textContent = "この端末へ保存できません";
  }
}

function visibleCompletionMessages() {
  return [...document.querySelectorAll(".completionMessageInput")]
    .map(input => String(input.value || "").trim())
    .filter(Boolean);
}

function firstNonEmptyMessage(messages) {
  return messages
    .map(message => String(message ?? "").trim())
    .find(Boolean) || "";
}

function protectCompletionSequence(patch) {
  const next = { ...patch };
  const trustedAction = next.__completionSequenceAction || "";
  delete next.__completionSequenceAction;

  const hasLegacyText = Object.prototype.hasOwnProperty.call(
    next,
    "completionText"
  );
  const hasSequence = Array.isArray(next.completionMessages);
  const currentSequence = Array.isArray(settings.completionMessages)
    ? settings.completionMessages
    : [];

  if (hasLegacyText && !hasSequence) {
    if (currentSequence.length <= 1) {
      const text = String(next.completionText ?? "").trim();
      next.completionMessages = text ? [text] : currentSequence;
    } else {
      delete next.completionText;
    }
  }

  if (Array.isArray(next.completionMessages)) {
    if (trustedAction !== "remove") {
      const visibleMessages = visibleCompletionMessages();
      if (visibleMessages.length > next.completionMessages.length) {
        next.completionMessages = visibleMessages;
      }
    }

    const first = firstNonEmptyMessage(next.completionMessages);
    if (first) next.completionText = first;
  }

  return next;
}

function setSettings(patch, options = {}) {
  const oldMode = settings.mode;
  const oldTime = settings.targetTime;
  const scheduleChanged = [
    "mode",
    "autoWroEnabled",
    "autoWroDuringCompletion",
    "autoWroIntervalMin",
    "autoWroDurationMin"
  ].some(key => key in patch);
  const protectedPatch = protectCompletionSequence(patch);

  settings = normalize({ ...settings, ...protectedPatch });
  const saved = save(settings);
  display.applyVisual();
  render();

  if (oldMode !== settings.mode || oldTime !== settings.targetTime) {
    display.setTarget();
  }
  if (scheduleChanged || oldMode !== settings.mode) {
    display.restartSchedule(false);
  }

  noise.restart();
  display.tick();
  reportSaveResult(saved);
  if (!options.quiet) noise.play();
}

function selectedLeads() {
  const presets = controls.leadPresets
    .filter(input => input.checked)
    .map(input => Number(input.value));
  const custom = settings.leadTimes
    .filter(minutes => !PRESET_LEADS.includes(minutes));
  return [...new Set([...presets, ...custom])].sort((a, b) => a - b);
}

function reset() {
  settings = normalize();
  const saved = save(settings);
  display.setTarget();
  display.applyVisual();
  render();
  noise.restart();
  display.restartSchedule(false);
  display.tick();
  reportSaveResult(saved);
  noise.play();
}

bindEvents({
  refs,
  controls,
  getSettings,
  setSettings,
  display,
  noise,
  audio,
  render,
  reset,
  selectedLeads
});

settingsAudit = createSettingsControlAudit({
  refs,
  getSettings,
  setSettings,
  audio,
  noise,
  reset
});

// This is installed after the legacy event bindings so the master auto-size
// switch can control all per-text switches without a second handler racing it.
textAutoSizeController = createTextAutoSizeController({
  getSettings,
  setSettings
});

async function start() {
  display.applyVisual();
  render();
  display.setTarget();
  await audio.restore();
  noise.restart();
  display.restartSchedule(false);
  display.tick();
  // Persist the normalized schema once so existing devices immediately gain
  // all nine per-text switches while retaining their former global behavior.
  reportSaveResult(save(settings));
  window.setInterval(display.tick, 250);
  window.setTimeout(noise.play, 180);
}

start().catch(error => {
  console.error(error);
  refs.status.textContent = "初期化エラー";
});

import {
  PRESET_LEADS,
  load,
  normalize,
  save
} from "./config.js?v=20260821a";
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
import { installSettingsLayout } from "./settings-layout.js?v=20260820a";
import { controls as makeControls } from "./controls.js?v=20260820b";
import { renderSettings } from "./render-settings.js?v=20260820b";
import { applySizeLimits } from "./size-limits.js?v=20260820a";
import {
  installExtraSettings,
  createExtraSettingsController
} from "./extra-settings.js?v=20260820a";
import {
  createSettingsControlAudit
} from "./settings-control-audit.js?v=20260821a";
import { createNoise } from "./noise.js?v=20260814m";
import { createAudio } from "./audio.js?v=20260815h";
import { createDisplay } from "./display.js?v=20260821a";
import { bindEvents } from "./events.js?v=20260820b";

buildSettings();
installSoundOptions();
installExtraSettings();
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

  settings = normalize({ ...settings, ...patch });
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

// Install this after the legacy handlers so every numeric, text and paired
// range/number setting uses one consistent validation and live-save path.
settingsAudit = createSettingsControlAudit({
  refs,
  getSettings,
  setSettings,
  audio,
  noise,
  reset
});

async function start() {
  display.applyVisual();
  render();
  display.setTarget();
  await audio.restore();
  noise.restart();
  display.restartSchedule(false);
  display.tick();
  settingsAudit.markSaved();
  window.setInterval(display.tick, 250);
  window.setTimeout(noise.play, 180);
}

start().catch(error => {
  console.error(error);
  refs.status.textContent = "初期化エラー";
});

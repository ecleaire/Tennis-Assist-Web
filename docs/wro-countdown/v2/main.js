import {
  PRESET_LEADS,
  load,
  normalize,
  save
} from "./config.js";
import { buildSettings, refs as makeRefs } from "./ui.js";
import { controls as makeControls } from "./controls.js";
import { renderSettings } from "./render-settings.js";
import { createNoise } from "./noise.js";
import { createAudio } from "./audio.js";
import { createDisplay } from "./display.js?v=20260814i";
import { bindEvents } from "./events.js";

buildSettings();

const refs = makeRefs();
const controls = makeControls();
let settings = load();
let audio;
let display;

const getSettings = () => settings;
const noise = createNoise(refs, getSettings);

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
}

function setSettings(patch, options = {}) {
  const oldMode = settings.mode;
  const oldTime = settings.targetTime;
  const scheduleChanged = [
    "mode",
    "autoWroEnabled",
    "autoWroIntervalMin",
    "autoWroDurationMin"
  ].some(key => key in patch);

  settings = normalize({ ...settings, ...patch });
  save(settings);
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
  save(settings);
  display.setTarget();
  display.applyVisual();
  render();
  noise.restart();
  display.restartSchedule(false);
  display.tick();
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

async function start() {
  display.applyVisual();
  render();
  display.setTarget();
  await audio.restore();
  noise.restart();
  display.restartSchedule(false);
  display.tick();
  window.setInterval(display.tick, 250);
  window.setTimeout(noise.play, 180);
}

start().catch(error => {
  console.error(error);
  refs.status.textContent = "初期化エラー";
});

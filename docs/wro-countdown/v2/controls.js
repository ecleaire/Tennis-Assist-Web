import { $ } from "./ui.js";

const IDS = [
  "modeTimer", "modeWro", "targetTimeField", "targetTime",
  "showTargetRow", "showTarget", "autoWroSettings",
  "autoWroEnabled", "autoWroInterval", "autoWroDuration",
  "themeDark", "themeLight", "clockSize", "timerSize",
  "targetSize", "subSize", "noiseRange", "noiseStrength",
  "noisePattern", "noiseInterval", "lineGap", "noisePreview",
  "alarmEnabled", "atTarget", "customLead", "addLead",
  "leadChips", "soundType", "volumeRange", "volume",
  "audioFile", "fileName", "testSound", "removeAudio",
  "audioStatus"
];

export function controls() {
  const result = Object.fromEntries(IDS.map(id => [id, $(id)]));
  result.leadPresets = [...document.querySelectorAll(".leadPreset")];
  return result;
}

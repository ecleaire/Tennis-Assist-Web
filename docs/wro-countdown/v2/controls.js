import { $ } from "./ui.js?v=20260814j";

const IDS = [
  "modeTimer", "modeWro", "targetTimeField", "targetTime",
  "showTargetRow", "showTarget", "showHourMinuteRow",
  "showHourMinute", "timerTextField", "timerTextInput",
  "autoWroSettings", "autoWroEnabled", "autoWroDuringCompletion",
  "autoWroInterval", "autoWroDuration", "themeDark", "themeLight",
  "autoSize", "clockSizeRange", "clockSize", "timerSizeRange",
  "timerSize", "targetSizeRange", "targetSize", "subSizeRange",
  "subSize", "timerTextSizeRange", "timerTextSize",
  "clockOffsetX", "clockOffsetY", "timerOffsetX", "timerOffsetY",
  "wroOffsetX", "wroOffsetY",
  "noiseRange", "noiseStrength", "noisePattern", "noiseInterval",
  "lineGap", "noisePreview", "alarmEnabled", "atTarget",
  "customLead", "addLead", "leadChips", "soundType",
  "volumeRange", "volume", "audioFile", "fileName", "testSound",
  "removeAudio", "audioStatus"
];

export function controls() {
  const result = Object.fromEntries(IDS.map(id => [id, $(id)]));
  result.leadPresets = [...document.querySelectorAll(".leadPreset")];
  result.clockPositionChoices = [
    ...document.querySelectorAll('input[name="clockPosition"]')
  ];
  result.timerPositionChoices = [
    ...document.querySelectorAll('input[name="timerPosition"]')
  ];
  result.wroPositionChoices = [
    ...document.querySelectorAll('input[name="wroPosition"]')
  ];
  return result;
}

import { renderLeadChips } from "./lead-chips.js?v=20260815i";

function checkPosition(choices, value) {
  choices.forEach(input => {
    input.checked = input.value === value;
  });
}

export function renderSettings(controls, settings, setSettings, audio) {
  const timerMode = settings.mode === "timer";

  controls.modeTimer.checked = timerMode;
  controls.modeWro.checked = !timerMode;
  controls.targetTimeField.hidden = !timerMode;
  controls.showTargetRow.hidden = !timerMode;
  controls.showHourMinuteRow.hidden = !timerMode;
  controls.timerTextField.hidden = !timerMode;
  controls.autoWroSettings.hidden = !timerMode;
  controls.autoWroSettings.classList.toggle(
    "disabled",
    !settings.autoWroEnabled
  );

  controls.targetTime.value = settings.targetTime;
  controls.showTarget.checked = settings.showTarget;
  controls.showHourMinute.checked = settings.showHourMinute;
  controls.timerTextInput.value = settings.timerText;
  controls.autoWroEnabled.checked = settings.autoWroEnabled;
  controls.autoWroDuringCompletion.checked =
    settings.autoWroDuringCompletion;
  controls.autoWroDuringCompletion.disabled =
    !settings.autoWroEnabled;
  controls.autoWroInterval.value = settings.autoWroIntervalMin;
  controls.autoWroDuration.value = settings.autoWroDurationMin;

  controls.themeDark.checked = settings.theme === "dark";
  controls.themeLight.checked = settings.theme === "light";
  controls.autoSize.checked = settings.autoSize;

  const sizes = [
    [controls.clockSizeRange, controls.clockSize, settings.clockSize],
    [controls.timerSizeRange, controls.timerSize, settings.timerSize],
    [controls.targetSizeRange, controls.targetSize, settings.targetSize],
    [controls.subSizeRange, controls.subSize, settings.subSize],
    [controls.timerTextSizeRange, controls.timerTextSize, settings.timerTextSize]
  ];
  sizes.forEach(([range, number, value]) => {
    range.value = value;
    number.value = value;
  });

  checkPosition(controls.clockPositionChoices, settings.clockPosition);
  checkPosition(controls.timerPositionChoices, settings.timerPosition);
  checkPosition(controls.wroPositionChoices, settings.wroPosition);
  controls.clockOffsetX.value = settings.clockOffsetX;
  controls.clockOffsetY.value = settings.clockOffsetY;
  controls.timerOffsetX.value = settings.timerOffsetX;
  controls.timerOffsetY.value = settings.timerOffsetY;
  controls.wroOffsetX.value = settings.wroOffsetX;
  controls.wroOffsetY.value = settings.wroOffsetY;

  controls.noiseRange.value = settings.noiseStrength;
  controls.noiseStrength.value = settings.noiseStrength;
  controls.noisePattern.value = settings.noisePattern;
  controls.noiseInterval.value = settings.noiseIntervalMin;
  controls.lineGap.value = settings.lineGap;

  controls.alarmEnabled.checked = settings.alarmEnabled;
  controls.atTarget.checked = settings.atTarget;
  controls.leadPresets.forEach(input => {
    input.checked = settings.leadTimes.includes(Number(input.value));
  });
  controls.soundType.value = settings.soundType;
  controls.volumeRange.value = settings.volume;
  controls.volume.value = settings.volume;
  controls.fileName.textContent = settings.fileName || "ファイル未選択";

  renderLeadChips(controls.leadChips, settings, setSettings);
  if (audio) audio.status();
}

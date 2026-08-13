import { renderLeadChips } from "./lead-chips.js";

export function renderSettings(controls, settings, setSettings, audio) {
  const timerMode = settings.mode === "timer";

  controls.modeTimer.checked = timerMode;
  controls.modeWro.checked = !timerMode;
  controls.targetTimeField.hidden = !timerMode;
  controls.showTargetRow.hidden = !timerMode;
  controls.autoWroSettings.hidden = !timerMode;
  controls.autoWroSettings.classList.toggle(
    "disabled",
    !settings.autoWroEnabled
  );

  controls.targetTime.value = settings.targetTime;
  controls.showTarget.checked = settings.showTarget;
  controls.autoWroEnabled.checked = settings.autoWroEnabled;
  controls.autoWroInterval.value = settings.autoWroIntervalMin;
  controls.autoWroDuration.value = settings.autoWroDurationMin;

  controls.themeDark.checked = settings.theme === "dark";
  controls.themeLight.checked = settings.theme === "light";
  controls.clockSize.value = settings.clockSize;
  controls.timerSize.value = settings.timerSize;
  controls.targetSize.value = settings.targetSize;
  controls.subSize.value = settings.subSize;

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
  audio?.status();
}

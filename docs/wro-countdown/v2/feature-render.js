function setSizePair(range, number, value) {
  if (range) range.value = value;
  if (number) number.value = value;
}

export function renderFeatureSettings(controls, settings) {
  const timerMode = settings.mode === "timer";

  controls.showTimerDetailsRow.hidden = !timerMode;
  controls.customTextField.hidden = !timerMode;
  controls.showTimerDetails.checked = settings.showTimerDetails;
  controls.customText.value = settings.customText;
  controls.autoSize.checked = settings.autoSize;

  setSizePair(
    controls.clockSizeRange,
    controls.clockSize,
    settings.clockSize
  );
  setSizePair(
    controls.timerSizeRange,
    controls.timerSize,
    settings.timerSize
  );
  setSizePair(
    controls.targetSizeRange,
    controls.targetSize,
    settings.targetSize
  );
  setSizePair(
    controls.customTextSizeRange,
    controls.customTextSize,
    settings.customTextSize
  );
  setSizePair(
    controls.subSizeRange,
    controls.subSize,
    settings.subSize
  );
}

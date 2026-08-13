function bindSizePair(range, number, key, setSettings) {
  const apply = value => {
    const next = Number(value);
    range.value = next;
    number.value = next;
    setSettings({ [key]: next }, { quiet: true });
  };

  range.oninput = () => apply(range.value);
  number.oninput = () => {
    range.value = number.value;
  };
  number.onchange = () => apply(number.value);
}

export function bindFeatureSettings(controls, setSettings) {
  controls.showTimerDetails.onchange = () => {
    setSettings(
      { showTimerDetails: controls.showTimerDetails.checked },
      { quiet: true }
    );
  };

  let customTextTimer = 0;
  controls.customText.oninput = () => {
    window.clearTimeout(customTextTimer);
    customTextTimer = window.setTimeout(() => {
      setSettings(
        { customText: controls.customText.value },
        { quiet: true }
      );
    }, 70);
  };

  controls.autoSize.onchange = () => {
    setSettings(
      { autoSize: controls.autoSize.checked },
      { quiet: true }
    );
  };

  [
    [controls.clockSizeRange, controls.clockSize, "clockSize"],
    [controls.timerSizeRange, controls.timerSize, "timerSize"],
    [controls.targetSizeRange, controls.targetSize, "targetSize"],
    [
      controls.customTextSizeRange,
      controls.customTextSize,
      "customTextSize"
    ],
    [controls.subSizeRange, controls.subSize, "subSize"]
  ].forEach(([range, number, key]) => {
    bindSizePair(range, number, key, setSettings);
  });
}

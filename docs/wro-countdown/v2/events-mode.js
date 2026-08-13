import { DEFAULTS } from "./config.js";

export function bindModeSettings(controls, setSettings) {
  [controls.modeTimer, controls.modeWro].forEach(input => {
    input.onchange = () => {
      if (input.checked) setSettings({ mode: input.value });
    };
  });

  controls.targetTime.onchange = () => {
    setSettings({
      targetTime: controls.targetTime.value || DEFAULTS.targetTime
    });
  };

  controls.showTarget.onchange = () => {
    setSettings({ showTarget: controls.showTarget.checked });
  };

  controls.showHourMinute.onchange = () => {
    setSettings(
      { showHourMinute: controls.showHourMinute.checked },
      { quiet: true }
    );
  };

  controls.timerTextInput.onchange = () => {
    setSettings(
      { timerText: controls.timerTextInput.value },
      { quiet: true }
    );
  };

  controls.autoWroEnabled.onchange = () => {
    setSettings(
      { autoWroEnabled: controls.autoWroEnabled.checked },
      { quiet: true }
    );
  };

  controls.autoWroInterval.onchange = () => {
    setSettings(
      { autoWroIntervalMin: Number(controls.autoWroInterval.value) },
      { quiet: true }
    );
  };

  controls.autoWroDuration.onchange = () => {
    setSettings(
      { autoWroDurationMin: Number(controls.autoWroDuration.value) },
      { quiet: true }
    );
  };

  [controls.themeDark, controls.themeLight].forEach(input => {
    input.onchange = () => {
      if (input.checked) {
        setSettings({ theme: input.value }, { quiet: true });
      }
    };
  });

  controls.autoSize.onchange = () => {
    setSettings(
      { autoSize: controls.autoSize.checked },
      { quiet: true }
    );
  };

  const sizeInputs = [
    [controls.clockSizeRange, controls.clockSize, "clockSize"],
    [controls.timerSizeRange, controls.timerSize, "timerSize"],
    [controls.targetSizeRange, controls.targetSize, "targetSize"],
    [controls.subSizeRange, controls.subSize, "subSize"],
    [controls.timerTextSizeRange, controls.timerTextSize, "timerTextSize"]
  ];

  sizeInputs.forEach(([range, number, key]) => {
    range.oninput = () => {
      number.value = range.value;
      setSettings({ [key]: Number(range.value) }, { quiet: true });
    };

    number.oninput = () => {
      if (number.value !== "") range.value = number.value;
    };

    number.onchange = () => {
      setSettings({ [key]: Number(number.value) }, { quiet: true });
    };
  });
}

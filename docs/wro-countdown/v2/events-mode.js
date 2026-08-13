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

  const sizeInputs = [
    [controls.clockSize, "clockSize"],
    [controls.timerSize, "timerSize"],
    [controls.targetSize, "targetSize"],
    [controls.subSize, "subSize"]
  ];

  sizeInputs.forEach(([input, key]) => {
    input.onchange = () => {
      setSettings({ [key]: Number(input.value) }, { quiet: true });
    };
  });
}

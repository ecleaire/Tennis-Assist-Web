export function bindNoiseSettings(refs, controls, setSettings, noise) {
  refs.display.onclick = noise.play;
  controls.noisePreview.onclick = noise.preview;

  controls.noiseRange.oninput = () => {
    controls.noiseStrength.value = controls.noiseRange.value;
  };

  controls.noiseRange.onchange = () => {
    setSettings(
      { noiseStrength: Number(controls.noiseRange.value) },
      { quiet: true }
    );
    noise.preview();
  };

  controls.noiseStrength.onchange = () => {
    setSettings(
      { noiseStrength: Number(controls.noiseStrength.value) },
      { quiet: true }
    );
    noise.preview();
  };

  controls.noisePattern.onchange = () => {
    setSettings(
      { noisePattern: controls.noisePattern.value },
      { quiet: true }
    );
    noise.preview();
  };

  controls.noiseInterval.onchange = () => {
    setSettings(
      { noiseIntervalMin: Number(controls.noiseInterval.value) },
      { quiet: true }
    );
  };

  controls.lineGap.onchange = () => {
    setSettings(
      { lineGap: Number(controls.lineGap.value) },
      { quiet: true }
    );
    noise.preview();
  };
}

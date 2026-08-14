export function bindSoundSettings(refs, controls, setSettings, audio) {
  controls.volumeRange.oninput = () => {
    const volume = Number(controls.volumeRange.value);
    controls.volume.value = volume;
    audio.setVolume(volume);
  };

  controls.volumeRange.onchange = () => {
    setSettings(
      { volume: Number(controls.volumeRange.value) },
      { quiet: true }
    );
    audio.setVolume(Number(controls.volumeRange.value));
  };

  controls.volume.oninput = () => {
    if (controls.volume.value !== "") {
      controls.volumeRange.value = controls.volume.value;
      audio.setVolume(Number(controls.volume.value));
    }
  };

  controls.volume.onchange = () => {
    setSettings(
      { volume: Number(controls.volume.value) },
      { quiet: true }
    );
    audio.setVolume(Number(controls.volume.value));
  };

  controls.soundType.onchange = () => {
    setSettings(
      { soundType: controls.soundType.value },
      { quiet: true }
    );
  };

  controls.testSound.onclick = () => {
    audio.play()
      .then(() => audio.status())
      .catch(error => {
        controls.audioStatus.textContent =
          error.message || "音声を再生できませんでした。";
      });
  };
}

export function bindSoundSettings(refs, controls, setSettings, audio) {
  controls.volumeRange.oninput = () => {
    controls.volume.value = controls.volumeRange.value;
    refs.audioPlayer.volume = Number(controls.volumeRange.value) / 100;
  };

  controls.volumeRange.onchange = () => {
    setSettings(
      { volume: Number(controls.volumeRange.value) },
      { quiet: true }
    );
  };

  controls.volume.onchange = () => {
    setSettings(
      { volume: Number(controls.volume.value) },
      { quiet: true }
    );
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

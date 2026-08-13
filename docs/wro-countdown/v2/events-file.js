export function bindAudioFile(controls, audio, render) {
  controls.audioFile.onchange = () => {
    const file = controls.audioFile.files?.[0];
    if (!file) return;

    audio.selectFile(file)
      .then(render)
      .catch(error => {
        controls.audioStatus.textContent = error.message;
      });
  };

  controls.removeAudio.onclick = () => {
    audio.remove().then(() => {
      controls.audioFile.value = "";
      render();
    });
  };
}

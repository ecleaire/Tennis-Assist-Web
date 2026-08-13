import { playTemplate } from "./sounds.js";

export function createAudio(refs, getSettings, setSettings, onAlarmVisual) {
  let context = null;
  let ready = false;
  let fileUrl = "";
  let customAudioReady = false;
  let lastMessage = "";

  async function unlock() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("このブラウザは音声再生に対応していません。");
    }
    if (!context) context = new AudioContextClass();
    if (context.state === "suspended") await context.resume();
    ready = context.state === "running";
    showStatus();
    return ready;
  }

  async function play() {
    const settings = getSettings();

    if (settings.soundType === "custom") {
      if (!customAudioReady || !refs.audioPlayer.src) {
        throw new Error("指定した音声ファイルがありません。");
      }
      refs.audioPlayer.pause();
      refs.audioPlayer.currentTime = 0;
      refs.audioPlayer.volume = settings.volume / 100;
      await refs.audioPlayer.play();
      ready = true;
      showStatus();
      return;
    }

    await unlock();
    playTemplate(context, settings.soundType, settings.volume);
  }

  async function alarm(message) {
    lastMessage = message;
    onAlarmVisual();
    try {
      await play();
      refs.audioStatus.textContent = `${message} — アラームを再生しました。`;
    } catch (error) {
      ready = false;
      refs.audioStatus.textContent =
        `${message} — ${error.message || "再生できませんでした。"}`;
      showStatus();
    }
  }

  function showStatus() {
    const settings = getSettings();

    if (!settings.alarmEnabled) {
      refs.soundBadge.textContent = "SOUND OFF";
      refs.soundBadge.className = "badge";
      refs.audioStatus.textContent = "アラームはオフです。";
      return;
    }

    if (settings.soundType === "custom" && !customAudioReady) {
      refs.soundBadge.textContent = "NO AUDIO FILE";
      refs.soundBadge.className = "badge";
      refs.audioStatus.textContent = "指定音声ファイルを選択してください。";
      return;
    }

    if (ready) {
      refs.soundBadge.textContent = "SOUND READY";
      refs.soundBadge.className = "badge ready";
      refs.audioStatus.textContent = lastMessage
        ? `${lastMessage} — 音声は有効です。`
        : "音声は有効です。ブラウザを閉じずに表示してください。";
    } else {
      refs.soundBadge.textContent = "SOUND LOCKED";
      refs.soundBadge.className = "badge";
      refs.audioStatus.textContent =
        "「音声テスト・有効化」を一度押してください。";
    }
  }

  async function selectFile(file) {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("20MB以下の音声を選択してください。");
    }
    if (file.type && !file.type.startsWith("audio/")) {
      throw new Error("音声ファイルを選択してください。");
    }

    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = URL.createObjectURL(file);
    refs.audioPlayer.src = fileUrl;
    refs.audioPlayer.volume = getSettings().volume / 100;
    customAudioReady = true;
    setSettings(
      { fileName: file.name, soundType: "custom" },
      { quiet: true }
    );
    refs.audioStatus.textContent = `${file.name}を読み込みました。`;
  }

  async function remove() {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = "";
    customAudioReady = false;
    refs.audioPlayer.removeAttribute("src");
    setSettings(
      {
        fileName: "",
        soundType: getSettings().soundType === "custom"
          ? "bell"
          : getSettings().soundType
      },
      { quiet: true }
    );
    refs.audioStatus.textContent = "指定音声を削除しました。";
  }

  async function restore() {
    showStatus();
  }

  return {
    restore,
    unlock,
    play,
    alarm,
    status: showStatus,
    selectFile,
    remove
  };
}

import { playTemplate } from "./sounds.js?v=20260814r";
import {
  saveAudioFile,
  loadAudioFile,
  deleteAudioFile
} from "./audio-storage.js?v=20260814k";

const VOLUME_BOOST = 20;

export function createAudio(refs, getSettings, setSettings, onAlarmVisual) {
  let context = null;
  let ready = false;
  let fileUrl = "";
  let customAudioReady = false;
  let customSource = null;
  let customGain = null;
  let customLimiter = null;
  let lastMessage = "";

  function boostedLevel(volume = getSettings().volume) {
    return Math.max(0, Number(volume) / 100 * VOLUME_BOOST);
  }

  function configureLimiter(limiter) {
    limiter.threshold.value = -1;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.12;
  }

  function useAudioBlob(blob) {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = URL.createObjectURL(blob);
    refs.audioPlayer.src = fileUrl;
    refs.audioPlayer.volume = 1;
    customAudioReady = true;
  }

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

  async function ensureCustomAudioGraph() {
    await unlock();

    if (!customSource) {
      customSource = context.createMediaElementSource(refs.audioPlayer);
      customGain = context.createGain();
      customLimiter = context.createDynamicsCompressor();
      configureLimiter(customLimiter);
      customSource
        .connect(customGain)
        .connect(customLimiter)
        .connect(context.destination);
    }

    refs.audioPlayer.volume = 1;
    setVolume();
  }

  function setVolume(volume = getSettings().volume) {
    if (customGain && context) {
      customGain.gain.setTargetAtTime(
        boostedLevel(volume),
        context.currentTime,
        0.01
      );
    }
  }

  async function play() {
    const settings = getSettings();

    if (settings.soundType === "custom") {
      if (!customAudioReady || !refs.audioPlayer.src) {
        throw new Error("指定した音声ファイルがありません。");
      }
      await ensureCustomAudioGraph();
      refs.audioPlayer.pause();
      refs.audioPlayer.currentTime = 0;
      setVolume(settings.volume);
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
        : "元の通知音を20倍ブーストで有効化しています。";
    } else {
      refs.soundBadge.textContent = customAudioReady
        ? "AUDIO SAVED"
        : "SOUND LOCKED";
      refs.soundBadge.className = customAudioReady
        ? "badge ready"
        : "badge";
      refs.audioStatus.textContent = customAudioReady
        ? "指定音声は端末に保存済みです。使用前に音声テストを押してください。"
        : "「音声テスト・有効化」を一度押してください。";
    }
  }

  async function selectFile(file) {
    if (file.size > 20 * 1024 * 1024) {
      throw new Error("20MB以下の音声を選択してください。");
    }
    if (file.type && !file.type.startsWith("audio/")) {
      throw new Error("音声ファイルを選択してください。");
    }

    let saved = true;
    try {
      await saveAudioFile(file);
    } catch (error) {
      saved = false;
      console.warn("Could not persist the selected audio file.", error);
    }

    useAudioBlob(file);
    setSettings(
      { fileName: file.name, soundType: "custom" },
      { quiet: true }
    );
    refs.audioStatus.textContent = saved
      ? `${file.name}をこの端末に保存しました。`
      : `${file.name}を読み込みました。このブラウザでは再起動後の復元ができません。`;
  }

  async function remove() {
    await deleteAudioFile();
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    fileUrl = "";
    customAudioReady = false;
    refs.audioPlayer.pause();
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
    refs.audioStatus.textContent = "指定音声を端末から削除しました。";
  }

  async function restore() {
    const storedFile = await loadAudioFile();
    if (storedFile instanceof Blob) {
      useAudioBlob(storedFile);
      const storedName = storedFile.name || getSettings().fileName;
      if (storedName && storedName !== getSettings().fileName) {
        setSettings({ fileName: storedName }, { quiet: true });
      }
    }
    showStatus();
  }

  return {
    restore,
    unlock,
    play,
    alarm,
    status: showStatus,
    setVolume,
    selectFile,
    remove
  };
}

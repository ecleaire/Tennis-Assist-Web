"use strict";

  function renderCustomAudioStatus() {
    customAudioName.textContent = settings.customAudioName || "未設定";
    removeCustomAudioButton.disabled = !settings.customAudioName && !customAudioBlob;
  }

  function renderAlarmOffsets() {
    alarmOffsetsEl.replaceChildren();

    for (const offset of settings.alarmOffsets) {
      const chip = document.createElement("span");
      chip.className = "alarm-chip";
      const label = document.createElement("span");
      label.textContent = offset === 0 ? "時刻ちょうど" : `${offset}分前`;
      chip.append(label);

      if (offset !== 0) {
        const remove = document.createElement("button");
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", `${offset}分前の通知を削除`);
        remove.addEventListener("click", () => {
          settings.alarmOffsets = settings.alarmOffsets.filter((value) => value !== offset);
          settings.alarmOffsets = sanitizeOffsets(settings.alarmOffsets);
          saveSettings();
          renderAlarmOffsets();
        });
        chip.append(remove);
      }

      alarmOffsetsEl.append(chip);
    }
  }

  function renderSettingsControls() {
    targetTimeInput.value = settings.targetTime;
    showTargetToggle.checked = settings.showTarget;
    currentSizeInput.value = String(settings.currentTimeSize);
    countdownSizeInput.value = String(settings.countdownSize);
    targetSizeInput.value = String(settings.targetSize);
    detailSizeInput.value = String(settings.detailSize);
    alarmEnabledToggle.checked = settings.alarmEnabled;
    soundTemplateSelect.value = settings.soundTemplate;
    volumeInput.value = String(settings.volume);
    volumeOutput.value = `${settings.volume}%`;
    noiseStrengthInput.value = String(settings.noiseStrength);
    noiseStrengthOutput.value = `${settings.noiseStrength}%`;
    noisePatternSelect.value = settings.noisePattern;
    noiseGapInput.value = String(settings.noiseGap);
    noiseDurationInput.value = String(settings.noiseDuration);
    noiseSequenceInput.value = String(settings.noiseSequenceGap);
    modeTimerButton.classList.toggle("active", settings.mode === "timer");
    modeWroButton.classList.toggle("active", settings.mode === "wro");
    themeDarkButton.classList.toggle("active", settings.theme === "dark");
    themeLightButton.classList.toggle("active", settings.theme === "light");
    renderAlarmOffsets();
    renderCustomAudioStatus();
    updateAudioStatus();
  }

  function openSettings() {
    settingsOverlay.classList.add("is-open");
    settingsOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    unlockAudio(false);
    window.setTimeout(() => settingsClose.focus(), 180);
  }

  function closeSettings() {
    settingsOverlay.classList.remove("is-open");
    settingsOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    settingsButton.focus({ preventScroll: true });
  }

  function updateSetting(key, value, options = {}) {
    settings = sanitizeSettings({ ...settings, [key]: value });
    saveSettings();

    if (options.theme) applyTheme();
    if (options.fonts) applyFontSizes();
    if (options.noise) applyNoiseSettings();
    if (options.mode) applyMode();
    if (options.display) updateDisplay();

    renderSettingsControls();
  }


const $ = id => document.getElementById(id);

function sizeControl(label, id, minimum, maximum, wide = false) {
  return `
<label class="field sizeControl${wide ? " wide" : ""}">
  <span class="label">${label}</span>
  <div class="range">
    <input id="${id}Range" type="range" min="${minimum}" max="${maximum}" step="1">
    <input id="${id}" type="number" min="${minimum}" max="${maximum}" step="1">
  </div>
</label>`;
}

export function installExtraSettings() {
  if ($("showCurrentTime")) return;

  const currentTimeGroup = document.createElement("div");
  currentTimeGroup.className = "extraSettingsGroup";
  currentTimeGroup.innerHTML = `
<div class="switch">
  <div class="switchCopy">
    <b>現在時刻を表示</b>
    <small>タイマーモード・全国大会モードの両方に適用します。</small>
  </div>
  <label class="toggle"><input id="showCurrentTime" type="checkbox"><span></span></label>
</div>
<label class="field" id="currentTimeLabelField">
  <span class="label">現在時刻の文言</span>
  <input id="currentTimeLabelInput" type="text" maxlength="40" placeholder="現在時刻">
  <small class="help compact">「現在時刻」以外の文言にも変更できます。空欄の場合は時刻だけを表示します。</small>
</label>`;

  const showHourMinuteRow = $("showHourMinuteRow");
  if (showHourMinuteRow) {
    showHourMinuteRow.after(currentTimeGroup);
  }

  const wroGroup = document.createElement("div");
  wroGroup.className = "extraSettingsGroup";
  wroGroup.innerHTML = `
<label class="field">
  <span class="label">8月22日（土）の後に追加する文字</span>
  <textarea id="wroDateSuffixInput" rows="2" maxlength="120" placeholder="例：Japan決勝大会 開幕"></textarea>
  <small class="help compact">初期値は空欄です。タイマーモード中の全国大会自動表示にも適用されます。</small>
</label>`;

  const autoWroSettings = $("autoWroSettings");
  if (autoWroSettings) {
    autoWroSettings.after(wroGroup);
  }

  const sizeControls = document.querySelector(".sizeControls");
  const clockSizeControl = $("clockSize")?.closest(".sizeControl");
  if (clockSizeControl && !$("dateSize")) {
    clockSizeControl.insertAdjacentHTML(
      "afterend",
      sizeControl("現在時刻下の日付（px）", "dateSize", 10, 48)
    );
  }

  if (sizeControls) {
    sizeControls.insertAdjacentHTML(
      "beforeend",
      sizeControl("全国大会タイトル（px）", "wroTitleSize", 12, 180) +
      sizeControl("8月22日後の追加文字（px）", "wroDateSuffixSize", 12, 140, true)
    );
  }
}

function bindSizePair(range, number, key, setSettings) {
  const update = value => {
    const next = Number(value);
    if (!Number.isFinite(next)) return;
    range.value = String(next);
    number.value = String(next);
    setSettings({ [key]: next }, { quiet: true });
  };

  range.oninput = () => update(range.value);
  number.oninput = () => {
    if (number.value !== "") range.value = number.value;
  };
  number.onchange = () => update(number.value);
}

export function createExtraSettingsController({ getSettings, setSettings }) {
  const controls = {
    showCurrentTime: $("showCurrentTime"),
    currentTimeLabelField: $("currentTimeLabelField"),
    currentTimeLabelInput: $("currentTimeLabelInput"),
    dateSizeRange: $("dateSizeRange"),
    dateSize: $("dateSize"),
    wroDateSuffixInput: $("wroDateSuffixInput"),
    wroTitleSizeRange: $("wroTitleSizeRange"),
    wroTitleSize: $("wroTitleSize"),
    wroDateSuffixSizeRange: $("wroDateSuffixSizeRange"),
    wroDateSuffixSize: $("wroDateSuffixSize")
  };

  controls.showCurrentTime.onchange = () => {
    setSettings(
      { showCurrentTime: controls.showCurrentTime.checked },
      { quiet: true }
    );
  };

  let currentLabelTimer = 0;
  controls.currentTimeLabelInput.oninput = () => {
    window.clearTimeout(currentLabelTimer);
    currentLabelTimer = window.setTimeout(() => {
      setSettings(
        { currentTimeLabel: controls.currentTimeLabelInput.value },
        { quiet: true }
      );
    }, 100);
  };

  let suffixTimer = 0;
  controls.wroDateSuffixInput.oninput = () => {
    window.clearTimeout(suffixTimer);
    suffixTimer = window.setTimeout(() => {
      setSettings(
        { wroDateSuffix: controls.wroDateSuffixInput.value },
        { quiet: true }
      );
    }, 100);
  };

  bindSizePair(
    controls.dateSizeRange,
    controls.dateSize,
    "dateSize",
    setSettings
  );
  bindSizePair(
    controls.wroTitleSizeRange,
    controls.wroTitleSize,
    "wroTitleSize",
    setSettings
  );
  bindSizePair(
    controls.wroDateSuffixSizeRange,
    controls.wroDateSuffixSize,
    "wroDateSuffixSize",
    setSettings
  );

  function render() {
    const settings = getSettings();
    controls.showCurrentTime.checked = settings.showCurrentTime;
    controls.currentTimeLabelField.classList.toggle(
      "disabledField",
      !settings.showCurrentTime
    );
    controls.currentTimeLabelInput.disabled = !settings.showCurrentTime;
    if (document.activeElement !== controls.currentTimeLabelInput) {
      controls.currentTimeLabelInput.value = settings.currentTimeLabel;
    }
    controls.dateSizeRange.value = settings.dateSize;
    controls.dateSize.value = settings.dateSize;
    if (document.activeElement !== controls.wroDateSuffixInput) {
      controls.wroDateSuffixInput.value = settings.wroDateSuffix;
    }
    controls.wroTitleSizeRange.value = settings.wroTitleSize;
    controls.wroTitleSize.value = settings.wroTitleSize;
    controls.wroDateSuffixSizeRange.value = settings.wroDateSuffixSize;
    controls.wroDateSuffixSize.value = settings.wroDateSuffixSize;
  }

  return { render };
}

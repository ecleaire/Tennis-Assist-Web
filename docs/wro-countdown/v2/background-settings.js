const $ = id => document.getElementById(id);
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function installBackgroundSettings() {
  if ($("backgroundSettings")) return;

  const themeSelector = $("themeDark")?.closest(".seg");
  if (!themeSelector) return;

  const section = document.createElement("div");
  section.id = "backgroundSettings";
  section.className = "backgroundSettings extraSettingsGroup";
  section.innerHTML = `
<div class="backgroundSettingsHead">
  <b>背景</b>
  <small>背景の種類・色・演出の強さを調整します。</small>
</div>
<label class="field">
  <span class="label">背景スタイル</span>
  <select id="backgroundStyle">
    <option value="gradient">グラデーション</option>
    <option value="spotlight">スポットライト</option>
    <option value="solid">単色</option>
  </select>
</label>
<div class="switch">
  <div class="switchCopy">
    <b>ダーク／ライトに合わせた色を使用</b>
    <small>オンの場合、テーマを切り替えると背景色も自動で変わります。</small>
  </div>
  <label class="toggle"><input id="backgroundUseThemeColors" type="checkbox"><span></span></label>
</div>
<div class="backgroundColors" id="backgroundColorFields">
  <label class="field backgroundColorField">
    <span class="label">ベース色</span>
    <div class="backgroundColorControl">
      <input id="backgroundBaseColor" type="color" value="#020405" aria-label="背景のベース色">
      <input id="backgroundBaseHex" type="text" maxlength="7" value="#020405" inputmode="text" spellcheck="false" aria-label="背景のベース色コード">
    </div>
  </label>
  <label class="field backgroundColorField">
    <span class="label">アクセント色</span>
    <div class="backgroundColorControl">
      <input id="backgroundAccentColor" type="color" value="#56d1e7" aria-label="背景のアクセント色">
      <input id="backgroundAccentHex" type="text" maxlength="7" value="#56d1e7" inputmode="text" spellcheck="false" aria-label="背景のアクセント色コード">
    </div>
  </label>
</div>
<label class="field">
  <span class="label">背景演出の強さ</span>
  <div class="range">
    <input id="backgroundStrengthRange" type="range" min="0" max="100" step="1">
    <input id="backgroundStrength" type="number" min="0" max="100" step="1">
  </div>
  <small class="help compact">0で色の演出を抑え、100で最も強く表示します。</small>
</label>
<div class="backgroundToggles">
  <div class="switch">
    <div class="switchCopy">
      <b>中央ガイド線</b>
      <small>画面中央の縦線・横線を表示します。</small>
    </div>
    <label class="toggle"><input id="backgroundGuides" type="checkbox"><span></span></label>
  </div>
  <div class="switch">
    <div class="switchCopy">
      <b>細い走査線</b>
      <small>背景全体の薄い横線を表示します。</small>
    </div>
    <label class="toggle"><input id="backgroundScanlines" type="checkbox"><span></span></label>
  </div>
</div>`;

  themeSelector.after(section);
}

function bindRange(range, number, key, setSettings) {
  const apply = value => {
    const next = Math.min(100, Math.max(0, Number(value)));
    if (!Number.isFinite(next)) return;
    range.value = String(next);
    number.value = String(next);
    setSettings({ [key]: next }, { quiet: true });
  };

  range.oninput = () => apply(range.value);
  number.oninput = () => {
    if (number.value !== "") range.value = number.value;
  };
  number.onchange = () => apply(number.value);
}

function bindColor(picker, text, key, setSettings) {
  const apply = value => {
    const normalized = String(value).trim().toLowerCase();
    if (!HEX_COLOR.test(normalized)) return false;
    picker.value = normalized;
    text.value = normalized;
    setSettings({ [key]: normalized }, { quiet: true });
    return true;
  };

  picker.oninput = () => apply(picker.value);
  text.onchange = () => {
    if (!apply(text.value)) text.value = picker.value;
  };
  text.onkeydown = event => {
    if (event.key === "Enter") {
      event.preventDefault();
      text.blur();
    }
  };
}

export function createBackgroundSettingsController({ getSettings, setSettings }) {
  const controls = {
    style: $("backgroundStyle"),
    useThemeColors: $("backgroundUseThemeColors"),
    colorFields: $("backgroundColorFields"),
    baseColor: $("backgroundBaseColor"),
    baseHex: $("backgroundBaseHex"),
    accentColor: $("backgroundAccentColor"),
    accentHex: $("backgroundAccentHex"),
    strengthRange: $("backgroundStrengthRange"),
    strength: $("backgroundStrength"),
    guides: $("backgroundGuides"),
    scanlines: $("backgroundScanlines")
  };

  controls.style.onchange = () => {
    setSettings({ backgroundStyle: controls.style.value }, { quiet: true });
  };

  controls.useThemeColors.onchange = () => {
    setSettings(
      { backgroundUseThemeColors: controls.useThemeColors.checked },
      { quiet: true }
    );
  };

  controls.guides.onchange = () => {
    setSettings(
      { backgroundGuides: controls.guides.checked },
      { quiet: true }
    );
  };

  controls.scanlines.onchange = () => {
    setSettings(
      { backgroundScanlines: controls.scanlines.checked },
      { quiet: true }
    );
  };

  bindRange(
    controls.strengthRange,
    controls.strength,
    "backgroundStrength",
    setSettings
  );
  bindColor(
    controls.baseColor,
    controls.baseHex,
    "backgroundBaseColor",
    setSettings
  );
  bindColor(
    controls.accentColor,
    controls.accentHex,
    "backgroundAccentColor",
    setSettings
  );

  function render() {
    const settings = getSettings();
    controls.style.value = settings.backgroundStyle;
    controls.useThemeColors.checked = settings.backgroundUseThemeColors;
    controls.strengthRange.value = settings.backgroundStrength;
    controls.strength.value = settings.backgroundStrength;
    controls.guides.checked = settings.backgroundGuides;
    controls.scanlines.checked = settings.backgroundScanlines;

    const customDisabled = settings.backgroundUseThemeColors;
    controls.colorFields.classList.toggle("disabledField", customDisabled);
    for (const input of [
      controls.baseColor,
      controls.baseHex,
      controls.accentColor,
      controls.accentHex
    ]) {
      input.disabled = customDisabled;
    }

    if (document.activeElement !== controls.baseHex) {
      controls.baseColor.value = settings.backgroundBaseColor;
      controls.baseHex.value = settings.backgroundBaseColor;
    }
    if (document.activeElement !== controls.accentHex) {
      controls.accentColor.value = settings.backgroundAccentColor;
      controls.accentHex.value = settings.backgroundAccentColor;
    }
  }

  return { render };
}

const DETAILS_OPEN_KEY = "wro-countdown-advanced-settings-open";

const $ = id => document.getElementById(id);

function closest(id, selector) {
  return $(id)?.closest(selector) || null;
}

function textNode(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function appendExisting(container, nodes) {
  for (const node of nodes.flat().filter(Boolean)) {
    container.append(node);
  }
}

function createBasicCard({ id, title, description, wide = false, nodes = [] }) {
  const card = document.createElement("section");
  card.id = id;
  card.className = `basicSettingsCard${wide ? " basicSettingsCardWide" : ""}`;

  const head = document.createElement("div");
  head.className = "basicSettingsCardHead";
  head.append(
    textNode("h3", "basicSettingsCardTitle", title),
    textNode("p", "basicSettingsCardDescription", description)
  );

  const body = document.createElement("div");
  body.className = "basicSettingsCardBody";
  appendExisting(body, nodes);

  card.append(head, body);
  return card;
}

function createSubgroup(title, description, nodes) {
  const group = document.createElement("div");
  group.className = "detailSettingsGroup";

  const head = document.createElement("div");
  head.className = "detailSettingsGroupHead";
  head.append(
    textNode("h3", "detailSettingsGroupTitle", title),
    textNode("p", "detailSettingsGroupDescription", description)
  );

  const body = document.createElement("div");
  body.className = "detailSettingsGroupBody";
  appendExisting(body, nodes);

  group.append(head, body);
  return group;
}

function retitleSection(section, title, description, category) {
  if (!section) return null;
  section.classList.add("detailSettingsCategory");
  section.dataset.settingsCategory = category;

  const heading = section.querySelector(":scope > h2");
  if (heading) heading.textContent = title;

  const help = section.querySelector(":scope > .help");
  if (help) help.textContent = description;

  return section;
}

function prepareDisplayDetails(displaySection) {
  if (!displaySection) return null;

  const fields = displaySection.querySelector(":scope > .fields");
  if (!fields) return displaySection;

  const currentTimeGroup = $("currentTimeLabelInput")?.closest(".extraSettingsGroup");
  const timerTextField = $("timerTextField");
  const wroTextGroup = $("wroDateSuffixInput")?.closest(".extraSettingsGroup");
  const autoWro = $("autoWroSettings");

  fields.replaceChildren(
    createSubgroup(
      "表示する文言",
      "現在時刻のラベル、タイマーの追加文字、全国大会の日付後の文字を変更します。",
      [currentTimeGroup, timerTextField, wroTextGroup]
    ),
    createSubgroup(
      "全国大会表示の自動切り替え",
      "タイマー使用中に全国大会カウントダウンを表示する間隔と表示時間を設定します。",
      [autoWro]
    )
  );

  return retitleSection(
    displaySection,
    "文字・表示内容",
    "画面へ追加する文言と、全国大会表示への自動切り替えを調整します。",
    "content"
  );
}

function prepareAppearanceDetails(appearanceSection) {
  if (!appearanceSection) return null;

  const fields = appearanceSection.querySelector(":scope > .fields");
  if (!fields) return appearanceSection;

  const sizeControls = appearanceSection.querySelector(".sizeControls");
  const sizeHelp = sizeControls?.nextElementSibling?.classList.contains("help")
    ? sizeControls.nextElementSibling
    : null;
  const backgroundSettings = $("backgroundSettings");
  backgroundSettings?.querySelector(".backgroundSettingsHead")?.remove();

  fields.replaceChildren(
    createSubgroup(
      "文字サイズ",
      "現在時刻、日付、タイマー、補足表示などを個別に調整します。",
      [sizeControls, sizeHelp]
    ),
    createSubgroup(
      "背景の詳細",
      "テーマ連動、色、演出の強さ、ガイド線、走査線を調整します。",
      [backgroundSettings]
    )
  );

  return retitleSection(
    appearanceSection,
    "文字サイズ・背景",
    "基本設定より細かい文字サイズと背景演出を調整します。",
    "appearance"
  );
}

function preparePositionDetails(positionSection) {
  return retitleSection(
    positionSection,
    "PC・横画面の配置",
    "現在時刻、タイマー、全国大会カウントダウンの位置とX・Yを調整します。",
    "placement"
  );
}

function prepareNoiseDetails(noiseSection) {
  return retitleSection(
    noiseSection,
    "ノイズ・グリッチ演出",
    "ノイズの強さ、種類、自動再生間隔、文字ごとの演出間隔を調整します。",
    "effects"
  );
}

function prepareAudioDetails(soundSection) {
  if (!soundSection) return null;

  const fields = soundSection.querySelector(":scope > .fields");
  if (!fields) return soundSection;

  const customLeadField = $("customLead")?.closest(".field");
  const audioFileField = $("audioFile")?.closest(".field");
  const audioActions = $("removeAudio")?.closest(".audioActions");

  fields.replaceChildren(
    createSubgroup(
      "追加の事前通知",
      "基本設定にない任意の分数を追加します。",
      [customLeadField]
    ),
    createSubgroup(
      "指定音声ファイル",
      "端末内の音声ファイルを通知音として使用、または削除します。",
      [audioFileField, audioActions]
    )
  );

  return retitleSection(
    soundSection,
    "音・通知の詳細",
    "任意の事前通知と、端末内のカスタム音声を設定します。",
    "audio"
  );
}

function createAdvancedAccordion(categories) {
  const details = document.createElement("details");
  details.id = "advancedSettingsAccordion";
  details.className = "advancedSettingsAccordion";
  details.open = localStorage.getItem(DETAILS_OPEN_KEY) === "1";

  const summary = document.createElement("summary");
  summary.className = "advancedSettingsSummary";
  summary.innerHTML = `
    <span class="advancedSettingsSummaryText">
      <span class="advancedSettingsKicker">ADVANCED</span>
      <strong>詳細設定</strong>
      <small>文字、背景、配置、演出、通知を細かく調整</small>
    </span>
    <span class="advancedSettingsSummaryAction" aria-hidden="true">
      <span class="advancedSettingsState"></span>
      <span class="advancedSettingsChevron">⌄</span>
    </span>`;

  const body = document.createElement("div");
  body.className = "advancedSettingsBody";
  appendExisting(body, categories);

  const updateSummary = () => {
    const state = summary.querySelector(".advancedSettingsState");
    if (state) state.textContent = details.open ? "閉じる" : "開く";
    localStorage.setItem(DETAILS_OPEN_KEY, details.open ? "1" : "0");
  };

  details.addEventListener("toggle", updateSummary);
  details.append(summary, body);
  updateSummary();
  return details;
}

export function installSettingsLayout() {
  const root = $("settingsRoot");
  if (!root || $("basicSettingsPanel")) return;

  const displaySection = $("modeTimer")?.closest(".section");
  const appearanceSection = $("themeDark")?.closest(".section");
  const positionSection = root.querySelector(":scope > .positionSection");
  const noiseSection = $("noiseStrength")?.closest(".section");
  const soundSection = $("alarmEnabled")?.closest(".section");
  const actions = root.querySelector(":scope > .actions");

  const modeSelector = closest("modeTimer", ".seg");
  const targetTimeField = $("targetTimeField");
  const showCurrentTime = closest("showCurrentTime", ".switch");
  const showTarget = $("showTargetRow");
  const showHourMinute = $("showHourMinuteRow");

  const themeSelector = closest("themeDark", ".seg");
  const backgroundStyle = closest("backgroundStyle", ".field");
  const autoSize = closest("autoSize", ".switch");

  const alarmSwitch = closest("alarmEnabled", ".switch");
  const alarmChecks = closest("atTarget", ".checks");
  const soundType = closest("soundType", ".field");
  const volume = closest("volume", ".field");
  const testSound = $("testSound");
  const audioStatus = $("audioStatus");

  const quickAudio = document.createElement("div");
  quickAudio.className = "quickAudioActions";
  appendExisting(quickAudio, [testSound, audioStatus]);

  const basic = document.createElement("section");
  basic.id = "basicSettingsPanel";
  basic.className = "basicSettingsPanel";
  basic.innerHTML = `
    <div class="basicSettingsHead">
      <div>
        <span class="basicSettingsKicker">QUICK SETUP</span>
        <h2>基本設定</h2>
        <p>普段よく使う項目をまとめています。ここだけでタイマーを一通り設定できます。</p>
      </div>
      <span class="settingsAutoSave">変更は自動保存</span>
    </div>`;

  const grid = document.createElement("div");
  grid.className = "basicSettingsGrid";
  grid.append(
    createBasicCard({
      id: "basicDisplayCard",
      title: "タイマーと表示",
      description: "モード、指定時刻、現在時刻と補足表示を設定します。",
      wide: true,
      nodes: [
        modeSelector,
        targetTimeField,
        showCurrentTime,
        showTarget,
        showHourMinute
      ]
    }),
    createBasicCard({
      id: "basicAppearanceCard",
      title: "外観",
      description: "テーマ、背景スタイル、自動サイズ調整を設定します。",
      nodes: [themeSelector, backgroundStyle, autoSize]
    }),
    createBasicCard({
      id: "basicAlarmCard",
      title: "アラーム",
      description: "通知タイミング、音、音量を設定してテストします。",
      nodes: [
        alarmSwitch,
        alarmChecks,
        soundType,
        volume,
        quickAudio
      ]
    })
  );
  basic.append(grid);

  const advanced = createAdvancedAccordion([
    prepareDisplayDetails(displaySection),
    prepareAppearanceDetails(appearanceSection),
    preparePositionDetails(positionSection),
    prepareNoiseDetails(noiseSection),
    prepareAudioDetails(soundSection)
  ]);

  if (actions) {
    actions.classList.add("settingsFooterActions");
    const reset = $("reset");
    if (reset) reset.classList.add("settingsResetButton");
  }

  root.replaceChildren(basic, advanced, actions);
}

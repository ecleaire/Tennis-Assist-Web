const $ = id => document.getElementById(id);

function createSwitch(id, title, help) {
  const row = document.createElement("div");
  row.className = "switch";
  row.id = `${id}Row`;
  row.innerHTML = `
    <div class="switchCopy">
      <b>${title}</b>
      <small>${help}</small>
    </div>
    <label class="toggle">
      <input id="${id}" type="checkbox">
      <span></span>
    </label>`;
  return row;
}

function addRangeToNumber(id) {
  const number = $(id);
  if (!number || $(`${id}Range`)) return;

  const range = document.createElement("input");
  range.id = `${id}Range`;
  range.type = "range";
  range.min = number.min;
  range.max = number.max;
  range.step = number.step || "1";

  const wrap = document.createElement("div");
  wrap.className = "range";
  number.before(wrap);
  wrap.append(range, number);
  number.closest(".field")?.classList.add("sizeControl");
}

export function enhanceSettings() {
  const showTargetRow = $("showTargetRow");
  if (showTargetRow && !$("showTimerDetails")) {
    const details = createSwitch(
      "showTimerDetails",
      "「あと00時間00分」を表示",
      "タイマー下部の残り時間補足を表示します。"
    );

    const custom = document.createElement("label");
    custom.className = "field";
    custom.id = "customTextField";
    custom.innerHTML = `
      <span class="label">タイマー画面の追加文字</span>
      <textarea id="customText" rows="3" maxlength="160"
        placeholder="例：授業終了まで残り {残り時間}"></textarea>
      <small class="help compact">
        空欄で非表示。{残り時間}・{時刻}・{日}・{時間}・{分}・{秒}を使用できます。
      </small>`;

    showTargetRow.after(details);
    details.after(custom);
  }

  const appearance = $("themeDark")?.closest(".section");
  const fields = $("themeDark")?.closest(".fields");
  if (appearance && fields && !$("autoSize")) {
    const help = appearance.querySelector(":scope > .help");
    if (help) {
      help.textContent =
        "文字サイズはシークバーまたは数値で変更できます。";
    }

    const automatic = createSwitch(
      "autoSize",
      "画面サイズに合わせて自動調整",
      "端末幅に合わせて現在時刻とタイマーを拡大・縮小します。"
    );
    fields.querySelector(".seg")?.after(automatic);

    ["clockSize", "timerSize", "targetSize", "subSize"]
      .forEach(addRangeToNumber);

    const sizeGrid = $("clockSize")?.closest(".two");
    if (sizeGrid) {
      sizeGrid.classList.add("sizeGrid");
      const customSize = document.createElement("label");
      customSize.className = "field sizeControl";
      customSize.innerHTML = `
        <span class="label">追加文字（px）</span>
        <div class="range">
          <input id="customTextSizeRange" type="range"
            min="12" max="100" step="1">
          <input id="customTextSize" type="number"
            min="12" max="100" step="1">
        </div>`;
      sizeGrid.append(customSize);
    }

    const note = document.createElement("p");
    note.className = "help compact";
    note.textContent =
      "自動調整がオンでも、各数値を基準にして画面へ収まる範囲で調整します。";
    fields.append(note);
  }
}

export function extraControls() {
  const ids = [
    "showTimerDetailsRow",
    "showTimerDetails",
    "customTextField",
    "customText",
    "autoSize",
    "clockSizeRange",
    "timerSizeRange",
    "targetSizeRange",
    "customTextSizeRange",
    "customTextSize",
    "subSizeRange"
  ];

  return Object.fromEntries(ids.map(id => [id, $(id)]));
}

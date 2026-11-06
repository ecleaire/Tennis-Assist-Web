import {
  alarmOffsets, describeAlarmOffset, formatAlarmStamp, nextAlarmStamp,
  MAX_ALARM_OFFSET_SEC
} from "./alarm-timing.js?v=20261106a";

const $ = id => document.getElementById(id);

export function installAlarmTimingSettings() {
  const basic = $("basicAlarmCard")?.querySelector(".basicSettingsCardBody");
  const audio = document.querySelector('[data-settings-category="audio"] .detailSettingsCategoryBody');
  if (!basic || !audio || $("alarmTimingEditor")) return;
  const summary = document.createElement("div");
  summary.id = "alarmTimingSummary";
  summary.className = "alarmTimingSummary";
  basic.insertBefore(summary, basic.querySelector(".quickAudioActions"));
  const editor = document.createElement("section");
  editor.id = "alarmTimingEditor";
  editor.className = "detailSettingsGroup alarmTimingEditor";
  editor.innerHTML = `
    <div class="detailSettingsGroupHead"><h3 class="detailSettingsGroupTitle">音が鳴るタイミング</h3>
    <p class="detailSettingsGroupDescription">指定時刻の前・ちょうど・後を秒単位で変更できます。時刻はすべて日本時間です。</p></div>
    <p class="help compact">この画面を開いている間、指定時刻タイマーモードで毎日通知します。自動の大会表示中も有効ですが、大会専用モードでは鳴りません。終了後の通知は、終了メッセージの表示時間とは独立しています。</p>
    <div id="alarmTimingList" class="alarmTimingList"></div>
    <div class="alarmTimingAdd">
      <h4>通知を追加</h4>
      <div class="alarmTimingInputs">
        <label class="field"><span class="label">前・ちょうど・後</span><select id="alarmTimingDirection"><option value="before">指定時刻の前</option><option value="at">指定時刻ちょうど</option><option value="after">指定時刻の後</option></select></label>
        <label class="field"><span class="label">分</span><input id="alarmTimingMinutes" type="number" required min="0" max="1440" step="1" value="1"></label>
        <label class="field"><span class="label">秒</span><input id="alarmTimingSeconds" type="number" required min="0" max="59" step="1" value="0"></label>
      </div>
      <small class="help compact">前後24時間以内。重複する時刻は登録できません。音の種類と音量は基本設定で共通に設定します。</small>
      <button type="button" class="btn" id="addAlarmTiming">このタイミングを追加</button>
      <p id="alarmTimingError" role="alert" class="alarmTimingError"></p>
    </div>
    <label class="field"><span class="label">遅れた通知を鳴らす期限（秒）</span><input id="alarmCatchUpSec" type="number" required min="1" max="300" step="1"><small class="help compact">画面復帰などで通知が遅れた場合、ここで指定した秒数以内だけ鳴らします。複数の通知を通過したときは1回にまとめます。起動前や設定変更前に過ぎた通知は鳴らしません。</small></label>
    <p class="help compact">音が鳴るのは登録した通知と「音声テスト」のみです。画面タップ・設定変更・大会表示への切り替えでは音は鳴りません。通知オフでも音声テストは再生します。最初に「音声テスト・有効化」を押してください。端末のスリープ中は通知できない場合があります。</p>`;
  audio.prepend(editor);
  const leadLabel = $("customLead")?.closest(".field")?.querySelector(":scope > .label");
  if (leadLabel) leadLabel.textContent = "分前の通知を簡単に追加";
}

function readOffset(direction, minutes, seconds) {
  if (direction.value === "at") return 0;
  for (const input of [minutes, seconds]) {
    input.setCustomValidity("");
    if (input.value === "" || !input.checkValidity()) {
      input.reportValidity();
      return null;
    }
  }
  const total = Number(minutes.value) * 60 + Number(seconds.value);
  if (total < 1 || total > MAX_ALARM_OFFSET_SEC) {
    seconds.setCustomValidity("1秒以上、合計24時間以内で設定してください。");
    seconds.reportValidity();
    return null;
  }
  return direction.value === "before" ? -total : total;
}

function toggleDuration(direction, minutes, seconds) {
  minutes.disabled = seconds.disabled = direction.value === "at";
}

export function createAlarmTimingController({ getSettings, setSettings }) {
  const list = $("alarmTimingList");
  const summary = $("alarmTimingSummary");
  const addDirection = $("alarmTimingDirection");
  const addMinutes = $("alarmTimingMinutes");
  const addSeconds = $("alarmTimingSeconds");
  if (!list || !summary || !addDirection || !addMinutes || !addSeconds) return { render() {} };
  let signature = "";

  const summaryText = document.createElement("p");
  const detailsLink = document.createElement("button");
  detailsLink.type = "button";
  detailsLink.className = "btn";
  detailsLink.textContent = "通知タイミングを編集";
  detailsLink.onclick = () => {
    $("advancedSettingsAccordion").open = true;
    document.querySelector('[data-settings-category="audio"]').open = true;
    $("alarmTimingEditor").scrollIntoView({ block: "start" });
    $("alarmTimingDirection").focus({ preventScroll: true });
  };
  summary.append(summaryText, detailsLink);

  function refreshTimes() {
    const settings = getSettings();
    const now = Date.now();
    const offsets = alarmOffsets(settings);
    const schedule = new Map(offsets.map(offset => [offset, nextAlarmStamp(settings.targetTime, offset, now)]));
    const next = offsets.map(offset => ({ offset, at: schedule.get(offset) })).sort((a, b) => a.at - b.at)[0];
    summaryText.textContent = !settings.alarmEnabled ? "通知音：オフ（設定は保持されます）" :
      settings.mode !== "timer" ? "通知音：大会専用モードのため停止中" :
      !next ? "通知音：有効なタイミングがありません" :
      `次の通知予定：${formatAlarmStamp(next.at)}（${describeAlarmOffset(next.offset)}・日本時間）`;
    for (const row of list.children) {
      const offset = Number(row.dataset.offsetSec);
      const label = !settings.alarmEnabled ? "設定上の予定（通知音オフ）" : settings.mode !== "timer" ? "設定上の予定（大会専用のため停止中）" : "次回通知予定";
      row.querySelector("output").textContent = `${label}：${formatAlarmStamp(schedule.get(offset))}（日本時間）`;
    }
  }

  function createRow(offset, index) {
    const row = document.createElement("div");
    row.className = "alarmTimingRow";
    row.dataset.offsetSec = offset;
    row.innerHTML = `<strong></strong><div class="alarmTimingInputs">
      <label class="field"><span class="label">前・ちょうど・後</span><select data-field="direction"><option value="before">指定時刻の前</option><option value="at">指定時刻ちょうど</option><option value="after">指定時刻の後</option></select></label>
      <label class="field"><span class="label">分</span><input data-field="minutes" type="number" required min="0" max="1440" step="1"></label>
      <label class="field"><span class="label">秒</span><input data-field="seconds" type="number" required min="0" max="59" step="1"></label>
      </div><output></output><button type="button" class="btn alarmTimingRemove">削除</button>`;
    row.querySelector("strong").textContent = describeAlarmOffset(offset);
    const direction = row.querySelector("select");
    const minutes = row.querySelector('[data-field="minutes"]');
    const seconds = row.querySelector('[data-field="seconds"]');
    direction.value = offset < 0 ? "before" : offset > 0 ? "after" : "at";
    minutes.value = Math.floor(Math.abs(offset) / 60);
    seconds.value = Math.abs(offset) % 60;
    for (const element of [direction, minutes, seconds]) {
      element.setAttribute("aria-label", `通知${index + 1}：${element.closest("label").querySelector(".label").textContent}`);
      element.oninput = () => { seconds.setCustomValidity(""); element.setCustomValidity(""); };
      element.onchange = () => {
        if (element === direction && direction.value !== "at" && Number(minutes.value) * 60 + Number(seconds.value) === 0) minutes.value = 1;
        toggleDuration(direction, minutes, seconds);
        const updated = readOffset(direction, minutes, seconds);
        if (updated === null) return;
        const offsets = alarmOffsets(getSettings());
        if (updated !== offset && offsets.includes(updated)) {
          element.setCustomValidity("同じタイミングが登録されています。");
          element.reportValidity();
          return;
        }
        const field = element.dataset.field;
        setSettings({ alarmOffsetsSec: offsets.map(value => value === offset ? updated : value) }, { quiet: true });
        if (document.activeElement === document.body) {
          list.querySelector(`[data-offset-sec="${updated}"] [data-field="${field}"]`)?.focus({ preventScroll: true });
        }
      };
    }
    toggleDuration(direction, minutes, seconds);
    const remove = row.querySelector("button");
    remove.setAttribute("aria-label", `${describeAlarmOffset(offset)}の通知を削除`);
    remove.onclick = () => {
      setSettings({ alarmOffsetsSec: alarmOffsets(getSettings()).filter(value => value !== offset) }, { quiet: true });
      $("addAlarmTiming").focus({ preventScroll: true });
    };
    return row;
  }

  addDirection.onchange = () => toggleDuration(addDirection, addMinutes, addSeconds);
  for (const input of [addMinutes, addSeconds]) input.oninput = () => {
    input.setCustomValidity(""); addSeconds.setCustomValidity(""); $("alarmTimingError").textContent = "";
  };
  $("addAlarmTiming").onclick = () => {
    const offset = readOffset(addDirection, addMinutes, addSeconds);
    if (offset === null) return;
    const offsets = alarmOffsets(getSettings());
    const error = $("alarmTimingError");
    if (offsets.includes(offset)) { error.textContent = "同じタイミングが登録されています。"; return; }
    error.textContent = "";
    setSettings({ alarmOffsetsSec: [...offsets, offset] }, { quiet: true });
  };
  $("alarmCatchUpSec").onchange = event => {
    if (!event.target.checkValidity() || event.target.value === "") {
      event.target.reportValidity(); return;
    }
    setSettings({ alarmCatchUpSec: Number(event.target.value) }, { quiet: true });
  };
  function render() {
    const offsets = alarmOffsets(getSettings());
    const nextSignature = JSON.stringify(offsets);
    if (signature !== nextSignature) {
      list.replaceChildren(...offsets.map(createRow));
      if (!offsets.length) list.textContent = "通知は登録されていません。下の欄から追加してください。";
      signature = nextSignature;
    }
    $("alarmCatchUpSec").value = getSettings().alarmCatchUpSec;
    refreshTimes();
  }
  // Update the next occurrence without rebuilding focused editing controls.
  window.setInterval(() => {
    if (!document.hidden && $("overlay").classList.contains("open")) refreshTimes();
  }, 1000);
  return { render };
}

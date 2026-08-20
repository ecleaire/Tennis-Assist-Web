export function installCompletionAutoWroSetting() {
  if (document.getElementById("autoWroDuringCompletion")) return;

  const container = document.getElementById("autoWroSettings");
  if (!container) return;

  const row = document.createElement("div");
  row.id = "autoWroDuringCompletionRow";
  row.className = "switch completionAutoWroSwitch";
  row.innerHTML = `
    <div class="switchCopy">
      <b>タイマー終了後も全国大会表示へ切り替える</b>
      <small>「お疲れ様でした」などの終了メッセージ表示中も、設定した間隔で全国大会カウントダウンを表示します。初期設定はオフです。</small>
    </div>
    <label class="toggle">
      <input id="autoWroDuringCompletion" type="checkbox">
      <span></span>
    </label>`;

  const timingFields = container.querySelector(".two");
  if (timingFields) {
    timingFields.before(row);
  } else {
    container.append(row);
  }
}

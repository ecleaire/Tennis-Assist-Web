const POSITION_OPTIONS = [
  ["top-left", "↖", "左上"],
  ["top-center", "↑", "中央上"],
  ["top-right", "↗", "右上"],
  ["middle-left", "←", "左"],
  ["center", "●", "中央"],
  ["middle-right", "→", "右"],
  ["bottom-left", "↙", "左下"],
  ["bottom-center", "↓", "中央下"],
  ["bottom-right", "↘", "右下"]
];

function positionGrid(prefix) {
  return `
<div class="positionGrid" role="radiogroup" aria-label="配置位置">
  ${POSITION_OPTIONS.map(([value, mark, label]) => `
  <label class="positionChoice" title="${label}">
    <input type="radio" name="${prefix}Position" value="${value}" aria-label="${label}">
    <span><b>${mark}</b><small>${label}</small></span>
  </label>`).join("")}
</div>`;
}

function positionEditor(prefix, title, description) {
  return `
<div class="positionEditor">
  <div class="positionEditorHead">
    <b>${title}</b>
    <small>${description}</small>
  </div>
  ${positionGrid(prefix)}
  <div class="offsetGrid">
    <label class="field">
      <span class="label">横方向 X（px）</span>
      <input id="${prefix}OffsetX" type="number" min="-1000" max="1000" step="1">
    </label>
    <label class="field">
      <span class="label">縦方向 Y（px）</span>
      <input id="${prefix}OffsetY" type="number" min="-1000" max="1000" step="1">
    </label>
  </div>
</div>`;
}

// Build the settings dialog when the page starts.
export function buildSettings() {
  document.getElementById("settingsRoot").innerHTML = `
<section class="section"><h2>表示モード</h2><p class="help">タイマーと全国大会カウントダウンを切り替えます。</p><div class="fields">
<div class="seg"><label><input type="radio" name="mode" value="timer" id="modeTimer"><span>指定時刻タイマー</span></label><label><input type="radio" name="mode" value="wro" id="modeWro"><span>全国大会まで</span></label></div>
<label class="field" id="targetTimeField"><span class="label">指定時刻</span><input id="targetTime" type="time"></label>
<div class="switch" id="showTargetRow"><div class="switchCopy"><b>「何時まで」を表示</b><small>目標時刻をタイマー画面に表示します。</small></div><label class="toggle"><input id="showTarget" type="checkbox"><span></span></label></div>
<div class="switch" id="showHourMinuteRow"><div class="switchCopy"><b>「あと00時間00分」を表示</b><small>大きなタイマー下の補足表示を切り替えます。</small></div><label class="toggle"><input id="showHourMinute" type="checkbox"><span></span></label></div>
<label class="field" id="timerTextField"><span class="label">タイマー画面に追加する文字</span><textarea id="timerTextInput" rows="3" maxlength="160" placeholder="例：競技終了まで残り {残り時間}"></textarea><small class="help compact">空欄で非表示。{残り時間} → 00:00:00、{時分} → 00時間00分、{目標時刻} → 14:00 に置き換えられます。</small></label>
<div class="autoWro" id="autoWroSettings"><div class="switch"><div class="switchCopy"><b>全国大会カウントダウンを自動表示</b><small>タイマー使用中に一定間隔で大会表示へ切り替えます。</small></div><label class="toggle"><input id="autoWroEnabled" type="checkbox"><span></span></label></div><div class="two"><label class="field"><span class="label">切り替える間隔（分）</span><input id="autoWroInterval" type="number" min="1" max="1440" step="1"></label><label class="field"><span class="label">大会表示を続ける時間（分）</span><input id="autoWroDuration" type="number" min="0.1" max="60" step="0.1"></label></div><p class="help compact">初期設定では5分ごとに大会表示へ切り替え、1分後にタイマーへ戻ります。</p></div>
</div></section>

<section class="section"><h2>外観</h2><p class="help">シークバーまたは数値入力で文字サイズを変更できます。</p><div class="fields"><div class="seg"><label><input type="radio" name="theme" value="dark" id="themeDark"><span>ダーク</span></label><label><input type="radio" name="theme" value="light" id="themeLight"><span>ライト</span></label></div>
<div class="switch"><div class="switchCopy"><b>画面サイズに合わせて自動調整</b><small>設定値を基準に、スマホでは数字をできるだけ大きく表示します。</small></div><label class="toggle"><input id="autoSize" type="checkbox"><span></span></label></div>
<div class="sizeControls">
<label class="field sizeControl"><span class="label">現在時刻（px）</span><div class="range"><input id="clockSizeRange" type="range" min="20" max="180" step="1"><input id="clockSize" type="number" min="20" max="180"></div></label>
<label class="field sizeControl"><span class="label">タイマー（px）</span><div class="range"><input id="timerSizeRange" type="range" min="36" max="260" step="1"><input id="timerSize" type="number" min="36" max="260"></div></label>
<label class="field sizeControl"><span class="label">目標時刻（px）</span><div class="range"><input id="targetSizeRange" type="range" min="12" max="100" step="1"><input id="targetSize" type="number" min="12" max="100"></div></label>
<label class="field sizeControl"><span class="label">補足表示（px）</span><div class="range"><input id="subSizeRange" type="range" min="12" max="80" step="1"><input id="subSize" type="number" min="12" max="80"></div></label>
<label class="field sizeControl wide"><span class="label">追加文字（px）</span><div class="range"><input id="timerTextSizeRange" type="range" min="12" max="100" step="1"><input id="timerTextSize" type="number" min="12" max="100"></div></label>
</div><p class="help compact">自動調整中もシークバーの値が基準になります。秒表示が画面から切れる場合は自動で縮小します。</p></div></section>

<section class="section positionSection">
  <h2>PC・横画面の配置</h2>
  <p class="help">PCやスマホ横画面では、現在時刻・タイマー・全国大会カウントダウンを9か所から選べます。スマホ縦画面では従来の縦配置を使用します。</p>
  <div class="positionEditors">
    ${positionEditor("clock", "現在時刻", "初期位置：右下")}
    ${positionEditor("timer", "タイマー", "初期位置：右上")}
    ${positionEditor("wro", "全国大会カウントダウン", "初期位置：左上")}
  </div>
  <p class="help compact">Xはプラスで右、マイナスで左へ移動します。Yはプラスで下、マイナスで上へ移動します。変更内容を含むすべての設定は、この端末へ自動保存されます。</p>
</section>

<section class="section"><h2>ノイズ演出</h2><p class="help">初期設定は強めです。強さ・パターン・自動再生間隔を変更できます。</p><div class="fields"><label class="field"><span class="label">ノイズの強さ</span><div class="range"><input id="noiseRange" type="range" min="0" max="100"><input id="noiseStrength" type="number" min="0" max="100"></div></label><label class="field"><span class="label">パターン</span><select id="noisePattern"><option value="random">ランダム</option><option value="horizontal">横走査線</option><option value="diagonal">斜線</option><option value="blocks">ブロック</option><option value="grid">グリッド</option><option value="digital">デジタル</option><option value="scanline">密な横縞</option></select></label><div class="two"><label class="field"><span class="label">自動再生間隔（分）</span><input id="noiseInterval" type="number" min="0" max="180" step="0.5"><small class="help compact">0で停止。初期値は3分です。</small></label><label class="field"><span class="label">文字行の間隔（ms）</span><input id="lineGap" type="number" min="0" max="1000" step="10"></label></div><div class="previewBox" id="noisePreviewStage"><div class="previewNoiseLayer" id="previewNoiseLayer"></div><span class="previewText glitch" id="previewText">GLITCH PREVIEW</span></div><button class="btn" id="noisePreview" type="button">ノイズをプレビュー</button></div></section>

<section class="section"><h2>タイマー音</h2><p class="help">指定時刻と、選択した事前通知のタイミングで鳴らします。</p><div class="fields"><div class="switch"><div class="switchCopy"><b>アラームを使用</b><small>最初に音声テストを押してください。</small></div><label class="toggle"><input id="alarmEnabled" type="checkbox"><span></span></label></div><div class="checks"><label class="check"><input id="atTarget" type="checkbox"><span>指定時刻ちょうど</span></label><label class="check"><input class="leadPreset" type="checkbox" value="5"><span>5分前</span></label><label class="check"><input class="leadPreset" type="checkbox" value="10"><span>10分前</span></label><label class="check"><input class="leadPreset" type="checkbox" value="30"><span>30分前</span></label></div><div class="field"><span class="label">別の事前通知を追加</span><div class="addRow"><input id="customLead" type="number" min="1" max="1440" placeholder="例：15"><button class="btn" id="addLead" type="button">追加</button></div><div class="chips" id="leadChips"></div></div><label class="field"><span class="label">音の種類</span><select id="soundType"><option value="bell">1. ベル</option><option value="chime">2. チャイム</option><option value="digital">3. デジタルビープ</option><option value="alarm">4. 繰り返しアラーム</option><option value="doubleBell">5. ダブルベル</option><option value="school">6. スクールチャイム</option><option value="softPing">7. ソフトピン</option><option value="siren">8. 緊急サイレン</option><option value="pulse">9. カウントダウンパルス</option><option value="robot">10. ロボットシグナル</option><option value="custom">指定した音声ファイル</option></select></label><label class="field"><span class="label">音量</span><div class="range"><input id="volumeRange" type="range" min="0" max="100"><input id="volume" type="number" min="0" max="100"></div></label><div class="field"><span class="label">任意の音声ファイル</span><label class="fileBox" for="audioFile"><span class="fileName" id="fileName">ファイル未選択</span><b>選択</b></label><input class="fileInput" id="audioFile" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"><small class="help compact">外部へ送信せず、この端末に保存します。20MBまで。</small></div><div class="audioActions"><button class="primary" id="testSound" type="button">音声テスト・有効化</button><button class="btn" id="removeAudio" type="button">指定音声を削除</button></div><div class="audioStatus" id="audioStatus">音声はまだ有効化されていません。</div></div></section>
<div class="actions"><button class="btn" id="reset" type="button">初期設定に戻す</button><button class="primary" id="done" type="button">設定を閉じる</button></div>`;
}

export const $ = id => document.getElementById(id);

export function refs() {
  return {
    app: $("app"), shell: $("shell"), top: $("top"),
    currentBlock: $("currentBlock"), clock: $("clock"), date: $("date"),
    modeLabel: $("modeLabel"), targetLabel: $("targetLabel"),
    timerText: $("timerText"), mainValue: $("mainValue"),
    subValue: $("subValue"), status: $("status"), foot: $("foot"),
    display: $("display"), overlay: $("overlay"), gear: $("gear"),
    soundBadge: $("soundBadge"), noiseLayer: $("noiseLayer"),
    audioPlayer: $("audioPlayer"), audioStatus: $("audioStatus"),
    metaTheme: document.querySelector('meta[name="theme-color"]'),
    previewStage: $("noisePreviewStage"), previewText: $("previewText"),
    previewNoiseLayer: $("previewNoiseLayer")
  };
}

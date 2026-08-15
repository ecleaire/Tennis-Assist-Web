document.body.innerHTML = `
<div class="app" id="app" data-theme="dark">
  <div class="noiseLayer" id="noiseLayer" aria-hidden="true"></div>
  <div class="shell" id="shell">
    <header class="top" id="top">
      <div class="currentBlock" id="currentBlock">
        <p class="eyebrow currentTimeLabel" id="currentTimeLabel">現在時刻</p>
        <p class="clock" id="clock">--:--:--</p>
        <div class="date" id="date">----</div>
      </div>
      <div class="topActions">
        <span class="badge" id="soundBadge">SOUND LOCKED</span>
        <button class="gear" id="gear" type="button" aria-label="設定を開く" aria-expanded="false">⚙</button>
      </div>
    </header>
    <main class="display" id="display" aria-live="polite">
      <p class="mode glitch" id="modeLabel">COUNTDOWN TIMER</p>
      <p class="target glitch" id="targetLabel">20:30 まで</p>
      <p class="wroSuffix glitch" id="wroSuffix" hidden></p>
      <p class="timerText glitch" id="timerText" hidden></p>
      <p class="mainValue glitch" id="mainValue">--:--:--</p>
      <p class="sub glitch" id="subValue">残り時間を計算中</p>
    </main>
    <footer class="foot" id="foot">
      <span>画面をタップするとグリッチ・ワイプを再生</span>
      <span id="status">設定を読み込んでいます</span>
    </footer>
  </div>
  <div class="overlay" id="overlay" aria-hidden="true"></div>
</div>`;

import("./entry-settings.js?v=20260815d");

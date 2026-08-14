const overlay = document.getElementById("overlay");
overlay.innerHTML = `
<section class="panel" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
  <header class="panelHead">
    <div>
      <p>DISPLAY / TIMER SETTINGS</p>
      <h1 id="settingsTitle">設定</h1>
    </div>
    <button class="close" id="close" type="button" aria-label="設定を閉じる">×</button>
  </header>
  <div class="settings" id="settingsRoot"></div>
</section>`;

const player = document.createElement("audio");
player.id = "audioPlayer";
player.preload = "auto";
document.getElementById("app").append(player);

import("./main.js?v=20260814p");

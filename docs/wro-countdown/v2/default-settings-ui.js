function positionDescription(name, text) {
  const input = document.querySelector(`input[name="${name}Position"]`);
  const description = input
    ?.closest(".positionEditor")
    ?.querySelector(".positionEditorHead small");

  if (description) description.textContent = text;
}

export function installDefaultSettingsUi() {
  positionDescription("clock", "初期位置：右上");
  positionDescription("timer", "初期位置：中央");
  positionDescription("wro", "初期位置：中央");

  const checks = document.getElementById("atTarget")?.closest(".checks");
  if (!checks || checks.querySelector('.leadPreset[value="60"]')) return;

  const oneHour = document.createElement("label");
  oneHour.className = "check";
  oneHour.innerHTML = `
    <input class="leadPreset" type="checkbox" value="60">
    <span>1時間前</span>`;
  checks.append(oneHour);
}

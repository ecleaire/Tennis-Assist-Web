import { PRESET_LEADS } from "./config.js?v=20260815i";

export function renderLeadChips(container, settings, setSettings) {
  container.replaceChildren();

  settings.leadTimes
    .filter(minutes => !PRESET_LEADS.includes(minutes))
    .forEach(minutes => {
      const chip = document.createElement("span");
      const text = document.createElement("span");
      const remove = document.createElement("button");

      chip.className = "chip";
      text.textContent = `${minutes}分前`;
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `${minutes}分前の通知を削除`);
      remove.onclick = () => {
        setSettings(
          {
            leadTimes: settings.leadTimes.filter(value => value !== minutes)
          },
          { quiet: true }
        );
      };

      chip.append(text, remove);
      container.append(chip);
    });
}

import { SOUND_CATALOG } from "./sound-catalog.js?v=20260815h";

export function installSoundOptions() {
  const select = document.getElementById("soundType");
  if (!select) return;

  const groups = new Map();
  for (const sound of SOUND_CATALOG) {
    if (!groups.has(sound.group)) groups.set(sound.group, []);
    groups.get(sound.group).push(sound);
  }

  const fragment = document.createDocumentFragment();
  for (const [label, sounds] of groups) {
    const group = document.createElement("optgroup");
    group.label = label;

    for (const sound of sounds) {
      const option = document.createElement("option");
      option.value = sound.key;
      option.textContent = sound.label;
      group.append(option);
    }

    fragment.append(group);
  }

  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = "指定した音声ファイル";
  fragment.append(custom);

  select.replaceChildren(fragment);
}

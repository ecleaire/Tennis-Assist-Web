const LABELABLE_SELECTOR =
  'input:not([type="hidden"]), select, textarea, button';

function controlSuffix(control) {
  if (control instanceof HTMLSelectElement) return "選択";
  if (control instanceof HTMLTextAreaElement) return "文字入力";
  if (control instanceof HTMLButtonElement) return "ボタン";

  switch (control.type) {
    case "range": return "スライダー";
    case "number": return "数値入力";
    case "color": return "カラーピッカー";
    case "time": return "時刻入力";
    case "file": return "ファイル選択";
    default: return "入力";
  }
}

function fieldName(label) {
  return label.querySelector(":scope > .label")?.textContent?.trim() ||
    label.querySelector(":scope > .switchCopy b")?.textContent?.trim() ||
    label.getAttribute("aria-label") ||
    "設定";
}

function directlyOwnedControls(label) {
  return [...label.querySelectorAll(LABELABLE_SELECTOR)]
    .filter(control => control.closest("label") === label);
}

function replaceWithGroup(label, controls) {
  const group = document.createElement("div");

  for (const attribute of label.attributes) {
    if (attribute.name !== "for") {
      group.setAttribute(attribute.name, attribute.value);
    }
  }

  while (label.firstChild) group.append(label.firstChild);
  label.replaceWith(group);

  const name = fieldName(group);
  group.dataset.compositeField = "true";
  group.setAttribute("role", "group");
  if (!group.hasAttribute("aria-label")) group.setAttribute("aria-label", name);

  controls.forEach((control, index) => {
    if (!control.hasAttribute("aria-label") &&
        !control.hasAttribute("aria-labelledby")) {
      control.setAttribute(
        "aria-label",
        `${name}の${controlSuffix(control)}${controls.length > 2 ? ` ${index + 1}` : ""}`
      );
    }
  });

  return group;
}

/**
 * A HTML label may label only one form control. Several settings were built as
 * one label containing a range and number input, or a color picker and text
 * input. Real mouse/touch interactions can then be forwarded to the wrong
 * control even though programmatic input-event tests pass.
 *
 * Convert every such composite label to an accessible neutral group while
 * keeping ordinary single-control labels intact.
 */
export function installSettingsFormIntegrity(root = document.getElementById("settingsRoot")) {
  if (!root) return [];

  const upgraded = [];
  for (const label of [...root.querySelectorAll("label")]) {
    const controls = directlyOwnedControls(label);
    if (controls.length <= 1) continue;
    upgraded.push(replaceWithGroup(label, controls));
  }

  root.dataset.compositeFieldsUpgraded = String(upgraded.length);
  return upgraded;
}

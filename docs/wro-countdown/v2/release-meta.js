export const APP_VERSION = "1.1.0";
export const APP_UPDATED_AT = "2026年9月26日";

export function applyReleaseMeta() {
  const root = document.querySelector(".settingsVersion");
  if (!root) return;

  const version = root.querySelector("strong");
  const updated = root.querySelector("small");
  if (version) version.textContent = `v${APP_VERSION}`;
  if (updated) updated.textContent = `更新日：${APP_UPDATED_AT}`;
}

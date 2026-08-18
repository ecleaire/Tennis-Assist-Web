import {
  SETTINGS_KEY,
  OLD_SETTINGS_KEY
} from "./config-values.js?v=20260815i";
import { normalize } from "./config-normalize.js?v=20260815i";

export function load() {
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (saved) return normalize(JSON.parse(saved));

    const legacy = localStorage.getItem(OLD_SETTINGS_KEY);
    if (legacy) return normalize(JSON.parse(legacy));
  } catch (error) {
    console.warn(error);
  }
  return normalize();
}

export function save(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn(error);
  }
}

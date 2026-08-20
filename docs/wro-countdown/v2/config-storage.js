import {
  SETTINGS_KEY,
  OLD_SETTINGS_KEY
} from "./config-values.js?v=20260820b";
import { normalize } from "./config-normalize.js?v=20260821a";

function read(key) {
  const source = localStorage.getItem(key);
  if (!source) return null;

  try {
    return normalize(JSON.parse(source));
  } catch (error) {
    console.warn(`Could not read saved WRO settings from ${key}.`, error);
    try {
      localStorage.removeItem(key);
    } catch (removeError) {
      console.warn("Could not remove invalid WRO settings.", removeError);
    }
    return null;
  }
}

export function load() {
  try {
    return read(SETTINGS_KEY) || read(OLD_SETTINGS_KEY) || normalize();
  } catch (error) {
    console.warn("Could not access saved WRO settings.", error);
    return normalize();
  }
}

export function save(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.warn("Could not save WRO settings.", error);
    return false;
  }
}

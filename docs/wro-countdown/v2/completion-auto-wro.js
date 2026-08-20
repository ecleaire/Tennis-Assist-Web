export function shouldPauseAutomaticWro(settings, completionActive) {
  return Boolean(
    settings.mode === "timer" &&
    completionActive &&
    !settings.autoWroDuringCompletion
  );
}

export function shouldDisplayAutomaticWro(
  settings,
  completionActive,
  automaticActive
) {
  return Boolean(
    automaticActive &&
    (!completionActive || settings.autoWroDuringCompletion)
  );
}

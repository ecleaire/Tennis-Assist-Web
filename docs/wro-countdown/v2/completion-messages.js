export const MAX_COMPLETION_MESSAGES = 12;
export const MAX_COMPLETION_MESSAGE_LENGTH = 160;

function sanitizeMessage(value) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .slice(0, MAX_COMPLETION_MESSAGE_LENGTH)
    .trim();
}

export function normalizeCompletionMessages(
  messages,
  legacyMessage,
  fallbackMessages = ["お疲れ様でした"]
) {
  const legacy = sanitizeMessage(legacyMessage);
  const fallbackSource = Array.isArray(fallbackMessages)
    ? fallbackMessages
    : [fallbackMessages];
  const fallbackFirst = sanitizeMessage(fallbackSource[0]);
  let source;

  if (Array.isArray(messages)) {
    source = [...messages];
    const currentFirst = sanitizeMessage(source[0]);
    // completionText is retained as a compatibility alias. If older code
    // explicitly changed it, treat that value as an edit to the first item.
    // A missing alias is normalized to the default, so do not let that default
    // overwrite an already saved custom sequence.
    if (
      legacy &&
      currentFirst !== legacy &&
      (!currentFirst || legacy !== fallbackFirst)
    ) {
      source[0] = legacy;
    }
  } else if (legacy) {
    source = [legacy];
  } else {
    source = fallbackSource;
  }

  const normalized = source
    .slice(0, MAX_COMPLETION_MESSAGES)
    .map(sanitizeMessage)
    .filter(Boolean);

  if (normalized.length) return normalized;

  const fallback = fallbackSource
    .slice(0, MAX_COMPLETION_MESSAGES)
    .map(sanitizeMessage)
    .filter(Boolean);

  return fallback.length ? fallback : ["お疲れ様でした"];
}

export function completionMessageAt(
  messages,
  elapsedMilliseconds,
  intervalSeconds
) {
  const normalized = normalizeCompletionMessages(messages, "");
  const interval = Math.max(1, Number(intervalSeconds) || 10) * 1000;
  const elapsed = Math.max(0, Number(elapsedMilliseconds) || 0);
  const index = Math.floor(elapsed / interval) % normalized.length;
  const cycleElapsed = elapsed % interval;

  return {
    text: normalized[index],
    index,
    count: normalized.length,
    intervalMilliseconds: interval,
    nextSwitchIn: normalized.length > 1
      ? Math.max(0, interval - cycleElapsed)
      : 0
  };
}

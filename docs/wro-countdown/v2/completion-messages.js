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

  // Once the new array exists it is the canonical source. completionText is
  // kept only as a compatibility alias for older saved data and older callers.
  // Ignoring a mismatched alias prevents a delayed legacy input event from
  // collapsing or overwriting a multi-message sequence.
  const source = Array.isArray(messages)
    ? [...messages]
    : legacy
      ? [legacy]
      : fallbackSource;

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

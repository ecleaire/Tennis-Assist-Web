import {
  MAX_COMPLETION_MESSAGES,
  MAX_COMPLETION_MESSAGE_LENGTH,
  normalizeCompletionMessages
} from "./completion-messages.js?v=20260821b";

const DEFAULT_MESSAGE = "お疲れ様でした";
const COMMIT_DELAY = 140;

const $ = id => document.getElementById(id);

export function completionMessagesMarkup() {
  return `
<div class="completionMessagesEditor" id="completionMessagesEditor">
  <div class="completionMessagesHead">
    <div>
      <span class="label">タイマー終了後に表示するメッセージ</span>
      <small>上から順番に表示し、最後まで進むと先頭へ戻ります。</small>
    </div>
    <div class="completionMessagesHeadActions">
      <span id="completionMessageCount" class="completionMessageCount">1 / ${MAX_COMPLETION_MESSAGES}</span>
      <button id="addCompletionMessage" class="secondary completionMessageAdd" type="button">メッセージを追加</button>
    </div>
  </div>
  <div id="completionMessageList" class="completionMessageList"></div>
  <small class="help compact">メッセージは最大${MAX_COMPLETION_MESSAGES}件です。各メッセージは改行を含めて${MAX_COMPLETION_MESSAGE_LENGTH}文字まで入力できます。1件だけの場合は切り替わりません。</small>
</div>
<label class="field">
  <span class="label">メッセージの切り替え間隔（秒）</span>
  <input id="completionMessageIntervalSec" type="number" min="1" max="600" step="1" inputmode="numeric">
  <small class="help compact">初期値は10秒です。終了メッセージの表示時間中、設定した秒数ごとに次のメッセージへ切り替えます。</small>
</label>`;
}

function button(action, label, text, disabled = false) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = "completionMessageAction";
  element.dataset.action = action;
  element.setAttribute("aria-label", label);
  element.title = label;
  element.textContent = text;
  element.disabled = disabled;
  return element;
}

function card(message, index, count) {
  const article = document.createElement("article");
  article.className = "completionMessageCard";
  article.dataset.messageIndex = String(index);

  const head = document.createElement("div");
  head.className = "completionMessageCardHead";

  const title = document.createElement("strong");
  title.className = "completionMessageCardTitle";
  title.textContent = `メッセージ ${index + 1}`;

  const actions = document.createElement("div");
  actions.className = "completionMessageCardActions";
  actions.append(
    button("up", `${index + 1}番目のメッセージを上へ移動`, "↑", index === 0),
    button(
      "down",
      `${index + 1}番目のメッセージを下へ移動`,
      "↓",
      index === count - 1
    ),
    button(
      "remove",
      `${index + 1}番目のメッセージを削除`,
      "削除",
      count === 1
    )
  );
  head.append(title, actions);

  const textarea = document.createElement("textarea");
  textarea.className = "completionMessageInput";
  textarea.id = index === 0
    ? "completionTextInput"
    : `completionTextInput${index + 1}`;
  textarea.dataset.messageIndex = String(index);
  textarea.rows = 2;
  textarea.maxLength = MAX_COMPLETION_MESSAGE_LENGTH;
  textarea.placeholder = index === 0
    ? DEFAULT_MESSAGE
    : `例：メッセージ ${index + 1}`;
  textarea.value = message;
  textarea.setAttribute(
    "aria-label",
    `タイマー終了後に表示するメッセージ ${index + 1}`
  );

  article.append(head, textarea);
  return article;
}

function numericValue(input, fallback) {
  const value = Number(input.value);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(
    Number(input.max || 600),
    Math.max(Number(input.min || 1), Math.round(value))
  );
}

export function createCompletionMessagesController({
  getSettings,
  setSettings
}) {
  const editor = $("completionMessagesEditor");
  const list = $("completionMessageList");
  const add = $("addCompletionMessage");
  const count = $("completionMessageCount");
  const interval = $("completionMessageIntervalSec");

  let draftMessages = [];
  let commitTimer = 0;
  let lastRenderedSignature = "";

  function settingsMessages() {
    const settings = getSettings();
    return normalizeCompletionMessages(
      settings.completionMessages,
      settings.completionText,
      [DEFAULT_MESSAGE]
    );
  }

  function valuesFromDom() {
    return [...list.querySelectorAll(".completionMessageInput")]
      .map(input => input.value);
  }

  function updateCount() {
    const current = list.querySelectorAll(".completionMessageInput").length ||
      draftMessages.length || 1;
    count.textContent = `${current} / ${MAX_COMPLETION_MESSAGES}`;
    add.disabled = current >= MAX_COMPLETION_MESSAGES;
  }

  function renderList({ focusIndex = -1 } = {}) {
    const messages = draftMessages.length
      ? draftMessages
      : settingsMessages();
    list.replaceChildren(
      ...messages.map((message, index) =>
        card(message, index, messages.length)
      )
    );
    lastRenderedSignature = JSON.stringify(messages);
    updateCount();

    if (focusIndex >= 0) {
      const input = list.querySelector(
        `.completionMessageInput[data-message-index="${focusIndex}"]`
      );
      input?.focus();
      input?.setSelectionRange(input.value.length, input.value.length);
    }
  }

  function normalizedDraft() {
    // The rendered editor is authoritative while it exists. This prevents a
    // delayed blur/change callback with a stale one-item draft from replacing
    // a visible multi-message list after reorder or delete actions.
    const visibleMessages = valuesFromDom();
    if (visibleMessages.length) draftMessages = visibleMessages;

    return normalizeCompletionMessages(
      draftMessages,
      "",
      [DEFAULT_MESSAGE]
    );
  }

  function saveDraft({ rebuild = false } = {}) {
    window.clearTimeout(commitTimer);
    commitTimer = 0;
    const messages = normalizedDraft();

    // setSettings renders the whole settings panel synchronously. Record the
    // incoming signature first so that render() does not replace this list in
    // the middle of a blur/change/click sequence.
    lastRenderedSignature = JSON.stringify(messages);
    setSettings(
      {
        completionMessages: messages,
        completionText: messages[0]
      },
      { quiet: true }
    );

    if (rebuild) {
      draftMessages = [...messages];
      renderList();
    }
  }

  function scheduleSave() {
    window.clearTimeout(commitTimer);
    commitTimer = window.setTimeout(() => saveDraft(), COMMIT_DELAY);
  }

  list.addEventListener("input", event => {
    const input = event.target.closest(".completionMessageInput");
    if (!input) return;
    draftMessages = valuesFromDom();
    scheduleSave();
  });

  list.addEventListener("change", event => {
    const input = event.target.closest(".completionMessageInput");
    if (!input) return;
    draftMessages = valuesFromDom();
    saveDraft();
  });

  list.addEventListener("focusout", event => {
    if (!event.target.closest(".completionMessageInput")) return;
    window.setTimeout(() => {
      if (list.contains(document.activeElement)) return;
      draftMessages = settingsMessages();
      renderList();
    }, 0);
  });

  // Keep the textarea focused until the delegated click handler has captured
  // its current value. Otherwise the textarea change event can synchronously
  // rebuild the list and remove the button before its click event arrives.
  list.addEventListener("pointerdown", event => {
    if (event.target.closest("[data-action]")) event.preventDefault();
  });

  list.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    event.preventDefault();

    const cardElement = actionButton.closest(".completionMessageCard");
    const index = Number(cardElement?.dataset.messageIndex);
    if (!Number.isInteger(index)) return;

    window.clearTimeout(commitTimer);
    commitTimer = 0;
    draftMessages = valuesFromDom();
    const action = actionButton.dataset.action;
    let nextIndex = index;

    if (action === "remove" && draftMessages.length > 1) {
      draftMessages.splice(index, 1);
      nextIndex = Math.min(index, draftMessages.length - 1);
    } else if (action === "up" && index > 0) {
      [draftMessages[index - 1], draftMessages[index]] =
        [draftMessages[index], draftMessages[index - 1]];
      nextIndex = index - 1;
    } else if (action === "down" && index < draftMessages.length - 1) {
      [draftMessages[index + 1], draftMessages[index]] =
        [draftMessages[index], draftMessages[index + 1]];
      nextIndex = index + 1;
    } else {
      return;
    }

    const messages = normalizeCompletionMessages(
      draftMessages,
      "",
      [DEFAULT_MESSAGE]
    );
    draftMessages = [...messages];
    lastRenderedSignature = JSON.stringify(messages);
    setSettings(
      {
        completionMessages: messages,
        completionText: messages[0],
        __completionSequenceAction: action
      },
      { quiet: true }
    );
    renderList({ focusIndex: nextIndex });
  });

  add.onclick = () => {
    draftMessages = valuesFromDom();
    if (!draftMessages.length) draftMessages = settingsMessages();
    if (draftMessages.length >= MAX_COMPLETION_MESSAGES) return;
    draftMessages.push("");
    renderList({ focusIndex: draftMessages.length - 1 });
  };

  interval.oninput = () => {
    if (interval.value === "") {
      interval.setAttribute("aria-invalid", "true");
      return;
    }
    const value = Number(interval.value);
    const valid = Number.isFinite(value) && value >= 1 && value <= 600;
    interval.setAttribute("aria-invalid", valid ? "false" : "true");
    if (!valid) return;
    setSettings(
      { completionMessageIntervalSec: Math.round(value) },
      { quiet: true }
    );
  };

  interval.onchange = () => {
    const value = numericValue(
      interval,
      getSettings().completionMessageIntervalSec || 10
    );
    interval.value = String(value);
    interval.setAttribute("aria-invalid", "false");
    setSettings(
      { completionMessageIntervalSec: value },
      { quiet: true }
    );
  };

  interval.addEventListener("wheel", event => {
    if (document.activeElement === interval) event.preventDefault();
  }, { passive: false });

  function render() {
    const settings = getSettings();
    const activeInList = list.contains(document.activeElement);
    const messages = settingsMessages();
    const signature = JSON.stringify(messages);

    if (!activeInList && signature !== lastRenderedSignature) {
      draftMessages = [...messages];
      renderList();
    } else if (!list.children.length) {
      draftMessages = [...messages];
      renderList();
    } else {
      updateCount();
    }

    if (document.activeElement !== interval) {
      interval.value = String(settings.completionMessageIntervalSec);
      interval.setAttribute("aria-invalid", "false");
    }
  }

  editor.dataset.maxMessages = String(MAX_COMPLETION_MESSAGES);
  return { render };
}

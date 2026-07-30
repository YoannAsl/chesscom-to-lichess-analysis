(function () {
  "use strict";

  if (globalThis.chesscomToLichessContentScriptLoaded) return;
  globalThis.chesscomToLichessContentScriptLoaded = true;

  const { cleanGameRecord, createLichessAnalysisUrl, isSupportedGameUrl } =
    globalThis.ChesscomToLichess;

  const START_HANDOFF = "START_HANDOFF";
  const CONTENT_SCRIPT_READY = "CONTENT_SCRIPT_READY";
  const OPEN_LICHESS_ANALYSIS = "OPEN_LICHESS_ANALYSIS";
  const BUTTON_ID = "chesscom-to-lichess-button";
  const MESSAGE_ID = "chesscom-to-lichess-message";
  const WAIT_TIMEOUT_MS = 5_000;
  const MESSAGE_DURATION_MS = 4_000;

  let handoffInProgress = false;
  let messageTimer;
  let syncScheduled = false;

  function visible(element) {
    return element instanceof HTMLElement && element.getClientRects().length > 0;
  }

  function labelOf(element) {
    return [
      element.textContent,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function findControl(label, root = document) {
    const controls = root.querySelectorAll(
      'button, [role="button"], [role="tab"], a',
    );

    return [...controls].find(
      (control) => visible(control) && labelOf(control) === label,
    );
  }

  function findShareControl() {
    const exactMatch = findControl("Share");
    if (exactMatch) return exactMatch;

    return [...document.querySelectorAll('button, [role="button"]')].find(
      (control) =>
        visible(control) && /\bshare\b/i.test(labelOf(control)),
    );
  }

  function waitFor(findElement, message) {
    const current = findElement();
    if (current) return Promise.resolve(current);

    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const element = findElement();
        if (element) {
          clearTimeout(timeout);
          observer.disconnect();
          resolve(element);
        }
      });
      const timeout = setTimeout(() => {
        observer.disconnect();
        reject(new Error(message));
      }, WAIT_TIMEOUT_MS);

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    });
  }

  function showError(text) {
    clearTimeout(messageTimer);

    const previous = document.getElementById(MESSAGE_ID);
    previous?.remove();

    const message = document.createElement("div");
    message.id = MESSAGE_ID;
    message.setAttribute("role", "alert");
    message.textContent = text;
    document.body.append(message);

    messageTimer = setTimeout(() => message.remove(), MESSAGE_DURATION_MS);
  }

  function findSharePanel(element) {
    return element?.closest(
      '[role="dialog"], [aria-modal="true"], dialog, .modal-content',
    );
  }

  function findOpenPanel() {
    const panels = document.querySelectorAll(
      '[role="dialog"], [aria-modal="true"], dialog[open], .modal-content',
    );

    return [...panels].find(visible);
  }

  function findPgnTextArea(root = document) {
    return [...root.querySelectorAll("textarea")].find(
      (textarea) => visible(textarea) && textarea.value.includes("["),
    );
  }

  async function readGameRecordFromSharePanel() {
    const shareControl = findShareControl();
    if (!shareControl) {
      throw new Error("Chess.com’s Share control was not found.");
    }

    shareControl.click();

    let panel;

    try {
      const pgnControl = await waitFor(
        () => findControl("PGN"),
        "Chess.com’s PGN tab was not found.",
      );
      panel = findSharePanel(pgnControl);
      pgnControl.click();

      const textArea = await waitFor(
        () => findPgnTextArea(panel || document),
        "No game record was found.",
      );
      panel = findSharePanel(textArea) || panel;

      return textArea.value;
    } finally {
      closeSharePanel(panel || findOpenPanel());
    }
  }

  function closeSharePanel(panel) {
    if (!panel) return;

    const closeControl =
      panel.querySelector(
        'button[aria-label*="close" i], button[title*="close" i], [data-cy*="close" i]',
      ) || findControl("Close", panel);

    closeControl?.click();
  }

  async function startHandoff() {
    if (handoffInProgress) return;

    if (!isSupportedGameUrl(location.href)) {
      showError("Open a supported Chess.com game first.");
      return;
    }

    handoffInProgress = true;
    const pageButton = document.getElementById(BUTTON_ID);
    if (pageButton) pageButton.disabled = true;

    try {
      const pgn = await readGameRecordFromSharePanel();
      const cleanPgn = cleanGameRecord(pgn);
      const url = createLichessAnalysisUrl(cleanPgn);

      const response = await chrome.runtime.sendMessage({
        type: OPEN_LICHESS_ANALYSIS,
        url,
      });
      if (!response?.opened) {
        throw new Error("Lichess could not be opened.");
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "The handoff failed.",
      );
    } finally {
      handoffInProgress = false;
      if (pageButton?.isConnected) pageButton.disabled = false;
    }
  }

  function syncPageButton() {
    syncScheduled = false;
    const existing = document.getElementById(BUTTON_ID);

    if (!isSupportedGameUrl(location.href)) {
      existing?.remove();
      return;
    }

    const shareControl = findShareControl();
    if (!shareControl || existing) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Analyze on Lichess";
    button.addEventListener("click", startHandoff);
    shareControl.insertAdjacentElement("afterend", button);
  }

  function schedulePageButtonSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(syncPageButton);
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === CONTENT_SCRIPT_READY) {
      sendResponse({ ready: true });
      return;
    }

    if (message?.type === START_HANDOFF) {
      void startHandoff();
    }
  });

  new MutationObserver(schedulePageButtonSync).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  schedulePageButtonSync();
})();

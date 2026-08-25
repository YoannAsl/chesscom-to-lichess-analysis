(function () {
  "use strict";

  if (globalThis.chesscomToLichessContentScriptLoaded) return;
  globalThis.chesscomToLichessContentScriptLoaded = true;

  const {
    cleanGameRecord,
    createLichessAnalysisUrl,
    findPlayerColor,
    isSupportedGameUrl,
  } = globalThis.ChesscomToLichess;

  const START_HANDOFF = "START_HANDOFF";
  const CONTENT_SCRIPT_READY = "CONTENT_SCRIPT_READY";
  const OPEN_LICHESS_ANALYSIS = "OPEN_LICHESS_ANALYSIS";
  const OPEN_LICHESS_IMPORT = "OPEN_LICHESS_IMPORT";
  const BUTTON_ID = "chesscom-to-lichess-button";
  const REVIEW_BUTTON_ID = "chesscom-to-lichess-review-button";
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

  async function copyPgnToClipboard(pgn) {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(pgn);
        return;
      }
    } catch {}

    const textArea = document.createElement("textarea");
    textArea.value = pgn;
    textArea.setAttribute("readonly", "");
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.append(textArea);
    textArea.select();

    let copied = false;
    try {
      copied = document.execCommand("copy");
    } finally {
      textArea.remove();
    }

    if (!copied) {
      throw new Error("The PGN could not be copied to the clipboard.");
    }
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
    setPageButtonsDisabled(true);

    try {
      const pgn = await readGameRecordFromSharePanel();
      const cleanPgn = cleanGameRecord(pgn);
      const settings = await chrome.storage.sync
        .get({ chessComUsername: "" })
        .catch(() => ({ chessComUsername: "" }));
      const color = findPlayerColor(cleanPgn, settings.chessComUsername);
      const url = createLichessAnalysisUrl(cleanPgn, color);

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
      setPageButtonsDisabled(false);
    }
  }

  async function startReview() {
    if (handoffInProgress) return;

    if (!isSupportedGameUrl(location.href)) {
      showError("Open a supported Chess.com game first.");
      return;
    }

    handoffInProgress = true;
    setPageButtonsDisabled(true);

    try {
      const pgn = await readGameRecordFromSharePanel();
      const cleanPgn = cleanGameRecord(pgn);
      await copyPgnToClipboard(cleanPgn);

      const response = await chrome.runtime.sendMessage({
        type: OPEN_LICHESS_IMPORT,
        pgn: cleanPgn,
      });
      if (!response?.opened) {
        throw new Error("Lichess could not be opened.");
      }
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "The review handoff failed.",
      );
    } finally {
      handoffInProgress = false;
      setPageButtonsDisabled(false);
    }
  }

  function setPageButtonsDisabled(disabled) {
    for (const id of [BUTTON_ID, REVIEW_BUTTON_ID]) {
      const button = document.getElementById(id);
      if (button) button.disabled = disabled;
    }
  }

  function createPageButton(id, text, handler) {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    button.textContent = text;
    button.addEventListener("click", handler);
    return button;
  }

  function syncPageButtons() {
    syncScheduled = false;

    if (!isSupportedGameUrl(location.href)) {
      document.getElementById(BUTTON_ID)?.remove();
      document.getElementById(REVIEW_BUTTON_ID)?.remove();
      return;
    }

    const shareControl = findShareControl();
    if (!shareControl) {
      document.getElementById(BUTTON_ID)?.remove();
      document.getElementById(REVIEW_BUTTON_ID)?.remove();
      return;
    }

    if (!document.getElementById(BUTTON_ID)) {
      shareControl.insertAdjacentElement(
        "afterend",
        createPageButton(BUTTON_ID, "Analyze on Lichess", startHandoff),
      );
    }
    if (!document.getElementById(REVIEW_BUTTON_ID)) {
      shareControl.insertAdjacentElement(
        "afterend",
        createPageButton(
          REVIEW_BUTTON_ID,
          "Review on Lichess",
          startReview,
        ),
      );
    }
  }

  function schedulePageButtonSync() {
    if (syncScheduled) return;
    syncScheduled = true;
    requestAnimationFrame(syncPageButtons);
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

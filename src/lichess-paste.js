(function () {
  "use strict";

  if (globalThis.chesscomToLichessPasteLoaded) return;
  globalThis.chesscomToLichessPasteLoaded = true;

  const LICHESS_PASTE_READY = "LICHESS_PASTE_READY";
  const WAIT_TIMEOUT_MS = 15_000;

  function visible(element) {
    return element instanceof HTMLElement && element.getClientRects().length > 0;
  }

  function labelOf(element) {
    return [
      element.textContent,
      element.getAttribute("aria-label"),
      element.getAttribute("title"),
      element.value,
    ]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
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

  function findPgnTextArea() {
    return [...document.querySelectorAll("textarea")].find(
      (textarea) => visible(textarea),
    );
  }

  function findAnalysisCheckbox() {
    const analysisLabel = [...document.querySelectorAll("label")].find(
      (label) => /request a computer analysis/i.test(label.textContent || ""),
    );
    if (analysisLabel) {
      if (analysisLabel.htmlFor) {
        const input = document.getElementById(analysisLabel.htmlFor);
        if (input?.type === "checkbox") return input;
      }

      const input = analysisLabel.querySelector('input[type="checkbox"]');
      if (input) return input;
    }

    const labelledCheckbox = [
      ...document.querySelectorAll('input[type="checkbox"]'),
    ].find((input) => {
      let parent = input.parentElement;
      for (let depth = 0; parent && depth < 4; depth += 1) {
        if (/request a computer analysis/i.test(parent.textContent || "")) {
          return true;
        }
        parent = parent.parentElement;
      }
      return false;
    });
    if (labelledCheckbox) return labelledCheckbox;

    return [...document.querySelectorAll('input[type="checkbox"]')].find(
      (input) => visible(input),
    );
  }

  function findImportButton() {
    return [...document.querySelectorAll('button, input[type="submit"]')].find(
      (button) => visible(button) && /import game/i.test(labelOf(button)),
    );
  }

  function setTextAreaValue(textArea, value) {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    setter?.call(textArea, value);
    if (!setter) textArea.value = value;
    textArea.dispatchEvent(new Event("input", { bubbles: true }));
    textArea.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function showError(text) {
    const message = document.createElement("div");
    message.setAttribute("role", "alert");
    message.textContent = text;
    Object.assign(message.style, {
      background: "#b33430",
      borderRadius: "0.4rem",
      bottom: "1.25rem",
      boxShadow: "0 0.25rem 1rem rgb(0 0 0 / 30%)",
      color: "#fff",
      font: "600 0.875rem/1.4 system-ui, sans-serif",
      left: "50%",
      maxWidth: "min(28rem, calc(100vw - 2rem))",
      padding: "0.75rem 1rem",
      position: "fixed",
      textAlign: "center",
      transform: "translateX(-50%)",
      zIndex: "2147483647",
    });
    document.body.append(message);
  }

  async function importGame(pgn) {
    const textArea = await waitFor(
      findPgnTextArea,
      "Lichess’s PGN field was not found.",
    );
    setTextAreaValue(textArea, pgn);

    const analysisCheckbox = await waitFor(
      findAnalysisCheckbox,
      "Lichess’s computer-analysis option was not found.",
    );
    if (analysisCheckbox.disabled) {
      throw new Error("Sign in to Lichess to request computer analysis.");
    }
    if (!analysisCheckbox.checked) analysisCheckbox.click();
    if (!analysisCheckbox.checked) {
      throw new Error("Lichess did not enable computer analysis.");
    }

    const importButton = await waitFor(
      findImportButton,
      "Lichess’s Import game button was not found.",
    );
    importButton.click();
  }

  function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  async function requestPendingPgn() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await chrome.runtime.sendMessage({
        type: LICHESS_PASTE_READY,
      });
      if (typeof response?.pgn === "string" && response.pgn.trim() !== "") {
        await importGame(response.pgn);
        return;
      }
      await delay(100);
    }
  }

  void requestPendingPgn()
    .catch((error) => {
      showError(
        error instanceof Error ? error.message : "The Lichess import failed.",
      );
    });
})();

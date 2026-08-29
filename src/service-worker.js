"use strict";

importScripts("game-record.js");

const { isSupportedGameUrl } = globalThis.ChesscomToLichess;
const START_HANDOFF = "START_HANDOFF";
const CONTENT_SCRIPT_READY = "CONTENT_SCRIPT_READY";
const OPEN_LICHESS_ANALYSIS = "OPEN_LICHESS_ANALYSIS";
const OPEN_LICHESS_IMPORT = "OPEN_LICHESS_IMPORT";
const LICHESS_PASTE_READY = "LICHESS_PASTE_READY";
const CONTEXT_MENU_ID = "analyze-on-lichess";
const LICHESS_PASTE_URL = "https://lichess.org/paste";
const PENDING_IMPORT_KEY_PREFIX = "pendingLichessImport:";
const PENDING_IMPORT_ORIENTATION_KEY_PREFIX =
  "pendingLichessImportOrientation:";
const orientationRedirectsInProgress = new Set();
const SUPPORTED_PAGE_PATTERNS = [
  "https://chess.com/game/*",
  "https://chess.com/analysis/game/live/*",
  "https://chess.com/analysis/game/daily/*",
  "https://www.chess.com/game/*",
  "https://www.chess.com/analysis/game/live/*",
  "https://www.chess.com/analysis/game/daily/*",
];

async function ensureContentScript(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: CONTENT_SCRIPT_READY,
    });
    if (response?.ready) return;
  } catch {}

  await chrome.scripting.insertCSS({
    target: { tabId },
    files: ["src/content-script.css"],
  });
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ["src/game-record.js", "src/content-script.js"],
  });
}

async function startHandoffInTab(tabId) {
  try {
    await ensureContentScript(tabId);
    await chrome.tabs.sendMessage(tabId, { type: START_HANDOFF });
  } catch {}
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title: "Analyze on Lichess",
      contexts: ["page"],
      documentUrlPatterns: SUPPORTED_PAGE_PATTERNS,
    });
  });
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    void startHandoffInTab(tab.id);
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === CONTEXT_MENU_ID && tab?.id) {
    void startHandoffInTab(tab.id);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo.url) return;

  void orientImportedGame(tabId, changeInfo.url);

  if (isSupportedGameUrl(changeInfo.url)) void ensureContentScript(tabId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message?.type === OPEN_LICHESS_ANALYSIS &&
    typeof message.url === "string" &&
    message.url.startsWith("https://lichess.org/analysis/pgn/")
  ) {
    chrome.tabs
      .create({ url: message.url, active: true })
      .then(() => sendResponse({ opened: true }))
      .catch(() => sendResponse({ opened: false }));
    return true;
  }

  if (
    message?.type === OPEN_LICHESS_IMPORT &&
    typeof message.pgn === "string" &&
    message.pgn.trim() !== ""
  ) {
    (async () => {
      try {
        const tab = await chrome.tabs.create({
          url: LICHESS_PASTE_URL,
          active: true,
        });
        if (!tab.id) throw new Error("The Lichess tab has no ID.");

        await chrome.storage.session.set({
          [pendingImportKey(tab.id)]: {
            pgn: message.pgn,
            color: normalizeColor(message.color),
          },
        });
        sendResponse({ opened: true });
      } catch {
        sendResponse({ opened: false });
      }
    })();
    return true;
  }

  if (message?.type === LICHESS_PASTE_READY && _sender.tab?.id) {
    (async () => {
      try {
        const result = await chrome.storage.session.get(
          pendingImportKey(_sender.tab.id),
        );
        const pending = result[pendingImportKey(_sender.tab.id)];
        const pgn = typeof pending === "string" ? pending : pending?.pgn;
        const color =
          typeof pending === "object" && pending
            ? normalizeColor(pending.color)
            : undefined;
        if (typeof pgn === "string") {
          await chrome.storage.session.remove(pendingImportKey(_sender.tab.id));
          if (color === "black") {
            await chrome.storage.session.set({
              [pendingImportOrientationKey(_sender.tab.id)]: color,
            });
          }
        }
        sendResponse({
          pgn: pgn || undefined,
        });
      } catch {
        sendResponse({});
      }
    })();
    return true;
  }

  return false;
});

function pendingImportKey(tabId) {
  return `${PENDING_IMPORT_KEY_PREFIX}${tabId}`;
}

function pendingImportOrientationKey(tabId) {
  return `${PENDING_IMPORT_ORIENTATION_KEY_PREFIX}${tabId}`;
}

function normalizeColor(color) {
  return color === "white" || color === "black" ? color : undefined;
}

function importedGameId(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "lichess.org") {
      return undefined;
    }

    const path = url.pathname.split("/").filter(Boolean);
    if (
      path.length === 1 &&
      /^\w{8}$/.test(path[0])
    ) {
      return path[0];
    }
    if (
      path.length === 2 &&
      /^\w{8}$/.test(path[0]) &&
      path[1] === "white"
    ) {
      return path[0];
    }
  } catch {}

  return undefined;
}

async function orientImportedGame(tabId, url) {
  const gameId = importedGameId(url);
  if (!gameId) return;
  if (orientationRedirectsInProgress.has(tabId)) return;

  orientationRedirectsInProgress.add(tabId);

  try {
    const key = pendingImportOrientationKey(tabId);
    const result = await chrome.storage.session.get(key);
    if (result[key] !== "black") return;

    await chrome.tabs.update(tabId, {
      url: `https://lichess.org/${gameId}/black`,
    });
    await chrome.storage.session.remove(key);
  } catch {} finally {
    orientationRedirectsInProgress.delete(tabId);
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove([
    pendingImportKey(tabId),
    pendingImportOrientationKey(tabId),
  ]);
});

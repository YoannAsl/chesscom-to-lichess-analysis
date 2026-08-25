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
  if (changeInfo.url && isSupportedGameUrl(changeInfo.url)) {
    void ensureContentScript(tabId);
  }
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
          [pendingImportKey(tab.id)]: message.pgn,
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
        const pgn = result[pendingImportKey(_sender.tab.id)];
        if (typeof pgn === "string") {
          await chrome.storage.session.remove(pendingImportKey(_sender.tab.id));
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

chrome.tabs.onRemoved.addListener((tabId) => {
  void chrome.storage.session.remove(pendingImportKey(tabId));
});

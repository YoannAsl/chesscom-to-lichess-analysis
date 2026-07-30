"use strict";

importScripts("game-record.js");

const { isSupportedGameUrl } = globalThis.ChesscomToLichess;
const START_HANDOFF = "START_HANDOFF";
const CONTENT_SCRIPT_READY = "CONTENT_SCRIPT_READY";
const OPEN_LICHESS_ANALYSIS = "OPEN_LICHESS_ANALYSIS";
const CONTEXT_MENU_ID = "analyze-on-lichess";
const SUPPORTED_PAGE_PATTERNS = [
  "https://chess.com/game/live/*",
  "https://chess.com/game/daily/*",
  "https://chess.com/analysis/game/live/*",
  "https://chess.com/analysis/game/daily/*",
  "https://www.chess.com/game/live/*",
  "https://www.chess.com/game/daily/*",
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

  return false;
});

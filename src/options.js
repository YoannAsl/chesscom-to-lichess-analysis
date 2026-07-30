"use strict";

const usernameInput = document.getElementById("chess-com-username");
const saveStatus = document.getElementById("save-status");
const form = document.querySelector("form");

async function loadSettings() {
  const settings = await chrome.storage.sync.get({
    chessComUsername: "",
  });
  usernameInput.value = settings.chessComUsername;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveStatus.textContent = "";

  await chrome.storage.sync.set({
    chessComUsername: usernameInput.value.trim(),
  });

  saveStatus.textContent = "Saved.";
});

void loadSettings();

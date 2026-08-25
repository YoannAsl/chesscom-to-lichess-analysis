# Chess.com to Lichess

A small Chrome and Edge extension that sends a finished Chess.com game to Lichess for analysis or review.

## Version one

The extension supports any public, finished, standard live or Daily Chess game. It works from:

- the normal Chess.com game page;
- the Game Review page;
- the Self Analysis page.

The user can start the handoff from:

- the extension toolbar icon;
- an **Analyze on Lichess** button beside Chess.com's Share control;
- a **Review the game on Lichess** button beside Chess.com's Share control;
- an **Analyze on Lichess** browser context-menu item.

The page button stays hidden while a game is ongoing. It appears beside Share
when Chess.com shows the finished game controls.

Lichess opens in a new active tab. The source Chess.com tab stays open.

## Settings

Open the extension's options and save your Chess.com username. When that
username matches the White or Black player in a game, Lichess shows that side
at the bottom of the board. An empty or unmatched username keeps Lichess's
default view.

## Analysis handoff

1. Check that the current URL is a known Chess.com game route.
2. Prevent a second handoff while the first one runs.
3. Open Chess.com's Share panel and select its PGN tab.
4. Read the PGN, then close the Share panel.
5. Reject a game whose result is `*`, whose rules are not standard chess, or whose PGN is missing.
6. Remove Chess.com review notes, annotations, and clock data if present.
7. Match the saved Chess.com username to the White or Black player when possible.
8. Open `https://lichess.org/analysis/pgn/{encoded PGN}` in a new active tab, with the matching side at the bottom.
9. Show a short on-page error and open no tab when a check fails.

The Share panel may appear for a moment during the handoff.

## Review handoff

The **Review the game on Lichess** page button follows the same checks and cleanup,
then:

1. Copy the cleaned PGN to the clipboard.
2. Open `https://lichess.org/paste` in a new active tab.
3. Fill the PGN textarea.
4. Select **Request a computer analysis**.
5. Click **Import game**.

The extension keeps the PGN in temporary extension session storage only until the
Lichess paste page receives it.

## Technical shape

- Manifest V3 for Chrome and Edge.
- Plain modern JavaScript.
- No build step, framework, server, or remote report service.
- A small options page stores the user's Chess.com username in browser sync storage.
- A content script owns the page button, PGN read, checks, and on-page messages.
- A Lichess content script fills the paste form and starts the import flow.
- A service worker owns the toolbar and context-menu actions.
- Pure functions own URL checks, PGN checks, cleanup, and Lichess URL creation.
- Page observers handle Chess.com's page changes without a full reload.

The extension needs access to the supported Chess.com routes, the Lichess paste
page, the clipboard, and the browser context-menu feature.

## Data

The extension reads the current game only after a user action. It stores the Chess.com username entered in its options, using browser sync storage. For review, it copies the cleaned PGN to the clipboard and keeps one temporary copy in extension session storage while the Lichess paste page loads. It does not store games, usage data, or error reports.

## Not in version one

- Ongoing games.
- Chess variants, including Chess960.
- Chrome Web Store assets or submission.
- Full browser test automation.

## Testing

Use Node's built-in test runner for the small pure-function test suite. Follow [the manual acceptance checklist](docs/acceptance-checklist.md) before calling the unpacked build ready.

The project language lives in [CONTEXT.md](CONTEXT.md). Integration facts and sources live in [the research note](docs/research/browser-extension-integration.md).

## Run locally

1. Open `chrome://extensions` in Chrome or `edge://extensions` in Edge.
2. Turn on developer mode.
3. Choose **Load unpacked** and select this project folder.
4. Open a supported finished Chess.com game.

Run the automated checks with:

```sh
npm test
```

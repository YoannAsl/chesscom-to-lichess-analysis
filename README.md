# Chess.com to Lichess

A small Chrome and Edge extension that opens a finished Chess.com game in the Lichess analysis board.

## Version one

The extension supports any public, finished, standard live or Daily Chess game. It works from:

- the normal Chess.com game page;
- the Game Review page;
- the Self Analysis page.

The user can start the handoff from:

- the extension toolbar icon;
- an **Analyze on Lichess** button beside Chess.com's Share control;
- an **Analyze on Lichess** browser context-menu item.

Lichess opens in a new active tab. The source Chess.com tab stays open.

## Handoff

1. Check that the current URL is a known Chess.com game route.
2. Prevent a second handoff while the first one runs.
3. Open Chess.com's Share panel and select its PGN tab.
4. Read the PGN, then close the Share panel.
5. Reject a game whose result is `*`, whose rules are not standard chess, or whose PGN is missing.
6. Remove Chess.com review notes, annotations, and clock data if present.
7. Open `https://lichess.org/analysis/pgn/{encoded PGN}` in a new active tab.
8. Show a short on-page error and open no tab when a check fails.

The Share panel may appear for a moment during the handoff.

## Technical shape

- Manifest V3 for Chrome and Edge.
- Plain modern JavaScript.
- No build step, framework, server, settings page, or remote report service.
- A content script owns the page button, PGN read, checks, and on-page messages.
- A service worker owns the toolbar and context-menu actions.
- Pure functions own URL checks, PGN checks, cleanup, and Lichess URL creation.
- A page observer handles Chess.com's page changes without a full reload.

The extension needs access only to the supported Chess.com routes and the browser context-menu feature. It does not need access to Lichess because it only opens a URL there.

## Data

The extension reads the current game only after a user action. It does not store games, settings, usage data, or error reports. It sends the game record only to Lichess as part of the analysis URL.

## Not in version one

- Ongoing games.
- Chess variants, including Chess960.
- Automatic Lichess engine control.
- Lichess imports, studies, or cloud analysis requests.
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

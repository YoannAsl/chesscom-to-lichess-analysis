# Browser extension integration notes

Checked on 2026-07-30.

## Chess.com

Chess.com documents Share → PGN as the way to download one game's PGN. Its public data API also exposes monthly game archives, but it does not provide a direct documented lookup by the numeric game-page ID.

On the supplied public game, `https://www.chess.com/game/172278675618` redirected to `https://www.chess.com/game/live/172278675618`. The Share dialog's PGN tab held a textarea with the full PGN: headers, result, and all moves. This gives the extension a page-level source without a server or private API.

Source:

- [Chess.com: How do I get a PGN of my game?](https://support.chess.com/en/articles/8705305-how-do-i-get-a-pgn-of-my-game)
- [Chess.com: What is the PubAPI and how do I use it?](https://support.chess.com/en/articles/9650547-what-is-the-pubapi-and-how-do-i-use-it)

## Lichess

Lichess has a public GET route at `/analysis/pgn/*pgn`. Opening a URL-encoded PGN through this route loads it in the analysis board without using the game-import flow.

The live `/paste` page also exposes a PGN textarea, a `Request a computer
analysis` checkbox, and an `Import game` button. The review button uses a
Lichess content script to fill these controls and submit the form after the
service worker opens the page.

The same route accepts a `color` query parameter. Its controller reads `getColor()` before it builds the analysis data, including in the `pgn` action. The extension can therefore open:

```text
https://lichess.org/analysis/pgn/<encoded-pgn>?color=black
```

Use `white` or `black` for the side that should appear at the bottom.

Source:

- [Lichess application routes](https://github.com/lichess-org/lila/blob/master/conf/routes)
- [Lichess `UserAnalysis.pgn` controller](https://github.com/lichess-org/lila/blob/master/app/controllers/UserAnalysis.scala#L54-L66)
- [Lichess analysis board](https://lichess.org/analysis)
- [Lichess game import](https://lichess.org/paste)

## Browser extension

A Manifest V3 content script can add the page button and read the Chess.com page. A service worker can handle the toolbar and context-menu actions. Static content-script match patterns keep site access limited to Chess.com game and analysis routes.

### Board orientation

This is possible, with one limit: the PGN identifies the White and Black players, but it does not identify which one is the signed-in Chess.com user. The extension therefore asks the user for their Chess.com username in its options. It compares the saved username with the PGN's `White` and `Black` headers, then passes the matching color to Lichess.

This avoids relying on Chess.com's undocumented page structure. A missing or unmatched username means “orientation unknown”, so the extension keeps Lichess's default orientation.

Source:

- [Chess.com PGN fields, including `White` and `Black`](https://support.chess.com/en/articles/8598397-what-are-pgn-fen)

Source:

- [Chrome: Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome: contextMenus API](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Chrome: activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)

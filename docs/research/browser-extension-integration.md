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

Source:

- [Lichess application routes](https://github.com/lichess-org/lila/blob/master/conf/routes)
- [Lichess analysis board](https://lichess.org/analysis)
- [Lichess game import](https://lichess.org/paste)

## Browser extension

A Manifest V3 content script can add the page button and read the Chess.com page. A service worker can handle the toolbar and context-menu actions. Static content-script match patterns keep site access limited to Chess.com game and analysis routes.

Source:

- [Chrome: Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome: contextMenus API](https://developer.chrome.com/docs/extensions/reference/api/contextMenus)
- [Chrome: activeTab permission](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab)

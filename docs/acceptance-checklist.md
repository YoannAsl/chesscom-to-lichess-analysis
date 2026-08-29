# Acceptance checklist

## Browsers

- [ ] Load the same unpacked extension in current Chrome.
- [ ] Load the same unpacked extension in current Edge.

## Supported pages

Check one finished standard live game and one finished standard Daily game.

- [ ] The normal game page can start a handoff.
- [ ] The Game Review page can start a handoff.
- [ ] The Self Analysis page can start a handoff.

## Actions

Run each action on a supported game.

- [ ] The page button stays hidden while the game is ongoing.
- [ ] The page button appears beside Share when the game finishes.
- [ ] The toolbar icon starts a handoff.
- [ ] The page shows **Analyze on Lichess** beside Share.
- [ ] The page button starts a handoff.
- [ ] The page shows **Review the game on Lichess** beside Share.
- [ ] The review button copies the cleaned PGN to the clipboard.
- [ ] The review button fills Lichess's PGN textarea.
- [ ] The review button selects **Request a computer analysis**.
- [ ] The review button clicks **Import game**.
- [ ] The review board puts the configured player's side at the bottom.
- [ ] The browser context menu shows **Analyze on Lichess**.
- [ ] The context-menu item starts a handoff.
- [ ] Repeated clicks during a handoff open only one Lichess tab.

## Settings and orientation

- [ ] The extension options save and restore a Chess.com username.
- [ ] A game where that username is White opens with White at the bottom.
- [ ] A game where that username is Black opens with Black at the bottom.
- [ ] An empty or unmatched username keeps Lichess's default orientation.

## Result

- [ ] Chess.com's Share panel closes after the PGN is read.
- [ ] A new active Lichess tab opens.
- [ ] The Chess.com tab stays open.
- [ ] Lichess shows the correct players, result, and full move list.
- [ ] The review flow requests computer analysis.

## Rejections

- [ ] An ongoing game opens no Lichess tab and shows a clear message.
- [ ] A variant opens no Lichess tab and shows a clear message.
- [ ] A page with no readable PGN opens no Lichess tab and shows a clear message.
- [ ] An unrelated Chess.com page cannot start a handoff.

## Automated tests

- [ ] Accept known normal game, Game Review, and Self Analysis URLs.
- [ ] Reject unrelated and malformed URLs.
- [ ] Accept a finished standard PGN.
- [ ] Reject a PGN whose result is `*`.
- [ ] Reject variant and non-standard starting-position PGNs.
- [ ] Remove annotations and clock data from a PGN.
- [ ] Preserve required headers, result, and moves.
- [ ] Encode the clean PGN in the Lichess analysis URL for the Analyze action.
- [ ] Match the configured username to White and Black without case sensitivity.
- [ ] Add the matched color to the Lichess analysis URL.

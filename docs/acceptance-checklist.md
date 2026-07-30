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

- [ ] The toolbar icon starts a handoff.
- [ ] The page shows **Analyze on Lichess** beside Share.
- [ ] The page button starts a handoff.
- [ ] The browser context menu shows **Analyze on Lichess**.
- [ ] The context-menu item starts a handoff.
- [ ] Repeated clicks during a handoff open only one Lichess tab.

## Result

- [ ] Chess.com's Share panel closes after the PGN is read.
- [ ] A new active Lichess tab opens.
- [ ] The Chess.com tab stays open.
- [ ] Lichess shows the correct players, result, and full move list.
- [ ] The add-on does not switch on the Lichess engine.

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
- [ ] Encode the clean PGN in the Lichess analysis URL.

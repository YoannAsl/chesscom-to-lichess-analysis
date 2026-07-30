# Chess.com to Lichess

This project transfers a completed Chess.com game into a Lichess analysis board.

## Language

**Finished game**:
A Chess.com game that has ended and has a final result in its game record.
_Avoid_: Played game, live game

**Standard game**:
A finished game played under standard chess rules and starting from the usual initial position.
_Avoid_: Variant game, Chess960 game

**Public game**:
A finished game whose game record Chess.com makes available without access to a player's account.
_Avoid_: Own game, private game

**Game record**:
The PGN headers and moves for a public game, without Chess.com review notes, annotations, or clock data.
_Avoid_: Game review, analysis

**Supported game**:
A public, finished, standard live or Daily Chess game. Its normal game page, Game Review page, and Self Analysis page are all valid starting points.
_Avoid_: Any game

**Analysis handoff**:
A user-triggered transfer that reads a supported game's game record and opens it in a new, active Lichess analysis tab without storing it.
_Avoid_: Import, sync

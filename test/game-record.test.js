const test = require("node:test");
const assert = require("node:assert/strict");

const {
  cleanGameRecord,
  createLichessAnalysisUrl,
  findPlayerColor,
  isSupportedGameUrl,
} = require("../src/game-record.js");

const FINISHED_STANDARD_PGN = `[Event "Live Chess"]
[Site "Chess.com"]
[White "Alpha"]
[Black "Beta"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0`;

test("accepts normal, Game Review, and Self Analysis game URLs", () => {
  const supportedUrls = [
    "https://www.chess.com/game/172278675618",
    "https://www.chess.com/game/live/172278675618",
    "https://www.chess.com/game/daily/123456789",
    "https://www.chess.com/analysis/game/live/172278675618/review",
    "https://www.chess.com/analysis/game/daily/123456789/analysis?tab=analysis",
  ];

  for (const url of supportedUrls) {
    assert.equal(isSupportedGameUrl(url), true, url);
  }
});

test("rejects unrelated and malformed URLs", () => {
  const unsupportedUrls = [
    "https://www.chess.com/home",
    "https://www.chess.com/game/live/not-a-game",
    "https://example.com/game/live/172278675618",
    "not a URL",
  ];

  for (const url of unsupportedUrls) {
    assert.equal(isSupportedGameUrl(url), false, url);
  }
});

test("accepts a finished standard game record", () => {
  assert.equal(cleanGameRecord(FINISHED_STANDARD_PGN), FINISHED_STANDARD_PGN);
});

test("rejects an unfinished game record", () => {
  const ongoingPgn = FINISHED_STANDARD_PGN.replaceAll("1-0", "*");
  const inconsistentPgn = FINISHED_STANDARD_PGN.replace(
    "3. Bb5 a6 1-0",
    "3. Bb5 a6 *",
  );

  assert.throws(
    () => cleanGameRecord(ongoingPgn),
    /game must be finished/i,
  );
  assert.throws(
    () => cleanGameRecord(inconsistentPgn),
    /game must be finished/i,
  );
});

test("rejects variants and non-standard starting positions", () => {
  const chess960Pgn = FINISHED_STANDARD_PGN.replace(
    '[Result "1-0"]',
    '[Result "1-0"]\n[Variant "Chess960"]',
  );
  const customPositionPgn = FINISHED_STANDARD_PGN.replace(
    '[Result "1-0"]',
    '[Result "1-0"]\n[SetUp "1"]\n[FEN "8/8/8/8/8/8/8/K6k w - - 0 1"]',
  );

  assert.throws(() => cleanGameRecord(chess960Pgn), /standard chess/i);
  assert.throws(() => cleanGameRecord(customPositionPgn), /standard chess/i);
});

test("removes review notes, annotations, variations, and clock data", () => {
  const annotatedPgn = `[Event "Live Chess"]
[Site "Chess.com"]
[White "Alpha"]
[Black "Beta"]
[Result "1-0"]

1. e4 {[%clk 0:10:00] Good move} e5 $1 2. Nf3?! (2. Bc4 {note} Nc6)
Nc6 ; review note
3. Bb5 a6 1-0`;

  assert.equal(cleanGameRecord(annotatedPgn), FINISHED_STANDARD_PGN);
});

test("normalizes repeated black move numbers from Chess.com PGNs", () => {
  const chessComPgn = FINISHED_STANDARD_PGN.replace(
    "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 1-0",
    "1. e4 1... e5 2. Nf3 2... Nc6 3. Bb5 3... a6 1-0",
  );

  assert.equal(cleanGameRecord(chessComPgn), FINISHED_STANDARD_PGN);
});

test("encodes the clean game record in a Lichess analysis URL", () => {
  assert.equal(
    createLichessAnalysisUrl(FINISHED_STANDARD_PGN),
    `https://lichess.org/analysis/pgn/${encodeURIComponent(FINISHED_STANDARD_PGN)}`,
  );
});

test("finds the configured player's color from the game record", () => {
  assert.equal(findPlayerColor(FINISHED_STANDARD_PGN, "alpha"), "white");
  assert.equal(findPlayerColor(FINISHED_STANDARD_PGN, " BETA "), "black");
});

test("uses the default orientation when the configured player is absent", () => {
  assert.equal(findPlayerColor(FINISHED_STANDARD_PGN, "Gamma"), undefined);
  assert.equal(findPlayerColor(FINISHED_STANDARD_PGN, ""), undefined);
  assert.equal(
    createLichessAnalysisUrl(FINISHED_STANDARD_PGN, undefined),
    `https://lichess.org/analysis/pgn/${encodeURIComponent(FINISHED_STANDARD_PGN)}`,
  );
});

test("adds the configured player's color to the Lichess analysis URL", () => {
  assert.equal(
    createLichessAnalysisUrl(FINISHED_STANDARD_PGN, "black"),
    `https://lichess.org/analysis/pgn/${encodeURIComponent(FINISHED_STANDARD_PGN)}?color=black`,
  );
});

test("rejects a game record with no moves", () => {
  const headerOnlyPgn = FINISHED_STANDARD_PGN.split("\n\n")[0];

  assert.throws(() => cleanGameRecord(headerOnlyPgn), /no game record/i);
});

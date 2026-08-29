(function (root) {
  "use strict";

  const SUPPORTED_GAME_PATH =
    /^\/(?:game\/(?:(?:live|daily)\/)?|analysis\/game\/(?:live|daily)\/)\d+(?:\/(?:review|analysis))?\/?$/;

  function isSupportedGameUrl(value) {
    try {
      const url = new URL(value);
      const isChessCom =
        url.hostname === "chess.com" || url.hostname === "www.chess.com";

      return (
        url.protocol === "https:" &&
        isChessCom &&
        SUPPORTED_GAME_PATH.test(url.pathname)
      );
    } catch {
      return false;
    }
  }

  function readHeaders(pgn) {
    const headers = new Map();

    for (const match of pgn.matchAll(/^\[([A-Za-z0-9_]+)\s+"([^"]*)"\]\s*$/gm)) {
      headers.set(match[1], match[2]);
    }

    return headers;
  }

  function removeAnnotations(moves) {
    let cleanMoves = "";
    let commentDepth = 0;
    let variationDepth = 0;
    let lineComment = false;

    for (const character of moves) {
      if (lineComment) {
        if (character === "\n") {
          lineComment = false;
          cleanMoves += " ";
        }
        continue;
      }

      if (commentDepth > 0) {
        if (character === "{") commentDepth += 1;
        if (character === "}") commentDepth -= 1;
        continue;
      }

      if (character === "{") {
        commentDepth = 1;
      } else if (character === ";") {
        lineComment = true;
      } else if (character === "(") {
        variationDepth += 1;
      } else if (character === ")") {
        variationDepth = Math.max(0, variationDepth - 1);
      } else if (variationDepth === 0) {
        cleanMoves += character;
      }
    }

    return cleanMoves
      .replace(/\$\d+/g, "")
      .replace(/[!?]+/g, "")
      .replace(/\d+\.\.\.\s*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanGameRecord(value) {
    if (typeof value !== "string" || value.trim() === "") {
      throw new Error("No game record was found.");
    }

    const pgn = value.replace(/\r\n?/g, "\n").trim();
    const headers = readHeaders(pgn);
    const result = headers.get("Result");

    if (!["1-0", "0-1", "1/2-1/2"].includes(result)) {
      throw new Error("The game must be finished.");
    }

    const variant = headers.get("Variant");
    const hasNonStandardVariant =
      variant && variant.toLowerCase() !== "standard";
    const hasCustomStart = headers.get("SetUp") === "1" || headers.has("FEN");

    if (hasNonStandardVariant || hasCustomStart) {
      throw new Error("Only standard chess games can be analyzed.");
    }

    const headerMatches = [...pgn.matchAll(/^\[[^\r\n]+\]\s*$/gm)];
    const lastHeader = headerMatches.at(-1);
    const headerEnd = lastHeader.index + lastHeader[0].length;
    const headerText = pgn.slice(0, headerEnd).trim();
    const moves = removeAnnotations(pgn.slice(headerEnd));

    if (!moves) {
      throw new Error("No game record was found.");
    }

    const moveResult = moves.match(/(?:^|\s)(1-0|0-1|1\/2-1\/2|\*)$/)?.[1];
    if (moveResult === "*") {
      throw new Error("The game must be finished.");
    }
    if (moveResult !== result) {
      throw new Error("The game record is incomplete.");
    }

    return `${headerText}\n\n${moves}`;
  }

  function findPlayerColor(pgn, username) {
    if (typeof username !== "string" || username.trim() === "") {
      return undefined;
    }

    const headers = readHeaders(pgn);
    const normalizedUsername = username.trim().toLowerCase();

    if (headers.get("White")?.toLowerCase() === normalizedUsername) {
      return "white";
    }
    if (headers.get("Black")?.toLowerCase() === normalizedUsername) {
      return "black";
    }

    return undefined;
  }

  function createLichessAnalysisUrl(cleanPgn, color) {
    const analysisUrl = `https://lichess.org/analysis/pgn/${encodeURIComponent(cleanPgn)}`;
    const colorQuery =
      color === "white" || color === "black" ? `?color=${color}` : "";

    return `${analysisUrl}${colorQuery}#0`;
  }

  const api = Object.freeze({
    cleanGameRecord,
    createLichessAnalysisUrl,
    findPlayerColor,
    isSupportedGameUrl,
  });

  root.ChesscomToLichess = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(globalThis);

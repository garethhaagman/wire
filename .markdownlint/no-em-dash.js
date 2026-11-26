// @ts-check

const EM_DASH_WITH_SPACING = /[ \t]*—[ \t]*/gu;

/**
 * The fix is deterministic: a mid-line em dash and its surrounding spaces
 * become ", ", a trailing one becomes ",", and a leading one is dropped.
 * @param {string} before
 * @param {string} after
 */
const replacementFor = (before, after) => {
  if (before.trim() === "") {
    return "";
  }
  if (after === "") {
    return ",";
  }
  return ", ";
};

/** @type {import("markdownlint").Rule} */
module.exports = {
  names: ["no-em-dash"],
  description: "Disallow the em dash (—) anywhere in markdown content.",
  tags: ["style"],
  function: (params, onError) => {
    for (const [index, line] of params.lines.entries()) {
      for (const match of line.matchAll(EM_DASH_WITH_SPACING)) {
        const start = match.index;
        const end = start + match[0].length;
        onError({
          lineNumber: index + 1,
          detail:
            "Avoid the em dash (—); use a comma, colon, parentheses, or a hyphen instead.",
          context: line.trim(),
          range: [start + 1, match[0].length],
          fixInfo: {
            editColumn: start + 1,
            deleteCount: match[0].length,
            insertText: replacementFor(line.slice(0, start), line.slice(end)),
          },
        });
      }
    }
  },
};

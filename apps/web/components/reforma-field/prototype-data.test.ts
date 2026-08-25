import { describe, expect, it } from "vitest";

import {
  PHOTO_LABELS,
  chip,
  entryExcerpt,
  photoCountLabel,
  photoLabelAt,
  voiceCountLabel,
  wordCount,
} from "./prototype-data.js";

describe("entryExcerpt", () => {
  it("falls back to the empty-state line", () => {
    expect(entryExcerpt("")).toBe(
      "Nothing recorded yet — write, speak or shoot.",
    );
  });

  it("passes a short note through untouched", () => {
    expect(entryExcerpt("Skip collected.")).toBe("Skip collected.");
  });

  it("truncates at 110 characters with an ellipsis", () => {
    const note = "x".repeat(200);
    const excerpt = entryExcerpt(note);
    expect(excerpt).toHaveLength(111);
    expect(excerpt.endsWith("…")).toBe(true);
  });

  it("does not leave a dangling space before the ellipsis", () => {
    const note = "word ".repeat(40);
    expect(entryExcerpt(note)).not.toContain(" …");
  });
});

describe("wordCount", () => {
  it("counts an empty or blank note as zero", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   \n  ")).toBe(0);
  });

  it("collapses runs of whitespace", () => {
    expect(wordCount("  kitchen   demolition\nfinished  ")).toBe(3);
  });
});

describe("photoLabelAt", () => {
  it("cycles through the label list", () => {
    expect(photoLabelAt(0)).toBe(PHOTO_LABELS[0]);
    expect(photoLabelAt(PHOTO_LABELS.length)).toBe(PHOTO_LABELS[0]);
    expect(photoLabelAt(PHOTO_LABELS.length + 1)).toBe(PHOTO_LABELS[1]);
  });

  it("always returns a label, never undefined", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(typeof photoLabelAt(i)).toBe("string");
    }
  });
});

describe("count labels", () => {
  it("singularises exactly one", () => {
    expect(photoCountLabel(1)).toBe("1 photograph");
    expect(voiceCountLabel(1)).toBe("1 voice note");
  });

  it("pluralises zero and many", () => {
    expect(photoCountLabel(0)).toBe("0 photographs");
    expect(photoCountLabel(5)).toBe("5 photographs");
    expect(voiceCountLabel(0)).toBe("0 voice notes");
    expect(voiceCountLabel(2)).toBe("2 voice notes");
  });
});

describe("chip", () => {
  it("marks the active choice with the accent border", () => {
    expect(chip(true).bc).toBe("#b68235");
    expect(chip(true).bg).not.toBe("transparent");
  });

  it("leaves an inactive choice unfilled", () => {
    expect(chip(false).bg).toBe("transparent");
  });
});

import { describe, expect, it } from "vitest";

import {
  isoDateSchema,
  nonEmptyStringSchema,
  nonNegativeNumberSchema,
  uuidSchema,
} from "./validators";

describe("nonEmptyStringSchema", () => {
  it("accepts non-empty text and trims whitespace", () => {
    expect(nonEmptyStringSchema.parse("  kitchen  ")).toBe("kitchen");
  });

  it("rejects empty or whitespace-only text", () => {
    expect(nonEmptyStringSchema.safeParse("").success).toBe(false);
    expect(nonEmptyStringSchema.safeParse("   ").success).toBe(false);
  });
});

describe("uuidSchema", () => {
  it("accepts a valid uuid", () => {
    expect(uuidSchema.safeParse("11111111-1111-4111-8111-111111111111").success).toBe(true);
  });

  it("rejects malformed uuids", () => {
    expect(uuidSchema.safeParse("not-a-uuid").success).toBe(false);
    expect(uuidSchema.safeParse("11111111-1111-1111-1111").success).toBe(false);
  });
});

describe("isoDateSchema", () => {
  it("accepts YYYY-MM-DD", () => {
    expect(isoDateSchema.safeParse("2026-07-02").success).toBe(true);
  });

  it("rejects other formats", () => {
    expect(isoDateSchema.safeParse("02/07/2026").success).toBe(false);
    expect(isoDateSchema.safeParse("2026-7-2").success).toBe(false);
    expect(isoDateSchema.safeParse("").success).toBe(false);
  });
});

describe("nonNegativeNumberSchema", () => {
  it("accepts zero and positive amounts", () => {
    expect(nonNegativeNumberSchema.safeParse(0).success).toBe(true);
    expect(nonNegativeNumberSchema.safeParse(950.5).success).toBe(true);
  });

  it("rejects negatives, infinity and non-numbers", () => {
    expect(nonNegativeNumberSchema.safeParse(-1).success).toBe(false);
    expect(nonNegativeNumberSchema.safeParse(Number.POSITIVE_INFINITY).success).toBe(false);
    expect(nonNegativeNumberSchema.safeParse("10").success).toBe(false);
  });
});

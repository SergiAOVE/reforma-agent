import { describe, expect, it } from "vitest";

import { APP_NAME, nonEmptyStringSchema } from "./index";

describe("core", () => {
  it("exposes the canonical project name", () => {
    expect(APP_NAME).toBe("reforma-agent");
  });

  it("accepts non-empty text and trims whitespace", () => {
    expect(nonEmptyStringSchema.parse("  kitchen  ")).toBe("kitchen");
  });

  it("rejects empty or whitespace-only text", () => {
    expect(nonEmptyStringSchema.safeParse("").success).toBe(false);
    expect(nonEmptyStringSchema.safeParse("   ").success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import {
  addMemberSchema,
  projectFormSchema,
  projectSettingsSchema,
  signInSchema,
  signUpSchema,
} from "./forms";

describe("signInSchema", () => {
  it("accepts a valid email and password, trimming the email", () => {
    const parsed = signInSchema.parse({ email: "  ana@example.com ", password: "password123" });
    expect(parsed.email).toBe("ana@example.com");
  });

  it("rejects invalid emails and short passwords", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "password123" }).success).toBe(false);
    expect(signInSchema.safeParse({ email: "a@b.com", password: "123" }).success).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("requires a non-empty full name", () => {
    expect(
      signUpSchema.safeParse({ email: "a@b.com", password: "password123", fullName: "  " }).success,
    ).toBe(false);
  });
});

describe("projectFormSchema", () => {
  it("normalizes empty optional fields to null", () => {
    const parsed = projectFormSchema.parse({
      name: " Demo ",
      addressLabel: "  ",
      description: undefined,
    });
    expect(parsed).toEqual({ name: "Demo", addressLabel: null, description: null });
  });

  it("rejects an empty name", () => {
    expect(projectFormSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("keeps provided optional values", () => {
    const parsed = projectFormSchema.parse({ name: "Demo", addressLabel: "Barcelona flat" });
    expect(parsed.addressLabel).toBe("Barcelona flat");
  });
});

describe("projectSettingsSchema", () => {
  it("requires a valid status", () => {
    expect(projectSettingsSchema.safeParse({ name: "Demo", status: "active" }).success).toBe(true);
    expect(projectSettingsSchema.safeParse({ name: "Demo", status: "bogus" }).success).toBe(false);
  });
});

describe("addMemberSchema", () => {
  it("accepts a valid email and role", () => {
    expect(addMemberSchema.safeParse({ email: "luis@example.com", role: "viewer" }).success).toBe(
      true,
    );
  });

  it("rejects unknown roles", () => {
    expect(addMemberSchema.safeParse({ email: "luis@example.com", role: "boss" }).success).toBe(
      false,
    );
  });
});

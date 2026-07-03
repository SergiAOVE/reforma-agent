import { describe, expect, it } from "vitest";

import {
  addMemberSchema,
  contractItemFormSchema,
  documentMetadataSchema,
  parseBudgetCsv,
  projectFormSchema,
  projectSettingsSchema,
  signInSchema,
  signUpSchema,
  zoneTradeFormSchema,
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

describe("zoneTradeFormSchema", () => {
  it("trims names and normalizes optional descriptions", () => {
    const parsed = zoneTradeFormSchema.parse({
      name: " Kitchen ",
      description: " ",
      sortOrder: "2",
    });

    expect(parsed).toEqual({ name: "Kitchen", description: null, sortOrder: 2 });
  });
});

describe("documentMetadataSchema", () => {
  it("accepts a known document type", () => {
    expect(
      documentMetadataSchema.safeParse({ type: "plan", title: "Ground floor plan", notes: "" })
        .success,
    ).toBe(true);
  });

  it("rejects unknown document types", () => {
    expect(
      documentMetadataSchema.safeParse({ type: "blueprint", title: "Plan", notes: "" }).success,
    ).toBe(false);
  });
});

describe("contractItemFormSchema", () => {
  it("parses optional decimals and UUID references from form values", () => {
    const parsed = contractItemFormSchema.parse({
      title: "Kitchen cabinets",
      quantity: "3",
      unitPrice: "1200.5",
      totalAmount: "",
      tradeId: "",
      zoneId: "",
      sourceDocumentId: "",
    });

    expect(parsed.quantity).toBe(3);
    expect(parsed.unitPrice).toBe(1200.5);
    expect(parsed.totalAmount).toBeNull();
    expect(parsed.tradeId).toBeNull();
  });

  it("rejects negative amounts", () => {
    expect(contractItemFormSchema.safeParse({ title: "Bad", totalAmount: "-1" }).success).toBe(
      false,
    );
  });
});

describe("parseBudgetCsv", () => {
  it("imports valid CSV rows and handles quoted commas", () => {
    const result =
      parseBudgetCsv(`code,title,description,trade,zone,quantity,unit,unit_price,total_amount,included_excluded,source_page,notes
K01,"Kitchen, cabinets",Base units,Carpentry,Kitchen,2,unit,1200,2400,included,4,"Oak finish, matte"`);

    expect(result.errors).toEqual([]);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      code: "K01",
      title: "Kitchen, cabinets",
      quantity: 2,
      unit_price: 1200,
      total_amount: 2400,
      notes: "Oak finish, matte",
    });
  });

  it("reports missing required headers", () => {
    const result = parseBudgetCsv("code,total_amount\nA,10");

    expect(result.items).toEqual([]);
    expect(result.errors).toContain("Missing required header: title.");
  });

  it("reports row numbers for invalid numbers", () => {
    const result = parseBudgetCsv("title,total_amount\nPaint,-10");

    expect(result.items).toEqual([]);
    expect(result.errors[0]).toMatch(/^Row 2:/);
  });
});

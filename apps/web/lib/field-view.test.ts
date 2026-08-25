import { describe, expect, it } from "vitest";

import { fieldNavigationSection, fieldViewStorageKey, isFieldViewEntryPath } from "./field-view";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";

describe("field view navigation", () => {
  it("uses a project-scoped browser-session key", () => {
    expect(fieldViewStorageKey(PROJECT_ID)).toBe(`reforma:field-view:${PROJECT_ID}`);
  });

  it("recognizes only the project's Today route as the field-view entry", () => {
    expect(isFieldViewEntryPath(`/projects/${PROJECT_ID}/today`, PROJECT_ID)).toBe(true);
    expect(isFieldViewEntryPath(`/projects/${PROJECT_ID}/visits`, PROJECT_ID)).toBe(false);
    expect(isFieldViewEntryPath("/projects/another-project/today", PROJECT_ID)).toBe(false);
  });

  it.each([
    [`/projects/${PROJECT_ID}/today`, "", "today"],
    [`/projects/${PROJECT_ID}/today`, "#attention", "attention"],
    [`/projects/${PROJECT_ID}/today`, "#more", "more"],
    [`/projects/${PROJECT_ID}/visits`, "", "updates"],
    [`/projects/${PROJECT_ID}/visits/a-visit`, "", "updates"],
    [`/projects/${PROJECT_ID}/documents`, "", "more"],
    [`/projects/${PROJECT_ID}`, "", "more"],
  ] as const)("maps %s%s to %s", (pathname, hash, expected) => {
    expect(fieldNavigationSection(pathname, hash, PROJECT_ID)).toBe(expected);
  });
});

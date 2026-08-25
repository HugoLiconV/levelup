import { describe, expect, it } from "vitest";
import { getAuthDisplayName } from "./auth-display-name";

describe("getAuthDisplayName", () => {
  it("prefers the given name from OAuth metadata", () => {
    expect(getAuthDisplayName({
      given_name: "Ana",
      full_name: "Ana García",
    })).toBe("Ana");
  });

  it("uses the first name from a full name", () => {
    expect(getAuthDisplayName({ full_name: "  Diego   Ramírez  " })).toBe("Diego");
  });

  it("does not turn an email address into a greeting name", () => {
    expect(getAuthDisplayName({ name: "judge@example.com" })).toBeNull();
  });

  it("returns null when auth metadata has no usable name", () => {
    expect(getAuthDisplayName({ provider_id: "123" })).toBeNull();
  });
});

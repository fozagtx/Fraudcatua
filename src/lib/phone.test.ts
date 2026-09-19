import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("converts local 0XXXXXXXXX to 233XXXXXXXXX", () => {
    expect(normalizePhone("0244123456")).toBe("233244123456");
  });
  it("handles +233 prefix", () => {
    expect(normalizePhone("+233244123456")).toBe("233244123456");
  });
  it("handles 00233 prefix", () => {
    expect(normalizePhone("00233244123456")).toBe("233244123456");
  });
  it("strips spaces and dashes", () => {
    expect(normalizePhone("024 412 3456")).toBe("233244123456");
    expect(normalizePhone("024-412-3456")).toBe("233244123456");
  });
  it("passes through other digit strings", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });
});

describe("maskPhone", () => {
  it("masks normalized Ghana numbers", () => {
    expect(maskPhone("233244123456")).toBe("024 *** 3456");
  });
  it("masks already-local numbers", () => {
    expect(maskPhone("0244123456")).toBe("024 *** 3456");
  });
});

import { describe, expect, it } from "vitest";
import { attachmentName, cn, displayName, formatBytes, initials, projectColor } from "./utils";

describe("cn", () => {
  it("drops falsy values and lets later Tailwind classes win", () => {
    expect(cn("h-9 px-2", false, null, undefined, "h-8")).toBe("px-2 h-8");
  });
});

describe("displayName", () => {
  it("prefers the full name and falls back to the username", () => {
    expect(displayName({ username: "kamran", FullName: "Kamran Ahmed" })).toBe("Kamran Ahmed");
    expect(displayName({ username: "kamran", FullName: "   " })).toBe("kamran");
    expect(displayName(null)).toBe("Unknown user");
  });
});

describe("initials", () => {
  it("uses the first and last word of a full name", () => {
    expect(initials({ username: "kamran", FullName: "Kamran Ali Ahmed" })).toBe("KA");
  });

  it("uses the first two letters of a single name", () => {
    expect(initials({ username: "kamran" })).toBe("KA");
  });
});

describe("formatBytes", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1.0 KB"],
    [1_572_864, "1.5 MB"],
  ])("formats %d bytes as %s", (bytes, expected) => {
    expect(formatBytes(bytes)).toBe(expected);
  });
});

describe("attachmentName", () => {
  it("strips the upload timestamp prefix and decodes the name", () => {
    expect(attachmentName("http://localhost:8000/images/1717171717171-my%20file.pdf")).toBe(
      "my file.pdf",
    );
  });

  it("keeps names without a timestamp prefix", () => {
    expect(attachmentName("/images/report.pdf")).toBe("report.pdf");
  });
});

describe("projectColor", () => {
  it("returns the same colour for the same id", () => {
    const id = "665f1c2b9a1e4b0012345678";
    expect(projectColor(id)).toBe(projectColor(id));
    expect(projectColor(id)).toMatch(/^bg-[a-z]+-500$/);
  });
});

import { describe, expect, it } from "vitest";
import { convertUnits } from "./conversion";

describe("convertUnits", () => {
  it("converts common distance and mass units", () => {
    expect(convertUnits("5 km to mi")?.result).toBeCloseTo(3.106855, 5);
    expect(convertUnits("1000 g в kg")?.result).toBe(1);
  });
  it("converts temperatures using the correct offsets", () => {
    expect(convertUnits("100 C to F")?.result).toBeCloseTo(212, 8);
    expect(convertUnits("32°F to C")?.result).toBeCloseTo(0, 8);
  });
  it("converts binary and decimal data sizes", () => {
    expect(convertUnits("1 GiB to MB")?.result).toBeCloseTo(1073.741824, 5);
  });
  it("rejects incompatible or unknown units", () => {
    expect(convertUnits("5 km to kg")).toBeNull();
    expect(convertUnits("5 widgets to mi")).toBeNull();
  });
});

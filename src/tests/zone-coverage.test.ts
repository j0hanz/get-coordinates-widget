import {
  DEFAULT_SWEREF_WKIDS,
  EXPECTED_SWEREF_WKIDS,
  SWEREF_GEODETIC_OPTIONS,
  SWEREF_ZONES,
  validateSwerefZoneCoverage,
} from "../config";

describe("SWEREF 99 zone coverage", () => {
  it("includes all projected SWEREF 99 zones", () => {
    expect(SWEREF_ZONES).toHaveLength(EXPECTED_SWEREF_WKIDS.length);
    const wkids = SWEREF_ZONES.map((zone) => zone.wkid);
    EXPECTED_SWEREF_WKIDS.forEach((wkid) => {
      expect(wkids).toContain(wkid);
    });
  });

  it("includes SWEREF 99 geodetic option", () => {
    expect(SWEREF_GEODETIC_OPTIONS).toHaveLength(1);
    expect(SWEREF_GEODETIC_OPTIONS[0].wkid).toBe(4669);
  });

  it("enables all SWEREF 99 options by default", () => {
    expect(DEFAULT_SWEREF_WKIDS).toHaveLength(
      EXPECTED_SWEREF_WKIDS.length + SWEREF_GEODETIC_OPTIONS.length
    );
    EXPECTED_SWEREF_WKIDS.forEach((wkid) => {
      expect(DEFAULT_SWEREF_WKIDS).toContain(wkid);
    });
    expect(DEFAULT_SWEREF_WKIDS).toContain(4669);
  });

  it("validates coverage via helper", () => {
    expect(validateSwerefZoneCoverage()).toBe(true);
  });

  it("assigns projected axis labels and order", () => {
    SWEREF_ZONES.forEach((zone) => {
      expect(zone.axisMessageKeys).toEqual(["easting", "northing"]);
      expect(zone.valueOrder).toBe("xy");
    });
  });

  it("assigns geodetic axis labels and order", () => {
    SWEREF_GEODETIC_OPTIONS.forEach((option) => {
      expect(option.axisMessageKeys).toEqual(["latitude", "longitude"]);
      expect(option.valueOrder).toBe("yx");
    });
  });
});

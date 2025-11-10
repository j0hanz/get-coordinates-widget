import {
  type KoordinaterModules,
  SWEREF_GEODETIC_OPTIONS,
  SWEREF_ZONES,
} from "../config";
import { projectionTestHelpers } from "../runtime/widget";
import {
  SWEREF99_TM_CONTROL_POINTS,
  SWEREF99_TOLERANCE_METERS,
} from "./control-points.data";

describe("SWEREF 99 TM control points", () => {
  it("provides 11 official control points", () => {
    expect(SWEREF99_TM_CONTROL_POINTS).toHaveLength(11);
    SWEREF99_TM_CONTROL_POINTS.forEach((point) => {
      expect(point.latitude).toBeGreaterThanOrEqual(55);
      expect(point.latitude).toBeLessThanOrEqual(65);
      expect(point.comment.length).toBeGreaterThan(0);
    });
  });

  it("confirms SWEREF 99 TM metadata matches Lantmäteriet specification", () => {
    const sweref99TM = SWEREF_ZONES.find((zone) => zone.wkid === 3006);
    expect(sweref99TM).toBeDefined();
    expect(sweref99TM?.metadata?.centralMeridian).toBe(15);
    expect(sweref99TM?.metadata?.scaleFactor).toBeCloseTo(0.9996, 5);
    expect(sweref99TM?.metadata?.falseNorthing).toBe(0);
    expect(sweref99TM?.metadata?.falseEasting).toBe(500000);
    expect(sweref99TM?.metadata?.ellipsoid).toBe("GRS80");
  });

  it.skip("validates transformations using ArcGIS projection modules", () => {
    expect(projectionTestHelpers.projectPointToOption).toBeDefined();
    const modules = {} as KoordinaterModules;
    const geodetic = SWEREF_GEODETIC_OPTIONS[0];
    const projected = SWEREF_ZONES[0];

    expect(geodetic.wkid).toBe(4669);
    expect(projected.wkid).toBe(3006);

    // Placeholder for future integration once ArcGIS JS API modules can be loaded in tests.
    expect(SWEREF99_TOLERANCE_METERS).toBe(0.001);
    expect(modules).toBeDefined();
  });
});

describe("SWEREF 99 geodetic to projected transformations", () => {
  it.skip("projects control points within millimetre tolerance", () => {
    const projected = SWEREF_ZONES[0];
    expect(projected.metadata?.centralMeridian).toBe(15);
    expect(SWEREF99_TOLERANCE_METERS).toBe(0.001);
  });
});

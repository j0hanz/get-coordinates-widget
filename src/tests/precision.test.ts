import {
  buildConfig,
  createDefaultSwerefWkids,
  createExportPayload,
  DEFAULT_PIN_ICON_ID,
  defaultConfig,
  ETRS89_OPTIONS,
  type ExportProjectionSnapshot,
  formatCoordinateOptionLabel,
  ITRF_OPTIONS,
  type KoordinaterConfig,
  type KoordinaterModules,
  type PinIconId,
  PRECISION_LIMITS,
  resolvePrecisionForOption,
  RT90_ZONES,
  sanitizeConfig,
  sanitizePrecision,
  SWEREF_GEODETIC_OPTIONS,
  SWEREF_ZONES,
  WGS84_DERIVED_OPTIONS,
  WGS84_OPTIONS,
} from "../config";
import runtimeMessages from "../runtime/translations/default";
import { projectionTestHelpers } from "../runtime/widget";

describe("precision handling", () => {
  it("provides default enabled WKIDs when configuration omits them", () => {
    const sanitized = buildConfig({});
    const defaults = createDefaultSwerefWkids();

    expect(sanitized.enabledWkids).toEqual(defaults);
    expect(sanitized.enabledWkids).not.toBe(defaults);
    expect(sanitized.showProjectionParameters).toBe(false);
  });

  it("sanitizes partial configuration consistently", () => {
    const sanitized = sanitizeConfig({
      swerefWkid: 999999,
      precision: 42,
      showExportButton: false,
      copyOnClick: false,
      enablePin: false,
      includeExtendedSystems: true,
      enabledWkids: [3006, 3021],
      pinFillColor: "336699",
      pinIconId: "invalid" as unknown as PinIconId,
      showProjectionParameters: "true",
    });

    expect(sanitized.swerefWkid).toBe(3006);
    expect(sanitized.precision).toBe(PRECISION_LIMITS.max);
    expect(sanitized.enabledWkids).toEqual([3006, 3021]);
    expect(sanitized.pinFillColor).toBe("#336699");
    expect(sanitized.pinIconId).toBe(DEFAULT_PIN_ICON_ID);
    expect(sanitized.includeExtendedSystems).toBe(true);
    expect(sanitized.showExportButton).toBe(false);
    expect(sanitized.showProjectionParameters).toBe(true);
  });

  it("keeps configured precision for projected meter-based systems", () => {
    const option = SWEREF_ZONES[0];
    expect(resolvePrecisionForOption(option, 2)).toBe(2);
    expect(resolvePrecisionForOption(option, 0)).toBe(0);
  });

  it("enforces geodetic minimum precision for latitude/longitude outputs", () => {
    const option = WGS84_OPTIONS[0];
    expect(resolvePrecisionForOption(option, 0)).toBe(5);
    expect(resolvePrecisionForOption(option, 3)).toBe(5);
  });

  it("enforces geodetic minimum for SWEREF lat/long outputs", () => {
    const option = SWEREF_GEODETIC_OPTIONS[0];
    expect(resolvePrecisionForOption(option, 2)).toBe(5);
  });

  it("enforces geodetic minimum for ETRS89 lat/long outputs", () => {
    const option = ETRS89_OPTIONS[0];
    expect(resolvePrecisionForOption(option, 1)).toBe(5);
  });

  it("enforces geodetic minimum for ITRF lat/long outputs", () => {
    const option = ITRF_OPTIONS[0];
    expect(resolvePrecisionForOption(option, 4)).toBe(5);
  });

  it("does not elevate precision for Web Mercator", () => {
    const option = WGS84_DERIVED_OPTIONS[0];
    expect(resolvePrecisionForOption(option, 0)).toBe(0);
    expect(resolvePrecisionForOption(option, 3)).toBe(3);
  });

  it("clamps precision values to shared limits", () => {
    expect(sanitizePrecision(10, 0)).toBe(PRECISION_LIMITS.max);
    expect(sanitizePrecision(-2, 0)).toBe(PRECISION_LIMITS.min);
    expect(
      sanitizePrecision(4.7, 0, {
        min: PRECISION_LIMITS.min,
        max: PRECISION_LIMITS.max,
      })
    ).toBe(5);
  });

  it("serializes geodetic exports with elevated precision", () => {
    const snapshot: ExportProjectionSnapshot = {
      wkid: WGS84_OPTIONS[0].wkid,
      system: WGS84_OPTIONS[0].system,
      firstValue: 59.123456789,
      secondValue: 18.987654321,
      firstAxis: "latitude",
      secondAxis: "longitude",
    };
    const cfg: KoordinaterConfig = { ...defaultConfig, precision: 0 };
    const payload = createExportPayload(
      snapshot,
      "WGS 84",
      cfg.precision,
      ["Lat", "Lon"],
      null
    );

    const expectedFirst = Number(snapshot.firstValue.toFixed(5));
    const expectedSecond = Number(snapshot.secondValue.toFixed(5));

    expect(payload.axes[0]).toEqual({ label: "Lat", value: expectedFirst });
    expect(payload.axes[1]).toEqual({ label: "Lon", value: expectedSecond });
    expect(payload.precision).toBe(5);
  });

  it("serializes projected exports with configured precision", () => {
    const snapshot: ExportProjectionSnapshot = {
      wkid: SWEREF_ZONES[0].wkid,
      system: SWEREF_ZONES[0].system,
      firstValue: 658742.1289,
      secondValue: 6581234.9821,
      firstAxis: "easting",
      secondAxis: "northing",
    };
    const cfg: KoordinaterConfig = { ...defaultConfig, precision: 2 };
    const payload = createExportPayload(
      snapshot,
      "SWEREF 99 TM",
      cfg.precision,
      ["E", "N"],
      null
    );

    const expectedFirst = Number(snapshot.firstValue.toFixed(2));
    const expectedSecond = Number(snapshot.secondValue.toFixed(2));

    expect(payload.axes[0]).toEqual({ label: "E", value: expectedFirst });
    expect(payload.axes[1]).toEqual({ label: "N", value: expectedSecond });
    expect(payload.precision).toBe(2);
  });

  it("sanitizes configuration precision using shared limits", () => {
    const sanitized = buildConfig({ precision: 42 });
    expect(sanitized.precision).toBe(PRECISION_LIMITS.max);

    const negative = buildConfig({ precision: -5 });
    expect(negative.precision).toBe(PRECISION_LIMITS.min);
  });

  it("normalizes WGS84 longitudes before reprojection", async () => {
    const projectionCalls: Array<{ x: number; y: number }> = [];
    const projection = {
      isLoaded: () => true,
      load: jest.fn(),
      project: jest.fn((pt: __esri.Point, target: __esri.SpatialReference) => {
        projectionCalls.push({ x: pt.x, y: pt.y });
        return { ...pt, spatialReference: target } as __esri.Point;
      }),
    } satisfies Pick<__esri.projection, "isLoaded" | "load" | "project">;
    const point = {
      x: 181,
      y: 10,
      spatialReference: { wkid: 4326, isWGS84: true },
      clone() {
        return {
          x: this.x,
          y: this.y,
          spatialReference: this.spatialReference,
          normalize: this.normalize,
        };
      },
      normalize() {
        const normalized = ((((this.x + 180) % 360) + 360) % 360) - 180;
        this.x = normalized;
      },
    };
    const modules: KoordinaterModules = {
      Point: jest.fn() as unknown as KoordinaterModules["Point"],
      SpatialReference:
        jest.fn() as unknown as KoordinaterModules["SpatialReference"],
      projection: projection as unknown as KoordinaterModules["projection"],
      webMercatorUtils: {
        webMercatorToGeographic: jest.fn(),
      } as unknown as KoordinaterModules["webMercatorUtils"],
      Graphic: jest.fn() as unknown as KoordinaterModules["Graphic"],
    };
    const option = ETRS89_OPTIONS[0];
    const result = await projectionTestHelpers.projectPointToOption(
      point as unknown as __esri.Point,
      option,
      modules,
      (wkid: number) =>
        ({ wkid, isWGS84: wkid === 4326 }) as unknown as __esri.SpatialReference
    );

    expect(projection.project).toHaveBeenCalledTimes(1);
    expect(projectionCalls[0].x).toBeCloseTo(-179, 6);
    expect(result?.x).toBeCloseTo(-179, 6);
    expect(result?.spatialReference?.wkid).toBe(option.wkid);
  });
});

describe("formatCoordinateOptionLabel", () => {
  const translate = (key: string) =>
    (runtimeMessages as { [messageKey: string]: string })[key] ?? key;

  it("formats SWEREF 99 TM with enhanced label", () => {
    const option = SWEREF_ZONES[0];
    const label = formatCoordinateOptionLabel(option, translate);
    expect(label).toBe("SWEREF 99 TM (EPSG:3006)");
  });

  it("formats SWEREF 99 local zones with degree notation", () => {
    const option = SWEREF_ZONES[1];
    const label = formatCoordinateOptionLabel(option, translate);
    expect(label).toBe("SWEREF 99 12°00′ E (EPSG:3007)");
  });

  it("formats SWEREF 99 half-degree zones with minutes", () => {
    const option = SWEREF_ZONES[6];
    const label = formatCoordinateOptionLabel(option, translate);
    expect(label).toBe("SWEREF 99 14°15′ E (EPSG:3012)");
  });

  it("omits duplicated system prefix for RT90 zones", () => {
    const option = RT90_ZONES[3];
    const label = formatCoordinateOptionLabel(option, translate);
    expect(label).toBe("RT 90 – 0 gon (EPSG:3023)");
  });

  it("handles systems where default labels differ from translations", () => {
    const option = ETRS89_OPTIONS[0];
    const label = formatCoordinateOptionLabel(option, translate);
    expect(label).toBe("ETRS 89 – lat/long (EPSG:4258)");
  });

  it("falls back to original label when no prefix matches", () => {
    const customOption = {
      ...WGS84_OPTIONS[0],
      label: "Custom label (EPSG:4326)",
    } as (typeof WGS84_OPTIONS)[number];
    const label = formatCoordinateOptionLabel(customOption, translate);
    expect(label).toBe("WGS 84 – Custom label (EPSG:4326)");
  });
});

describe("hasCopyableText", () => {
  const emptyValueText = runtimeMessages.noValue;

  it("returns false for nullish values", () => {
    expect(projectionTestHelpers.hasCopyableText(null, emptyValueText)).toBe(
      false
    );
    expect(
      projectionTestHelpers.hasCopyableText(undefined, emptyValueText)
    ).toBe(false);
  });

  it("returns false when value matches the empty-value text", () => {
    expect(
      projectionTestHelpers.hasCopyableText(emptyValueText, emptyValueText)
    ).toBe(false);
  });

  it("returns true for meaningful coordinate text", () => {
    expect(
      projectionTestHelpers.hasCopyableText("658742.12", emptyValueText)
    ).toBe(true);
  });
});

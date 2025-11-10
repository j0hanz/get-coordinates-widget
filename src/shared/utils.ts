import copy from "copy-to-clipboard";
import type {
  CoordinateOption,
  EvaluateReadinessParams,
  ExportProjectionSnapshot,
  ImmutableArrayLike,
  KoordinaterModules,
  KoordinaterReadiness,
  MultiSelectValue,
  ThemeLike,
  ThemePalette,
  ThemeRecord,
} from "../config/types";

const coerceHasMap = (
  hasMap: EvaluateReadinessParams["hasMap"],
  mapWidgetIds: EvaluateReadinessParams["mapWidgetIds"]
): boolean => {
  if (typeof hasMap === "boolean") {
    return hasMap;
  }
  if (Array.isArray(mapWidgetIds)) {
    return mapWidgetIds.length > 0;
  }
  return false;
};

const coerceHasFormats = (
  hasFormats: EvaluateReadinessParams["hasFormats"],
  enabledWkids: EvaluateReadinessParams["enabledWkids"]
): boolean => {
  if (typeof hasFormats === "boolean") {
    return hasFormats;
  }
  if (Array.isArray(enabledWkids)) {
    return enabledWkids.length > 0;
  }
  return false;
};

export const evaluateKoordinaterReadiness = (
  params: EvaluateReadinessParams
): KoordinaterReadiness => {
  const hasMap = coerceHasMap(params.hasMap, params.mapWidgetIds);
  if (!hasMap) {
    return {
      hasMap: false,
      hasFormats: false,
      status: "no-map",
      messageKey: "noView",
    };
  }

  const hasFormats = coerceHasFormats(params.hasFormats, params.enabledWkids);
  if (!hasFormats) {
    return {
      hasMap: true,
      hasFormats: false,
      status: "no-formats",
      messageKey: "noFormats",
    };
  }

  return {
    hasMap: true,
    hasFormats: true,
    status: "ready",
    messageKey: null,
  };
};

export const copyTextToClipboard = (
  value: string | null | undefined
): boolean => {
  if (!value) return false;
  try {
    return copy(value, { format: "text/plain" });
  } catch {
    return false;
  }
};

export const resolveCheckedValue = (
  event: React.ChangeEvent<HTMLInputElement> | undefined,
  explicit?: boolean
): boolean => {
  if (typeof explicit === "boolean") {
    return explicit;
  }
  return !!event?.target?.checked;
};

const hasToArray = <T>(value: unknown): value is ImmutableArrayLike<T> => {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { toArray?: unknown }).toArray === "function"
  );
};

export const materializeValueArray = (
  source: MultiSelectValue
): Array<string | number> => {
  if (!source) {
    return [];
  }
  if (Array.isArray(source)) {
    return [...source];
  }
  if (hasToArray<string | number>(source)) {
    return source.toArray();
  }
  return [];
};

export const hasCopyableText = (
  value: string | null | undefined,
  emptyValueText: string
) => Boolean(value && value !== emptyValueText);

export const isWebMercatorWkid = (wkid?: number): boolean =>
  wkid === 102100 || wkid === 3857 || wkid === 102113;

export const clonePoint = (
  modules: KoordinaterModules,
  point: __esri.Point
): __esri.Point => {
  if (typeof point.clone === "function") {
    return point.clone();
  }
  const { Point } = modules;
  return new Point({
    x: point.x,
    y: point.y,
    spatialReference: point.spatialReference,
  });
};

export const normalizeLongitudeIfNeeded = (
  pt: __esri.Point | null
): __esri.Point | null => {
  if (pt?.spatialReference?.isWGS84 && typeof pt.normalize === "function") {
    try {
      pt.normalize();
    } catch {
      /* ignore normalization errors */
    }
  }
  return pt;
};

export const createSpatialReferenceFactory = (
  modules: KoordinaterModules | null
) => {
  const srCache: { [wkid: number]: __esri.SpatialReference } = {};
  return (wkid: number): __esri.SpatialReference | null => {
    if (!modules) return null;
    let sr = srCache[wkid];
    if (!sr) {
      try {
        const SpatialReference = modules.SpatialReference;
        sr = new SpatialReference({ wkid });
        srCache[wkid] = sr;
      } catch {
        return null;
      }
    }
    return sr;
  };
};

export const hasSys = (
  candidate: ThemeLike
): candidate is ThemeLike & ThemeRecord => {
  return (
    typeof candidate === "object" && candidate !== null && "sys" in candidate
  );
};

export const getThemePalette = (
  theme: ThemeLike,
  paletteKey: string
): ThemePalette | undefined => {
  if (!hasSys(theme)) return undefined;
  const colors = theme.sys?.color;
  const palette = colors?.[paletteKey];
  return typeof palette === "object" && palette !== null ? palette : undefined;
};

export const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === "object") {
    const candidate = value as {
      toArray?: () => unknown[];
      toJS?: () => unknown;
    };
    if (typeof candidate.toArray === "function") {
      try {
        return candidate.toArray();
      } catch {
        return [];
      }
    }
    if (typeof candidate.toJS === "function") {
      try {
        const jsValue = candidate.toJS();
        return Array.isArray(jsValue) ? jsValue : [];
      } catch {
        return [];
      }
    }
  }
  return [];
};

export const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

export const readConfigValue = (candidate: unknown, key: string): unknown => {
  if (!candidate || typeof candidate !== "object") {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(candidate, key)) {
    return (candidate as { [key: string]: unknown })[key];
  }
  const maybeGetter = candidate as {
    get?: (prop: string) => unknown;
  };
  if (typeof maybeGetter.get === "function") {
    try {
      return maybeGetter.get(key);
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

export const formatNumber = (
  value: number,
  precision: number,
  emptyValueText: string
): string => {
  if (Number.isNaN(value) || !Number.isFinite(value)) return emptyValueText;
  try {
    return new Intl.NumberFormat(undefined, {
      maximumFractionDigits: precision,
      minimumFractionDigits: precision,
      useGrouping: false,
    }).format(value);
  } catch {
    return value.toFixed(precision);
  }
};

export const formatSnapshotForClipboard = (
  snapshot: ExportProjectionSnapshot,
  precision: number,
  _emptyValueText: string
): string | null => {
  const safePrecision = Math.max(0, Math.floor(precision));
  const formatValue = (value: number): string | null => {
    if (!Number.isFinite(value)) {
      return null;
    }
    try {
      return value.toFixed(safePrecision);
    } catch {
      return null;
    }
  };

  const firstFormatted = formatValue(snapshot.firstValue);
  const secondFormatted = formatValue(snapshot.secondValue);

  if (!firstFormatted || !secondFormatted) {
    return null;
  }

  return `${firstFormatted} ${secondFormatted}`;
};

const ensureProjectionLoaded = async (projection: __esri.projection) => {
  if (!projection || projection.isLoaded()) return;
  await projection.load();
};

const projectWgs84ToTarget = async (
  point: __esri.Point,
  targetSr: __esri.SpatialReference,
  projection: __esri.projection
): Promise<__esri.Point | null> => {
  try {
    await ensureProjectionLoaded(projection);
    const projected = projection.project(
      point,
      targetSr
    ) as __esri.Point | null;
    return normalizeLongitudeIfNeeded(projected);
  } catch {
    return null;
  }
};

const projectWebMercatorToWgs84 = (
  point: __esri.Point,
  webMercatorUtils: __esri.webMercatorUtils
): __esri.Point | null => {
  const geographic = webMercatorUtils.webMercatorToGeographic(
    point
  ) as __esri.Point | null;
  return normalizeLongitudeIfNeeded(geographic);
};

export const projectPointToOption = async (
  point: __esri.Point,
  option: CoordinateOption,
  modules: KoordinaterModules,
  getSpatialReference: (wkid: number) => __esri.SpatialReference | null
): Promise<__esri.Point | null> => {
  if (!point?.spatialReference || !modules) return null;

  const { projection, webMercatorUtils } = modules;
  const sourceSr = point.spatialReference;

  if (sourceSr.wkid === option.wkid) {
    return normalizeLongitudeIfNeeded(clonePoint(modules, point));
  }

  const wgs84Clone = sourceSr.isWGS84
    ? normalizeLongitudeIfNeeded(clonePoint(modules, point))
    : null;

  if (sourceSr.isWGS84 && option.wkid === 4326) {
    return wgs84Clone;
  }

  if (isWebMercatorWkid(sourceSr.wkid) && option.wkid === 4326) {
    return projectWebMercatorToWgs84(point, webMercatorUtils);
  }

  const targetSr = getSpatialReference(option.wkid);
  if (!targetSr) return null;

  return await projectWgs84ToTarget(wgs84Clone ?? point, targetSr, projection);
};

export const buildProjectionSnapshot = async (
  point: __esri.Point,
  option: CoordinateOption,
  modules: KoordinaterModules,
  getSpatialReference: (wkid: number) => __esri.SpatialReference | null
): Promise<ExportProjectionSnapshot | null> => {
  const projected = await projectPointToOption(
    point,
    option,
    modules,
    getSpatialReference
  );
  if (!projected) return null;

  const firstValue = option.valueOrder === "xy" ? projected.x : projected.y;
  const secondValue = option.valueOrder === "xy" ? projected.y : projected.x;

  return {
    wkid: option.wkid,
    system: option.system,
    firstValue,
    secondValue,
    firstAxis: option.axisMessageKeys[0],
    secondAxis: option.axisMessageKeys[1],
  };
};

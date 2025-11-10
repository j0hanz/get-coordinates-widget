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

const ensureProjectionLoaded = async (projection: __esri.projection) => {
  if (!projection || projection.isLoaded()) return;
  await projection.load();
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
    const geographic = webMercatorUtils.webMercatorToGeographic(
      point
    ) as __esri.Point | null;
    return normalizeLongitudeIfNeeded(geographic);
  }

  const targetSr = getSpatialReference(option.wkid);
  if (!targetSr) return null;

  try {
    await ensureProjectionLoaded(projection);
    const projected = projection.project(
      wgs84Clone ?? point,
      targetSr
    ) as __esri.Point | null;
    return normalizeLongitudeIfNeeded(projected);
  } catch {
    return null;
  }
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

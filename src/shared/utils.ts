import copy from "copy-to-clipboard";
import { AXIS_VALUE_SEPARATOR } from "../config/constants";
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

const coerceBoolean = (
  value: boolean | undefined,
  arrayValue: readonly unknown[] | null | undefined
): boolean => {
  if (typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(arrayValue)) {
    return arrayValue.length > 0;
  }
  return false;
};

export const evaluateKoordinaterReadiness = (
  params: EvaluateReadinessParams
): KoordinaterReadiness => {
  const hasMap = coerceBoolean(params.hasMap, params.mapWidgetIds);
  if (!hasMap) {
    return {
      hasMap: false,
      hasFormats: false,
      status: "no-map",
      messageKey: "noView",
    };
  }

  const hasFormats = coerceBoolean(params.hasFormats, params.enabledWkids);
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

export const hasMethod = <K extends string>(
  value: unknown,
  methodName: K
): value is { [P in K]: (...args: unknown[]) => unknown } & object => {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { [key: string]: unknown })[methodName] === "function"
  );
};

const hasToArray = <T = string | number>(
  value: unknown
): value is ImmutableArrayLike<T> => {
  return hasMethod<"toArray">(value, "toArray");
};

export const toArrayValue = (
  source: MultiSelectValue
): Array<string | number> => {
  if (!source) {
    return [];
  }
  if (Array.isArray(source)) {
    return [...source];
  }
  if (hasToArray(source)) {
    return source.toArray();
  }
  return [];
};

export const isValidClipboardText = (
  value: string | null | undefined,
  emptyValueText: string
) => Boolean(value && value !== emptyValueText);

export const isFiniteNumber = (value: number): boolean =>
  Number.isFinite(value);

export const isWebMercatorWkid = (wkid?: number): boolean =>
  wkid === 102100 || wkid === 3857 || wkid === 102113;

const hasClone = (
  point: __esri.Point
): point is __esri.Point & { clone: () => __esri.Point } => {
  return hasMethod<"clone">(point, "clone");
};

export const clonePoint = (
  modules: KoordinaterModules,
  point: __esri.Point
): __esri.Point => {
  if (hasClone(point)) {
    return point.clone();
  }
  const basePoint: __esri.Point = point;
  const { Point } = modules;
  return new Point({
    x: basePoint.x,
    y: basePoint.y,
    spatialReference: basePoint.spatialReference,
  });
};

const hasNormalize = (
  point: __esri.Point | null
): point is __esri.Point & { normalize: () => void } => {
  return (
    point !== null &&
    !!point.spatialReference?.isWGS84 &&
    hasMethod<"normalize">(point, "normalize")
  );
};

export const normalizeLongitudeIfNeeded = (
  point: __esri.Point | null
): __esri.Point | null => {
  if (hasNormalize(point)) {
    try {
      point.normalize();
    } catch {
      /* ignore normalization errors */
    }
  }
  return point;
};

const spatialReferenceCache: { [wkid: number]: __esri.SpatialReference } = {};

export const buildSpatialReferenceGetter = (
  modules: KoordinaterModules | null
) => {
  return (wkid: number): __esri.SpatialReference | null => {
    if (!modules) return null;
    let sr = spatialReferenceCache[wkid];
    if (!sr) {
      try {
        const SpatialReference = modules.SpatialReference;
        sr = new SpatialReference({ wkid });
        spatialReferenceCache[wkid] = sr;
      } catch {
        return null;
      }
    }
    return sr;
  };
};

export const hasSys = (
  candidate: ThemeLike
): candidate is NonNullable<ThemeLike> & ThemeRecord => {
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

export const toArray = <T = unknown>(value: unknown): T[] => {
  if (Array.isArray(value)) {
    return value as T[];
  }
  if (value && typeof value === "object") {
    const candidate = value as {
      toArray?: () => T[];
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
        return Array.isArray(jsValue) ? (jsValue as T[]) : [];
      } catch {
        return [];
      }
    }
  }
  return [];
};

export const toNumber = (value: unknown): number | null => {
  if (typeof value === "number" && isFiniteNumber(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (isFiniteNumber(parsed)) {
      return parsed;
    }
  }
  return null;
};

export const parseIntOrNull = (
  value: unknown,
  event?: React.ChangeEvent<HTMLInputElement>
): number | null => {
  if (typeof value === "number" && isFiniteNumber(value)) {
    return Math.floor(value);
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (isFiniteNumber(parsed)) {
      return parsed;
    }
  }
  if (event?.target?.value) {
    const parsed = parseInt(event.target.value, 10);
    if (isFiniteNumber(parsed)) {
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
  if (Number.isNaN(value) || !isFiniteNumber(value)) return emptyValueText;
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

export const formatCoordinateDisplay = (
  snapshot: ExportProjectionSnapshot,
  precision: number,
  translate: (id: string) => string,
  emptyValueText: string
): string => {
  const firstFormatted = formatNumber(
    snapshot.firstValue,
    precision,
    emptyValueText
  );
  const secondFormatted = formatNumber(
    snapshot.secondValue,
    precision,
    emptyValueText
  );

  return `${translate(snapshot.firstAxis)}:${AXIS_VALUE_SEPARATOR}${firstFormatted}, ${translate(snapshot.secondAxis)}:${AXIS_VALUE_SEPARATOR}${secondFormatted}`;
};

export const formatSnapshotForClipboard = (
  snapshot: ExportProjectionSnapshot,
  precision: number,
  _emptyValueText: string
): string | null => {
  const safePrecision = Math.max(0, Math.floor(precision));
  const formatValue = (value: number): string | null => {
    if (!isFiniteNumber(value)) {
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

  return `${firstFormatted},${secondFormatted}`;
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
    return projected;
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

  if (isWebMercatorWkid(sourceSr.wkid) && option.wkid === 4326) {
    return projectWebMercatorToWgs84(point, webMercatorUtils);
  }

  if (sourceSr.isWGS84 && option.wkid === 4326) {
    return normalizeLongitudeIfNeeded(clonePoint(modules, point));
  }

  const targetSr = getSpatialReference(option.wkid);
  if (!targetSr) return null;

  const sourcePoint = sourceSr.isWGS84
    ? normalizeLongitudeIfNeeded(clonePoint(modules, point))
    : point;

  const projected = await projectWgs84ToTarget(
    sourcePoint,
    targetSr,
    projection
  );
  return normalizeLongitudeIfNeeded(projected);
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

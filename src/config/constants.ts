import { clamp, readConfigValue, toArray, toNumber } from "../shared/utils";
import { StyleVariant } from "./enums";
import type {
  AxisMessageKey,
  CoordinateOption,
  CoordinateSystemCatalogEntry,
  CoordinateSystemId,
  ExportFormat,
  ExportFormatDescriptor,
  KoordinaterConfig,
  PinIconDefinition,
  PinIconId,
  RestrictEnabledWkidsOptions,
} from "./types";

export const SUPPORTED_SYSTEM_IDS = [
  "sweref99",
  "rt90",
  "wgs84",
  "etrs89",
  "itrf",
] as const satisfies readonly CoordinateSystemId[];

export const SUPPORTED_SYSTEM_ID_SET = new Set<CoordinateSystemId>(
  SUPPORTED_SYSTEM_IDS
);

export const FALLBACK_SYSTEM_ID: CoordinateSystemId = "sweref99";

export const GEODETIC_MINIMUM_PRECISION = 5;

export const PRECISION_LIMITS: Readonly<{ min: number; max: number }> =
  Object.freeze({
    min: 0,
    max: 6,
  });

export const DEFAULT_STYLE_VARIANT = StyleVariant.Default;

export const WIDGET_STARTUP_DELAY_MS = 1500;

export const MIN_SPINNER_DISPLAY_MS = 500;

export const LAT_LONG_AXIS_KEYS = new Set<AxisMessageKey>([
  "latitude",
  "longitude",
]);

export const SWEREF_ZONES: readonly CoordinateOption[] = Object.freeze([
  {
    id: "sweref_99_tm",
    wkid: 3006,
    label: "SWEREF 99 TM (EPSG:3006)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_12_00",
    wkid: 3007,
    label: "SWEREF 99 12 00 (EPSG:3007)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_13_30",
    wkid: 3008,
    label: "SWEREF 99 13 30 (EPSG:3008)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_15_00",
    wkid: 3009,
    label: "SWEREF 99 15 00 (EPSG:3009)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_16_30",
    wkid: 3010,
    label: "SWEREF 99 16 30 (EPSG:3010)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_18_00",
    wkid: 3011,
    label: "SWEREF 99 18 00 (EPSG:3011)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_14_15",
    wkid: 3012,
    label: "SWEREF 99 14 15 (EPSG:3012)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_15_45",
    wkid: 3013,
    label: "SWEREF 99 15 45 (EPSG:3013)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_17_15",
    wkid: 3014,
    label: "SWEREF 99 17 15 (EPSG:3014)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_18_45",
    wkid: 3015,
    label: "SWEREF 99 18 45 (EPSG:3015)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_20_15",
    wkid: 3016,
    label: "SWEREF 99 20 15 (EPSG:3016)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_21_45",
    wkid: 3017,
    label: "SWEREF 99 21 45 (EPSG:3017)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
  {
    id: "sweref_99_23_15",
    wkid: 3018,
    label: "SWEREF 99 23 15 (EPSG:3018)",
    system: "sweref99",
    axisMessageKeys: ["northing", "easting"],
    valueOrder: "yx",
  },
]);

export const RT90_ZONES: readonly CoordinateOption[] = Object.freeze([
  {
    id: "rt90_7_5_gon_v",
    wkid: 3020,
    label: "RT 90 7,5 gon V (EPSG:3020)",
    system: "rt90",
    axisMessageKeys: ["easting", "northing"],
    valueOrder: "xy",
  },
  {
    id: "rt90_5_gon_v",
    wkid: 3021,
    label: "RT 90 5 gon V (EPSG:3021)",
    system: "rt90",
    axisMessageKeys: ["easting", "northing"],
    valueOrder: "xy",
  },
  {
    id: "rt90_2_5_gon_v",
    wkid: 3022,
    label: "RT 90 2,5 gon V (EPSG:3022)",
    system: "rt90",
    axisMessageKeys: ["easting", "northing"],
    valueOrder: "xy",
  },
  {
    id: "rt90_0_gon",
    wkid: 3023,
    label: "RT 90 0 gon (EPSG:3023)",
    system: "rt90",
    axisMessageKeys: ["easting", "northing"],
    valueOrder: "xy",
  },
  {
    id: "rt90_2_5_gon_o",
    wkid: 3024,
    label: "RT 90 2,5 gon O (EPSG:3024)",
    system: "rt90",
    axisMessageKeys: ["easting", "northing"],
    valueOrder: "xy",
  },
  {
    id: "rt90_5_gon_o",
    wkid: 3025,
    label: "RT 90 5 gon O (EPSG:3025)",
    system: "rt90",
    axisMessageKeys: ["easting", "northing"],
    valueOrder: "xy",
  },
]);

export const WGS84_OPTIONS: readonly CoordinateOption[] = Object.freeze([
  {
    id: "wgs84",
    wkid: 4326,
    label: "WGS 84 lat/long (EPSG:4326)",
    system: "wgs84",
    axisMessageKeys: ["latitude", "longitude"],
    valueOrder: "yx",
  },
]);

export const SWEREF_GEODETIC_OPTIONS: readonly CoordinateOption[] =
  Object.freeze([
    {
      id: "sweref_99_geodetic",
      wkid: 4619,
      label: "SWEREF 99 lat/long (EPSG:4619)",
      system: "sweref99",
      axisMessageKeys: ["latitude", "longitude"],
      valueOrder: "yx",
    },
  ]);

export const WGS84_DERIVED_OPTIONS: readonly CoordinateOption[] = Object.freeze(
  [
    {
      id: "wgs84_web_mercator",
      wkid: 3857,
      label: "WGS 84 Web Mercator (EPSG:3857)",
      system: "wgs84",
      axisMessageKeys: ["easting", "northing"],
      valueOrder: "xy",
    },
    {
      id: "wgs84_utm33n",
      wkid: 32633,
      label: "WGS 84 / UTM zone 33N (EPSG:32633)",
      system: "wgs84",
      axisMessageKeys: ["easting", "northing"],
      valueOrder: "xy",
    },
  ]
);

export const ETRS89_OPTIONS: readonly CoordinateOption[] = Object.freeze([
  {
    id: "etrs89",
    wkid: 4258,
    label: "ETRS89 lat/long (EPSG:4258)",
    system: "etrs89",
    axisMessageKeys: ["latitude", "longitude"],
    valueOrder: "yx",
  },
]);

export const ITRF_OPTIONS: readonly CoordinateOption[] = Object.freeze([
  {
    id: "itrf2014",
    wkid: 7912,
    label: "ITRF2014 lat/long (EPSG:7912)",
    system: "itrf",
    axisMessageKeys: ["latitude", "longitude"],
    valueOrder: "yx",
  },
]);

export const DEFAULT_SWEREF_WKID = 3006;
export const DEFAULT_RT90_WKID = 3022;
export const DEFAULT_WGS84_WKID = 4326;
export const DEFAULT_ETRS89_WKID = 4258;
export const DEFAULT_ITRF_WKID = 7912;

export const SWEREF_GROUP_OPTIONS: readonly CoordinateOption[] = Object.freeze([
  ...SWEREF_ZONES,
  ...SWEREF_GEODETIC_OPTIONS,
]);

export const WGS84_GROUP_OPTIONS: readonly CoordinateOption[] = Object.freeze([
  ...WGS84_OPTIONS,
  ...WGS84_DERIVED_OPTIONS,
]);

export const SWEREF_WKID_LIST: readonly number[] = Object.freeze(
  SWEREF_GROUP_OPTIONS.map((option) => option.wkid)
);

export const SWEREF_WKID_SET = new Set<number>(SWEREF_WKID_LIST);

export const DEFAULT_SWEREF_WKIDS: readonly number[] = Object.freeze([
  ...SWEREF_WKID_LIST,
]);

const SYSTEM_LABEL_DEFINITIONS = Object.freeze({
  sweref99: { messageKey: "systemLabelSweref99", defaultLabel: "SWEREF 99" },
  rt90: { messageKey: "systemLabelRt90", defaultLabel: "RT 90" },
  wgs84: { messageKey: "systemLabelWgs84", defaultLabel: "WGS 84" },
  etrs89: { messageKey: "systemLabelEtrs89", defaultLabel: "ETRS89" },
  itrf: { messageKey: "systemLabelItrf", defaultLabel: "ITRF2014" },
} satisfies {
  readonly [key in CoordinateSystemId]: {
    readonly messageKey: string;
    readonly defaultLabel: string;
  };
});

export const COORDINATE_SYSTEM_CATALOG: readonly CoordinateSystemCatalogEntry[] =
  Object.freeze([
    {
      id: "sweref99",
      label: SYSTEM_LABEL_DEFINITIONS.sweref99.defaultLabel,
      labelMessageKey: SYSTEM_LABEL_DEFINITIONS.sweref99.messageKey,
      defaultWkid: DEFAULT_SWEREF_WKID,
      options: SWEREF_GROUP_OPTIONS,
    },
    {
      id: "rt90",
      label: SYSTEM_LABEL_DEFINITIONS.rt90.defaultLabel,
      labelMessageKey: SYSTEM_LABEL_DEFINITIONS.rt90.messageKey,
      defaultWkid: DEFAULT_RT90_WKID,
      options: RT90_ZONES,
    },
    {
      id: "wgs84",
      label: SYSTEM_LABEL_DEFINITIONS.wgs84.defaultLabel,
      labelMessageKey: SYSTEM_LABEL_DEFINITIONS.wgs84.messageKey,
      defaultWkid: DEFAULT_WGS84_WKID,
      options: WGS84_GROUP_OPTIONS,
    },
    {
      id: "etrs89",
      label: SYSTEM_LABEL_DEFINITIONS.etrs89.defaultLabel,
      labelMessageKey: SYSTEM_LABEL_DEFINITIONS.etrs89.messageKey,
      defaultWkid: DEFAULT_ETRS89_WKID,
      options: ETRS89_OPTIONS,
    },
    {
      id: "itrf",
      label: SYSTEM_LABEL_DEFINITIONS.itrf.defaultLabel,
      labelMessageKey: SYSTEM_LABEL_DEFINITIONS.itrf.messageKey,
      defaultWkid: DEFAULT_ITRF_WKID,
      options: ITRF_OPTIONS,
    },
  ]);

export const COORDINATE_OPTIONS: CoordinateOption[] =
  COORDINATE_SYSTEM_CATALOG.flatMap((entry) => Array.from(entry.options));

export const COORDINATE_OPTIONS_BY_WKID: ReadonlyMap<number, CoordinateOption> =
  new Map(COORDINATE_OPTIONS.map((option) => [option.wkid, option]));

export const COORDINATE_OPTION_ORDER: ReadonlyMap<number, number> = new Map(
  COORDINATE_OPTIONS.map((option, index) => [option.wkid, index])
);

export const COORDINATE_SYSTEM_META_LOOKUP: ReadonlyMap<
  CoordinateSystemId,
  CoordinateSystemCatalogEntry
> = new Map(COORDINATE_SYSTEM_CATALOG.map((entry) => [entry.id, entry]));

export const DEFAULT_WKID_BY_SYSTEM: Readonly<{
  [K in CoordinateSystemId]: number;
}> = Object.freeze({
  sweref99: DEFAULT_SWEREF_WKID,
  rt90: DEFAULT_RT90_WKID,
  wgs84: DEFAULT_WGS84_WKID,
  etrs89: DEFAULT_ETRS89_WKID,
  itrf: DEFAULT_ITRF_WKID,
});

export const PIN_COLOR_HEX_PATTERN = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;

export const DEFAULT_PIN_FILL_COLOR = "#000000";

export const PIN_ICON_DEFINITIONS: readonly PinIconDefinition[] = Object.freeze(
  [
    {
      id: "classicPin",
      labelMessageKey: "pinIconClassicPin",
      viewBox: "0 0 32 32",
      svgBody:
        '<path fill="{{color}}" d="M16 3.5A7.5 7.5 0 0 0 8.5 11c0 4.143 7.5 18.12 7.5 18.12S23.5 15.144 23.5 11A7.5 7.5 0 0 0 16 3.5zm0 11.084a3.583 3.583 0 1 1 0-7.168a3.583 3.583 0 1 1 0 7.168z"/>',
      mapSymbol: { width: 22, height: 22, yOffset: 10 },
    },
    {
      id: "targetCircle",
      labelMessageKey: "pinIconTargetCircle",
      viewBox: "0 0 2048 2048",
      svgBody:
        '<path fill="{{color}}" d="M1024 128q123 0 237 32t214 90t182 141t140 181t91 214t32 238q0 123-32 237t-90 214t-141 182t-181 140t-214 91t-238 32q-123 0-237-32t-214-90t-182-141t-140-181t-91-214t-32-238q0-123 32-237t90-214t141-182t181-140t214-91t238-32zm0 1664q106 0 204-27t183-78t156-120t120-155t77-184t28-204q0-106-27-204t-78-183t-120-156t-155-120t-184-77t-204-28q-106 0-204 27t-183 78t-156 120t-120 155t-77 184t-28 204q0 106 27 204t78 183t120 156t155 120t184 77t204 28zm0-1152q79 0 149 30t122 83t82 122t31 149q0 79-30 149t-83 122t-122 82t-149 31q-79 0-149-30t-122-83t-82-122t-31-149q0-79 30-149t83-122t122-82t149-31z"/>',
      mapSymbol: { width: 22, height: 22, yOffset: 0 },
    },
    {
      id: "dropMarker",
      labelMessageKey: "pinIconDropMarker",
      viewBox: "-7 -1.5 24 24",
      svgBody:
        '<path fill="{{color}}" d="M4 10.465a5.002 5.002 0 0 1 1-9.9a5 5 0 0 1 1 9.9v9.1a1 1 0 0 1-2 0v-9.1z"/>',
      mapSymbol: { width: 22, height: 22, yOffset: 10 },
    },
    {
      id: "beaconPin",
      labelMessageKey: "pinIconBeaconPin",
      viewBox: "0 0 1024 1024",
      svgBody:
        '<path fill="{{color}}" d="M480 512h64v320h-64z"/><path fill="{{color}}" d="M192 896h640a64 64 0 0 0-64-64H256a64 64 0 0 0-64 64zm64-128h512a128 128 0 0 1 128 128v64H128v-64a128 128 0 0 1 128-128zm256-256a192 192 0 1 0 0-384a192 192 0 0 0 0 384zm0 64a256 256 0 1 1 0-512a256 256 0 0 1 0 512z"/>',
      mapSymbol: { width: 22, height: 22, yOffset: 6 },
    },
    {
      id: "ringPin",
      labelMessageKey: "pinIconRingPin",
      viewBox: "0 0 24 24",
      svgBody:
        '<g fill="none" stroke="{{color}}" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.2"><path d="M2 12h3m14 0h3M12 2v3m0 14v3"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/></g>',
      mapSymbol: { width: 22, height: 22, yOffset: 0 },
    },
  ]
);

export const PIN_ICON_LOOKUP: ReadonlyMap<PinIconId, PinIconDefinition> =
  new Map(
    PIN_ICON_DEFINITIONS.map((definition) => [definition.id, definition])
  );

export const DEFAULT_PIN_ICON_ID: PinIconId = PIN_ICON_DEFINITIONS[0].id;

export const EXPORT_FORMATS: readonly ExportFormatDescriptor[] = Object.freeze([
  {
    key: "json",
    extension: "json",
    mime: "application/json",
    messageKey: "exportJson",
  },
  {
    key: "xml",
    extension: "xml",
    mime: "application/xml",
    messageKey: "exportXml",
  },
  {
    key: "yaml",
    extension: "yaml",
    mime: "application/x-yaml",
    messageKey: "exportYaml",
  },
]);

export const EXPORT_FORMAT_LOOKUP: ReadonlyMap<
  ExportFormat,
  ExportFormatDescriptor
> = new Map(EXPORT_FORMATS.map((format) => [format.key, format]));

export const AXIS_VALUE_SEPARATOR = "\u202F";

export const NO_VALUE_MESSAGE_KEY = "noValue";

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const ConfigCoercers = {
  string: (value: unknown, fallback: string): string => {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
    return fallback;
  },
  number: (value: unknown): number | null => {
    const parsed = toNumber(value);
    return parsed === null ? null : parsed;
  },
  boolean: (value: unknown, fallback: boolean): boolean => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const lowered = value.trim().toLowerCase();
      if (lowered === "true") return true;
      if (lowered === "false") return false;
    }
    if (typeof value === "number") {
      if (value === 1) return true;
      if (value === 0) return false;
    }
    return fallback;
  },
};

const normalizeHex = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (!PIN_COLOR_HEX_PATTERN.test(prefixed)) {
    return null;
  }
  return prefixed.toUpperCase();
};

export const ConfigSanitizers = {
  precision: (
    value: unknown,
    fallback: number,
    limits?: { min?: number; max?: number }
  ): number => {
    const min =
      typeof limits?.min === "number" ? limits.min : PRECISION_LIMITS.min;
    const max =
      typeof limits?.max === "number" ? limits.max : PRECISION_LIMITS.max;
    const candidate = ConfigCoercers.number(value);
    if (candidate === null) {
      const fallbackCandidate = ConfigCoercers.number(fallback);
      const resolvedFallback =
        fallbackCandidate === null ? PRECISION_LIMITS.min : fallbackCandidate;
      return clamp(Math.round(resolvedFallback), min, max);
    }
    return clamp(Math.round(candidate), min, max);
  },
  hexColor: (value: unknown, fallback: string): string => {
    if (typeof value === "string") {
      const normalized = normalizeHex(value);
      if (normalized) {
        return normalized;
      }
    }
    const normalizedFallback = normalizeHex(fallback);
    return normalizedFallback ?? DEFAULT_PIN_FILL_COLOR;
  },
  pinIconId: (value: unknown, fallback?: PinIconId): PinIconId => {
    if (typeof value === "string" && PIN_ICON_LOOKUP.has(value as PinIconId)) {
      return value as PinIconId;
    }
    if (fallback && PIN_ICON_LOOKUP.has(fallback)) {
      return fallback;
    }
    return DEFAULT_PIN_ICON_ID;
  },
  wkid: (value: unknown, fallback: number): number => {
    const candidate = ConfigCoercers.number(value);
    if (candidate === null) {
      return fallback;
    }
    const option = COORDINATE_OPTIONS_BY_WKID.get(candidate);
    return option ? option.wkid : fallback;
  },
};

export const ConfigValidators = {
  restrictEnabledWkids: (
    wkids: readonly unknown[] | null | undefined,
    includeExtended: boolean,
    options?: RestrictEnabledWkidsOptions
  ): number[] => {
    const availableOptions = getCoordinateOptionsForScope(includeExtended);
    const allowedSet = new Set(availableOptions.map((option) => option.wkid));
    const desiredValues = new Set<number>();
    if (Array.isArray(wkids)) {
      for (const item of wkids) {
        const numeric = toNumber(item);
        if (numeric != null) {
          desiredValues.add(numeric);
        }
      }
    }
    const restricted: number[] = [];
    for (const option of availableOptions) {
      if (desiredValues.has(option.wkid) && allowedSet.has(option.wkid)) {
        restricted.push(option.wkid);
      }
    }
    if (restricted.length === 0 && !options?.allowEmpty) {
      return availableOptions.map((option) => option.wkid);
    }
    return restricted;
  },
};

export const createDefaultSwerefWkids = (): number[] => {
  return Array.from(DEFAULT_SWEREF_WKIDS);
};

export const getCoordinateOptionsForScope = (
  includeExtended: boolean
): CoordinateOption[] => {
  if (includeExtended) {
    return COORDINATE_OPTIONS.map((option) => ({ ...option }));
  }
  return SWEREF_GROUP_OPTIONS.map((option) => ({ ...option }));
};

export const computeAllowedZones = (
  enabledWkids: readonly number[] | null | undefined
): CoordinateOption[] => {
  if (!enabledWkids || enabledWkids.length === 0) {
    return SWEREF_GROUP_OPTIONS.map((option) => ({ ...option }));
  }
  const desired = new Set<number>();
  for (const wkid of enabledWkids) {
    if (typeof wkid === "number") {
      desired.add(wkid);
    }
  }
  const options: CoordinateOption[] = [];
  for (const option of COORDINATE_OPTIONS) {
    if (desired.has(option.wkid)) {
      options.push({ ...option });
    }
  }
  if (options.length === 0) {
    return SWEREF_GROUP_OPTIONS.map((option) => ({ ...option }));
  }
  return options;
};

export const ensureValidWkid = (
  wkid: number,
  allowedWkids: readonly number[]
): number => {
  if (Array.isArray(allowedWkids) && allowedWkids.includes(wkid)) {
    return wkid;
  }
  if (Array.isArray(allowedWkids) && allowedWkids.length > 0) {
    return allowedWkids[0];
  }
  return DEFAULT_SWEREF_WKID;
};

export const getCoordinateOption = (
  wkid: number
): CoordinateOption | undefined => {
  return COORDINATE_OPTIONS_BY_WKID.get(wkid);
};

export const getDefaultWkidForSystem = (
  systemId: CoordinateSystemId
): number => {
  return DEFAULT_WKID_BY_SYSTEM[systemId] ?? DEFAULT_SWEREF_WKID;
};

const stripPrefixFromLabel = (
  label: string,
  candidate: string
): string | null => {
  const collapsedCandidate = candidate.replace(/\s+/g, " ").trim();
  if (!collapsedCandidate) return null;
  const escaped = collapsedCandidate
    .split(/\s+/)
    .map((segment) => escapeRegExp(segment))
    .join("\\s+");
  // Safe: Input is escaped via escapeRegExp before RegExp construction
  const pattern = new RegExp(`^${escaped}(?:\\s*[-–—]\\s*|\\s+)`, "i");
  const match = label.match(pattern);
  if (!match) {
    return null;
  }
  return label.slice(match[0].length).trim();
};

export const formatCoordinateOptionLabel = (
  option: CoordinateOption,
  translate: (key: string) => string
): string => {
  const meta = COORDINATE_SYSTEM_META_LOOKUP.get(option.system);
  const translatedSystem = meta ? translate(meta.labelMessageKey) : null;
  const systemLabel =
    translatedSystem && translatedSystem !== meta?.label
      ? translatedSystem
      : (meta?.label ?? option.system.toUpperCase());

  const originalLabel = option.label.trim();
  if (!originalLabel) return systemLabel;

  const candidates: string[] = [
    translatedSystem || "",
    meta?.label || "",
    (translatedSystem || "").replace(/\s+/g, ""),
    (meta?.label || "").replace(/\s+/g, ""),
  ].filter(Boolean);

  let suffix = originalLabel;
  for (const candidate of candidates) {
    const stripped = stripPrefixFromLabel(originalLabel, candidate);
    if (stripped) {
      suffix = stripped;
      break;
    }
  }

  if (suffix.toLowerCase().startsWith(systemLabel.toLowerCase())) {
    return suffix;
  }
  return `${systemLabel} – ${suffix}`;
};

export const resolvePrecisionForOption = (
  option: CoordinateOption,
  configuredPrecision: number
): number => {
  const isGeodetic = option.axisMessageKeys.some((axis) =>
    LAT_LONG_AXIS_KEYS.has(axis)
  );
  const sanitized = clamp(
    Math.floor(Number.isFinite(configuredPrecision) ? configuredPrecision : 0),
    PRECISION_LIMITS.min,
    PRECISION_LIMITS.max
  );
  if (!isGeodetic) {
    return sanitized;
  }
  return Math.max(sanitized, GEODETIC_MINIMUM_PRECISION);
};

export const resolvePrecisionForAxes = (
  axes: readonly [AxisMessageKey, AxisMessageKey],
  configuredPrecision: number
): number => {
  const isGeodetic = axes.some((axis) => LAT_LONG_AXIS_KEYS.has(axis));
  const sanitized = clamp(
    Math.floor(Number.isFinite(configuredPrecision) ? configuredPrecision : 0),
    PRECISION_LIMITS.min,
    PRECISION_LIMITS.max
  );
  if (!isGeodetic) {
    return sanitized;
  }
  return Math.max(sanitized, GEODETIC_MINIMUM_PRECISION);
};

export const isCoordinateSystemId = (
  value: unknown
): value is CoordinateSystemId => {
  return (
    typeof value === "string" &&
    SUPPORTED_SYSTEM_ID_SET.has(value as CoordinateSystemId)
  );
};

export const defaultConfig: KoordinaterConfig = Object.freeze({
  swerefWkid: DEFAULT_SWEREF_WKID,
  precision: PRECISION_LIMITS.min,
  showExportButton: false,
  copyOnClick: false,
  enablePin: true,
  includeExtendedSystems: false,
  enabledWkids: Array.from(DEFAULT_SWEREF_WKIDS),
  pinFillColor: DEFAULT_PIN_FILL_COLOR,
  pinIconId: DEFAULT_PIN_ICON_ID,
  styleVariant: DEFAULT_STYLE_VARIANT,
});

const coerceEnabledWkids = (
  candidate: unknown,
  includeExtended: boolean
): number[] => {
  const values = toArray(candidate);
  return ConfigValidators.restrictEnabledWkids(values, includeExtended, {
    allowEmpty: false,
  });
};

export const buildConfig = (partial: unknown): KoordinaterConfig => {
  const base: KoordinaterConfig = {
    swerefWkid: defaultConfig.swerefWkid,
    precision: defaultConfig.precision,
    showExportButton: defaultConfig.showExportButton,
    copyOnClick: defaultConfig.copyOnClick,
    enablePin: defaultConfig.enablePin,
    includeExtendedSystems: defaultConfig.includeExtendedSystems,
    enabledWkids: Array.from(defaultConfig.enabledWkids),
    pinFillColor: defaultConfig.pinFillColor,
    pinIconId: defaultConfig.pinIconId,
    styleVariant: defaultConfig.styleVariant ?? DEFAULT_STYLE_VARIANT,
  };

  const includeExtended = ConfigCoercers.boolean(
    readConfigValue(partial, "includeExtendedSystems"),
    base.includeExtendedSystems
  );

  const enabledWkids = coerceEnabledWkids(
    readConfigValue(partial, "enabledWkids"),
    includeExtended
  );

  const resolvedWkid = ensureValidWkid(
    ConfigSanitizers.wkid(
      readConfigValue(partial, "swerefWkid"),
      DEFAULT_SWEREF_WKID
    ),
    enabledWkids
  );

  const precision = ConfigSanitizers.precision(
    readConfigValue(partial, "precision"),
    base.precision
  );

  const showExportButton = ConfigCoercers.boolean(
    readConfigValue(partial, "showExportButton"),
    base.showExportButton
  );

  const copyOnClick = ConfigCoercers.boolean(
    readConfigValue(partial, "copyOnClick"),
    base.copyOnClick
  );

  const enablePin = ConfigCoercers.boolean(
    readConfigValue(partial, "enablePin"),
    base.enablePin
  );

  const pinFillColor = ConfigSanitizers.hexColor(
    readConfigValue(partial, "pinFillColor"),
    base.pinFillColor
  );

  const pinIconId = ConfigSanitizers.pinIconId(
    readConfigValue(partial, "pinIconId")
  );

  const styleVariantCandidate = readConfigValue(partial, "styleVariant");
  const styleVariant =
    styleVariantCandidate === StyleVariant.Linear ||
    styleVariantCandidate === StyleVariant.Default
      ? (styleVariantCandidate as StyleVariant)
      : (base.styleVariant ?? DEFAULT_STYLE_VARIANT);

  return {
    swerefWkid: resolvedWkid,
    precision,
    showExportButton,
    copyOnClick,
    enablePin,
    includeExtendedSystems: includeExtended,
    enabledWkids,
    pinFillColor,
    pinIconId,
    styleVariant,
  };
};

export const sanitizePrecision = (
  value: unknown,
  fallback: number,
  limits?: { min?: number; max?: number }
): number => ConfigSanitizers.precision(value, fallback, limits);

export const resolveEffectiveWkid = (
  wkid: number,
  _longitude?: number
): number => {
  const option = getCoordinateOption(wkid);
  if (!option) {
    return getDefaultWkidForSystem(FALLBACK_SYSTEM_ID);
  }
  return option.wkid;
};

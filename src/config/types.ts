import type {
  AllWidgetProps,
  ImmutableObject,
  IMThemeVariables,
  ThemeVariables,
} from "jimu-core";

export type CoordinateSystemId =
  | "sweref99"
  | "rt90"
  | "wgs84"
  | "etrs89"
  | "itrf";

export type AxisMessageKey = "easting" | "northing" | "latitude" | "longitude";

export interface CoordinateOption {
  id: string;
  wkid: number;
  label: string;
  system: CoordinateSystemId;
  axisMessageKeys: readonly [AxisMessageKey, AxisMessageKey];
  valueOrder: "xy" | "yx";
}

export interface CoordinateSystemCatalogEntry {
  readonly id: CoordinateSystemId;
  readonly label: string;
  readonly labelMessageKey: string;
  readonly defaultWkid: number;
  readonly options: readonly CoordinateOption[];
}

export interface KoordinaterConfig {
  swerefWkid: number;
  precision: number;
  showExportButton: boolean;
  copyOnClick: boolean;
  enablePin: boolean;
  includeExtendedSystems: boolean;
  enabledWkids: number[];
  pinFillColor: string;
  pinIconId: PinIconId;
}

export type IMKoordinaterConfig = ImmutableObject<KoordinaterConfig>;

export interface KoordinaterModules {
  Point: new (...args: unknown[]) => __esri.Point;
  SpatialReference: new (...args: unknown[]) => __esri.SpatialReference;
  projection: __esri.projection;
  webMercatorUtils: __esri.webMercatorUtils;
  Graphic: new (...args: unknown[]) => __esri.Graphic;
}

export interface PinGraphicManager {
  rememberPinnedPoint: (pt: __esri.Point | null) => void;
  applyGraphic: (pt: __esri.Point | null) => void;
  clearGraphic: () => void;
  getPinnedPoint: () => __esri.Point | null;
}

export interface ProjectionManager {
  rememberPoint: (pt: __esri.Point | null) => void;
  formatPoint: (pt: __esri.Point | null) => Promise<string>;
  getLastPoint: () => __esri.Point | null;
  getLastSnapshot: () => ExportProjectionSnapshot | null;
  hasSnapshot: () => boolean;
  clearSnapshot: () => void;
}

export interface ExportManager {
  handleExportSelect: (value: ExportFormat) => void;
  isReady: () => boolean;
}

export interface ExportAxisPayload {
  label: string;
  value: number;
}

export interface ExportPayload {
  wkid: number;
  system: CoordinateSystemId;
  axes: ExportAxisPayload[];
  zoneLabel: string;
  precision: number;
  timestamp: string;
  pointJSON: __esri.PointProperties | null;
}

export interface ExportProjectionSnapshot {
  wkid: number;
  system: CoordinateSystemId;
  firstValue: number;
  secondValue: number;
  firstAxis: AxisMessageKey;
  secondAxis: AxisMessageKey;
}

export type ExportFormat = "json" | "xml" | "yaml";

export interface ExportFormatDescriptor {
  readonly key: ExportFormat;
  readonly extension: string;
  readonly mime: string;
  readonly messageKey: string;
}

export type PinIconId =
  | "classicPin"
  | "targetCircle"
  | "dropMarker"
  | "beaconPin"
  | "ringPin";

export interface PinIconDefinition {
  readonly id: PinIconId;
  readonly labelMessageKey: string;
  readonly viewBox: string;
  readonly svgBody: string;
  readonly mapSymbol: {
    readonly width: number;
    readonly height: number;
    readonly yOffset: number;
  };
}

export interface RestrictEnabledWkidsOptions {
  readonly allowEmpty?: boolean;
}

export type KoordinaterReadinessStatus = "no-map" | "no-formats" | "ready";

export type KoordinaterReadinessMessageKey = "noView" | "noFormats" | null;

export interface KoordinaterReadiness {
  readonly hasMap: boolean;
  readonly hasFormats: boolean;
  readonly status: KoordinaterReadinessStatus;
  readonly messageKey: KoordinaterReadinessMessageKey;
}

export interface EvaluateReadinessParams {
  readonly hasMap?: boolean;
  readonly mapWidgetIds?: readonly string[] | null | undefined;
  readonly hasFormats?: boolean;
  readonly enabledWkids?: readonly number[] | null | undefined;
}

export interface ConfigSetter extends IMKoordinaterConfig {
  set: <K extends keyof KoordinaterConfig>(
    key: K,
    value: KoordinaterConfig[K]
  ) => IMKoordinaterConfig;
}

export interface ImmutableArrayLike<T> {
  toArray: () => T[];
}

export type MultiSelectValue =
  | Array<string | number>
  | ImmutableArrayLike<string | number>
  | undefined;

export type BooleanConfigKey = {
  [K in keyof KoordinaterConfig]: KoordinaterConfig[K] extends boolean
    ? K
    : never;
}[keyof KoordinaterConfig];

export type KoordinaterWidgetProps = AllWidgetProps<IMKoordinaterConfig>;

export type ThemeLike = ThemeVariables | IMThemeVariables | null | undefined;

export type NativeEventWithStop = Event & {
  stopImmediatePropagation?: () => void;
};

export type GraphicsLayerCtor = new (
  ...args: unknown[]
) => __esri.GraphicsLayer;

export interface ThemePalette {
  [tone: string]: string;
}

export interface ThemeColors {
  [palette: string]: ThemePalette | string;
}

export interface ThemeRecord {
  sys?: {
    color?: ThemeColors;
    spacing?: (value: number) => number | string;
  };
}

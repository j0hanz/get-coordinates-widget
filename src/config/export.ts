import {
  ConfigCoercers,
  EXPORT_FORMAT_LOOKUP,
  FALLBACK_SYSTEM_ID,
  isCoordinateSystemId,
  resolvePrecisionForAxes,
} from "./constants";
import type {
  AxisMessageKey,
  CoordinateSystemId,
  ExportAxisPayload,
  ExportFormat,
  ExportFormatDescriptor,
  ExportPayload,
  ExportProjectionSnapshot,
} from "./types";

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const escapeYamlString = (value: string) => value.replace(/"/g, '\\"');

export const isExportFormat = (value: unknown): value is ExportFormat =>
  typeof value === "string" && EXPORT_FORMAT_LOOKUP.has(value as ExportFormat);

const isExportAxisPayload = (value: unknown): value is ExportAxisPayload => {
  if (!value || typeof value !== "object") return false;
  const candidate = value as { [key: string]: unknown };
  return (
    typeof candidate.label === "string" &&
    typeof candidate.value === "number" &&
    Number.isFinite(candidate.value)
  );
};

const sanitizeAxes = (axes: unknown): ExportAxisPayload[] => {
  if (!Array.isArray(axes)) return [];
  return axes.filter(isExportAxisPayload);
};

const sanitizeTimestamp = (value: unknown): string => {
  try {
    const candidate = ConfigCoercers.string(value, "");
    if (!candidate) {
      return new Date().toISOString();
    }
    const parsed = Date.parse(candidate);
    if (Number.isNaN(parsed)) {
      return new Date().toISOString();
    }
    return new Date(parsed).toISOString();
  } catch {
    try {
      return new Date().toISOString();
    } catch {
      return new Date(Date.now()).toISOString();
    }
  }
};

const sanitizePointJson = (value: unknown): __esri.PointProperties | null =>
  value && typeof value === "object" ? (value as __esri.PointProperties) : null;

export const sanitizeExportPayload = (payload: unknown): ExportPayload => {
  const candidate =
    payload && typeof payload === "object"
      ? (payload as { [key: string]: unknown })
      : {};
  const sanitizedAxes = sanitizeAxes(candidate.axes);
  const safeWkid = ConfigCoercers.number(candidate.wkid) ?? 0;
  const safePrecision = ConfigCoercers.number(candidate.precision) ?? 0;
  const safeSystem: CoordinateSystemId = isCoordinateSystemId(candidate.system)
    ? candidate.system
    : FALLBACK_SYSTEM_ID;
  const zoneLabel = ConfigCoercers.string(candidate.zoneLabel, "");
  const timestamp = sanitizeTimestamp(candidate.timestamp);
  const pointJSON = sanitizePointJson(candidate.pointJSON);

  return {
    wkid: safeWkid,
    system: safeSystem,
    axes: sanitizedAxes,
    zoneLabel,
    precision: safePrecision,
    timestamp,
    pointJSON,
  };
};

const formatAxesAsXml = (axes: ExportAxisPayload[]): string =>
  axes
    .map(
      (axis) =>
        `  <axis>\n    <label>${escapeXml(axis.label)}</label>\n    <value>${escapeXml(String(axis.value))}</value>\n  </axis>`
    )
    .join("\n");

const formatAxesAsYaml = (axes: ExportAxisPayload[]): string[] =>
  axes.map(
    (axis) =>
      `  - label: "${escapeYamlString(axis.label)}"\n    value: ${axis.value}`
  );

const formatExportAsJson = (payload: ExportPayload) => {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return JSON.stringify(
      {
        error: "Serialization failed",
        wkid: payload.wkid,
        system: payload.system,
        zoneLabel: payload.zoneLabel,
      },
      null,
      2
    );
  }
};

const formatExportAsXml = (payload: ExportPayload) => {
  const axes = formatAxesAsXml(payload.axes);
  let pointJsonString = "null";
  try {
    pointJsonString = JSON.stringify(payload.pointJSON);
  } catch {
    pointJsonString = "null";
  }
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n<coordinates>` +
    `\n  <wkid>${escapeXml(String(payload.wkid))}</wkid>` +
    `\n  <system>${escapeXml(payload.system)}</system>` +
    `\n  <zoneLabel>${escapeXml(payload.zoneLabel)}</zoneLabel>` +
    `\n  <axes>\n${axes}\n  </axes>` +
    `\n  <precision>${escapeXml(String(payload.precision))}</precision>` +
    `\n  <timestamp>${escapeXml(payload.timestamp)}</timestamp>` +
    `\n  <pointJSON>${escapeXml(pointJsonString)}</pointJSON>` +
    "\n</coordinates>\n"
  );
};

const formatExportAsYaml = (payload: ExportPayload) => {
  let pointJsonString = "null";
  try {
    pointJsonString = JSON.stringify(payload.pointJSON);
  } catch {
    pointJsonString = "null";
  }
  return [
    `wkid: ${payload.wkid}`,
    `system: ${payload.system}`,
    `zoneLabel: "${escapeYamlString(payload.zoneLabel)}"`,
    "axes:",
    ...formatAxesAsYaml(payload.axes),
    `precision: ${payload.precision}`,
    `timestamp: "${payload.timestamp}"`,
    `pointJSON: ${pointJsonString}`,
  ].join("\n");
};

const getExportFormatMeta = (value: unknown): ExportFormatDescriptor | null => {
  if (typeof value !== "string") {
    return null;
  }
  const meta = EXPORT_FORMAT_LOOKUP.get(value as ExportFormat);
  return meta ?? null;
};

export const buildExportFilename = (
  payload: ExportPayload,
  format: ExportFormat
) => {
  const meta = getExportFormatMeta(format);
  const sanitizedPayload = sanitizeExportPayload(payload);
  const stem =
    `coords-${sanitizedPayload.system}-${sanitizedPayload.wkid}-${sanitizedPayload.timestamp}`
      .toLowerCase()
      .replace(/[^a-z0-9\-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  const ext = meta?.extension ?? format;
  return `${stem}.${ext}`;
};

const toFixedNumber = (value: number, decimals: number) =>
  Number(value.toFixed(decimals));

export const createExportPayload = (
  snapshot: ExportProjectionSnapshot,
  zoneLabel: string,
  configuredPrecision: number,
  axisLabels: [string, string],
  pointJSON: __esri.PointProperties | null
): ExportPayload => {
  const axes: [AxisMessageKey, AxisMessageKey] = [
    snapshot.firstAxis,
    snapshot.secondAxis,
  ];
  const appliedPrecision = resolvePrecisionForAxes(axes, configuredPrecision);
  return {
    wkid: snapshot.wkid,
    system: snapshot.system,
    axes: [
      {
        label: axisLabels[0],
        value: toFixedNumber(snapshot.firstValue, appliedPrecision),
      },
      {
        label: axisLabels[1],
        value: toFixedNumber(snapshot.secondValue, appliedPrecision),
      },
    ],
    zoneLabel,
    precision: appliedPrecision,
    timestamp: new Date().toISOString(),
    pointJSON,
  };
};

export const serializeExportPayload = (
  payload: ExportPayload,
  format: ExportFormat
) => {
  const meta = getExportFormatMeta(format);
  const safePayload = sanitizeExportPayload(payload);
  if (!meta) {
    return {
      content: formatExportAsJson(safePayload),
      mime: "application/json",
    };
  }
  switch (meta.key) {
    case "json":
      return { content: formatExportAsJson(safePayload), mime: meta.mime };
    case "xml":
      return { content: formatExportAsXml(safePayload), mime: meta.mime };
    case "yaml":
      return {
        content: `${formatExportAsYaml(safePayload)}\n`,
        mime: meta.mime,
      };
  }
  return { content: formatExportAsJson(safePayload), mime: "application/json" };
};

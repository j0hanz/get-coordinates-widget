import {
  DEFAULT_PIN_FILL_COLOR,
  DEFAULT_PIN_ICON_ID,
  PIN_ICON_DEFINITIONS,
  PIN_ICON_LOOKUP,
} from "./constants";
import type { PinIconDefinition, PinIconId } from "./types";

export { DEFAULT_PIN_FILL_COLOR, DEFAULT_PIN_ICON_ID };

export const listPinIconDefinitions = (): readonly PinIconDefinition[] =>
  PIN_ICON_DEFINITIONS;

export const getPinIconDefinition = (id: PinIconId): PinIconDefinition =>
  PIN_ICON_LOOKUP.get(id) ?? PIN_ICON_DEFINITIONS[0];

export const isPinIconId = (value: unknown): value is PinIconId =>
  typeof value === "string" && PIN_ICON_LOOKUP.has(value as PinIconId);

export const resolveBase64Encoder = (): ((input: string) => string) | null => {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window.btoa;
  }
  if (typeof btoa === "function") {
    return btoa;
  }
  return null;
};

export const buildPinSymbolDataUrl = (
  definition: PinIconDefinition,
  color: string
): string | null => {
  const svgBody = definition.svgBody.replace(/{{color}}/g, color);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${definition.viewBox}" role="img" aria-hidden="true">${svgBody}</svg>`;
  const encode = resolveBase64Encoder();
  if (!encode) return null;
  try {
    return `data:image/svg+xml;base64,${encode(svg)}`;
  } catch {
    return null;
  }
};

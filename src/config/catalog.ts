import {
  FALLBACK_SYSTEM_ID,
  getCoordinateOption,
  getDefaultWkidForSystem,
} from "./constants";

export {
  DEFAULT_ETRS89_WKID,
  DEFAULT_ITRF_WKID,
  DEFAULT_RT90_WKID,
  DEFAULT_SWEREF_WKID,
  DEFAULT_SWEREF_WKIDS,
  DEFAULT_WGS84_WKID,
  ETRS89_OPTIONS,
  FALLBACK_SYSTEM_ID,
  ITRF_OPTIONS,
  PRECISION_LIMITS,
  RT90_ZONES,
  SWEREF_GEODETIC_OPTIONS,
  SWEREF_ZONES,
  WGS84_DERIVED_OPTIONS,
  WGS84_OPTIONS,
} from "./constants";

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

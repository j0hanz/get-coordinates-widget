/*
 * Kontrollpunkter för SWEREF 99 TM enligt Lantmäteriet.
 * Källa: SWEREF_99.jsonl (Kontrollpunkter för SWEREF 99 TM)
 */
export interface ControlPoint {
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly northing: number;
  readonly easting: number;
  readonly comment: string;
}

export const SWEREF99_TM_CONTROL_POINTS: readonly ControlPoint[] =
  Object.freeze([
    {
      name: "Punkt 1",
      latitude: 55,
      longitude: 12,
      northing: 6097259.371,
      easting: 318985.166,
      comment: "Sydväst",
    },
    {
      name: "Punkt 2",
      latitude: 56,
      longitude: 13,
      northing: 6208169.735,
      easting: 383467.711,
      comment: "Mitt",
    },
    {
      name: "Punkt 3",
      latitude: 57,
      longitude: 14,
      northing: 6319024.547,
      easting: 447794.055,
      comment: "Mitt",
    },
    {
      name: "Punkt 4",
      latitude: 58,
      longitude: 15,
      northing: 6429817.199,
      easting: 511957.81,
      comment: "Centralt",
    },
    {
      name: "Punkt 5",
      latitude: 59,
      longitude: 16,
      northing: 6540541.349,
      easting: 575953.116,
      comment: "Mitt",
    },
    {
      name: "Punkt 6",
      latitude: 60,
      longitude: 17,
      northing: 6651190.822,
      easting: 639774.545,
      comment: "Mitt",
    },
    {
      name: "Punkt 7",
      latitude: 61,
      longitude: 18,
      northing: 6761759.611,
      easting: 703417.015,
      comment: "Mitt",
    },
    {
      name: "Punkt 8",
      latitude: 62,
      longitude: 19,
      northing: 6872241.884,
      easting: 766875.709,
      comment: "Mitt",
    },
    {
      name: "Punkt 9",
      latitude: 63,
      longitude: 20,
      northing: 6982631.982,
      easting: 830146.076,
      comment: "Mitt",
    },
    {
      name: "Punkt 10",
      latitude: 64,
      longitude: 21,
      northing: 7092924.428,
      easting: 893223.828,
      comment: "Mitt",
    },
    {
      name: "Punkt 11",
      latitude: 65,
      longitude: 22,
      northing: 7203113.929,
      easting: 956104.948,
      comment: "Nordost",
    },
  ]);

export const SWEREF99_TOLERANCE_METERS = 0.001;

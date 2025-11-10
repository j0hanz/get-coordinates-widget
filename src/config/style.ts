import { css } from "jimu-core";
import { getThemePalette, hasSys } from "../shared/utils";
import { StyleVariant } from "./enums";
import type { ThemeLike } from "./types";

const createSharedStyles = (
  colors: {
    surface: ReturnType<typeof getThemePalette>;
    onSurface: ReturnType<typeof getThemePalette>;
    activeIconColor: string;
  },
  spacing: ((value: number) => number | string) | undefined,
  options?: { pinButtonBackground?: string }
) => {
  const { surface, onSurface, activeIconColor } = colors;
  const pinButtonBackground =
    options?.pinButtonBackground ?? surface?.background;

  return {
    output: css({
      marginLeft: spacing?.(2),
      flex: 1,
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
      color: surface?.backgroundText ?? onSurface?.high ?? onSurface?.variant,
    }),
    pinButton: css({
      display: "flex",
      height: 33,
      backgroundColor: pinButtonBackground,
      "&:hover svg, &:focus-visible svg, &:active svg": {
        color: activeIconColor,
      },
    }),
    pinIcon: css({
      transition: "color 120ms ease",
      "&[data-active='true']": {
        color: activeIconColor,
      },
      "& svg": {
        color: "inherit",
        fill: "currentColor",
        stroke: "currentColor",
        transition: "color 120ms ease",
      },
      "& svg [stroke]:not([stroke='none'])": {
        stroke: "currentColor",
      },
      "& svg [fill]:not([fill='none'])": {
        fill: "currentColor",
      },
    }),
    actions: css({
      display: "flex",
      alignItems: "center",
      "&[data-can-copy='false'] [data-role='copy-icon']": {
        display: "none",
      },
    }),
    copyIcon: css({
      display: "flex",
      alignItems: "center",
      marginRight: spacing?.(2),
      opacity: 0,
      pointerEvents: "none",
      transition: "opacity 120ms ease",
      "&[data-visible='true']": {
        opacity: 0.25,
      },
    }),
  };
};

const createDefaultStyles = (
  colors: {
    surface: ReturnType<typeof getThemePalette>;
    onSurface: ReturnType<typeof getThemePalette>;
    activeIconColor: string;
  },
  spacing: ((value: number) => number | string) | undefined
) => ({
  ...createSharedStyles(colors, spacing),
  container: css({
    display: "flex",
    height: 33,
    backgroundColor: colors.surface?.paper,
  }),
  controls: css({
    display: "flex",
    alignItems: "center",
    width: "100%",
  }),
});

const createLinearStyles = (
  theme: ThemeLike,
  colors: {
    surface: ReturnType<typeof getThemePalette>;
    onSurface: ReturnType<typeof getThemePalette>;
    activeIconColor: string;
  },
  spacing: ((value: number) => number | string) | undefined
) => ({
  ...createSharedStyles(colors, spacing, {
    pinButtonBackground: "transparent",
  }),
  container: css({
    display: "flex",
    height: 33,
    background: "transparent",
  }),
  controls: css({
    display: "flex",
    alignItems: "center",
    borderBottom: `1px solid ${(() => {
      const neutral = getThemePalette(theme, "neutral");
      if (neutral) {
        const candidate = neutral["500"] ?? neutral["400"] ?? neutral["600"];
        return candidate ?? "var(--sys-color-neutral-500)";
      }
      return "var(--sys-color-neutral-500)";
    })()}`,
    width: "100%",
  }),
});

export const createWidgetStyles = (
  theme: ThemeLike,
  variant: StyleVariant = StyleVariant.Default
) => {
  const sys = hasSys(theme) ? theme.sys : undefined;
  const spacing = sys?.spacing;
  const secondary = getThemePalette(theme, "secondary");
  const surface = getThemePalette(theme, "surface");
  const onSurface = getThemePalette(theme, "onSurface");
  const activeIconColor = secondary?.dark ?? "var(--sys-color-secondary-dark)";
  const colors = {
    surface,
    onSurface,
    activeIconColor,
  };

  if (variant === StyleVariant.Linear) {
    return createLinearStyles(theme, colors, spacing);
  }

  return createDefaultStyles(colors, spacing);
};

export const createSettingStyles = () => {
  return {
    fullWidth: css({
      display: "flex",
      width: "100%",
      flexDirection: "column",
      minWidth: 0,
    }),
    helperStyle: css({
      marginTop: 4,
      opacity: 0.7,
    }),
    iconGroupStyle: css({
      display: "flex",
      width: "100%",
      flexWrap: "nowrap",
      gap: 8,
      justifyContent: "space-between",
      "& > button": {
        flex: "0 0 44px",
        height: 42,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      },
    }),
    iconSvgStyle: css({
      width: 28,
      height: 28,
      pointerEvents: "none",
    }),
    inlineMessageStyle: css({
      marginTop: 8,
      opacity: 0.75,
    }),
  };
};

export const createStyleVariantSelectorStyles = () => {
  return {
    container: css({
      display: "flex",
      flexDirection: "column",
      width: "100%",
      gap: 12,
    }),
    button: css({
      flex: "1 1 auto",
      height: 40,
      padding: 0,
      margin: 0,
      background: "#181818",
      border: "2px solid transparent",
    }),
    buttonActive: css({
      border: "2px solid var(--sys-color-primary-light)",
    }),
    styleImg: css({
      height: 36,
      margin: 0,
      width: "100%",
    }),
  };
};

import { css } from "jimu-core";
import { getThemePalette, hasSys } from "../shared/utils";
import type { ThemeLike } from "./types";

export const createWidgetStyles = (theme: ThemeLike) => {
  const sys = hasSys(theme) ? theme.sys : undefined;
  const spacing = sys?.spacing;
  const secondary = getThemePalette(theme, "secondary");
  const surface = getThemePalette(theme, "surface");
  const onSurface = getThemePalette(theme, "onSurface");
  const activeIconColor = secondary?.dark ?? "var(--sys-color-secondary-dark)";

  return {
    container: css({
      display: "flex",
      height: 33,
      backgroundColor: surface?.paper,
    }),
    controls: css({
      display: "flex",
      alignItems: "center",
      width: "100%",
    }),
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
      backgroundColor: surface?.background,
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
      projectionParams: css({
        marginTop: spacing?.(2) ?? 8,
        padding: spacing?.(2) ?? 8,
        borderRadius: 4,
        border: "1px solid var(--sys-color-outline, rgba(0,0,0,0.12))",
        backgroundColor:
          surface?.background ?? "var(--sys-color-surface-container-lowest)",
        color: onSurface?.variant,
        display: "flex",
        flexDirection: "column",
        gap: spacing?.(1) ?? 6,
        width: "100%",
      }),
      projectionToggle: css({
        alignSelf: "flex-start",
        display: "inline-flex",
        alignItems: "center",
        gap: spacing?.(1) ?? 6,
        padding: 0,
      }),
      paramLabel: css({
        fontWeight: 600,
      }),
      paramDetails: css({
        display: "flex",
        flexDirection: "column",
        gap: spacing?.(0.5) ?? 4,
      }),
      paramRow: css({
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.85rem",
        gap: spacing?.(1) ?? 8,
      }),
      paramKey: css({
        color: onSurface?.variant ?? "var(--sys-color-on-surface-variant)",
      }),
      paramValue: css({
        fontFamily: "monospace",
        fontWeight: 600,
      }),
      "&[data-visible='true']": {
        opacity: 0.25,
      },
    }),
  };
};

/** @jsx jsx */
import { hooks, jsx, React } from "jimu-core";
import { type JimuMapView, JimuMapViewComponent } from "jimu-arcgis";
import {
  Button,
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownMenu,
  SVG,
} from "jimu-ui";
import { useTheme } from "jimu-theme";
import downIcon from "jimu-icons/svg/outlined/directional/down.svg";
import copyIcon from "jimu-icons/svg/outlined/editor/copy.svg";
import {
  computeAllowedZones,
  type CoordinateOption,
  EXPORT_FORMATS,
  formatCoordinateOptionLabel,
  type GraphicsLayerCtor,
  type KoordinaterModules,
  type KoordinaterWidgetProps,
  type NativeEventWithStop,
  NO_VALUE_MESSAGE_KEY,
  type ThemeLike,
} from "../config";
import { createWidgetStyles } from "../config/style";
import {
  useArcGisModuleLoader,
  useConfigState,
  useExportManager,
  useFeedbackController,
  usePinGraphicManager,
  usePointerSubscriptions,
  useProjectionManager,
} from "../shared/hooks";
import {
  copyTextToClipboard,
  createSpatialReferenceFactory,
  evaluateKoordinaterReadiness,
  formatSnapshotForClipboard,
  hasCopyableText,
  projectPointToOption,
} from "../shared/utils";
import defaultMessages from "./translations/default";
import exportSvg from "../assets/export.svg";
import pinOffSvg from "../assets/pin-off.svg";
import pinSvg from "../assets/pin.svg";

const defaultNoValueText = defaultMessages[NO_VALUE_MESSAGE_KEY];
if (!defaultNoValueText) {
  throw new Error(`Missing default translation for '${NO_VALUE_MESSAGE_KEY}'`);
}

function useStyles() {
  const theme = useTheme();
  const stylesRef = React.useRef(null);
  const themeRef = React.useRef<ThemeLike | null>(null);
  let styles = stylesRef.current;
  if (!styles || themeRef.current !== theme) {
    styles = createWidgetStyles(theme);
    stylesRef.current = styles;
    themeRef.current = theme;
  }
  return styles;
}

const KoordinaterWidget: React.FC<KoordinaterWidgetProps> = (props) => {
  const translate = hooks.useTranslation(defaultMessages);
  const translateRef = hooks.useLatest(translate);
  const {
    message: feedbackMessage,
    show: showFeedbackMessage,
    clear: clearFeedbackMessage,
  } = useFeedbackController(translateRef);

  const { config } = useConfigState(props.config);
  const configRef = hooks.useLatest(config);

  const [jmv, setJmv] = React.useState<JimuMapView | null>(null);
  const [selectedWkid, setSelectedWkid] = React.useState<number>(
    () => config.swerefWkid ?? 3006
  );
  const [text, setText] = React.useState<string>(defaultNoValueText);
  const [isPinned, setIsPinned] = React.useState<boolean>(false);
  const [hasPinnedPoint, setHasPinnedPoint] = React.useState<boolean>(false);

  const modules = useArcGisModuleLoader<KoordinaterModules>(
    [
      "esri/geometry/Point",
      "esri/geometry/SpatialReference",
      "esri/geometry/projection",
      "esri/geometry/support/webMercatorUtils",
      "esri/Graphic",
    ],
    (
      PointCtor,
      SpatialReferenceCtor,
      projectionModule,
      webMercatorUtilsModule,
      GraphicCtor
    ) => ({
      Point: PointCtor as KoordinaterModules["Point"],
      SpatialReference:
        SpatialReferenceCtor as KoordinaterModules["SpatialReference"],
      projection: projectionModule as KoordinaterModules["projection"],
      webMercatorUtils:
        webMercatorUtilsModule as KoordinaterModules["webMercatorUtils"],
      Graphic: GraphicCtor as KoordinaterModules["Graphic"],
    })
  );

  const extraMods = useArcGisModuleLoader<{
    GraphicsLayer?: GraphicsLayerCtor;
  }>(["esri/layers/GraphicsLayer"], (GraphicsLayer) => ({
    GraphicsLayer: GraphicsLayer as GraphicsLayerCtor,
  }));

  const styles = useStyles();
  const noValueText = translate(NO_VALUE_MESSAGE_KEY);
  if (!noValueText) {
    throw new Error("Missing translation for 'noValue'");
  }

  const viewRef = hooks.useLatest(jmv?.view as __esri.MapView | undefined);
  const selectedWkidRef = hooks.useLatest(selectedWkid);
  const isPinnedRef = hooks.useLatest(isPinned);
  const noValueTextRef = hooks.useLatest(noValueText);
  const outputRef = React.useRef<HTMLDivElement | null>(null);
  const [showCopyIcon, setShowCopyIcon] = React.useState(false);

  const pinManager = usePinGraphicManager({
    view: jmv?.view as __esri.MapView | undefined,
    modules,
    extraModules: extraMods,
    pinFillColor: config.pinFillColor,
    pinIconId: config.pinIconId,
  });
  const getPinnedPoint = pinManager.getPinnedPoint;

  // Constrain selectable zones (validated list)
  const [allowedOptions, setAllowedOptions] = React.useState<
    CoordinateOption[]
  >(() => computeAllowedZones(config.enabledWkids));
  const allowedOptionsRef = hooks.useLatest(allowedOptions);

  hooks.useUpdateEffect(() => {
    setAllowedOptions(computeAllowedZones(config.enabledWkids));
  }, [config.enabledWkids]);

  const getSpatialReferenceRef = React.useRef(
    createSpatialReferenceFactory(modules)
  );
  hooks.useUpdateEffect(() => {
    getSpatialReferenceRef.current = createSpatialReferenceFactory(modules);
  }, [modules]);
  const getSpatialReference = getSpatialReferenceRef.current;

  // Coordinate projection manager
  const projection = useProjectionManager({
    modules,
    configRef,
    selectedWkidRef,
    viewRef,
    getSpatialReference,
    translate,
  });

  // Export manager (serialization & download)
  const exportManager = useExportManager({
    projection,
    configRef,
    allowedOptionsRef,
    translate,
  });

  const readiness = evaluateKoordinaterReadiness({
    hasMap: !!jmv,
    hasFormats: allowedOptions.length > 0,
  });
  const shouldShowPinInstruction =
    config.enablePin && isPinned && !hasPinnedPoint;
  const instructionMessage = shouldShowPinInstruction
    ? translate("clickMapToPlacePin")
    : null;
  const baseOutput = readiness.messageKey
    ? translate(readiness.messageKey)
    : (instructionMessage ?? text);
  const renderedOutput = feedbackMessage ?? baseOutput;
  const canCopyCurrentText =
    readiness.status === "ready" &&
    !shouldShowPinInstruction &&
    hasCopyableText(text, noValueText);
  const outputInteractive = canCopyCurrentText;
  const shouldRenderFormatDropdown =
    readiness.status === "ready" && allowedOptions.length >= 2;
  hooks.useUpdateEffect(() => {
    if (!outputInteractive) {
      setShowCopyIcon(false);
    }
  }, [outputInteractive]);

  // Privacy: drop pinned graphics so coordinates are never persisted in view state
  const clearPinGraphic = hooks.useEventCallback(() => {
    pinManager.rememberPinnedPoint(null);
    pinManager.clearGraphic();
    setHasPinnedPoint(false);
  });

  const applyPinGraphic = hooks.useEventCallback(
    (point: __esri.Point | null) => {
      if (!point) return;
      pinManager.rememberPinnedPoint(point);
      pinManager.applyGraphic(point);
      setHasPinnedPoint(true);
    }
  );

  hooks.useUpdateEffect(() => {
    if (config.enablePin) return;
    if (isPinned) {
      setIsPinned(false);
    }
    clearPinGraphic();
  }, [config.enablePin, isPinned, clearPinGraphic]);

  // (Re)apply pin graphic when pin state or modules ready
  hooks.useUpdateEffect(() => {
    if (!isPinned) {
      clearPinGraphic();
      return;
    }
    if (!modules?.Graphic) return;
    const point = getPinnedPoint();
    if (!point) return;
    applyPinGraphic(point);
  }, [isPinned, modules, getPinnedPoint, applyPinGraphic, clearPinGraphic]);

  // If map view disappears, reset pin state and clear graphics
  hooks.useUpdateEffect(() => {
    if (!jmv) {
      if (isPinned) setIsPinned(false);
      clearPinGraphic();
      projection.rememberPoint(null);
      setText(noValueText);
      clearFeedbackMessage();
    }
  }, [jmv, isPinned, noValueText]);

  // Reapply graphic when modules reload
  // Ensure current selection remains valid when allowed zones change
  // Keep selected wkid valid
  hooks.useUpdateEffect(() => {
    if (
      !allowedOptions.some((o) => o.wkid === selectedWkid) &&
      allowedOptions.length > 0
    ) {
      setSelectedWkid(allowedOptions[0].wkid);
    }
  }, [allowedOptions, selectedWkid]);
  const formatSeqRef = React.useRef(0);

  const updateFromPoint = hooks.useEventCallback(
    async (
      point: __esri.Point | null,
      options?: { syncPin?: boolean }
    ): Promise<string | null> => {
      const syncPin = options?.syncPin ?? false;
      const seq = ++formatSeqRef.current;
      projection.rememberPoint(point);
      const emptyValueText = noValueTextRef.current;
      if (!emptyValueText) {
        throw new Error("Missing translation for 'noValue'");
      }
      let formatted = emptyValueText;
      try {
        formatted = await projection.formatPoint(point);
      } catch {
        formatted = emptyValueText;
      }
      if (seq !== formatSeqRef.current) {
        return null;
      }
      setText(formatted);
      if (syncPin) {
        if (point && isPinnedRef.current) {
          applyPinGraphic(point);
        } else {
          clearPinGraphic();
        }
      }
      return formatted;
    }
  );

  // Ensure any pending RAF is cancelled on unmount as a safety net
  hooks.useUnmount(() => {
    clearPinGraphic();
    clearFeedbackMessage();
  });

  // React to settings changes that affect formatting or zone selection
  // Sync zone selection from external config changes
  hooks.useUpdateEffect(() => {
    const cfgWkid = config.swerefWkid;
    if (typeof cfgWkid === "number" && cfgWkid !== selectedWkidRef.current) {
      setSelectedWkid(cfgWkid);
    }
  }, [config.swerefWkid]);

  // Recompute formatted text when formatting-affecting settings change
  hooks.useUpdateEffect(() => {
    const lastPoint = projection.getLastPoint();
    if (!lastPoint) {
      setText(noValueText);
      return;
    }
    updateFromPoint(lastPoint).catch(() => undefined);
  }, [selectedWkid, config.precision, noValueText, updateFromPoint]);

  const onJmvChange = hooks.useEventCallback((mv: JimuMapView) => {
    setJmv(mv);
  });

  const onZoneChange = hooks.useEventCallback((wkid: number) => {
    const zones = allowedOptionsRef.current;
    const numericWkid = typeof wkid === "number" ? wkid : Number(wkid);
    if (!Number.isFinite(numericWkid)) return;
    if (!zones?.some((z) => z.wkid === numericWkid)) return;
    if (numericWkid === selectedWkidRef.current) return;
    setSelectedWkid(numericWkid);
  });

  const handleMapClick = hooks.useEventCallback(
    async (event: __esri.ViewClickEvent) => {
      const view = viewRef.current;
      if (!view) return;
      const point = view.toMap({ x: event?.x, y: event?.y });
      if (!point) return;
      try {
        const formatted = await updateFromPoint(point, { syncPin: true });
        const emptyValueText = noValueTextRef.current;
        if (
          formatted &&
          emptyValueText &&
          config.copyOnClick &&
          hasCopyableText(formatted, emptyValueText)
        ) {
          copyValueToClipboard();
        }
      } catch {
        /* ignore formatting errors */
      }
    }
  );

  usePointerSubscriptions({
    view: jmv?.view as __esri.MapView | undefined,
    isPinnedRef,
    updateFromPoint,
    handleMapClick,
  });

  const onPinToggle = hooks.useEventCallback(
    (event?: React.MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();
      if (event?.stopPropagation) {
        event.stopPropagation();
      }
      const nativeEvent = event?.nativeEvent as NativeEventWithStop | undefined;
      if (nativeEvent?.stopImmediatePropagation) {
        nativeEvent.stopImmediatePropagation();
      }
      setIsPinned((prev) => !prev);
    }
  );

  // Shared clipboard helper for runtime copy feedback
  const copyValueToClipboard = hooks.useEventCallback(() => {
    const clipboardText = projection.formatClipboardText();
    if (!clipboardText) {
      showFeedbackMessage("clipboardUnavailable");
      return;
    }
    const copied = copyTextToClipboard(clipboardText);
    showFeedbackMessage(copied ? "copied" : "clipboardUnavailable");
  });

  const handleOutputMouseEnter = hooks.useEventCallback(() => {
    if (!outputInteractive) return;
    setShowCopyIcon(true);
  });

  const handleOutputMouseLeave = hooks.useEventCallback(() => {
    setShowCopyIcon(false);
  });

  // Copy-on-click for the output area (extracted hook usage)
  const onOutputClick = hooks.useEventCallback(() => {
    if (!outputInteractive) return;
    copyValueToClipboard();
  });

  // Keyboard accessibility: Enter/Space triggers copy when enabled
  const onOutputKeyDown = hooks.useEventCallback(
    (event: React.KeyboardEvent) => {
      if (!outputInteractive) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        copyValueToClipboard();
      }
    }
  );

  const pinIconSrc = isPinned ? pinOffSvg : pinSvg;

  return (
    <div css={styles.container}>
      <JimuMapViewComponent
        useMapWidgetId={props.useMapWidgetIds?.[0]}
        onActiveViewChange={onJmvChange}
      />
      <div css={styles.controls}>
        {config.enablePin && (
          <Button
            type="tertiary"
            icon
            css={styles.pinButton}
            aria-pressed={isPinned}
            aria-label={translate(isPinned ? "pinToggleOff" : "pinToggleOn")}
            title={translate(isPinned ? "pinToggleOff" : "pinToggleOn")}
            onClick={onPinToggle}
            disabled={!jmv}
          >
            <SVG
              src={pinIconSrc}
              css={styles.pinIcon}
              aria-hidden="true"
              data-active={isPinned ? "true" : "false"}
              size={22}
              role="presentation"
            />
          </Button>
        )}
        <div
          css={styles.output}
          ref={outputRef}
          aria-live="polite"
          onClick={onOutputClick}
          onKeyDown={onOutputKeyDown}
          onMouseEnter={handleOutputMouseEnter}
          onMouseLeave={handleOutputMouseLeave}
          role={outputInteractive ? "button" : undefined}
          tabIndex={outputInteractive ? 0 : undefined}
          aria-label={outputInteractive ? translate("copy") : undefined}
          title={renderedOutput}
          data-can-copy={outputInteractive ? "true" : "false"}
        >
          {renderedOutput}
        </div>
        <div
          css={styles.actions}
          data-role="actions"
          data-can-copy={outputInteractive ? "true" : "false"}
        >
          <div
            css={styles.copyIcon}
            data-role="copy-icon"
            data-visible={outputInteractive && showCopyIcon ? "true" : "false"}
            aria-hidden="true"
          >
            <SVG src={copyIcon} size={20} role="presentation" />
          </div>
          {config.showExportButton && (
            <Dropdown
              activeIcon
              menuRole="listbox"
              aria-label={translate("export")}
            >
              <DropdownButton
                arrow={false}
                icon
                type="tertiary"
                css={styles.pinButton}
                title={translate("export")}
                role="combobox"
                disabled={
                  readiness.status !== "ready" || !exportManager.isReady()
                }
              >
                <SVG src={exportSvg} size={14} />
              </DropdownButton>
              <DropdownMenu alignment="start">
                {EXPORT_FORMATS.map((item) => (
                  <DropdownItem
                    key={item.key}
                    onClick={() => {
                      exportManager.handleExportSelect(item.key);
                    }}
                    role="menuitem"
                    title={translate(item.messageKey)}
                  >
                    {translate(item.messageKey)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
          )}

          {shouldRenderFormatDropdown && (
            <Dropdown
              activeIcon
              menuRole="listbox"
              aria-label={translate("format")}
            >
              <DropdownButton
                arrow={false}
                icon
                type="tertiary"
                css={styles.pinButton}
                title={translate("format")}
                role="combobox"
                disabled={allowedOptions.length === 0}
              >
                <SVG src={downIcon} size={16} />
              </DropdownButton>
              <DropdownMenu alignment="start">
                {allowedOptions.map((option) => {
                  const displayLabel = formatCoordinateOptionLabel(
                    option,
                    translate
                  );
                  const isActive = option.wkid === selectedWkid;
                  return (
                    <DropdownItem
                      key={option.wkid}
                      active={isActive}
                      onClick={() => onZoneChange(option.wkid)}
                      title={displayLabel}
                      role="menuitemradio"
                      aria-checked={isActive}
                    >
                      {displayLabel}
                    </DropdownItem>
                  );
                })}
              </DropdownMenu>
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default KoordinaterWidget;

export const projectionTestHelpers = {
  projectPointToOption,
  hasCopyableText,
  formatSnapshotForClipboard,
};

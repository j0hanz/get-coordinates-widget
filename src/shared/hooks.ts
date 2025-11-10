import { hooks, React } from "jimu-core";
import { loadArcGISJSAPIModules } from "jimu-arcgis";
import { saveAs } from "file-saver";
import {
  AXIS_VALUE_SEPARATOR,
  buildExportFilename,
  buildPinSymbolDataUrl,
  ConfigSanitizers,
  createExportPayload,
  DEFAULT_PIN_FILL_COLOR,
  DEFAULT_PIN_ICON_ID,
  type ExportFormat,
  type ExportManager,
  type ExportManagerParams,
  type ExportProjectionSnapshot,
  formatCoordinateOptionLabel,
  getCoordinateOption,
  getPinIconDefinition,
  isExportFormat,
  NO_VALUE_MESSAGE_KEY,
  type PinGraphicManager,
  type PinGraphicManagerParams,
  type PinIconId,
  type PointerSubscriptionsParams,
  type ProjectionManager,
  type ProjectionManagerParams,
  resolveEffectiveWkid,
  resolvePrecisionForOption,
  serializeExportPayload,
} from "../config";
import { buildProjectionSnapshot, formatNumber } from "./utils";

const { hexColor: sanitizeHexColor } = ConfigSanitizers;

export const useFeedbackController = (
  translateRef: React.MutableRefObject<(id: string) => string>
) => {
  const [message, setMessage] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  const clear = hooks.useEventCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage(null);
  });

  const show = hooks.useEventCallback((messageKey: string) => {
    const translateFn = translateRef.current;
    if (typeof translateFn !== "function") {
      return;
    }
    const text = translateFn(messageKey);
    if (!text) {
      return;
    }
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setMessage(text);
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      setMessage(null);
    }, 1000);
  });

  hooks.useUnmount(() => {
    clear();
  });

  return {
    message,
    show,
    clear,
  };
};

export const usePointerSubscriptions = (params: PointerSubscriptionsParams) => {
  const { view, isPinnedRef, updateFromPoint, handleMapClick } = params;
  const viewRef = hooks.useLatest(view);
  const updateRef = hooks.useLatest(updateFromPoint);
  const clickRef = hooks.useLatest(handleMapClick);
  const rafIdRef = React.useRef<number | null>(null);
  const lastMoveEventRef = React.useRef<__esri.ViewPointerMoveEvent | null>(
    null
  );

  const cancelPendingFrame = hooks.useEventCallback(() => {
    if (rafIdRef.current != null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  });

  hooks.useUnmount(() => {
    cancelPendingFrame();
  });

  hooks.useUpdateEffect(() => {
    const currentView = viewRef.current;
    if (!currentView) {
      cancelPendingFrame();
      return undefined;
    }

    const cleanupFns: Array<() => void> = [];

    const moveHandle = currentView.on(
      "pointer-move",
      (evt: __esri.ViewPointerMoveEvent) => {
        if (isPinnedRef.current) return;

        lastMoveEventRef.current = evt;
        if (rafIdRef.current != null) return;

        rafIdRef.current = window.requestAnimationFrame(async () => {
          rafIdRef.current = null;
          const latestEvt = lastMoveEventRef.current;
          if (!latestEvt || !viewRef.current) return;

          const pt = viewRef.current.toMap({
            x: latestEvt.x,
            y: latestEvt.y,
          });
          await updateRef.current(pt);
        });
      }
    );
    cleanupFns.push(() => {
      moveHandle.remove();
    });

    const clickHandle = currentView.on(
      "click",
      (evt: __esri.ViewClickEvent) => {
        clickRef.current(evt);
      }
    );
    cleanupFns.push(() => {
      clickHandle.remove();
    });

    return () => {
      cleanupFns.forEach((fn) => {
        fn();
      });
      cancelPendingFrame();
    };
  }, [view]);
};

export const useArcGisModuleLoader = <T>(
  moduleNames: string[],
  mapResult: (...loaded: unknown[]) => T
) => {
  const [value, setValue] = React.useState<T | null>(null);
  const makeCancelable = hooks.useCancelablePromiseMaker();
  hooks.useEffectOnce(() => {
    const cancellable = makeCancelable(loadArcGISJSAPIModules(moduleNames));
    cancellable
      .then((loaded) => {
        try {
          setValue(mapResult(...loaded));
        } catch {
          setValue(null);
        }
      })
      .catch(() => {
        /* swallow load failures */
      });
  });
  return value;
};

const createPinSymbol = (
  symbolUrl: string,
  definition: ReturnType<typeof getPinIconDefinition>
) => ({
  type: "picture-marker" as const,
  url: symbolUrl,
  width: definition.mapSymbol.width,
  height: definition.mapSymbol.height,
  yoffset: definition.mapSymbol.yOffset,
});

const tryRemoveGraphicFromLayer = (
  layer: __esri.GraphicsLayer | null,
  graphic: __esri.Graphic | null
) => {
  if (graphic && layer) {
    try {
      layer.remove(graphic);
    } catch {
      /* ignore removal errors */
    }
  }
};

const tryRemoveLayerFromMap = (
  layer: __esri.GraphicsLayer | null,
  map: __esri.Map | null
) => {
  if (layer && map) {
    try {
      map.remove(layer);
    } catch {
      /* ignore removal errors */
    }
  }
};

export const usePinGraphicManager = (
  params: PinGraphicManagerParams
): PinGraphicManager => {
  const { view, modules, extraModules, pinFillColor, pinIconId } = params;
  const viewRef = hooks.useLatest(view);
  const modulesRef = hooks.useLatest(modules);
  const layerCtorRef = hooks.useLatest(extraModules?.GraphicsLayer);
  const colorRef = hooks.useLatest(pinFillColor);
  const iconIdRef = hooks.useLatest(pinIconId || DEFAULT_PIN_ICON_ID);
  const pinLayerRef = React.useRef<__esri.GraphicsLayer | null>(null);
  const pinLayerMapRef = React.useRef<__esri.Map | null>(null);
  const pinGraphicRef = React.useRef<__esri.Graphic | null>(null);
  const pinnedPointRef = React.useRef<__esri.Point | null>(null);
  const symbolUrlRef = React.useRef<string | null>(null);
  const symbolColorRef = React.useRef<string | null>(null);
  const symbolIconIdRef = React.useRef<PinIconId | null>(null);

  const resolveSymbolResources = hooks.useEventCallback(() => {
    const desiredColor = sanitizeHexColor(
      colorRef.current,
      DEFAULT_PIN_FILL_COLOR
    );
    const iconId = iconIdRef.current ?? DEFAULT_PIN_ICON_ID;
    const definition = getPinIconDefinition(iconId);
    if (
      symbolUrlRef.current &&
      symbolColorRef.current === desiredColor &&
      symbolIconIdRef.current === iconId
    ) {
      return {
        url: symbolUrlRef.current,
        definition,
      };
    }
    const url = buildPinSymbolDataUrl(definition, desiredColor);
    if (!url) return null;
    symbolUrlRef.current = url;
    symbolColorRef.current = desiredColor;
    symbolIconIdRef.current = iconId;
    return { url, definition };
  });

  const ensureLayerSynced = hooks.useEventCallback(() => {
    const viewCurrent = viewRef.current;
    const GraphicsLayerCtor = layerCtorRef.current;
    const existingLayer = pinLayerRef.current;
    const previousMap = pinLayerMapRef.current;

    if (!viewCurrent) {
      tryRemoveLayerFromMap(existingLayer, previousMap);
      pinLayerRef.current = null;
      pinLayerMapRef.current = null;
      return null;
    }

    const map = viewCurrent.map;

    if (existingLayer && previousMap && previousMap !== map) {
      tryRemoveLayerFromMap(existingLayer, previousMap);
      pinLayerRef.current = null;
      pinLayerMapRef.current = null;
    }

    if (!pinLayerRef.current) {
      if (!GraphicsLayerCtor) return null;
      try {
        const layer = new GraphicsLayerCtor({ listMode: "hide" });
        pinLayerRef.current = layer;
        pinLayerMapRef.current = map;
        map.add(layer);
      } catch {
        pinLayerRef.current = null;
        pinLayerMapRef.current = null;
      }
      return pinLayerRef.current;
    }

    pinLayerMapRef.current = map;
    const layer = pinLayerRef.current;
    const layers = map?.layers;
    if (!layer) return null;

    const alreadyAttached =
      typeof layers?.includes === "function" ? layers.includes(layer) : false;
    if (alreadyAttached) return layer;

    try {
      map.add(layer);
    } catch {
      /* ignore layer add errors */
    }
    return layer;
  });

  const clearGraphic = hooks.useEventCallback(() => {
    pinnedPointRef.current = null;
    tryRemoveGraphicFromLayer(pinLayerRef.current, pinGraphicRef.current);
    pinGraphicRef.current = null;
  });

  const applyGraphic = hooks.useEventCallback((pt: __esri.Point | null) => {
    const GraphicCtor = modulesRef.current?.Graphic;
    if (!pt || !GraphicCtor) return;

    const layer = ensureLayerSynced();
    if (!layer) return;

    const symbolResources = resolveSymbolResources();
    if (!symbolResources) return;

    const { url: symbolUrl, definition } = symbolResources;
    const symbol = createPinSymbol(symbolUrl, definition);

    try {
      let graphic = pinGraphicRef.current;
      if (!graphic) {
        graphic = new GraphicCtor({ geometry: pt, symbol });
        pinGraphicRef.current = graphic;
      } else {
        graphic.geometry = pt;
        graphic.symbol = symbol;
      }

      tryRemoveGraphicFromLayer(layer, graphic);
      layer.add(graphic);
    } catch {
      /* ignore rendering errors silently */
    }
  });

  const reapplyPinnedGraphic = hooks.useEventCallback(() => {
    const pt = pinnedPointRef.current;
    if (!pt) return;
    applyGraphic(pt);
  });

  const rememberPinnedPoint = hooks.useEventCallback(
    (pt: __esri.Point | null) => {
      pinnedPointRef.current = pt;
    }
  );

  const getPinnedPoint = hooks.useEventCallback(() => pinnedPointRef.current);

  hooks.useUpdateEffect(() => {
    ensureLayerSynced();
    reapplyPinnedGraphic();
  }, [view, extraModules]);

  hooks.useUpdateEffect(() => {
    reapplyPinnedGraphic();
  }, [modules]);

  hooks.useUpdateEffect(() => {
    symbolUrlRef.current = null;
    symbolColorRef.current = null;
    symbolIconIdRef.current = null;
    reapplyPinnedGraphic();
  }, [pinFillColor, pinIconId]);

  hooks.useUnmount(() => {
    clearGraphic();
    tryRemoveLayerFromMap(pinLayerRef.current, pinLayerMapRef.current);
    pinLayerRef.current = null;
    pinLayerMapRef.current = null;
  });

  return {
    rememberPinnedPoint,
    applyGraphic,
    clearGraphic,
    getPinnedPoint,
  };
};

const formatCoordinateAxis = (
  value: number,
  precision: number,
  emptyText: string
): string => {
  return formatNumber(value, precision, emptyText);
};

const buildFormattedOutput = (
  snapshot: ExportProjectionSnapshot,
  precision: number,
  translate: (id: string) => string,
  emptyValueText: string
): string => {
  const firstFormatted = formatCoordinateAxis(
    snapshot.firstValue,
    precision,
    emptyValueText
  );
  const secondFormatted = formatCoordinateAxis(
    snapshot.secondValue,
    precision,
    emptyValueText
  );

  return `${translate(snapshot.firstAxis)}:${AXIS_VALUE_SEPARATOR}${firstFormatted}, ${translate(snapshot.secondAxis)}:${AXIS_VALUE_SEPARATOR}${secondFormatted}`;
};

export const useProjectionManager = (
  params: ProjectionManagerParams
): ProjectionManager => {
  const {
    modules,
    configRef,
    selectedWkidRef,
    viewRef,
    getSpatialReference,
    translate,
  } = params;
  const modulesRef = hooks.useLatest(modules);
  const translateRef = hooks.useLatest(translate);
  const lastPointRef = React.useRef<__esri.Point | null>(null);
  const lastProjectionRef = React.useRef<ExportProjectionSnapshot | null>(null);

  const rememberPoint = hooks.useEventCallback((pt: __esri.Point | null) => {
    lastPointRef.current = pt;
    if (!pt) {
      lastProjectionRef.current = null;
    }
  });

  const clearSnapshot = hooks.useEventCallback(() => {
    lastProjectionRef.current = null;
  });

  const formatPoint = hooks.useEventCallback(
    async (pt: __esri.Point | null) => {
      const translateFn = translateRef.current;
      const emptyValueText = translateFn(NO_VALUE_MESSAGE_KEY);
      if (!emptyValueText) {
        throw new Error("Missing translation for 'noValue'");
      }
      if (!pt) {
        lastProjectionRef.current = null;
        return emptyValueText;
      }
      const mods = modulesRef.current;
      if (!mods) {
        lastProjectionRef.current = null;
        return emptyValueText;
      }
      const cfg = configRef.current;
      const effectiveWkid = resolveEffectiveWkid(
        selectedWkidRef.current,
        viewRef.current?.center?.longitude
      );
      const option = getCoordinateOption(effectiveWkid);
      if (!option) {
        lastProjectionRef.current = null;
        return emptyValueText;
      }
      try {
        const snapshot = await buildProjectionSnapshot(
          pt,
          option,
          mods,
          getSpatialReference
        );
        if (!snapshot) {
          lastProjectionRef.current = null;
          return emptyValueText;
        }
        const precision = resolvePrecisionForOption(option, cfg.precision);
        lastProjectionRef.current = snapshot;

        return buildFormattedOutput(
          snapshot,
          precision,
          translateFn,
          emptyValueText
        );
      } catch {
        lastProjectionRef.current = null;
        return emptyValueText;
      }
    }
  );

  const getLastPoint = hooks.useEventCallback(() => lastPointRef.current);
  const getLastSnapshot = hooks.useEventCallback(
    () => lastProjectionRef.current
  );
  const hasSnapshot = hooks.useEventCallback(
    () => lastPointRef.current != null && lastProjectionRef.current != null
  );

  return {
    rememberPoint,
    formatPoint,
    getLastPoint,
    getLastSnapshot,
    hasSnapshot,
    clearSnapshot,
  };
};

export const useExportManager = (
  params: ExportManagerParams
): ExportManager => {
  const { projection, configRef, allowedOptionsRef, translate } = params;
  const translateRef = hooks.useLatest(translate);

  const isReady = hooks.useEventCallback(() => projection.hasSnapshot());

  const handleExportSelect = hooks.useEventCallback((value: ExportFormat) => {
    if (!isExportFormat(value)) return;
    const snapshot = projection.getLastSnapshot();
    const point = projection.getLastPoint();
    if (!snapshot || !point) return;

    const axisLabels: [string, string] = [
      translateRef.current(snapshot.firstAxis),
      translateRef.current(snapshot.secondAxis),
    ];
    const zones = allowedOptionsRef.current;
    const zoneOption =
      zones?.find((option) => option.wkid === snapshot.wkid) ??
      getCoordinateOption(snapshot.wkid);
    if (!zoneOption) {
      throw new Error(
        `Missing coordinate option metadata for WKID ${snapshot.wkid}`
      );
    }
    const zoneLabel = formatCoordinateOptionLabel(
      zoneOption,
      translateRef.current
    );
    const payload = createExportPayload(
      snapshot,
      zoneLabel,
      configRef.current.precision,
      axisLabels,
      typeof point.toJSON === "function" ? point.toJSON() : null
    );
    const { content, mime } = serializeExportPayload(payload, value);
    const filename = buildExportFilename(payload, value);
    try {
      const blob = new Blob([content], { type: mime });
      saveAs(blob, filename);
    } catch {
      /* ignore download errors to avoid leaking environment details */
    }
  });

  return {
    handleExportSelect,
    isReady,
  };
};

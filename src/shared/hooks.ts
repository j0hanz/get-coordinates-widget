import { hooks, React } from "jimu-core";
import { loadArcGISJSAPIModules } from "jimu-arcgis";
import { saveAs } from "file-saver";
import {
  buildConfig,
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
  type GraphicsLayerCtor,
  isExportFormat,
  type KoordinaterConfig,
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
import {
  buildProjectionSnapshot,
  formatCoordinateDisplay,
  formatSnapshotForClipboard,
  hasMethod,
} from "./utils";

const { hexColor: sanitizeHexColor } = ConfigSanitizers;

export const useConfigState = (configProp: unknown) => {
  const [config, setConfig] = React.useState<KoordinaterConfig>(() =>
    buildConfig(configProp)
  );

  hooks.useUpdateEffect(() => {
    setConfig(buildConfig(configProp));
  }, [configProp]);

  return { config, setConfig };
};

export const useStagedState = <T>(initialValue: T | (() => T)) => {
  const [value, setValue] = React.useState<T>(initialValue);
  return [value, setValue] as const;
};

export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const safeDelay = Number.isFinite(delay) && delay >= 0 ? delay : 0;
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  const mountedRef = React.useRef(true);

  hooks.useUpdateEffect(() => {
    if (safeDelay === 0) {
      setDebouncedValue(value);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      if (mountedRef.current) {
        setDebouncedValue(value);
      }
    }, safeDelay);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [value, safeDelay]);

  hooks.useEffectOnce(() => {
    return () => {
      mountedRef.current = false;
    };
  });

  return debouncedValue;
};

export const useFeedbackController = (
  translateRef: React.MutableRefObject<(id: string) => string>
) => {
  const [message, setMessage] = React.useState<string | null>(null);
  const timeoutRef = React.useRef<number | null>(null);

  const cancel = hooks.useEventCallback(() => {
    if (timeoutRef.current != null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  });

  const clear = hooks.useEventCallback(() => {
    cancel();
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
    cancel();
    setMessage(text);
    try {
      timeoutRef.current = window.setTimeout(() => {
        timeoutRef.current = null;
        setMessage(null);
      }, 1000);
    } catch {
      setMessage(null);
    }
  });

  hooks.useUnmount(() => {
    clear();
  });

  return {
    message,
    show,
    clear,
    cancel,
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
  const lastProcessedPosRef = React.useRef<{ x: number; y: number } | null>(
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

        const lastPos = lastProcessedPosRef.current;
        if (
          lastPos &&
          Math.abs(lastPos.x - evt.x) < 2 &&
          Math.abs(lastPos.y - evt.y) < 2
        ) {
          return;
        }

        lastMoveEventRef.current = evt;
        if (rafIdRef.current != null) return;

        rafIdRef.current = window.requestAnimationFrame(async () => {
          rafIdRef.current = null;
          const latestEvt = lastMoveEventRef.current;
          if (!latestEvt || !viewRef.current) return;

          lastProcessedPosRef.current = { x: latestEvt.x, y: latestEvt.y };
          const point = viewRef.current.toMap({
            x: latestEvt.x,
            y: latestEvt.y,
          });
          await updateRef.current(point);
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
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);
  const mountedRef = React.useRef(true);
  const makeCancelable = hooks.useCancelablePromiseMaker();
  hooks.useEffectOnce(() => {
    const cancellable = makeCancelable(loadArcGISJSAPIModules(moduleNames));
    cancellable
      .then((loaded) => {
        try {
          const mapped = mapResult(...loaded);
          if (!mountedRef.current) {
            return;
          }
          setValue(mapped);
          setError(null);
        } catch (err) {
          if (!mountedRef.current) {
            return;
          }
          setValue(null);
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .catch((err) => {
        if (!mountedRef.current) {
          return;
        }
        if (err?.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
      const cancelable = cancellable as unknown as {
        cancel?: () => void;
      };
      if (typeof cancelable?.cancel === "function") {
        cancelable.cancel();
      }
    };
  });
  return { value, loading, error } as const;
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

const removeGraphicSafely = <T, U>(
  container: T | null,
  item: U | null,
  removeFn: (container: T, item: U) => void
) => {
  if (!container || !item) return;
  try {
    removeFn(container, item);
  } catch {
    /* ignore removal errors */
  }
};

const ensureGraphicsLayerSynced = (
  viewRef: React.MutableRefObject<__esri.MapView | undefined>,
  layerCtorRef: React.MutableRefObject<GraphicsLayerCtor | undefined>,
  pinLayerRef: React.MutableRefObject<__esri.GraphicsLayer | null>,
  pinLayerMapRef: React.MutableRefObject<__esri.Map | null>
): __esri.GraphicsLayer | null => {
  const currentView = viewRef.current;
  const GraphicsLayerCtor = layerCtorRef.current;
  const existingLayer = pinLayerRef.current;
  const previousMap = pinLayerMapRef.current;

  if (!currentView) {
    removeGraphicSafely(previousMap, existingLayer, (m, l) => m.remove(l));
    pinLayerRef.current = null;
    pinLayerMapRef.current = null;
    return null;
  }

  const map = currentView.map;

  if (existingLayer && previousMap && previousMap !== map) {
    removeGraphicSafely(previousMap, existingLayer, (m, l) => m.remove(l));
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
};

const resolveSymbolResources = (
  colorRef: React.MutableRefObject<string>,
  iconIdRef: React.MutableRefObject<PinIconId>,
  symbolUrlRef: React.MutableRefObject<string | null>,
  symbolColorRef: React.MutableRefObject<string | null>,
  symbolIconIdRef: React.MutableRefObject<PinIconId | null>,
  symbolCacheRef: React.MutableRefObject<Map<string, string>>
): {
  url: string;
  definition: ReturnType<typeof getPinIconDefinition>;
} | null => {
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

  const cacheKey = `${iconId}:${desiredColor}`;
  const cached = symbolCacheRef.current.get(cacheKey);
  if (cached) {
    symbolUrlRef.current = cached;
    symbolColorRef.current = desiredColor;
    symbolIconIdRef.current = iconId;
    return { url: cached, definition };
  }

  const url = buildPinSymbolDataUrl(definition, desiredColor);
  if (!url) return null;
  symbolCacheRef.current.set(cacheKey, url);
  symbolUrlRef.current = url;
  symbolColorRef.current = desiredColor;
  symbolIconIdRef.current = iconId;
  return { url, definition };
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
  const symbolCacheRef = React.useRef<Map<string, string>>(new Map());

  const ensureLayerSynced = hooks.useEventCallback(() =>
    ensureGraphicsLayerSynced(
      viewRef,
      layerCtorRef,
      pinLayerRef,
      pinLayerMapRef
    )
  );

  const clearGraphic = hooks.useEventCallback(() => {
    pinnedPointRef.current = null;
    removeGraphicSafely(
      pinLayerRef.current,
      pinGraphicRef.current,
      (layer, graphic) => {
        layer.remove(graphic);
      }
    );
    pinGraphicRef.current = null;
  });

  const applyGraphic = hooks.useEventCallback((point: __esri.Point | null) => {
    const GraphicCtor = modulesRef.current?.Graphic;
    if (!point || !GraphicCtor) return;

    const layer = ensureLayerSynced();
    if (!layer) return;

    const symbolResources = resolveSymbolResources(
      colorRef,
      iconIdRef,
      symbolUrlRef,
      symbolColorRef,
      symbolIconIdRef,
      symbolCacheRef
    );
    if (!symbolResources) return;

    const { url: symbolUrl, definition } = symbolResources;
    const symbol = createPinSymbol(symbolUrl, definition);

    try {
      let graphic = pinGraphicRef.current;
      if (!graphic) {
        graphic = new GraphicCtor({ geometry: point, symbol });
        pinGraphicRef.current = graphic;
      } else {
        graphic.geometry = point;
        graphic.symbol = symbol;
      }

      removeGraphicSafely(layer, graphic, (l, g) => l.remove(g));
      layer.add(graphic);
    } catch {
      /* ignore rendering errors silently */
    }
  });

  const reapplyPinnedGraphic = hooks.useEventCallback(() => {
    const point = pinnedPointRef.current;
    if (!point) return;
    applyGraphic(point);
  });

  const rememberPinnedPoint = hooks.useEventCallback(
    (point: __esri.Point | null) => {
      pinnedPointRef.current = point;
    }
  );

  const getPinnedPoint = hooks.useEventCallback(() => pinnedPointRef.current);

  hooks.useUpdateEffect(() => {
    ensureLayerSynced();
    reapplyPinnedGraphic();
  }, [view, extraModules, modules]);

  hooks.useUpdateEffect(() => {
    symbolUrlRef.current = null;
    symbolColorRef.current = null;
    symbolIconIdRef.current = null;
    reapplyPinnedGraphic();
  }, [pinFillColor, pinIconId]);

  hooks.useUnmount(() => {
    clearGraphic();
    removeGraphicSafely(
      pinLayerMapRef.current,
      pinLayerRef.current,
      (map, layer) => map.remove(layer)
    );
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
    async (point: __esri.Point | null) => {
      const translateFn = translateRef.current;
      const emptyValueText = translateFn(NO_VALUE_MESSAGE_KEY);
      if (!emptyValueText) {
        throw new Error("Missing translation for 'noValue'");
      }
      if (!point) {
        lastProjectionRef.current = null;
        return emptyValueText;
      }
      const modules = modulesRef.current;
      if (!modules) {
        lastProjectionRef.current = null;
        return emptyValueText;
      }
      const config = configRef.current;
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
          point,
          option,
          modules,
          getSpatialReference
        );
        if (!snapshot) {
          lastProjectionRef.current = null;
          return emptyValueText;
        }
        const precision = resolvePrecisionForOption(option, config.precision);
        lastProjectionRef.current = snapshot;

        return formatCoordinateDisplay(
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
  const formatClipboardText = hooks.useEventCallback(() => {
    const snapshot = lastProjectionRef.current;
    if (!snapshot) {
      return null;
    }
    const translateFn = translateRef.current;
    const emptyValueText = translateFn(NO_VALUE_MESSAGE_KEY);
    if (!emptyValueText) {
      return null;
    }
    const option = getCoordinateOption(snapshot.wkid);
    if (!option) {
      return null;
    }
    const precision = resolvePrecisionForOption(
      option,
      configRef.current.precision
    );
    return formatSnapshotForClipboard(snapshot, precision, emptyValueText);
  });

  return {
    rememberPoint,
    formatPoint,
    getLastPoint,
    getLastSnapshot,
    hasSnapshot,
    clearSnapshot,
    formatClipboardText,
  };
};

const hasToJSON = (
  point: __esri.Point | null
): point is __esri.Point & { toJSON: () => __esri.PointProperties } => {
  if (point === null) return false;
  return hasMethod<"toJSON">(point, "toJSON");
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
      hasToJSON(point) ? point.toJSON() : null
    );
    const { content, mime } = serializeExportPayload(payload, value);
    const filename = buildExportFilename(payload, value);
    try {
      const blob = new Blob([content], { type: mime });
      saveAs(blob, filename);
    } catch {
      /* ignore download errors: Blob API unavailable, quota exceeded, or file-saver failure */
    }
  });

  return {
    handleExportSelect,
    isReady,
  };
};

export const useWidgetStartup = (params: {
  modulesLoading: boolean;
  startupDelay: number;
  minSpinnerDisplay: number;
}) => {
  const { modulesLoading, startupDelay, minSpinnerDisplay } = params;

  const [isInitializing, setIsInitializing] = React.useState(true);
  const [spinnerVisible, setSpinnerVisible] = React.useState(false);
  const spinnerStartTimeRef = React.useRef<number | null>(null);
  const mountedRef = React.useRef(true);

  const debouncedLoading = useDebouncedValue(modulesLoading, startupDelay);

  hooks.useUpdateEffect(() => {
    if (debouncedLoading && !spinnerVisible) {
      setSpinnerVisible(true);
      try {
        spinnerStartTimeRef.current = performance.now();
      } catch {
        spinnerStartTimeRef.current = null;
      }
    }
  }, [debouncedLoading, spinnerVisible]);

  hooks.useUpdateEffect(() => {
    if (!modulesLoading && spinnerVisible) {
      const startTime = spinnerStartTimeRef.current;
      const elapsed =
        startTime != null ? performance.now() - startTime : minSpinnerDisplay;

      if (elapsed >= minSpinnerDisplay) {
        setSpinnerVisible(false);
        setIsInitializing(false);
      } else {
        const remaining = minSpinnerDisplay - elapsed;
        const timerId = window.setTimeout(() => {
          if (mountedRef.current) {
            setSpinnerVisible(false);
            setIsInitializing(false);
          }
        }, remaining);

        return () => {
          window.clearTimeout(timerId);
        };
      }
    } else if (!modulesLoading && !spinnerVisible) {
      setIsInitializing(false);
    }

    return undefined;
  }, [modulesLoading, spinnerVisible, minSpinnerDisplay]);

  hooks.useEffectOnce(() => {
    return () => {
      mountedRef.current = false;
    };
  });

  return {
    shouldShowLoading: spinnerVisible,
    isInitializing,
    modulesReady: !modulesLoading && !isInitializing,
  } as const;
};

/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { css, hooks, jsx, React } from "jimu-core";
import {
  MapWidgetSelector,
  SettingRow,
  SettingSection,
} from "jimu-ui/advanced/setting-components";
import { ColorPicker as JimuColorPicker } from "jimu-ui/basic/color-picker";
import {
  AdvancedButtonGroup,
  Button,
  MultiSelect,
  MultiSelectItem,
  NumericInput,
  SVG,
  Switch,
} from "jimu-ui";
import type { AllWidgetSettingProps } from "jimu-for-builder";
import { useTheme } from "jimu-theme";
import {
  buildConfig,
  ConfigSanitizers,
  ConfigValidators,
  DEFAULT_PIN_FILL_COLOR,
  DEFAULT_PIN_ICON_ID,
  ensureValidWkid,
  formatCoordinateOptionLabel,
  getCoordinateOptionsForScope,
  listPinIconDefinitions,
  PRECISION_LIMITS,
} from "../config";
import type {
  BooleanConfigKey,
  IMKoordinaterConfig,
  KoordinaterConfig,
  MultiSelectValue,
  PinIconDefinition,
  PinIconId,
} from "../config";
import {
  evaluateKoordinaterReadiness,
  materializeValueArray,
  resolveCheckedValue,
} from "../shared/utils";
import defaultMessages from "./translations/default";

const fullWidth = css({
  display: "flex",
  width: "100%",
  flexDirection: "column",
  minWidth: 0,
});

const helperStyle = css({
  marginTop: 4,
  opacity: 0.7,
});

const iconGroupStyle = css({
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
});

const iconSvgStyle = css({
  width: 28,
  height: 28,
  pointerEvents: "none",
});

const inlineMessageStyle = css({
  marginTop: 8,
  opacity: 0.75,
});

const { restrictEnabledWkids } = ConfigValidators;
const {
  precision: sanitizePrecision,
  hexColor: sanitizeHexColor,
  pinIconId: sanitizePinIconId,
} = ConfigSanitizers;

const extractPrecisionCandidate = (
  value?: number | string,
  evt?: React.ChangeEvent<HTMLInputElement>
): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  if (evt?.target) {
    const fromEvent = parseInt(evt.target.value, 10);
    if (Number.isFinite(fromEvent)) {
      return fromEvent;
    }
  }
  return null;
};

const logSettingsEvent = (
  event: string,
  details: { [key: string]: unknown }
) => {
  if (typeof console === "undefined") {
    return;
  }
  if (typeof console.debug === "function") {
    console.debug("[Koordinater][Settings]", event, details);
    return;
  }
  if (typeof console.info === "function") {
    console.info("[Koordinater][Settings]", event, details);
  }
};

const ColorPicker: React.FC<{
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  style?: React.CSSProperties;
  "aria-label"?: string;
}> = ({ value, defaultValue, onChange, "aria-label": ariaLabel }) => {
  return (
    <JimuColorPicker
      color={value || defaultValue || "#000000"}
      onChange={(color) => {
        onChange?.(color);
      }}
      aria-label={ariaLabel}
      css={fullWidth}
    />
  );
};

const PinIconPreview: React.FC<{
  definition: PinIconDefinition;
  color: string;
}> = ({ definition, color }) => {
  const resolvedColor = sanitizeHexColor(color, DEFAULT_PIN_FILL_COLOR);
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${definition.viewBox}">${definition.svgBody.replace(/{{color}}/g, resolvedColor)}</svg>`;
  let dataSrc: string | null = null;
  try {
    const encoder =
      typeof window !== "undefined" && typeof window.btoa === "function"
        ? window.btoa
        : typeof btoa === "function"
          ? btoa
          : null;
    if (encoder) {
      const utf8 = encodeURIComponent(svgMarkup).replace(
        /%([0-9A-F]{2})/g,
        (_match, hex) => String.fromCharCode(parseInt(hex, 16))
      );
      const base64 = encoder(utf8);
      dataSrc = `data:image/svg+xml;base64,${base64}`;
    }
  } catch {
    dataSrc = null;
  }
  if (!dataSrc) {
    dataSrc = `data:image/svg+xml;utf8,${encodeURIComponent(svgMarkup)}`;
  }
  return (
    <SVG
      src={dataSrc}
      role="img"
      aria-hidden="true"
      focusable="false"
      css={iconSvgStyle}
      currentColor={false}
    />
  );
};

const Setting: React.FC<AllWidgetSettingProps<IMKoordinaterConfig>> = (
  props
) => {
  useTheme();
  const translate = hooks.useTranslation(defaultMessages);
  const cfg = props.config;
  const sanitizedConfig = buildConfig(cfg);
  const sanitizedPrecisionRef = hooks.useLatest(sanitizedConfig.precision);
  const initialEnabled = restrictEnabledWkids(
    sanitizedConfig.enabledWkids,
    sanitizedConfig.includeExtendedSystems,
    { allowEmpty: true }
  );

  // Local staged state for onBlur-commit pattern
  const [localIncludeExtended, setLocalIncludeExtended] =
    React.useState<boolean>(() => sanitizedConfig.includeExtendedSystems);
  const [localEnabledWkids, setLocalEnabledWkids] = React.useState<number[]>(
    () => [...initialEnabled]
  );
  const [localWkid, setLocalWkid] = React.useState<number>(() =>
    ensureValidWkid(sanitizedConfig.swerefWkid, initialEnabled)
  );
  const [localPrecision, setLocalPrecision] = React.useState<number>(
    () => sanitizedConfig.precision
  );
  const [localShowExportButton, setLocalShowExportButton] =
    React.useState<boolean>(() => !!sanitizedConfig.showExportButton);
  const [localCopyOnClick, setLocalCopyOnClick] = React.useState<boolean>(
    () => !!sanitizedConfig.copyOnClick
  );
  const [localEnablePin, setLocalEnablePin] = React.useState<boolean>(
    () => !!sanitizedConfig.enablePin
  );
  const [localPinFillColor, setLocalPinFillColor] = React.useState<string>(
    () => sanitizedConfig.pinFillColor || DEFAULT_PIN_FILL_COLOR
  );
  const [localPinIconId, setLocalPinIconId] = React.useState<PinIconId>(
    () => sanitizedConfig.pinIconId || DEFAULT_PIN_ICON_ID
  );

  const pinIconDefinitions = listPinIconDefinitions();
  const pinIconIdRef = hooks.useLatest(localPinIconId);

  const enabledSnapshotRef = React.useRef<string>(
    initialEnabled.map(String).sort().join("|")
  );

  const availableOptions = getCoordinateOptionsForScope(localIncludeExtended);

  const coordinateItems = availableOptions.map((option) => ({
    value: option.wkid.toString(),
    label: formatCoordinateOptionLabel(option, translate),
  }));

  const readiness = evaluateKoordinaterReadiness({
    hasMap: !!props.useMapWidgetIds?.length,
    enabledWkids: localEnabledWkids,
  });
  const mapSelected = readiness.hasMap;
  const formatsSelected = readiness.hasFormats;
  const mapStatusMessage =
    readiness.status === "no-map" && readiness.messageKey
      ? translate(readiness.messageKey)
      : null;
  const formatsStatusMessage =
    readiness.status === "no-formats" && readiness.messageKey
      ? translate(readiness.messageKey)
      : null;

  // Sync staged state when external config changes (e.g., undo/redo or JSON edit)
  hooks.useUpdateEffect(() => {
    const nextSanitized = buildConfig(cfg);
    const include = nextSanitized.includeExtendedSystems;
    const enabled = restrictEnabledWkids(nextSanitized.enabledWkids, include, {
      allowEmpty: true,
    });
    enabledSnapshotRef.current = enabled.map(String).sort().join("|");
    setLocalIncludeExtended(include);
    setLocalEnabledWkids(enabled);
    setLocalWkid(ensureValidWkid(nextSanitized.swerefWkid, enabled));
    setLocalPrecision(nextSanitized.precision);
    setLocalShowExportButton(!!nextSanitized.showExportButton);
    setLocalCopyOnClick(!!nextSanitized.copyOnClick);
    setLocalEnablePin(!!nextSanitized.enablePin);
    setLocalPinFillColor(nextSanitized.pinFillColor || DEFAULT_PIN_FILL_COLOR);
    setLocalPinIconId(nextSanitized.pinIconId || DEFAULT_PIN_ICON_ID);
  }, [cfg]);

  const commitPartial = hooks.useEventCallback(
    (updates: Partial<KoordinaterConfig>) => {
      let nextConfig = props.config;
      for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          const value = updates[key as keyof KoordinaterConfig];
          if (typeof value !== "undefined") {
            nextConfig = nextConfig.set(key, value);
          }
        }
      }
      props.onSettingChange({ id: props.id, config: nextConfig });
    }
  );

  const onMapChange = hooks.useEventCallback((ids: string[]) => {
    props.onSettingChange({ id: props.id, useMapWidgetIds: ids });
  });

  const applyEnabledWkidsChange = hooks.useEventCallback(
    (
      incomingValues: MultiSelectValue,
      source: "change" | "click",
      rawValue?: string | number
    ) => {
      const valuesArray = materializeValueArray(incomingValues);
      const snapshot = valuesArray.map(String).sort().join("|");
      if (snapshot === enabledSnapshotRef.current) {
        return;
      }
      enabledSnapshotRef.current = snapshot;

      const enabled = restrictEnabledWkids(valuesArray, localIncludeExtended, {
        allowEmpty: true,
      });
      setLocalEnabledWkids(enabled);

      logSettingsEvent("availableOutputsChange", {
        source,
        includeExtended: localIncludeExtended,
        rawValue,
        enabledWkids: enabled,
      });

      let updates: Partial<KoordinaterConfig> = {
        enabledWkids: enabled,
      };
      const nextWkid = ensureValidWkid(localWkid, enabled);
      if (nextWkid !== localWkid) {
        setLocalWkid(nextWkid);
        updates = { ...updates, swerefWkid: nextWkid };
      }
      commitPartial(updates);
    }
  );

  const onIncludeExtendedChange = hooks.useEventCallback(
    (
      event: React.ChangeEvent<HTMLInputElement> | undefined,
      checked?: boolean
    ) => {
      const nextInclude = resolveCheckedValue(event, checked);
      setLocalIncludeExtended(nextInclude);

      if (!nextInclude) {
        const restricted = restrictEnabledWkids(localEnabledWkids, false, {
          allowEmpty: true,
        });
        enabledSnapshotRef.current = restricted.map(String).sort().join("|");
        setLocalEnabledWkids(restricted);
        let updates: Partial<KoordinaterConfig> = {
          includeExtendedSystems: nextInclude,
          enabledWkids: restricted,
        };
        const nextWkid = ensureValidWkid(localWkid, restricted);
        if (nextWkid !== localWkid) {
          setLocalWkid(nextWkid);
          updates = { ...updates, swerefWkid: nextWkid };
        }
        commitPartial(updates);
        return;
      }

      commitPartial({
        includeExtendedSystems: nextInclude,
        enabledWkids: localEnabledWkids,
      });
    }
  );

  // Available zones — change locally, commit immediately
  const onEnabledWkidsChange = hooks.useEventCallback(
    (_value: string | number, values: Array<string | number>) => {
      applyEnabledWkidsChange(values, "change", _value);
    }
  );

  const onEnabledWkidsItemClick = hooks.useEventCallback(
    (
      _evt: React.MouseEvent<HTMLButtonElement>,
      value: string | number,
      values: Array<string | number>
    ) => {
      applyEnabledWkidsChange(values, "click", value);
    }
  );

  // Default zone — change locally, commit immediately
  // Precision — change locally, commit immediately AND onBlur
  const commitPrecisionValue = hooks.useEventCallback((value: number) => {
    const fallback = Number.isFinite(localPrecision)
      ? localPrecision
      : sanitizedPrecisionRef.current;
    const normalized = sanitizePrecision(value, fallback);
    setLocalPrecision(normalized);
    commitPartial({ precision: normalized });
  });

  const onPrecisionChange = hooks.useEventCallback(
    (value?: number | string, evt?: React.ChangeEvent<HTMLInputElement>) => {
      const numeric = extractPrecisionCandidate(value, evt);
      if (numeric == null) {
        return;
      }
      commitPrecisionValue(numeric);
    }
  );
  const onPrecisionBlur = hooks.useEventCallback(() => {
    const fallback = Number.isFinite(localPrecision)
      ? localPrecision
      : PRECISION_LIMITS.min;
    commitPrecisionValue(fallback);
  });

  // Switches — change locally, commit immediately
  const onToggleLocal = hooks.useEventCallback(
    (setter: (v: boolean) => void, key: BooleanConfigKey) =>
      (
        event: React.ChangeEvent<HTMLInputElement> | undefined,
        checked?: boolean
      ) => {
        const value = resolveCheckedValue(event, checked);
        setter(value);

        // Commit immediately for live updates
        commitPartial({ [key]: value } as Partial<KoordinaterConfig>);
      }
  );

  const onPinFillColorChange = hooks.useEventCallback((color: string) => {
    const sanitized = sanitizeHexColor(color, DEFAULT_PIN_FILL_COLOR);
    setLocalPinFillColor(sanitized);
    commitPartial({ pinFillColor: sanitized });
  });

  const onPinIconSelect = hooks.useEventCallback((nextId: PinIconId) => {
    const sanitized = sanitizePinIconId(nextId, DEFAULT_PIN_ICON_ID);
    if (sanitized === pinIconIdRef.current) {
      return;
    }
    setLocalPinIconId(sanitized);
    commitPartial({ pinIconId: sanitized });
    logSettingsEvent("pinIconChange", { pinIconId: sanitized });
  });

  return (
    <>
      <SettingSection title={translate("mapSection")}>
        <SettingRow level={1} label="" flow="wrap">
          <MapWidgetSelector
            onSelect={onMapChange}
            useMapWidgetIds={props.useMapWidgetIds}
          />
        </SettingRow>
        {!mapSelected && mapStatusMessage && (
          <SettingRow level={1} label="" flow="wrap">
            <div css={inlineMessageStyle} role="status" aria-live="polite">
              {mapStatusMessage}
            </div>
          </SettingRow>
        )}
      </SettingSection>
      {mapSelected && (
        <SettingSection>
          <SettingRow
            level={1}
            label={translate("includeExtendedSystems")}
            tag="label"
            flow="no-wrap"
          >
            <Switch
              checked={!!localIncludeExtended}
              onChange={onIncludeExtendedChange}
            />
          </SettingRow>
          <SettingRow
            level={1}
            label={translate("availableOutputs")}
            tag="label"
            flow="wrap"
          >
            <MultiSelect
              values={localEnabledWkids.map(String)}
              onChange={onEnabledWkidsChange}
              onClickItem={onEnabledWkidsItemClick}
              placeholder={translate("availableOutputs")}
              items={coordinateItems}
              css={fullWidth}
            >
              {coordinateItems.map((item) => (
                <MultiSelectItem
                  key={item.value}
                  value={item.value}
                  label={item.label}
                />
              ))}
            </MultiSelect>
          </SettingRow>
          {!formatsSelected && formatsStatusMessage && (
            <SettingRow level={1} label="" flow="wrap">
              <div css={inlineMessageStyle} role="status" aria-live="polite">
                {formatsStatusMessage}
              </div>
            </SettingRow>
          )}
        </SettingSection>
      )}

      {mapSelected && formatsSelected && (
        <>
          <SettingSection>
            <SettingRow
              level={1}
              label={translate("precision")}
              tag="label"
              flow="wrap"
            >
              <NumericInput
                value={
                  Number.isFinite(localPrecision)
                    ? localPrecision
                    : PRECISION_LIMITS.min
                }
                onChange={onPrecisionChange}
                onAcceptValue={(finalValue) => {
                  const numeric = extractPrecisionCandidate(finalValue);
                  if (numeric != null) {
                    commitPrecisionValue(numeric);
                    return;
                  }
                  onPrecisionBlur();
                }}
                min={PRECISION_LIMITS.min}
                max={PRECISION_LIMITS.max}
                aria-label={translate("precision")}
                css={fullWidth}
              />
              <div css={helperStyle}>{translate("precisionHelper")}</div>
            </SettingRow>
          </SettingSection>
          <SettingSection>
            <SettingRow
              level={1}
              label={translate("showExportButton")}
              tag="label"
              flow="no-wrap"
            >
              <Switch
                checked={!!localShowExportButton}
                onChange={onToggleLocal(
                  setLocalShowExportButton,
                  "showExportButton"
                )}
              />
            </SettingRow>

            <SettingRow
              level={1}
              label={translate("enablePin")}
              tag="label"
              flow="no-wrap"
            >
              <Switch
                checked={!!localEnablePin}
                onChange={onToggleLocal(setLocalEnablePin, "enablePin")}
              />
            </SettingRow>

            <SettingRow
              level={1}
              label={translate("copyOnClick")}
              tag="label"
              flow="no-wrap"
            >
              <Switch
                checked={!!localCopyOnClick}
                onChange={onToggleLocal(setLocalCopyOnClick, "copyOnClick")}
              />
            </SettingRow>
          </SettingSection>
          {localEnablePin && (
            <SettingSection>
              <SettingRow
                level={1}
                label={translate("pinColor")}
                tag="label"
                flow="wrap"
              >
                <ColorPicker
                  value={localPinFillColor}
                  onChange={onPinFillColorChange}
                  aria-label={translate("pinColor")}
                />
              </SettingRow>
              <SettingRow
                level={1}
                label={translate("pinIcon")}
                tag="label"
                flow="wrap"
              >
                <AdvancedButtonGroup css={iconGroupStyle} size="sm">
                  {pinIconDefinitions.map((definition) => {
                    const label = translate(definition.labelMessageKey);
                    const isActive = localPinIconId === definition.id;
                    return (
                      <Button
                        key={definition.id}
                        icon
                        type="tertiary"
                        active={isActive}
                        onClick={() => onPinIconSelect(definition.id)}
                        aria-label={label}
                        title={label}
                      >
                        <PinIconPreview
                          definition={definition}
                          color={localPinFillColor}
                        />
                      </Button>
                    );
                  })}
                </AdvancedButtonGroup>
              </SettingRow>
            </SettingSection>
          )}
        </>
      )}
    </>
  );
};

export default Setting;

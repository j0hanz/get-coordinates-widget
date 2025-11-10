/** @jsx jsx */
/** @jsxFrag React.Fragment */
import { hooks, jsx, React } from "jimu-core";
import {
  MapWidgetSelector,
  SettingRow,
  SettingSection,
} from "jimu-ui/advanced/setting-components";
import { ColorPicker as JimuColorPicker } from "jimu-ui/basic/color-picker";
import {
  AdvancedButtonGroup,
  Button,
  defaultMessages as jimuUIMessages,
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
  buildPinSymbolDataUrl,
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
import { createSettingStyles } from "../config/style";
import {
  evaluateKoordinaterReadiness,
  materializeValueArray,
  parseIntOrNull,
  resolveCheckedValue,
} from "../shared/utils";
import defaultMessages from "./translations/default";

const { restrictEnabledWkids } = ConfigValidators;
const {
  precision: sanitizePrecision,
  hexColor: sanitizeHexColor,
  pinIconId: sanitizePinIconId,
} = ConfigSanitizers;

function useSettingStyles() {
  const stylesRef = React.useRef(null);
  let styles = stylesRef.current;
  if (!styles) {
    styles = createSettingStyles();
    stylesRef.current = styles;
  }
  return styles;
}

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

const updateEnabledWkidsSnapshot = (values: Array<string | number>): string => {
  return values.map(String).sort().join("|");
};

const validateAndUpdateWkid = (
  currentWkid: number,
  enabledWkids: number[],
  setLocalWkid: (wkid: number) => void
): Partial<KoordinaterConfig> => {
  const nextWkid = ensureValidWkid(currentWkid, enabledWkids);
  const updates: Partial<KoordinaterConfig> = { enabledWkids };
  if (nextWkid !== currentWkid) {
    setLocalWkid(nextWkid);
    return { ...updates, swerefWkid: nextWkid };
  }
  return updates;
};

const ColorPicker: React.FC<{
  value?: string;
  defaultValue?: string;
  onChange?: (color: string) => void;
  style?: React.CSSProperties;
  "aria-label"?: string;
  styles: ReturnType<typeof createSettingStyles>;
}> = ({ value, defaultValue, onChange, "aria-label": ariaLabel, styles }) => {
  return (
    <JimuColorPicker
      color={value || defaultValue || "#000000"}
      onChange={(color) => {
        onChange?.(color);
      }}
      aria-label={ariaLabel}
      css={styles.fullWidth}
    />
  );
};

const PinIconPreview: React.FC<{
  definition: PinIconDefinition;
  color: string;
  styles: ReturnType<typeof createSettingStyles>;
}> = ({ definition, color, styles }) => {
  const resolvedColor = sanitizeHexColor(color, DEFAULT_PIN_FILL_COLOR);
  const dataSrc =
    buildPinSymbolDataUrl(definition, resolvedColor) ??
    `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${definition.viewBox}">${definition.svgBody.replace(/{{color}}/g, resolvedColor)}</svg>`)}`;
  return (
    <SVG
      src={dataSrc}
      role="img"
      aria-hidden="true"
      focusable="false"
      css={styles.iconSvgStyle}
      currentColor={false}
    />
  );
};

const Setting: React.FC<AllWidgetSettingProps<IMKoordinaterConfig>> = (
  props
) => {
  useTheme();
  const styles = useSettingStyles();
  const translate = hooks.useTranslation(jimuUIMessages, defaultMessages);
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
    const include = sanitizedConfig.includeExtendedSystems;
    const enabled = restrictEnabledWkids(
      sanitizedConfig.enabledWkids,
      include,
      {
        allowEmpty: true,
      }
    );
    enabledSnapshotRef.current = enabled.map(String).sort().join("|");
    setLocalIncludeExtended(include);
    setLocalEnabledWkids(enabled);
    setLocalWkid(ensureValidWkid(sanitizedConfig.swerefWkid, enabled));
    setLocalPrecision(sanitizedConfig.precision);
    setLocalShowExportButton(!!sanitizedConfig.showExportButton);
    setLocalCopyOnClick(!!sanitizedConfig.copyOnClick);
    setLocalEnablePin(!!sanitizedConfig.enablePin);
    setLocalPinFillColor(
      sanitizedConfig.pinFillColor || DEFAULT_PIN_FILL_COLOR
    );
    setLocalPinIconId(sanitizedConfig.pinIconId || DEFAULT_PIN_ICON_ID);
  }, [sanitizedConfig]);

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
      const snapshot = updateEnabledWkidsSnapshot(valuesArray);
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

      const updates = validateAndUpdateWkid(localWkid, enabled, setLocalWkid);
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
        enabledSnapshotRef.current = updateEnabledWkidsSnapshot(
          restricted.map(String)
        );
        setLocalEnabledWkids(restricted);
        const updates: Partial<KoordinaterConfig> = {
          includeExtendedSystems: nextInclude,
          ...validateAndUpdateWkid(localWkid, restricted, setLocalWkid),
        };
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
      const numeric = parseIntOrNull(value, evt);
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
            <div
              css={styles.inlineMessageStyle}
              role="status"
              aria-live="polite"
            >
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
              css={styles.fullWidth}
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
              <div
                css={styles.inlineMessageStyle}
                role="status"
                aria-live="polite"
              >
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
                  const numeric = parseIntOrNull(finalValue);
                  if (numeric != null) {
                    commitPrecisionValue(numeric);
                    return;
                  }
                  onPrecisionBlur();
                }}
                min={PRECISION_LIMITS.min}
                max={PRECISION_LIMITS.max}
                aria-label={translate("precision")}
                css={styles.fullWidth}
              />
              <div css={styles.helperStyle}>{translate("precisionHelper")}</div>
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
                  styles={styles}
                />
              </SettingRow>
              <SettingRow
                level={1}
                label={translate("pinIcon")}
                tag="label"
                flow="wrap"
              >
                <AdvancedButtonGroup css={styles.iconGroupStyle} size="sm">
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
                          styles={styles}
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

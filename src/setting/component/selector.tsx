/** @jsx jsx */
import { hooks, jsx, React } from "jimu-core";
import {
  SettingRow,
  SettingSection,
} from "jimu-ui/advanced/setting-components";
import { Button } from "jimu-ui";
import { createStyleVariantSelectorStyles, StyleVariant } from "../../config";
import type { StyleVariantSelectorProps } from "../../config";
import defaultMessages from "../translations/default";

const DefaultStyleIcon = () => (
  <svg width="108" height="72" viewBox="0 0 108 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="26" width="92" height="20" fill="#ffffff"/>
    <rect x="12" y="30" width="12" height="12" rx="6" fill="#131313"/>
    <rect x="33" y="33" width="42" height="6" fill="#131313"/>
    <rect x="84" y="30" width="12" height="12" rx="6" fill="#131313"/>
  </svg>
);

const LinearStyleIcon = () => (
  <svg width="108" height="72" viewBox="0 0 108 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="26" width="92" height="20" fill="rgba(0,0,0,0)"/>
    <rect x="12" y="30" width="12" height="12" rx="6" fill="#ffffff"/>
    <rect x="33" y="33" width="42" height="6" fill="#ffffff"/>
    <rect x="84" y="30" width="12" height="12" rx="6" fill="#ffffff"/>
  </svg>
);

const StyleVariantSelector = (props: StyleVariantSelectorProps) => {
  const translate = hooks.useTranslation(defaultMessages);
  const { config, id, onSettingChange, currentVariant } = props;

  const stylesRef = React.useRef(null);
  let styles = stylesRef.current;
  if (!styles) {
    styles = createStyleVariantSelectorStyles();
    stylesRef.current = styles;
  }

  const handleStyleVariantChange = hooks.useEventCallback(
    (variant: StyleVariant) => {
      onSettingChange({
        id,
        config: config.set("styleVariant", variant),
      });
    }
  );

  const isDefaultActive = currentVariant === StyleVariant.Default;
  const isLinearActive = currentVariant === StyleVariant.Linear;

  return (
    <SettingSection title={translate("settingStyleVariant")}>
      <SettingRow>
        <div
          aria-label={translate("settingStyleVariant")}
          role="radiogroup"
          css={styles.container}
        >
          <Button
            type="tertiary"
            role="radio"
            block
            css={[styles.button, isDefaultActive && styles.buttonActive]}
            onClick={() => handleStyleVariantChange(StyleVariant.Default)}
            title={translate("styleVariantDefault")}
            aria-label={translate("styleVariantDefault")}
            aria-checked={isDefaultActive}
          >
            <div css={styles.styleImg}>
              <DefaultStyleIcon />
            </div>
          </Button>
          <Button
            type="tertiary"
            role="radio"
            block
            css={[styles.button, isLinearActive && styles.buttonActive]}
            onClick={() => handleStyleVariantChange(StyleVariant.Linear)}
            title={translate("styleVariantLinear")}
            aria-label={translate("styleVariantLinear")}
            aria-checked={isLinearActive}
          >
            <div css={styles.styleImg}>
              <LinearStyleIcon />
            </div>
          </Button>
        </div>
      </SettingRow>
    </SettingSection>
  );
};

export default StyleVariantSelector;
